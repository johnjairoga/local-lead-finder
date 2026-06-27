# Local Lead Finder - Local startup script (Windows)
$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent

Set-Location $ProjectRoot
Write-Host ">> Project: $ProjectRoot" -ForegroundColor Cyan

# Refresh PATH (Node may have been installed recently)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
  exit 1
}

Write-Host ">> Node $(node --version)" -ForegroundColor Green

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host ">> Created .env from .env.example" -ForegroundColor Yellow
}

if (-not (Test-Path "node_modules")) {
  Write-Host ">> Installing dependencies..." -ForegroundColor Cyan
  npm install
}

$pgReady = $false
$pgBin = "C:\Program Files\PostgreSQL\16\bin\pg_isready.exe"
if (Test-Path $pgBin) {
  & $pgBin -h localhost -p 5432 2>$null
  if ($LASTEXITCODE -eq 0) { $pgReady = $true }
}

if (-not $pgReady) {
  Write-Host "" 
  Write-Host "PostgreSQL is not running on localhost:5432." -ForegroundColor Yellow
  Write-Host "Choose ONE option:" -ForegroundColor Yellow
  Write-Host "  A) Finish PostgreSQL installer (set password to: postgres)" -ForegroundColor White
  Write-Host "  B) Start service: services.msc -> postgresql-x64-16 -> Start" -ForegroundColor White
  Write-Host "  C) Docker: docker run -d --name llf-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=local_lead_finder -p 5432:5432 postgres:16-alpine" -ForegroundColor White
  Write-Host ""
  Write-Host "Then update DATABASE_URL in .env if your password is different." -ForegroundColor Yellow
  exit 1
}

Write-Host ">> PostgreSQL is ready" -ForegroundColor Green

Write-Host ">> Prisma generate + migrate..." -ForegroundColor Cyan
npx prisma generate
npx prisma migrate deploy

if (-not (Test-Path "$env:USERPROFILE\AppData\Local\ms-playwright")) {
  Write-Host ">> Installing Playwright Chromium (first time only)..." -ForegroundColor Cyan
  npx playwright install chromium
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Starting app at http://localhost:3000" -ForegroundColor Green
Write-Host " Search page: http://localhost:3000/search" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

npm run dev
