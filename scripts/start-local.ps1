# Local Lead Finder — dev startup (Supabase)
$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent

Set-Location $ProjectRoot
Write-Host ">> Project: $ProjectRoot" -ForegroundColor Cyan

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
  exit 1
}

Write-Host ">> Node $(node --version)" -ForegroundColor Green

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host ">> Created .env from .env.example — fill in your Supabase credentials" -ForegroundColor Yellow
  exit 1
}

# Load .env into process
Get-Content ".env" | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_ -split '=', 2
  if ($parts.Count -eq 2) {
    $key = $parts[0].Trim()
    $val = $parts[1].Trim().Trim('"')
    [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
  }
}

$required = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL"
)

$placeholders = @("YOUR_PROJECT_REF", "YOUR_PASSWORD", "your-anon-key", "your-service-role-key")
$missing = @()

foreach ($key in $required) {
  $val = [System.Environment]::GetEnvironmentVariable($key, "Process")
  if (-not $val) { $missing += $key; continue }
  foreach ($p in $placeholders) {
    if ($val -like "*$p*") { $missing += $key; break }
  }
}

if ($missing.Count -gt 0) {
  Write-Host ""
  Write-Host "Supabase env vars missing or still using placeholders:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
  Write-Host ""
  Write-Host "Fill in .env from Supabase → Project Settings → API & Database" -ForegroundColor Yellow
  exit 1
}

if ($env:DATABASE_URL -notlike "*supabase.com*") {
  Write-Host "ERROR: DATABASE_URL must use Supabase (supabase.com). Local PostgreSQL is disabled." -ForegroundColor Red
  exit 1
}

Write-Host ">> Supabase configuration OK" -ForegroundColor Green

if (-not (Test-Path "node_modules")) {
  Write-Host ">> Installing dependencies..." -ForegroundColor Cyan
  npm install
}

Write-Host ">> Prisma generate + migrate (Supabase)..." -ForegroundColor Cyan
npx prisma generate
npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
  Write-Host "Migration failed. Check DATABASE_URL and DIRECT_URL in .env" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "$env:USERPROFILE\AppData\Local\ms-playwright")) {
  Write-Host ">> Installing Playwright Chromium (first time only)..." -ForegroundColor Cyan
  npx playwright install chromium
}

$env:PLAYWRIGHT_BROWSERS_PATH = "$env:USERPROFILE\AppData\Local\ms-playwright"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Starting app at http://localhost:3000" -ForegroundColor Green
Write-Host " Dashboard: http://localhost:3000/dashboard" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

npm run dev
