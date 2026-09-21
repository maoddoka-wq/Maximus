[CmdletBinding()]
param(
    [string]$WorkspaceDir = "",
    [string]$TaskName = "MAXIMUS automatic update",
    [ValidateRange(5, 1440)]
    [int]$IntervalMinutes = 10,
    [switch]$Remove
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($WorkspaceDir)) {
    $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    if ([string]::IsNullOrWhiteSpace($scriptDirectory)) {
        throw "Impossible de déterminer le dossier du script."
    }
    $WorkspaceDir = (Resolve-Path (Join-Path $scriptDirectory "..")).Path
}

$updateScript = Join-Path $WorkspaceDir "scripts/update-maximus-instance.ps1"
if (-not (Test-Path $updateScript)) {
    throw "Script de mise à jour introuvable : $updateScript"
}

if ($Remove) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tâche supprimée : $TaskName"
    exit 0
}

$powerShell = (Get-Command powershell.exe -ErrorAction Stop).Source
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$updateScript`" -SkipHealthcheck"
$action = New-ScheduledTaskAction -Execute $powerShell -Argument $arguments
$trigger = New-ScheduledTaskTrigger `
    -Once (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Description "Met à jour MAXIMUS après validation du commit GitHub et du déploiement Render." `
    -Force | Out-Null

Write-Host "Mise à jour automatique activée : $TaskName"
Write-Host "Fréquence : toutes les $IntervalMinutes minutes"
Write-Host "Pour supprimer la tâche :"
Write-Host ".\scripts\register-maximus-auto-update.ps1 -Remove"