[CmdletBinding()]
param(
    [string]$WorkspaceDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$Branch = "main",
    [string]$CentralUrl = "https://maximus-erp.onrender.com",
    [string]$BootstrapFile = "",
    [switch]$Install,
    [switch]$CheckUpdate,
    [switch]$Update,
    [switch]$Backup,
    [switch]$HealthCheck,
    [switch]$Repair,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Logs,
    [switch]$NonInteractive,
    [switch]$Approve,
    [switch]$SkipComposer,
    [switch]$SkipBuild,
    [switch]$SkipHealthcheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$WorkspaceDir = (Resolve-Path $WorkspaceDir -ErrorAction Stop).Path
$LaravelDir = Join-Path $WorkspaceDir "artifacts/api-server/laravel"
$FrontendDir = Join-Path $WorkspaceDir "artifacts/maximus"
$EnvFile = Join-Path $LaravelDir ".env"
$BackupRoot = Join-Path $WorkspaceDir "maximus-sauvegardes"
$ManagerStateDir = Join-Path $LaravelDir "storage/app/maximus-manager"
$ServerStateFile = Join-Path $ManagerStateDir "server.json"

function Fail([string]$Message) {
    throw "MaximusManager : $Message"
}

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message"
}

function Invoke-NativeChecked([string]$File, [string[]]$Arguments) {
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        Fail "La commande $File a échoué avec le code $LASTEXITCODE."
    }
}

function Get-CommandPath([string[]]$Names) {
    foreach ($name in $Names) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }
    return $null
}

function Convert-ToBashPath([string]$Path) {
    $cygpath = Get-CommandPath @("cygpath.exe", "cygpath")
    if ($cygpath) {
        return (& $cygpath -u $Path | Out-String).Trim()
    }
    return $Path
}

function Ensure-UnixShellForNodeScripts {
    if (Get-Command sh.exe -ErrorAction SilentlyContinue) {
        return
    }

    $gitBinCandidates = @()
    if ($env:ProgramFiles) {
        $gitBinCandidates += (Join-Path $env:ProgramFiles "Git\bin")
    }
    if (${env:ProgramFiles(x86)}) {
        $gitBinCandidates += (Join-Path ${env:ProgramFiles(x86)} "Git\bin")
    }

    foreach ($gitBin in $gitBinCandidates) {
        if (Test-Path (Join-Path $gitBin "sh.exe") -PathType Leaf) {
            $env:Path = "$gitBin;$env:Path"
            return
        }
    }

    Fail "Git for Windows est installé mais sh.exe est introuvable. Le build frontend ne peut pas s’exécuter."
}

function Get-EnvMap {
    $values = @{}
    if (-not (Test-Path $EnvFile -PathType Leaf)) {
        return $values
    }

    foreach ($line in [System.IO.File]::ReadAllLines($EnvFile)) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $key = $matches[1]
            $value = $matches[2].Trim()
            if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
                $value = $value.Replace('\"', '"').Replace('\\', '\')
            } elseif ($value.Length -ge 2 -and $value.StartsWith("'") -and $value.EndsWith("'")) {
                $value = $value.Substring(1, $value.Length - 2)
            } else {
                $value = ($value -split '\s+#', 2)[0].Trim()
            }
            $values[$key] = $value
        }
    }
    return $values
}

function Get-EnvValue([hashtable]$Values, [string]$Key, [string]$Default = "") {
    if ($Values.ContainsKey($Key)) {
        return [string]$Values[$Key]
    }
    return $Default
}

function Protect-PrivateFile([string]$Path) {
    $acl = Get-Acl $Path
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($rule in @($acl.Access)) {
        [void]$acl.RemoveAccessRule($rule)
    }
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $identity,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.Security.AccessControl.AccessControlType]::Allow
    )
    [void]$acl.AddAccessRule($accessRule)
    Set-Acl -Path $Path -AclObject $acl
}

function Get-FolderSize([string]$Path) {
    if (-not (Test-Path $Path -PathType Container)) {
        return [int64]0
    }
    $total = [int64]0
    foreach ($file in @(Get-ChildItem -LiteralPath $Path -File -Recurse -ErrorAction SilentlyContinue)) {
        $total += [int64]$file.Length
    }
    return $total
}

function Get-DatabaseConfig {
    $values = Get-EnvMap
    $connection = Get-EnvValue $values "DB_CONNECTION"
    if ($connection -ne "pgsql") {
        Fail "La sauvegarde automatique exige DB_CONNECTION=pgsql ; valeur actuelle : $connection."
    }

    $required = @("DB_HOST", "DB_PORT", "DB_DATABASE", "DB_USERNAME", "DB_PASSWORD")
    foreach ($key in $required) {
        if ([string]::IsNullOrWhiteSpace((Get-EnvValue $values $key))) {
            Fail "$key est absent du fichier .env ; la sauvegarde est arrêtée."
        }
    }

    return @{
        Host = Get-EnvValue $values "DB_HOST"
        Port = Get-EnvValue $values "DB_PORT"
        Database = Get-EnvValue $values "DB_DATABASE"
        Username = Get-EnvValue $values "DB_USERNAME"
        Password = Get-EnvValue $values "DB_PASSWORD"
    }
}

function Escape-PgPass([string]$Value) {
    return $Value.Replace('\', '\\').Replace(':', '\:')
}

function New-MaximusBackup {
    if (-not (Test-Path $EnvFile -PathType Leaf)) {
        Fail "Fichier .env absent : aucune installation dédiée initialisée."
    }

    $pgDump = Get-CommandPath @("pg_dump.exe", "pg_dump")
    if (-not $pgDump) {
        Fail "pg_dump est introuvable. Installez le client PostgreSQL avant de sauvegarder."
    }
    $pgRestore = Get-CommandPath @("pg_restore.exe", "pg_restore")
    if (-not $pgRestore) {
        Fail "pg_restore est introuvable. La sauvegarde ne peut pas être validée."
    }

    $db = Get-DatabaseConfig
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = Join-Path $BackupRoot "backup-$timestamp"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    try {
        Write-Step "Vérification de l’espace disponible"
        $drive = Get-PSDrive -Name ([System.IO.Path]::GetPathRoot($backupDir).TrimEnd('\').TrimEnd(':')) -ErrorAction SilentlyContinue
        $estimatedFiles = Get-FolderSize (Join-Path $LaravelDir "storage/app/digital-products")
        if ($drive -and $drive.Free -lt [Math]::Max(100MB, $estimatedFiles + 100MB)) {
            Fail "Espace disque insuffisant pour la sauvegarde."
        }

        Write-Step "Copie sécurisée de la configuration locale"
        $envBackup = Join-Path $backupDir ".env"
        Copy-Item -LiteralPath $EnvFile -Destination $envBackup -Force
        Protect-PrivateFile $envBackup

        $buildFile = Join-Path $LaravelDir "MAXIMUS_BUILD_VERSION"
        if (Test-Path $buildFile -PathType Leaf) {
            Copy-Item -LiteralPath $buildFile -Destination (Join-Path $backupDir "MAXIMUS_BUILD_VERSION") -Force
        }

        Write-Step "Sauvegarde de PostgreSQL"
        $dumpFile = Join-Path $backupDir "database.dump"
        $passFile = Join-Path $backupDir ".pgpass"
        $passLine = "{0}:{1}:{2}:{3}:{4}" -f `
            (Escape-PgPass $db.Host),
            (Escape-PgPass $db.Port),
            (Escape-PgPass $db.Database),
            (Escape-PgPass $db.Username),
            (Escape-PgPass $db.Password)
        [System.IO.File]::WriteAllText($passFile, $passLine + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
        Protect-PrivateFile $passFile
        $previousPassFile = $env:PGPASSFILE
        try {
            $env:PGPASSFILE = $passFile
            Invoke-NativeChecked $pgDump @(
                "--format=custom",
                "--file=$dumpFile",
                "--host=$($db.Host)",
                "--port=$($db.Port)",
                "--username=$($db.Username)",
                "--dbname=$($db.Database)",
                "--no-password"
            )
        } finally {
            if ($null -eq $previousPassFile) {
                Remove-Item Env:PGPASSFILE -ErrorAction SilentlyContinue
            } else {
                $env:PGPASSFILE = $previousPassFile
            }
            Remove-Item -LiteralPath $passFile -Force -ErrorAction SilentlyContinue
        }
        if (-not (Test-Path $dumpFile -PathType Leaf) -or (Get-Item $dumpFile).Length -le 0) {
            Fail "pg_dump n’a pas produit une sauvegarde exploitable."
        }
        $null = & $pgRestore "--list" $dumpFile 2>$null
        if ($LASTEXITCODE -ne 0) {
            Fail "pg_restore ne peut pas lire la sauvegarde PostgreSQL produite."
        }

        $digitalProducts = Join-Path $LaravelDir "storage/app/digital-products"
        if (Test-Path $digitalProducts -PathType Container) {
            Write-Step "Copie des fichiers persistants"
            Copy-Item -LiteralPath $digitalProducts -Destination (Join-Path $backupDir "digital-products") -Recurse -Force
        }

        $manifest = [ordered]@{
            createdAt = (Get-Date).ToUniversalTime().ToString("o")
            workspace = $WorkspaceDir
            databaseDump = "database.dump"
            environmentFile = ".env"
            digitalProducts = (Test-Path (Join-Path $backupDir "digital-products") -PathType Container)
        }
        $manifestPath = Join-Path $backupDir "manifest.json"
        $manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8
        Protect-PrivateFile $manifestPath
        Write-Host "Sauvegarde validée : $backupDir"
        return $backupDir
    } catch {
        Write-Warning "La sauvegarde a échoué. Le dossier incomplet est conservé pour inspection : $backupDir"
        throw
    }
}

function Confirm-RiskyAction([string]$Action) {
    if ($Approve) {
        return
    }
    if ($NonInteractive) {
        Fail "L’action « $Action » exige -Approve en mode non interactif."
    }
    $answer = Read-Host "Confirmer « $Action » ? (oui/non)"
    if ($answer -notmatch '^(oui|o|yes|y)$') {
        Fail "Opération annulée."
    }
}

function Get-GitState {
    $git = Get-CommandPath @("git.exe", "git")
    if (-not $git) {
        Fail "Git est introuvable."
    }
    $isWorkTree = (& $git -C $WorkspaceDir rev-parse --is-inside-work-tree | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $isWorkTree -ne "true") {
        Fail "Le workspace n’est pas un dépôt Git valide."
    }
    $branch = (& $git -C $WorkspaceDir branch --show-current | Out-String).Trim()
    $head = (& $git -C $WorkspaceDir rev-parse HEAD | Out-String).Trim()
    $status = (& $git -C $WorkspaceDir status --porcelain --untracked-files=all | Out-String).Trim()
    return @{ Git = $git; Branch = $branch; Head = $head; Status = $status }
}

function Invoke-CheckUpdate {
    Write-Step "Détection de l’installation et de la version"
    $state = Get-GitState
    if ($state.Branch -ne $Branch) {
        Write-Warning "Branche locale : $($state.Branch) ; branche attendue : $Branch"
    }
    if ($state.Status) {
        Write-Warning "Le workspace contient des changements locaux. Aucune mise à jour ne doit être lancée."
    }

    Invoke-NativeChecked $state.Git @("-C", $WorkspaceDir, "fetch", "origin", $Branch, "--prune")
    $target = (& $state.Git -C $WorkspaceDir rev-parse "origin/$Branch" | Out-String).Trim()
    $health = Invoke-RestMethod -Uri "$($CentralUrl.TrimEnd('/'))/api/healthz" -TimeoutSec 20
    $remoteVersion = [string]$health.applicationVersion
    if ([string]::IsNullOrWhiteSpace($remoteVersion) -or $remoteVersion -eq "unknown") {
        Fail "MAXIMUS central ne publie pas une version exploitable."
    }

    Write-Host "Version locale   : $($state.Head)"
    Write-Host "Version GitHub   : $target"
    Write-Host "Version centrale : $remoteVersion"
    if ($state.Head -eq $target -and $target -eq $remoteVersion) {
        Write-Host "Statut : aucune mise à jour nécessaire."
    } elseif ($target -eq $remoteVersion -and -not $state.Status) {
        Write-Host "Statut : mise à jour disponible."
    } else {
        Write-Warning "Statut : prérequis non satisfaits ou versions non alignées."
    }
}

function Invoke-HealthCheck {
    Write-Step "Vérification de l’installation"
    $checks = [ordered]@{}
    $checks["Laravel"] = Test-Path $LaravelDir -PathType Container
    $checks["Artisan"] = Test-Path (Join-Path $LaravelDir "artisan") -PathType Leaf
    $checks["Frontend compilé"] = Test-Path (Join-Path $LaravelDir "public/index.html") -PathType Leaf
    $checks["Configuration locale"] = Test-Path $EnvFile -PathType Leaf
    $checks["Vendor Laravel"] = Test-Path (Join-Path $LaravelDir "vendor/autoload.php") -PathType Leaf
    foreach ($item in $checks.GetEnumerator()) {
        Write-Host ("{0,-24} {1}" -f $item.Key, ($(if ($item.Value) { "OK" } else { "ABSENT" })))
    }

    $php = Get-CommandPath @("php.exe", "php")
    if ($php -and $checks["Artisan"]) {
        $null = & $php (Join-Path $LaravelDir "artisan") "migrate:status" "--no-interaction" 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "La vérification PostgreSQL/Laravel a échoué."
        } else {
            Write-Host ("{0,-24} {1}" -f "Base et migrations", "OK")
        }
    } else {
        Write-Warning "PHP ou Artisan est absent : vérification de la base ignorée."
    }

    $values = Get-EnvMap
    $appUrl = Get-EnvValue $values "APP_URL" "http://127.0.0.1:8080"
    try {
        $response = Invoke-WebRequest -Uri "$($appUrl.TrimEnd('/'))/api/healthz" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host ("{0,-24} {1}" -f "API /api/healthz", "OK")
        } else {
            Write-Warning "API /api/healthz : HTTP $($response.StatusCode)"
        }
    } catch {
        Write-Warning "API inaccessible à $appUrl ; le serveur est peut-être arrêté."
    }
}

function Invoke-Repair {
    Confirm-RiskyAction "réparer les dépendances et reconstruire le frontend sans migration"
    $state = Get-GitState
    if ($state.Status) {
        Fail "La réparation exige un workspace Git propre afin de ne pas écraser des changements locaux."
    }
    $php = Get-CommandPath @("php.exe", "php")
    $composer = Get-CommandPath @("composer.bat", "composer")
    $corepack = Get-CommandPath @("corepack.cmd", "corepack")
    if (-not $php -or -not $composer -or -not $corepack) {
        Fail "PHP, Composer et Corepack doivent être installés avant une réparation."
    }
    if (-not $SkipBuild) {
        Ensure-UnixShellForNodeScripts
    }

    if (-not $SkipComposer) {
        Write-Step "Réinstallation contrôlée des dépendances Laravel"
        Invoke-NativeChecked $composer @("install", "--no-dev", "--no-interaction", "--no-progress", "--prefer-dist", "--optimize-autoloader")
    }
    if (-not $SkipBuild) {
        Write-Step "Reconstruction contrôlée du frontend"
        Push-Location $WorkspaceDir
        try {
            Invoke-NativeChecked $corepack @("pnpm", "install", "--frozen-lockfile")
            $env:PORT = "10000"
            $env:BASE_PATH = "/"
            $env:NODE_ENV = "production"
            Invoke-NativeChecked $corepack @("pnpm", "--filter", "@workspace/maximus", "run", "build")
            $distPublic = Join-Path $FrontendDir "dist/public"
            if (-not (Test-Path $distPublic -PathType Container)) {
                Fail "Le build frontend n’a pas produit dist/public."
            }
            Copy-Item -Path (Join-Path $distPublic "*") -Destination (Join-Path $LaravelDir "public") -Recurse -Force
        } finally {
            Pop-Location
        }
    }
    Write-Host "Réparation terminée sans migration ni modification de la base."
}

function Invoke-Install {
    Confirm-RiskyAction "installer ou initialiser MAXIMUS"
    $bash = Get-CommandPath @("bash.exe", "bash")
    $installScript = Join-Path $WorkspaceDir "scripts/install-maximus-instance.sh"
    if (-not $bash -or -not (Test-Path $installScript -PathType Leaf)) {
        Fail "Bash et scripts/install-maximus-instance.sh sont requis."
    }
    $arguments = @(
        (Convert-ToBashPath $installScript),
        "--workspace-dir",
        (Convert-ToBashPath $WorkspaceDir)
    )
    if (-not [string]::IsNullOrWhiteSpace($BootstrapFile)) {
        $arguments += @("--bootstrap-file", (Convert-ToBashPath $BootstrapFile))
    } elseif ($NonInteractive) {
        Fail "-BootstrapFile est obligatoire en mode non interactif."
    }
    if ($NonInteractive) {
        $arguments += "--non-interactive"
    }
    Invoke-NativeChecked $bash $arguments
}

function Invoke-Update {
    Confirm-RiskyAction "sauvegarder puis mettre à jour MAXIMUS"
    Ensure-UnixShellForNodeScripts
    $backupDir = New-MaximusBackup
    $updateScript = Join-Path $WorkspaceDir "scripts/update-maximus-instance.ps1"
    if (-not (Test-Path $updateScript -PathType Leaf)) {
        Fail "Script de mise à jour introuvable."
    }

    Write-Step "Mise à jour MAXIMUS après sauvegarde validée"
    $arguments = @("-WorkspaceDir", $WorkspaceDir, "-Branch", $Branch, "-CentralUrl", $CentralUrl)
    if ($SkipComposer) { $arguments += "-SkipComposer" }
    if ($SkipBuild) { $arguments += "-SkipBuild" }
    if ($SkipHealthcheck) { $arguments += "-SkipHealthcheck" }
    & $updateScript @arguments
    if ($LASTEXITCODE -ne 0) {
        Fail "La mise à jour a échoué. La sauvegarde reste disponible : $backupDir"
    }
    Write-Host "Mise à jour terminée. Sauvegarde conservée : $backupDir"
}

function Get-AppPort {
    $values = Get-EnvMap
    $uri = $null
    [Uri]::TryCreate((Get-EnvValue $values "APP_URL" "http://127.0.0.1:8080"), [UriKind]::Absolute, [ref]$uri) | Out-Null
    if ($uri -and $uri.Port -gt 0) {
        return $uri.Port
    }
    return 8080
}

function Invoke-Start {
    $php = Get-CommandPath @("php.exe", "php")
    if (-not $php) {
        Fail "PHP est introuvable."
    }
    $port = Get-AppPort
    $existing = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
    if ($existing.Count -gt 0) {
        Fail "Le port $port est déjà utilisé. Aucun second serveur ne sera lancé."
    }

    New-Item -ItemType Directory -Path $ManagerStateDir -Force | Out-Null
    $logDir = Join-Path $LaravelDir "storage/logs"
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $stdout = Join-Path $logDir "manager-server.out.log"
    $stderr = Join-Path $logDir "manager-server.err.log"
    $process = Start-Process -FilePath $php `
        -ArgumentList @("-S", "127.0.0.1:$port", "server.php") `
        -WorkingDirectory $LaravelDir `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -PassThru `
        -WindowStyle Hidden
    @{ pid = $process.Id; startedAt = (Get-Date).ToUniversalTime().ToString("o"); port = $port } |
        ConvertTo-Json | Set-Content -LiteralPath $ServerStateFile -Encoding UTF8
    Write-Host "MAXIMUS démarré sur http://127.0.0.1:$port (PID $($process.Id))."
}

function Invoke-Stop {
    if (-not (Test-Path $ServerStateFile -PathType Leaf)) {
        Write-Host "Aucun serveur géré par MaximusManager n’est enregistré."
        return
    }
    $state = Get-Content -LiteralPath $ServerStateFile -Raw | ConvertFrom-Json
    $process = Get-Process -Id ([int]$state.pid) -ErrorAction SilentlyContinue
    if (-not $process) {
        Remove-Item -LiteralPath $ServerStateFile -Force
        Write-Host "Le processus enregistré n’existe plus."
        return
    }
    $startedAt = [DateTime]::Parse($state.startedAt).ToUniversalTime()
    if ([Math]::Abs(($process.StartTime.ToUniversalTime() - $startedAt).TotalSeconds) -gt 5) {
        Fail "Le PID enregistré a été réutilisé par un autre processus. Aucun arrêt effectué."
    }
    Confirm-RiskyAction "arrêter MAXIMUS sur le port $($state.port)"
    Stop-Process -Id $process.Id -Force
    Remove-Item -LiteralPath $ServerStateFile -Force
    Write-Host "MAXIMUS arrêté."
}

function Invoke-Logs {
    $logDir = Join-Path $LaravelDir "storage/logs"
    if (-not (Test-Path $logDir -PathType Container)) {
        Write-Host "Aucun journal local trouvé."
        return
    }
    foreach ($file in @(Get-ChildItem -LiteralPath $logDir -File | Sort-Object LastWriteTime | Select-Object -Last 3)) {
        Write-Host "`n--- $($file.Name) ---"
        foreach ($line in @(Get-Content -LiteralPath $file.FullName -Tail 80)) {
            $safeLine = $line -replace '(?i)(password|token|secret|api[_-]?key|authorization)\s*([=:])\s*[^\s,;]+', '$1$2[REDACTED]'
            Write-Host $safeLine
        }
    }
}

function Show-Menu {
    if ($NonInteractive) {
        Fail "Une opération doit être indiquée en mode non interactif."
    }
    Write-Host @"

MAXIMUS MANAGER
---------------
[1] Installer MAXIMUS
[2] Vérifier les mises à jour
[3] Mettre à jour MAXIMUS
[4] Sauvegarder la base
[5] Vérifier l’installation
[6] Réparer les dépendances et le frontend
[7] Démarrer MAXIMUS
[8] Arrêter MAXIMUS
[9] Afficher les journaux
[0] Quitter
"@
    switch (Read-Host "Choix") {
        "1" { Invoke-Install }
        "2" { Invoke-CheckUpdate }
        "3" { Invoke-Update }
        "4" { [void](New-MaximusBackup) }
        "5" { Invoke-HealthCheck }
        "6" { Invoke-Repair }
        "7" { Invoke-Start }
        "8" { Invoke-Stop }
        "9" { Invoke-Logs }
        "0" { return }
        default { Fail "Choix invalide." }
    }
}

try {
    $requested = @($Install, $CheckUpdate, $Update, $Backup, $HealthCheck, $Repair, $Start, $Stop, $Logs) |
        Where-Object { $_ } |
        Measure-Object |
        Select-Object -ExpandProperty Count
    if ($requested -gt 1) {
        Fail "Indiquez une seule opération à la fois."
    }

    if ($requested -eq 0) {
        Show-Menu
    } elseif ($Install) {
        Invoke-Install
    } elseif ($CheckUpdate) {
        Invoke-CheckUpdate
    } elseif ($Update) {
        Invoke-Update
    } elseif ($Backup) {
        [void](New-MaximusBackup)
    } elseif ($HealthCheck) {
        Invoke-HealthCheck
    } elseif ($Repair) {
        Invoke-Repair
    } elseif ($Start) {
        Invoke-Start
    } elseif ($Stop) {
        Invoke-Stop
    } elseif ($Logs) {
        Invoke-Logs
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}