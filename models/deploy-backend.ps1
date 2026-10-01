# Deploy Backend Only to Cloud Run
# Use this script when you only need to update the backend

Write-Host "🚀 Deploying Backend to Cloud Run..." -ForegroundColor Cyan

$PROJECT_ID = "bone-fracture-ai-2026"
$REGION = "us-central1"
$SERVICE_NAME = "bone-fracture-backend"

Set-Location backend

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

if ($LASTEXITCODE -eq 0) {
    $BACKEND_URL = gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format="value(status.url)"
    Write-Host ""
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
    Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Cyan
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
}

Set-Location ..
