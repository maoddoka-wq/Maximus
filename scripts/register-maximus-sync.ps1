[CmdletBinding()]
param(
    [string]$WorkspaceDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$TaskName = "MAXIMUS central scheduler",
    [ValidateRange(1, 1440)]
    [int]$IntervalMinutes = 1,
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

$LaravelDir = Join-Path $WorkspaceDir "artifacts/api-server/laravel"
if (-not (Test-Path $LaravelDir -PathType Container)) {
    throw "Dossier Laravel introuvable : $LaravelDir"
}

if ($Remove) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Scheduler MAXIMUS supprimé : $TaskName"
    exit 0
}

$phpCommand = Get-Command php.exe -ErrorAction SilentlyContinue
if (-not $phpCommand) {
    $phpCommand = Get-Command php -ErrorAction SilentlyContinue
}
if (-not $phpCommand) {
    throw "PHP est introuvable dans PATH."
}

$action = New-ScheduledTaskAction `
    -Execute $phpCommand.Source `
    -Argument "artisan schedule:run --no-ansi" `
    -WorkingDirectory $LaravelDir
$startAt = (Get-Date).AddMinutes(1)
$trigger = New-ScheduledTaskTrigger `
    -Once `
    -At $startAt `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -Hidden `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Déclenche le scheduler Laravel MAXIMUS pour synchroniser la configuration centrale." `
    -Force | Out-Null

Write-Host "Scheduler MAXIMUS activé : $TaskName"
Write-Host "Déclenchement toutes les $IntervalMinutes minute(s), synchronisation centrale selon la règle Laravel."