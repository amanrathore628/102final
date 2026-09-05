$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot '.runtime\server.pid'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Host 'No prototype process recorded.'; exit 0 }
$serverPid = [int](Get-Content -LiteralPath $pidFile)
$process = Get-CimInstance Win32_Process -Filter "ProcessId = $serverPid" -ErrorAction SilentlyContinue
if ($process) {
    $expected = Join-Path $projectRoot 'NIRIKSHAN\backend\.venv\Scripts\python.exe'
    if ($process.ExecutablePath -ne $expected -or $process.CommandLine -notlike '*uvicorn prototype:app*') {
        throw 'Recorded PID belongs to another process; it was left running.'
    }
    Stop-Process -Id $serverPid
}
Remove-Item -LiteralPath $pidFile
Write-Host 'NIRIKSHAN prototype stopped. Your demo data has been kept.'
