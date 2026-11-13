# StockSight setup helper
#
# Run from the root of a clone of the repository:
#   git clone https://github.com/saliljena16-sys/StockSight.git
#   cd StockSight
#   .\setup.ps1

$repoUrl = "https://github.com/saliljena16-sys/StockSight"
$port = 4000  # matches the --port flag in package.json's dev/start/preview scripts

Write-Host "Setting up StockSight ($repoUrl)" -ForegroundColor Cyan

if (-not (Test-Path "package.json")) {
    Write-Host "package.json not found. Run this script from the root of a clone of $repoUrl" -ForegroundColor Red
    exit 1
}

if (Test-Path ".env") {
    Write-Host ".env already exists - leaving it unchanged." -ForegroundColor Yellow
} else {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example. Add your Finnhub key (and Supabase keys for cloud sync)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. npm install" -ForegroundColor White
Write-Host "2. npm run dev" -ForegroundColor White
Write-Host "3. Open http://localhost:$port" -ForegroundColor White
