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
$hiddenCommand = @"
`$process = Start-Process -FilePath '$phpLiteral' -ArgumentList @('artisan', 'schedule:run', '--no-ansi') -WorkingDirectory '$laravelLiteral' -WindowStyle Hidden -Wait -PassThru
exit `$process.ExitCode
"@
$encodedCommand = [Convert]::ToBase64String(
    [System.Text.Encoding]::Unicode.GetBytes($hiddenCommand)
)
$action = New-ScheduledTaskAction `
    -Execute $powerShellCommand.Source `
    -Argument "-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -EncodedCommand $encodedCommand" `
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
Enable-ScheduledTask -TaskName $TaskName | Out-Null

Write-Host "Scheduler MAXIMUS activé : $TaskName"
Write-Host "Déclenchement toutes les $IntervalMinutes minute(s), sans fenêtre visible."