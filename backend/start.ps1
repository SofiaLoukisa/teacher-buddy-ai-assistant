Write-Host "=== Starting AI Study Assistant ===" -ForegroundColor Cyan
Write-Host "Starting Ollama backend and Streamlit frontend..." -ForegroundColor Yellow

docker compose up --build
