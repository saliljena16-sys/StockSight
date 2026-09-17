# StockSight Quick Setup Script
# Run this ONCE to create all project files

Write-Host "Setting up StockSight..." -ForegroundColor Cyan

# Create directory structure
New-Item -ItemType Directory -Force -Path src\components | Out-Null
New-Item -ItemType Directory -Force -Path src\utils | Out-Null

# Download all files from the project
$baseUrl = "https://raw.githubusercontent.com/YOUR_USERNAME/stocksight/main"

# For now, let's use a simpler approach - copy from current directory
Write-Host "Project files should already be in this directory." -ForegroundColor Yellow
Write-Host "If you see src\, index.html, and package.json, you're good!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "1. npm install" -ForegroundColor White
Write-Host "2. npm run dev" -ForegroundColor White
Write-Host "3. Open http://localhost:3000" -ForegroundColor White
