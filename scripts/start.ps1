param([switch]$NoBrowser, [switch]$Rebuild)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot 'NIRIKSHAN\backend'
$frontendDir = Join-Path $projectRoot 'NIRIKSHAN\frontend'
$runtimeDir = Join-Path $projectRoot '.runtime'
$pythonExe = Join-Path $backendDir '.venv\Scripts\python.exe'
$url = 'http://127.0.0.1:8102'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
try {
    $health = Invoke-RestMethod "$url/api/prototype" -TimeoutSec 2
    if ($health.project_root -ne $projectRoot) { throw 'Port 8102 belongs to a different project.' }
    Write-Host "NIRIKSHAN is already running at $url"
    if (-not $NoBrowser) { Start-Process $url }
    exit 0
} catch {
    if (Get-NetTCPConnection -LocalPort 8102 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 8102 is occupied. Close that application or use Stop-Prototype.cmd if this prototype is running.'
    }
}
if (-not (Test-Path -LiteralPath $pythonExe)) {
    Write-Host 'Creating isolated Python 3.12+ environment...'
    & python -m venv (Join-Path $backendDir '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Python environment setup failed. Install Python 3.12 or newer.' }
}
$requirements = Join-Path $backendDir 'requirements-prototype.lock.txt'
$requirementsHash = (Get-FileHash -LiteralPath $requirements).Hash
$stamp = Join-Path $runtimeDir 'requirements.sha256'
if (-not (Test-Path -LiteralPath $stamp) -or (Get-Content -LiteralPath $stamp) -ne $requirementsHash) {
    & $pythonExe -m pip install -r $requirements
    if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
    Set-Content -LiteralPath $stamp -Value $requirementsHash
}
if ($Rebuild -or -not (Test-Path -LiteralPath (Join-Path $frontendDir 'dist\index.html'))) {
    Push-Location $frontendDir
    try {
        & npm.cmd ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
    } finally { Pop-Location }
}
$env:PYTHONUTF8 = '1'
$env:USE_SQLITE_FALLBACK = 'true'
$env:DEBUG = 'false'
$env:HOST = '127.0.0.1'
$env:SQLITE_FALLBACK_URL = 'sqlite:///' + ((Join-Path $backendDir 'data\prototype.db') -replace '\\', '/')
$process = Start-Process -FilePath $pythonExe -ArgumentList '-m uvicorn prototype:app --host 127.0.0.1 --port 8102' -WorkingDirectory $backendDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log') -PassThru
Set-Content -LiteralPath (Join-Path $runtimeDir 'server.pid') -Value $process.Id
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
        $health = Invoke-RestMethod "$url/api/prototype" -TimeoutSec 2
        if ($health.ready -and $health.project_root -eq $projectRoot) {
            Write-Host "NIRIKSHAN prototype ready: $url ($($health.works) demo works)"
            if (-not $NoBrowser) { Start-Process $url }
            exit 0
        }
    } catch {}
    $process.Refresh()
    if ($process.HasExited) { Get-Content -LiteralPath (Join-Path $runtimeDir 'server-error.log'); throw 'Server failed to start.' }
    Start-Sleep -Milliseconds 500
}
throw "Startup timed out. See $runtimeDir\server-error.log"
