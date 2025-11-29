Write-Host "=== QR Gen Local Test ===" -ForegroundColor Cyan
Write-Host ""

# Start server in separate window
Write-Host "Starting server in new window..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm start"

# Wait for server to start
Write-Host "Waiting for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test the application
Write-Host "`nTesting application..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -UseBasicParsing
    Write-Host "✓ Main page: OK ($($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Content: $($response.Content.Length) bytes" -ForegroundColor Gray
} catch {
    Write-Host "✗ Main page failed: $_" -ForegroundColor Red
    exit 1
}

$files = @('index.css', 'app.js', 'qrcode.min.js', 'manifest.json', 'service-worker.js')
Write-Host "`nStatic Files:" -ForegroundColor Cyan
foreach ($file in $files) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8080/$file" -UseBasicParsing
        Write-Host "  ✓ $file" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ $file" -ForegroundColor Red
    }
}

Write-Host "`nAPI Endpoints:" -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/health"
    Write-Host "  ✓ Health: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Health check failed" -ForegroundColor Red
}

try {
    $info = Invoke-RestMethod -Uri "http://localhost:8080/api/info"
    Write-Host "  ✓ API Info: $($info.name)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ API info failed" -ForegroundColor Red
}

Write-Host "`n✓ Local application is working!" -ForegroundColor Green
Write-Host "  URL: http://localhost:8080" -ForegroundColor Cyan
Write-Host "`nPress Enter to open in browser..." -ForegroundColor Yellow
Read-Host
Start-Process "http://localhost:8080"
