# =====================================================================
# Smart Manhole Guardian System - GitHub Publication Script
# =====================================================================

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "🛡️  SMART MANHOLE GUARDIAN - GITHUB UPLOADER" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH and check standard installation locations
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
if (Test-Path "C:\Program Files\Git\cmd") {
    $env:Path = "C:\Program Files\Git\cmd;" + $env:Path
}
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "⚠️  Git is not detected on your system PATH." -ForegroundColor Yellow
    Write-Host "Attempting automatic installation via Windows Package Manager (winget)..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    
    # Refresh PATH in current session
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    
    if (-not $gitCmd) {
        Write-Host ""
        Write-Host "❌ Git installation completed, but you need to restart your terminal window." -ForegroundColor Red
        Write-Host "Please close this PowerShell window, open a new one, and re-run this script." -ForegroundColor Yellow
        exit
    }
}

Write-Host "✅ Git detected: $($gitCmd.Source)" -ForegroundColor Green
Write-Host ""

# 1. Initialize Git repository if not already initialized
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing local Git repository..." -ForegroundColor Cyan
    git init
} else {
    Write-Host "ℹ️  Existing local Git repository found." -ForegroundColor Gray
}

# 2. Stage all files (respecting .gitignore)
Write-Host "📝 Staging files (excluding node_modules and .env)..." -ForegroundColor Cyan
git add .

# 3. Commit
Write-Host "💾 Creating commit..." -ForegroundColor Cyan
git commit -m "Smart Manhole Guardian System - IoT Telemetry & Web Dashboard"

# 4. Prompt for user's repository URL
Write-Host ""
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
Write-Host "👉 Enter your GitHub Repository URL:" -ForegroundColor Yellow
Write-Host "   (Example: https://github.com/your-username/smart-manhole-guardian.git)" -ForegroundColor Gray
Write-Host "   (If you haven't created one yet, create a new repo at https://github.com/new)" -ForegroundColor Gray
Write-Host "-------------------------------------------------------------" -ForegroundColor Gray
$repoUrl = Read-Host "Repository URL"

if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host ""
    Write-Host "⚠️  No repository URL provided. Local commit created successfully!" -ForegroundColor Yellow
    Write-Host "When you create your repository on GitHub, run:" -ForegroundColor Yellow
    Write-Host "  git remote add origin <YOUR_URL>" -ForegroundColor Gray
    Write-Host "  git branch -M main" -ForegroundColor Gray
    Write-Host "  git push -u origin main" -ForegroundColor Gray
    exit
}

# 5. Push to GitHub
git remote remove origin -ErrorAction SilentlyContinue
git remote add origin $repoUrl
git branch -M main

Write-Host ""
Write-Host "🚀 Pushing code to GitHub ($repoUrl)..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 SUCCESS! Your project is now published on GitHub:" -ForegroundColor Green
    Write-Host "   $repoUrl" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ Push encountered an issue. If GitHub prompted for credentials," -ForegroundColor Yellow
    Write-Host "make sure you have authenticated using your browser or a Personal Access Token." -ForegroundColor Yellow
}
