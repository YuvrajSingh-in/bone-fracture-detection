# Deploy Frontend Only to Firebase Hosting
# Use this script when you only need to update the frontend

Write-Host "🚀 Deploying Frontend to Firebase Hosting..." -ForegroundColor Cyan

Set-Location frontend

Write-Host "Building Next.js application..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -eq 0) {
    Set-Location ..
    Write-Host "Deploying to Firebase..." -ForegroundColor Gray
    firebase deploy --only hosting
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
        Write-Host "URL: https://bone-fracture-ai-2026.web.app" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Firebase deployment failed!" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ..
}
