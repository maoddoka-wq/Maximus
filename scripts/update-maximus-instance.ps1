[CmdletBinding()]
param(
    [string]$WorkspaceDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$Branch = "main",
    [string]$CentralUrl = "https://maximus-erp.onrender.com",
    [switch]$SkipComposer,
    [switch]$SkipBuild,
    [switch]$SkipHealthcheck
)

$ErrorActionPreference = "Stop"

$LaravelDir = Join-Path $WorkspaceDir "artifacts/api-server/laravel"
$FrontendDir = Join-Path $WorkspaceDir "artifacts/maximus"
$EnvFile = Join-Path $LaravelDir ".env"

function Fail([string]$Message) {
    throw "Mise à jour MAXIMUS interrompue : $Message"
}

function Invoke-CommandChecked([string]$File, [string[]]$Arguments) {
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        Fail "La commande $File a échoué avec le code $LASTEXITCODE."
    }
}

function Get-CommandOutput([string]$File, [string[]]$Arguments) {
    $output = & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        Fail "La commande $File a échoué avec le code $LASTEXITCODE."
    }
    return ($output -join "`n").Trim()
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

    Fail "Git for Windows est installé mais sh.exe est introuvable. Le script preinstall du frontend ne peut pas s’exécuter."
}

function Set-EnvValue([string]$Key, [string]$Value) {
    $escaped = $Value.Replace("\", "\\").Replace('"', '\"')
    $line = "$Key=`"$escaped`""
    if (Test-Path $EnvFile) {
        $content = [System.IO.File]::ReadAllText($EnvFile)
        $pattern = "(?m)^" + [regex]::Escape($Key) + "=.*$"
        if ([regex]::IsMatch($content, $pattern)) {
            $content = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $line })
        } else {
            $content = $content.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
        }
    } else {
        $content = $line + [Environment]::NewLine
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($EnvFile, $content, $encoding)
}

if (-not (Test-Path $LaravelDir)) { Fail "Dossier Laravel introuvable : $LaravelDir" }
if (-not (Test-Path $FrontendDir)) { Fail "Dossier frontend introuvable : $FrontendDir" }
if (-not (Test-Path $EnvFile)) { Fail "Cette installation n’est pas initialisée : .env introuvable." }

$git = (Get-Command git -ErrorAction Stop).Source
$php = (Get-Command php -ErrorAction Stop).Source
$curl = (Get-Command curl.exe -ErrorAction Stop).Source
if (-not $SkipComposer) { $composer = (Get-Command composer -ErrorAction Stop).Source }
if (-not $SkipBuild) { $corepack = (Get-Command corepack -ErrorAction Stop).Source }
if (-not $SkipBuild) { Ensure-UnixShellForNodeScripts }

try {
    $isWorkTree = Get-CommandOutput $git @("-C", $WorkspaceDir, "rev-parse", "--is-inside-work-tree")
} catch {
    Fail "Le workspace local doit être un clone Git. Pour une première installation, utilisez git clone."
}
if ($isWorkTree -ne "true") { Fail "Le workspace local n’est pas un dépôt Git." }

$currentBranch = Get-CommandOutput $git @("-C", $WorkspaceDir, "branch", "--show-current")
if ($currentBranch -ne $Branch) {
    Fail "La branche locale est « $currentBranch », la branche attendue est « $Branch »."
}
    $statusLines = @(& $git -C $WorkspaceDir status --porcelain --untracked-files=all)
    $status = ($statusLines |
        Where-Object {
            $_ -notmatch '^\?\? maximus-sauvegardes([/\\]|$)' -and
            $_ -notmatch '^\?\? scripts[/\\]MaximusManager\.ps1$'
        } |
        Out-String).Trim()
if ($status) {
    Fail "Le workspace contient des changements locaux. Sauvegardez-les ou annulez-les avant la mise à jour."
}

Write-Host "`n==> Vérification de la version GitHub et de la version Render"
Invoke-CommandChecked $git @("-C", $WorkspaceDir, "fetch", "origin", $Branch, "--prune")
$targetVersion = Get-CommandOutput $git @("-C", $WorkspaceDir, "rev-parse", "origin/$Branch")
$health = Invoke-RestMethod -Uri "$($CentralUrl.TrimEnd('/'))/api/healthz" -TimeoutSec 20
$remoteVersion = [string]$health.applicationVersion
if ([string]::IsNullOrWhiteSpace($remoteVersion) -or $remoteVersion -eq "unknown") {
    Fail "Render ne publie pas applicationVersion. La mise à jour est bloquée."
}
if ($targetVersion -ne $remoteVersion) {
    Fail "GitHub ($targetVersion) et Render ($remoteVersion) ne servent pas le même commit."
}

& $git -C $WorkspaceDir merge-base --is-ancestor HEAD $targetVersion
if ($LASTEXITCODE -ne 0) {
    Fail "L’historique local diverge de GitHub. La mise à jour automatique refuse d’écraser cette copie."
}

$localVersion = Get-CommandOutput $git @("-C", $WorkspaceDir, "rev-parse", "HEAD")
if ($localVersion -ne $targetVersion) {
    Write-Host "`n==> Mise à jour du code depuis GitHub"
    Invoke-CommandChecked $git @("-C", $WorkspaceDir, "merge", "--ff-only", $targetVersion)
} else {
    Write-Host "Le code local est déjà sur le commit Render."
}

[System.IO.File]::WriteAllText(
    (Join-Path $LaravelDir "MAXIMUS_BUILD_VERSION"),
    "$targetVersion`n",
    (New-Object System.Text.UTF8Encoding($false))
)
Set-EnvValue "MAXIMUS_EXPECTED_APPLICATION_VERSION" $targetVersion

if (-not $SkipComposer) {
    Write-Host "`n==> Mise à jour des dépendances Laravel"
    Push-Location $LaravelDir
    try {
        Invoke-CommandChecked $composer @("install", "--no-dev", "--no-interaction", "--no-progress", "--prefer-dist", "--optimize-autoloader")
    } finally {
        Pop-Location
    }
}

if (-not $SkipBuild) {
    Write-Host "`n==> Construction du frontend MAXIMUS"
    Push-Location $WorkspaceDir
    try {
        Invoke-CommandChecked $corepack @("pnpm", "install", "--frozen-lockfile")
        $env:PORT = "10000"
        $env:BASE_PATH = "/"
        $env:NODE_ENV = "production"
        Invoke-CommandChecked $corepack @("pnpm", "--filter", "@workspace/maximus", "run", "build")
    } finally {
        Pop-Location
    }
    $distPublic = Join-Path $FrontendDir "dist/public"
    if (-not (Test-Path $distPublic)) { Fail "Le build frontend n’a pas produit dist/public." }
    Copy-Item -Path (Join-Path $distPublic "*") -Destination (Join-Path $LaravelDir "public") -Recurse -Force
}

Write-Host "`n==> Migration et synchronisation de l’entreprise"
Push-Location $LaravelDir
try {
    Invoke-CommandChecked $php @("artisan", "config:clear", "--no-interaction")
    Invoke-CommandChecked $php @("artisan", "migrate", "--force", "--no-interaction")
    Invoke-CommandChecked $php @("artisan", "maximus:install-company", "--no-interaction")
} finally {
    Pop-Location
}

$syncScheduler = Join-Path $WorkspaceDir "scripts/register-maximus-sync.ps1"
if (Test-Path $syncScheduler -PathType Leaf) {
    Write-Host "`n==> Activation du scheduler de synchronisation centrale"
    & $syncScheduler -WorkspaceDir $WorkspaceDir
    if ($LASTEXITCODE -ne 0) { Fail "L’activation du scheduler de synchronisation a échoué." }
}

if (-not $SkipHealthcheck) {
    Write-Host "`n==> Vérification locale"
    $port = Get-Random -Minimum 18080 -Maximum 19080
    $stdout = Join-Path $env:TEMP "maximus-health-$port.out.log"
    $stderr = Join-Path $env:TEMP "maximus-health-$port.err.log"
    $process = Start-Process -FilePath $php -ArgumentList @("-S", "127.0.0.1:$port", "server.php") -WorkingDirectory $LaravelDir -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden
    $healthOk = $false
    try {
        for ($attempt = 0; $attempt -lt 15; $attempt++) {
            Start-Sleep -Seconds 1
            try {
                $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/healthz" -TimeoutSec 2 -UseBasicParsing
                if ($response.StatusCode -eq 200) {
                    $healthOk = $true
                    break
                }
            } catch {}
        }
    } finally {
        if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
        Remove-Item $stdout, $stderr -Force -ErrorAction SilentlyContinue
    }
    if (-not $healthOk) { Fail "La sonde de santé locale a échoué." }
}

Write-Host "`nMise à jour MAXIMUS terminée."
Write-Host "Version locale : $targetVersion"