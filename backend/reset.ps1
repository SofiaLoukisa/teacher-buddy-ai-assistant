Write-Host "=== RESET AI Study Assistant Environment ===" -ForegroundColor Red
Write-Host "This will STOP containers and DELETE the Ollama model volume." -ForegroundColor Yellow
Write-Host "You will need to run setup.bat again afterwards." -ForegroundColor Yellow

# Stop stack
Write-Host "`nStopping docker compose stack (if running)..." -ForegroundColor Yellow
docker compose down

# Remove any leftover ollama-temp container
Write-Host "Removing 'ollama-temp' container (if any)..." -ForegroundColor Yellow
docker rm -f ollama-temp 2>$null | Out-Null

# Remove the volume
Write-Host "Removing 'ollama' model volume..." -ForegroundColor Yellow
docker volume rm ollama

Write-Host "`nReset complete." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1) Run setup.bat to re-download the model" -ForegroundColor Cyan
Write-Host "  2) Run start.bat to launch the app" -ForegroundColor Cyan
