[CmdletBinding()]
param(
    [string]$WorkspaceDir = "",
    [ValidateRange(1, 65535)][int]$Port = 8080,
    [string]$BindAddress = "127.0.0.1",
    [string]$PhpExecutable = ""
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($WorkspaceDir)) {
    $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    if ([string]::IsNullOrWhiteSpace($scriptDirectory)) {
        throw "Impossible de déterminer le dossier du script."
    }
    $WorkspaceDir = (Resolve-Path (Join-Path $scriptDirectory "..")).Path
}
if (-not $PhpExecutable) {
    $PhpCommand = Get-Command php -ErrorAction SilentlyContinue
    if ($PhpCommand) {
        $PhpExecutable = $PhpCommand.Source
    } elseif (Test-Path (Join-Path $HOME "php/php.exe") -PathType Leaf) {
        $PhpExecutable = Join-Path $HOME "php/php.exe"
    } else {
        throw "PHP introuvable. Ajoutez PHP à PATH ou utilisez -PhpExecutable avec le chemin de php.exe."
    }
}
$LaravelDir = (Resolve-Path (Join-Path $WorkspaceDir "artifacts/api-server/laravel")).Path
$PublicDir = (Resolve-Path (Join-Path $LaravelDir "public")).Path
$Router = Join-Path $LaravelDir "server.php"
if (-not (Test-Path $Router -PathType Leaf)) {
    throw "Routeur MAXIMUS server.php introuvable dans le dépôt. Vérifiez les fichiers de cette version ; le routeur Laravel générique ne sert pas le frontend MAXIMUS."
}
$Router = (Resolve-Path $Router).Path
if (-not (Test-Path (Join-Path $PublicDir "index.php") -PathType Leaf)) {
    throw "Le document root Laravel est incomplet."
}
if (-not (Test-Path (Join-Path $PublicDir "index.html") -PathType Leaf)) {
    throw "Frontend compilé absent de public/index.html. Construire et copier dist/public avant utilisation."
}
Write-Host "MAXIMUS local : http://${BindAddress}:$Port (Ctrl+C pour arrêter)."
Write-Host "Serveur de développement au premier plan : aucun service ni démarrage automatique installé."
Write-Host "Document root : $PublicDir"
Push-Location $PublicDir
try {
    & $PhpExecutable -S "${BindAddress}:$Port" -t $PublicDir $Router
    if ($LASTEXITCODE -ne 0) {
        throw "PHP s'est arrêté avec le code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}