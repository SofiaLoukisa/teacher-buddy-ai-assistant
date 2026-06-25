Write-Host "=== AI Study Assistant – One-Time Setup ===" -ForegroundColor Cyan

# 1. Pull Ollama image
Write-Host "`n[1/5] Pulling Ollama image..." -ForegroundColor Yellow
docker pull ollama/ollama

# 2. Create volume (if it exists, Docker just returns the name again)
Write-Host "`n[2/5] Creating 'ollama' volume (for model storage)..." -ForegroundColor Yellow
docker volume create ollama | Out-Null

# 3. Clean up any old temp container if it exists
Write-Host "`n[3/5] Removing any existing 'ollama-temp' container..." -ForegroundColor Yellow
docker rm -f ollama-temp 2>$null | Out-Null

# 4. Start temporary Ollama container
Write-Host "`n[4/5] Starting temporary Ollama container to download model..." -ForegroundColor Yellow
docker run -d --name ollama-temp -p 11434:11434 -v ollama:/root/.ollama ollama/ollama | Out-Null

Write-Host "   Waiting 5 seconds for Ollama to start..." -ForegroundColor DarkYellow
Start-Sleep -Seconds 5

# 5. Pull llama3 model inside the container
Write-Host "`n[5/5] Downloading 'llama3' model into Docker volume (this may take several minutes)..." -ForegroundColor Green
docker exec ollama-temp ollama pull llama3

# Stop and remove temp container
Write-Host "`nCleaning up temporary container..." -ForegroundColor Yellow
docker stop ollama-temp | Out-Null
docker rm ollama-temp | Out-Null

Write-Host "`n=== Setup complete! ===" -ForegroundColor Cyan
Write-Host "You can now run 'start.bat' to launch the Study Assistant." -ForegroundColor Green
