# Bone Fracture AI - Deployment Script
# This script deploys both frontend and backend to Firebase/Google Cloud

Write-Host "🚀 Starting Bone Fracture AI Deployment..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = "bone-fracture-ai-2026"
$REGION = "us-central1"
$SERVICE_NAME = "bone-fracture-backend"

# Step 1: Deploy Backend to Cloud Run
Write-Host "📦 Step 1: Deploying Backend to Cloud Run..." -ForegroundColor Yellow
Write-Host ""

Set-Location backend

# Build and deploy to Cloud Run
Write-Host "Building Docker image and deploying..." -ForegroundColor Gray
gcloud run deploy $SERVICE_NAME `
    --source . `
    --platform managed `
    --region $REGION `
    --project $PROJECT_ID `
    --allow-unauthenticated `
    --memory 4Gi `
    --cpu 2 `
    --timeout 300 `
    --max-instances 10

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend deployment failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Get the backend URL
$BACKEND_URL = gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format="value(status.url)"
Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Cyan
Write-Host ""

Set-Location ..

# Step 2: Update Frontend Environment Variable
Write-Host "📝 Step 2: Updating Frontend Environment..." -ForegroundColor Yellow
$envContent = "NEXT_PUBLIC_API_URL=$BACKEND_URL"
Set-Content -Path "frontend\.env.production" -Value $envContent
Write-Host "✅ Environment updated!" -ForegroundColor Green
Write-Host ""

# Step 3: Build Frontend
Write-Host "🏗️  Step 3: Building Frontend..." -ForegroundColor Yellow
Set-Location frontend

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Frontend built successfully!" -ForegroundColor Green
Write-Host ""

Set-Location ..

# Step 4: Deploy to Firebase Hosting
Write-Host "🌐 Step 4: Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Your application is live at:" -ForegroundColor Cyan
Write-Host "   Frontend: https://$PROJECT_ID.web.app" -ForegroundColor White
Write-Host "   Backend:  $BACKEND_URL" -ForegroundColor White
Write-Host ""
