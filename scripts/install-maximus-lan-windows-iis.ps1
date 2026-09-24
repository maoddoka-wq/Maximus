[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
    [Parameter(Mandatory = $true)][string]$WorkspaceDir,
    [Parameter(Mandatory = $true)][ipaddress]$LanIp,
    [Parameter(Mandatory = $true)][string]$LanCidr,
    [Parameter(Mandatory = $true)][string]$InternalHostname,
    [Parameter(Mandatory = $true)][string]$CertificateThumbprint,
    [Parameter(Mandatory = $true)][string]$PhpCgiPath,
    [Parameter(Mandatory = $true)][ValidateRange(1, 512)][int]$PhpWorkerCount,
    [Parameter(Mandatory = $true)][ValidateRange(64, 4096)][int]$PerWorkerMemoryCapMb,
    [Parameter(Mandatory = $true)][ValidateRange(256, 1048576)][int]$SystemReserveMb,
    [Parameter(Mandatory = $true)][ValidateRange(256, 1048576)][int]$DbReserveMb,
    [Parameter(Mandatory = $true)][ValidateRange(1, 10000)][int]$DbConnectionReserve,
    [Parameter(Mandatory = $true)][ValidateRange(1, 512)][int]$RequestBodyLimitMb
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Stop-Install([string]$Message) {
    throw "Installation IIS MAXIMUS interrompue : $Message"
}

function Require-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Stop-Install 'PowerShell doit être exécuté en tant qu’administrateur.'
    }
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Stop-Install "Commande requise absente : $Name. Installez le prérequis indiqué puis relancez."
    }
}

function Backup-IfPresent([string]$Path) {
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $backup = "$Path.maximus-backup-$stamp"
        Copy-Item -LiteralPath $Path -Destination $backup -Force
        Write-Host "Sauvegarde créée : $backup"
    }
}

function Test-Cidr([string]$Cidr, [ipaddress]$Address) {
    $parts = $Cidr.Split('/', 2)
    $network = $null
    $prefix = 0
    if ($parts.Count -ne 2 -or -not [ipaddress]::TryParse($parts[0], [ref]$network) -or
        -not [int]::TryParse($parts[1], [ref]$prefix) -or $prefix -lt 0 -or $prefix -gt 32) {
        Stop-Install "LAN CIDR invalide : $Cidr (exemple attendu : 192.168.10.0/24)."
    }
    if ($network.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork -or
        $Address.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
        Stop-Install 'LanIp et LanCidr doivent utiliser IPv4.'
    }

    $networkBytes = $network.GetAddressBytes()
    $addressBytes = $Address.GetAddressBytes()
    for ($index = 0; $index -lt 4; $index++) {
        $bits = [math]::Min(8, [math]::Max(0, $prefix - ($index * 8)))
        $mask = if ($bits -eq 0) { 0 } elseif ($bits -eq 8) { 255 } else { [int](256 - [math]::Pow(2, 8 - $bits)) }
        if (($networkBytes[$index] -band $mask) -ne $networkBytes[$index]) {
            Stop-Install "Le réseau CIDR $Cidr contient des bits hôte; indiquez l’adresse réseau normalisée."
        }
        if (($networkBytes[$index] -band $mask) -ne ($addressBytes[$index] -band $mask)) {
            Stop-Install "L’adresse LAN $Address n’appartient pas au CIDR $Cidr."
        }
    }
}

function Test-CertificateHostname([string]$Pattern, [string]$Hostname) {
    if ($Pattern -ieq $Hostname) { return $true }
    if (-not $Pattern.StartsWith('*.')) { return $false }

    $suffix = $Pattern.Substring(1)
    $hostLabels = $Hostname.Split('.')
    $patternLabels = $Pattern.Split('.')
    return $hostLabels.Count -eq ($patternLabels.Count) -and $Hostname.EndsWith($suffix, [StringComparison]::OrdinalIgnoreCase)
}

Require-Administrator
if (-not [Environment]::Is64BitOperatingSystem -or -not [Environment]::Is64BitProcess) {
    Stop-Install 'Exécutez ce script dans PowerShell 64 bits sur Windows Server 2019 ou plus récent.'
}
Test-Cidr $LanCidr $LanIp
if ([string]::IsNullOrWhiteSpace($InternalHostname) -or $InternalHostname -notmatch '^(?=.{1,253}$)(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$') {
    Stop-Install 'InternalHostname doit être un nom DNS interne valide.'
}
if ($LanIp.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
    Stop-Install 'LanIp doit être une adresse IPv4 de l’interface LAN.'
}
if (-not (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop | Where-Object { $_.IPAddress -eq $LanIp.IPAddressToString })) {
    Stop-Install "L’adresse $LanIp n’est pas configurée sur une interface locale."
}
$resolvedAddresses = @([Net.Dns]::GetHostAddresses($InternalHostname) | ForEach-Object { $_.IPAddressToString })
if ($resolvedAddresses -notcontains $LanIp.IPAddressToString) {
    Stop-Install "Le DNS interne de $InternalHostname doit pointer vers $LanIp."
}
$CertificateThumbprint = ($CertificateThumbprint -replace '\s', '').ToUpperInvariant()
if ($CertificateThumbprint -notmatch '^[0-9A-F]{40}$') {
    Stop-Install 'CertificateThumbprint doit contenir l’empreinte SHA-1 de 40 caractères.'
}

$workspace = (Resolve-Path -LiteralPath $WorkspaceDir -ErrorAction Stop).Path
$laravel = Join-Path $workspace 'artifacts/api-server/laravel'
$public = Join-Path $laravel 'public'
$envFile = Join-Path $laravel '.env'
foreach ($required in @($laravel, $public, (Join-Path $public 'index.php'), (Join-Path $public 'index.html'), $envFile, (Join-Path $laravel 'artisan'), (Join-Path $laravel 'vendor/autoload.php'))) {
    if (-not (Test-Path -LiteralPath $required)) {
        Stop-Install "Fichier ou dossier MAXIMUS requis absent : $required"
    }
}

$os = Get-CimInstance Win32_OperatingSystem
if ([Environment]::OSVersion.Version.Major -lt 10 -or [Environment]::OSVersion.Version.Build -lt 17763) {
    Stop-Install 'Windows Server 2019 ou plus récent est requis pour cette installation IIS.'
}
if ($os.ProductType -notin @(2, 3)) {
    Stop-Install 'Ce programme cible Windows Server, pas une édition cliente de Windows.'
}
Import-Module ServerManager -ErrorAction Stop
foreach ($feature in @('Web-Server', 'Web-CGI', 'Web-Url-Auth')) {
    $installed = Get-WindowsFeature -Name $feature -ErrorAction Stop
    if (-not $installed.Installed) {
        Stop-Install "Rôle IIS requis absent : $feature. Le script n’installe aucun package."
    }
}
Require-Command 'curl.exe'
$appcmd = Join-Path $env:WINDIR 'System32\inetsrv\appcmd.exe'
if (-not (Test-Path -LiteralPath $appcmd -PathType Leaf)) {
    Stop-Install "IIS appcmd.exe est absent : $appcmd"
}
if (-not (Get-Module -ListAvailable -Name WebAdministration)) {
    Stop-Install 'Le module IIS WebAdministration est absent.'
}
Import-Module WebAdministration -ErrorAction Stop
if (-not (Get-WebGlobalModule -Name RewriteModule -ErrorAction SilentlyContinue)) {
    Stop-Install 'IIS URL Rewrite est requis et doit être installé avant MAXIMUS.'
}
if (-not (Test-Path -LiteralPath $PhpCgiPath -PathType Leaf) -or
    [IO.Path]::GetFileName($PhpCgiPath) -ine 'php-cgi.exe') {
    Stop-Install 'PhpCgiPath doit pointer vers un php-cgi.exe PHP 8.2 NTS déjà installé.'
}
$PhpCgiPath = (Resolve-Path -LiteralPath $PhpCgiPath).Path
if ($PhpCgiPath.Contains("'")) {
    Stop-Install 'Le chemin de php-cgi.exe ne peut pas contenir une apostrophe pour la configuration IIS FastCGI.'
}
$phpCliPath = Join-Path (Split-Path -Parent $PhpCgiPath) 'php.exe'
if (-not (Test-Path -LiteralPath $phpCliPath -PathType Leaf)) {
    Stop-Install "php.exe du même runtime PHP 8.2 est introuvable : $phpCliPath"
}
$phpVersion = (& $phpCliPath -r 'echo PHP_VERSION;').Trim()
if ($LASTEXITCODE -ne 0 -or $phpVersion -notmatch '^8\.2\.\d+$') {
    Stop-Install "PHP 8.2 NTS CGI-FCGI attendu ; résultat détecté : $phpVersion"
}
$phpCgiVersion = (& $PhpCgiPath -v | Out-String)
if ($LASTEXITCODE -ne 0 -or $phpCgiVersion -notmatch '(?im)^PHP 8\.2\.\d+ \(cgi-fcgi\).*\bNTS\b') {
    Stop-Install "PHP-CGI 8.2 NTS attendu ; résultat détecté : $phpCgiVersion"
}
$phpInfo = (& $phpCliPath -i | Out-String)
if ($LASTEXITCODE -ne 0 -or $phpInfo -notmatch '(?im)^Thread Safety\s*=>\s*disabled\s*$') {
    Stop-Install 'Le runtime PHP doit être NTS (Thread Safety disabled) pour IIS FastCGI.'
}
$phpModules = (& $phpCliPath -m | Out-String)
foreach ($extension in @('PDO', 'pdo_pgsql', 'mbstring', 'fileinfo', 'openssl')) {
    if ($phpModules -notmatch "(?im)^$([regex]::Escape($extension))$") {
        Stop-Install "Extension PHP requise absente : $extension"
    }
}

$appPool = 'MAXIMUS-Entreprise-LAN'
$siteName = 'MAXIMUS-Entreprise-LAN'
$appUrl = "https://$InternalHostname"
$cert = Get-ChildItem "Cert:\LocalMachine\My\$CertificateThumbprint" -ErrorAction SilentlyContinue
if (-not $cert) { Stop-Install "Certificat introuvable dans LocalMachine\My : $CertificateThumbprint" }
if (-not $cert.HasPrivateKey) { Stop-Install 'Le certificat fourni ne possède pas de clé privée.' }
if ($cert.NotBefore -gt (Get-Date)) { Stop-Install "Le certificat n’est pas encore valide avant $($cert.NotBefore.ToString('s'))." }
if ($cert.NotAfter -le (Get-Date)) { Stop-Install "Le certificat est expiré depuis $($cert.NotAfter.ToString('s'))." }
$names = @($cert.DnsNameList | ForEach-Object { $_.Unicode })
if (-not ($names | Where-Object { Test-CertificateHostname -Pattern $_ -Hostname $InternalHostname })) {
    Stop-Install "Le certificat ne couvre pas le nom interne $InternalHostname."
}

$physical = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1MB)
$requiredMemory = $SystemReserveMb + $DbReserveMb + ($PhpWorkerCount * $PerWorkerMemoryCapMb)
if ($requiredMemory -gt $physical) {
    Stop-Install "Budget mémoire dépassé : ${requiredMemory}MB demandés, ${physical}MB disponibles."
}

if (-not $PSCmdlet.ShouldProcess("$appUrl, IIS et le pare-feu LAN", 'Configurer MAXIMUS en HTTPS')) {
    return
}
Push-Location $laravel
try {
    & $phpCliPath artisan config:clear --no-interaction
    if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible de recharger la configuration Laravel avant le précontrôle.' }
    & $phpCliPath artisan maximus:check-on-prem-capacity "--php-workers=$PhpWorkerCount" "--db-reserve=$DbConnectionReserve" "--url=$appUrl"
    if ($LASTEXITCODE -ne 0) { Stop-Install 'Le précontrôle de capacité MAXIMUS a échoué; IIS et le pare-feu n’ont pas été modifiés.' }
} finally { Pop-Location }

$webConfig = Join-Path $public 'web.config'
$userIni = Join-Path $public '.user.ini'
Backup-IfPresent $webConfig
Backup-IfPresent $userIni
$escapedPhpCgiPath = [System.Security.SecurityElement]::Escape((Resolve-Path -LiteralPath $PhpCgiPath).Path)

$webConfigXml = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <defaultDocument enabled="true">
      <files><clear /><add value="index.html" /></files>
    </defaultDocument>
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="$($RequestBodyLimitMb * 1048576)" />
        <fileExtensions allowUnlisted="true" />
        <hiddenSegments><add segment=".env" /><add segment=".user.ini" /><add segment=".git" /><add segment="vendor" /></hiddenSegments>
        <denyUrlSequences><add sequence="/." /></denyUrlSequences>
      </requestFiltering>
    </security>
    <rewrite><rules>
      <clear />
      <rule name="MAXIMUS deny direct PHP scripts" stopProcessing="true">
        <match url=".*\.php(?:/.*)?$" ignoreCase="true" />
        <conditions><add input="{URL}" pattern="^/index\.php$" negate="true" /></conditions>
        <action type="CustomResponse" statusCode="404" statusReason="Not Found" statusDescription="Not found" />
      </rule>
      <rule name="MAXIMUS API to Laravel" stopProcessing="true">
        <match url="^api.*$" />
        <serverVariables>
          <set name="HTTP_AUTHORIZATION" value="{HTTP_AUTHORIZATION}" />
          <set name="HTTP_X_XSRF_TOKEN" value="{HTTP_X_XSRF_TOKEN}" />
        </serverVariables>
        <action type="Rewrite" url="index.php" appendQueryString="true" />
      </rule>
      <rule name="MAXIMUS health route" stopProcessing="true">
        <match url="^up$" />
        <action type="Rewrite" url="index.php" appendQueryString="true" />
      </rule>
      <rule name="MAXIMUS client PWA entry" stopProcessing="true">
        <match url="^client-app/?$" />
        <action type="Rewrite" url="index.html" />
      </rule>
      <rule name="MAXIMUS missing static asset" stopProcessing="true">
        <match url=".*\.(?:js|mjs|css|json|webmanifest|svg|png|jpg|jpeg|webp|gif|ico|woff|woff2|ttf|wasm|txt)$" ignoreCase="true" />
        <conditions><add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" /></conditions>
        <action type="CustomResponse" statusCode="404" statusReason="Not Found" statusDescription="Static resource not found" />
      </rule>
      <rule name="MAXIMUS React SPA fallback" stopProcessing="true">
        <match url=".*" />
        <conditions logicalGrouping="MatchAll">
          <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
        </conditions>
        <action type="Rewrite" url="index.html" />
      </rule>
    </rules></rewrite>
    <handlers>
      <remove name="PHP_via_FastCGI" />
      <add name="MAXIMUS-PHP-CGI" path="index.php" verb="*" modules="FastCgiModule" scriptProcessor="$escapedPhpCgiPath" resourceType="File" requireAccess="Script" />
    </handlers>
    <directoryBrowse enabled="false" />
    <httpProtocol>
      <customHeaders>
        <remove name="X-Powered-By" />
        <remove name="Strict-Transport-Security" />
        <add name="Strict-Transport-Security" value="max-age=31536000" />
        <remove name="Content-Security-Policy" />
        <add name="Content-Security-Policy" value="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; manifest-src 'self'; worker-src 'self' blob:; frame-src 'none'; upgrade-insecure-requests" />
        <remove name="X-Content-Type-Options" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <remove name="X-Frame-Options" />
        <add name="X-Frame-Options" value="DENY" />
        <remove name="Referrer-Policy" />
        <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
"@
[xml]$validatedWebConfig = $webConfigXml
$userIniText = @"
; MAXIMUS LAN production limits. This file contains no credentials.
memory_limit = ${PerWorkerMemoryCapMb}M
upload_max_filesize = ${RequestBodyLimitMb}M
post_max_size = ${RequestBodyLimitMb}M
max_execution_time = 120
max_input_time = 120
expose_php = Off
session.cookie_secure = 1
session.cookie_httponly = 1
session.cookie_samesite = Lax
"@
Set-Content -LiteralPath $webConfig -Value $webConfigXml -Encoding UTF8 -Force
Set-Content -LiteralPath $userIni -Value $userIniText -Encoding ASCII -Force

$iisBackupName = 'MAXIMUS-LAN-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
& $appcmd add backup $iisBackupName | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible de sauvegarder la configuration IIS avant modification.' }

$allowedVariables = (& $appcmd list config /section:system.webServer/rewrite/allowedServerVariables 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible de lire la liste des variables IIS autorisées pour URL Rewrite.' }
foreach ($serverVariable in @('HTTP_AUTHORIZATION', 'HTTP_X_XSRF_TOKEN')) {
    if ($allowedVariables -notmatch [regex]::Escape($serverVariable)) {
        & $appcmd set config /section:system.webServer/rewrite/allowedServerVariables "/+[name='$serverVariable']" /commit:apphost
        if ($LASTEXITCODE -ne 0) { Stop-Install "Impossible d’autoriser la variable IIS $serverVariable." }
    }
}

$fastCgiConfiguration = (& $appcmd list config /section:system.webServer/fastCgi 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible de lire la configuration IIS FastCGI.' }
$fastCgiEntry = "[fullPath='$PhpCgiPath',arguments='']"
if ($fastCgiConfiguration.IndexOf($PhpCgiPath, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
    & $appcmd set config /section:system.webServer/fastCgi "/+$fastCgiEntry" /commit:apphost
    if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible d’enregistrer php-cgi.exe dans la configuration FastCGI IIS.' }
}
foreach ($fastCgiSetting in @(
    "maxInstances:$PhpWorkerCount",
    'activityTimeout:120',
    'requestTimeout:120',
    'instanceMaxRequests:500'
)) {
    & $appcmd set config /section:system.webServer/fastCgi "/${fastCgiEntry}.${fastCgiSetting}" /commit:apphost
    if ($LASTEXITCODE -ne 0) { Stop-Install "Impossible de régler FastCGI : $fastCgiSetting." }
}

if (-not (Get-WebAppPoolState -Name $appPool -ErrorAction SilentlyContinue)) {
    New-WebAppPool -Name $appPool
}
Set-ItemProperty "IIS:\AppPools\$appPool" -Name managedRuntimeVersion -Value ''
Set-ItemProperty "IIS:\AppPools\$appPool" -Name managedPipelineMode -Value 'Integrated'
Set-ItemProperty "IIS:\AppPools\$appPool" -Name processModel.identityType -Value 'ApplicationPoolIdentity'
Set-ItemProperty "IIS:\AppPools\$appPool" -Name queueLength -Value ([math]::Max(100, $PhpWorkerCount * 10))
Set-ItemProperty "IIS:\AppPools\$appPool" -Name startMode -Value 'AlwaysRunning'
Set-ItemProperty "IIS:\AppPools\$appPool" -Name processModel.idleTimeout -Value '00:00:00'
if (-not (Get-Website -Name $siteName -ErrorAction SilentlyContinue)) {
    New-Website -Name $siteName -PhysicalPath $public -ApplicationPool $appPool -IPAddress $LanIp.IPAddressToString -Port 443 -HostHeader $InternalHostname -Ssl
} else {
    Set-ItemProperty "IIS:\Sites\$siteName" -Name physicalPath -Value $public
    Set-ItemProperty "IIS:\Sites\$siteName" -Name applicationPool -Value $appPool
}
$bindingInformation = "$($LanIp.IPAddressToString):443:$InternalHostname"
$wildcardBindingInformation = "*:443:$InternalHostname"
$bindingsToReplace = @(Get-WebBinding -Name $siteName -Protocol https | Where-Object {
    $_.bindingInformation -eq $bindingInformation -or $_.bindingInformation -eq $wildcardBindingInformation
})
foreach ($existingBinding in $bindingsToReplace) {
    Remove-WebBinding -Name $siteName -Protocol https -BindingInformation $existingBinding.bindingInformation
}
New-WebBinding -Name $siteName -Protocol https -IPAddress $LanIp.IPAddressToString -Port 443 -HostHeader $InternalHostname -SslFlags 1
$binding = Get-WebBinding -Name $siteName -Protocol https | Where-Object { $_.bindingInformation -eq $bindingInformation }
if (-not $binding) { Stop-Install 'La liaison HTTPS MAXIMUS n’a pas été créée.' }
$binding.AddSslCertificate($CertificateThumbprint, 'My')
icacls $envFile /inheritance:r /grant:r '*S-1-5-18:(R)' '*S-1-5-32-544:(R)' 'IIS AppPool\MAXIMUS-Entreprise-LAN:(R)' | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible de restreindre les permissions du fichier .env.' }
icacls $laravel /grant 'IIS AppPool\MAXIMUS-Entreprise-LAN:(RX)' /T | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible d’accorder la lecture du code à l’application IIS.' }
icacls (Join-Path $laravel 'storage') /grant 'IIS AppPool\MAXIMUS-Entreprise-LAN:(M)' /T | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible d’accorder l’écriture Laravel dans storage/.' }
icacls (Join-Path $laravel 'bootstrap/cache') /grant 'IIS AppPool\MAXIMUS-Entreprise-LAN:(M)' /T | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-Install 'Impossible d’accorder l’écriture Laravel dans bootstrap/cache/.' }
Get-NetFirewallRule -DisplayName 'MAXIMUS LAN HTTPS 443' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName 'MAXIMUS LAN HTTPS 443' -Direction Inbound -Protocol TCP -LocalAddress $LanIp.IPAddressToString -LocalPort 443 -RemoteAddress $LanCidr -Action Allow -Profile Domain,Private | Out-Null
Start-WebAppPool -Name $appPool
Start-Website -Name $siteName
& curl.exe --noproxy '*' --fail --silent --show-error --max-time 20 --resolve "$InternalHostname`:443`:$($LanIp.IPAddressToString)" "$appUrl/api/healthz"
if ($LASTEXITCODE -ne 0) { Stop-Install 'La validation TLS /api/healthz a échoué. Vérifiez DNS, certificat et pare-feu LAN.' }
Write-Host "MAXIMUS IIS LAN installé : $appUrl (IP $LanIp, CIDR autorisé $LanCidr)"