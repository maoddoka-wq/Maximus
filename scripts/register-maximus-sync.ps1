[CmdletBinding()]
param(
    [string]$WorkspaceDir = "",
    [string]$TaskName = "MAXIMUS central scheduler",
    [ValidateRange(1, 1440)]
    [int]$IntervalMinutes = 5,
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

$LaravelDir = Join-Path $WorkspaceDir "artifacts/api-server/laravel"
if (-not (Test-Path $LaravelDir -PathType Container)) {
    throw "Dossier Laravel introuvable : $LaravelDir"
}
$LogDir = Join-Path $LaravelDir "storage/logs"
$LogFile = Join-Path $LogDir "installation-scheduler.log"

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

$powerShellCommand = Get-Command powershell.exe -ErrorAction SilentlyContinue
if (-not $powerShellCommand) {
    throw "Windows PowerShell est introuvable dans PATH."
}

$phpLiteral = $phpCommand.Source.Replace("'", "''")
$laravelLiteral = $LaravelDir.Replace("'", "''")
$logLiteral = $LogFile.Replace("'", "''")
$hiddenCommand = @"
`$logDirectory = Split-Path -Parent '$logLiteral'
New-Item -ItemType Directory -Path `$logDirectory -Force | Out-Null
`$startedAt = (Get-Date).ToString('o')
Add-Content -LiteralPath '$logLiteral' -Value "[$startedAt] START schedule:run"
`$exitCode = 1
try {
    Push-Location '$laravelLiteral'
    try {
        & '$phpLiteral' 'artisan' 'schedule:run' '--no-ansi' *>> '$logLiteral'
        `$exitCode = if (`$null -eq `$LASTEXITCODE) { 0 } else { `$LASTEXITCODE }
    } finally {
        Pop-Location
    }
} catch {
    (`$_ | Out-String) | Add-Content -LiteralPath '$logLiteral'
}
`$finishedAt = (Get-Date).ToString('o')
Add-Content -LiteralPath '$logLiteral' -Value "[$finishedAt] END schedule:run exit=`$exitCode"
exit `$exitCode
"@
$encodedCommand = [Convert]::ToBase64String(
    [System.Text.Encoding]::Unicode.GetBytes($hiddenCommand)
)
$action = New-ScheduledTaskAction `
    -Execute $powerShellCommand.Source `
    -Argument "-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand $encodedCommand" `
    -WorkingDirectory $LaravelDir
$now = Get-Date
$minutesSinceMidnight = ($now.Hour * 60) + $now.Minute + 1
$nextSlot = [Math]::Ceiling($minutesSinceMidnight / [double]$IntervalMinutes) * $IntervalMinutes
$startAt = $now.Date.AddMinutes($nextSlot)
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
Enable-ScheduledTask -TaskName $TaskName | Out-Null

Write-Host "Scheduler MAXIMUS activé : $TaskName"
Write-Host "Déclenchement toutes les $IntervalMinutes minute(s), sans fenêtre visible."
Write-Host "Journal : $LogFile"
$taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue
if ($taskInfo) {
    Write-Host "Prochaine exécution : $($taskInfo.NextRunTime)"
    Write-Host "Dernière exécution : $($taskInfo.LastRunTime) (code $($taskInfo.LastTaskResult))"
}