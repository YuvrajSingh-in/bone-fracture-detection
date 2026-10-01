# Ngrok Setup Script
# This script helps you set up ngrok without admin rights

Write-Host "🌐 Ngrok Setup Helper" -ForegroundColor Cyan
Write-Host ""

# Check if ngrok is already available
$ngrokExists = Get-Command ngrok -ErrorAction SilentlyContinue

if ($ngrokExists) {
    Write-Host "✅ Ngrok is already installed!" -ForegroundColor Green
    Write-Host "Location: $($ngrokExists.Source)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ Ngrok not found in PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📥 Please follow these steps:" -ForegroundColor Cyan
    Write-Host "1. Download ngrok from: https://ngrok.com/download" -ForegroundColor White
    Write-Host "2. Extract the ZIP file" -ForegroundColor White
    Write-Host "3. Move ngrok.exe to: $env:USERPROFILE\ngrok\" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run ngrok directly from your Downloads folder!" -ForegroundColor Yellow
    Write-Host ""
    
    # Create ngrok directory if it doesn't exist
    $ngrokDir = "$env:USERPROFILE\ngrok"
    if (-not (Test-Path $ngrokDir)) {
        New-Item -ItemType Directory -Path $ngrokDir -Force | Out-Null
        Write-Host "✅ Created directory: $ngrokDir" -ForegroundColor Green
    }
    
    Write-Host "💡 After extracting ngrok.exe to the folder above, run this script again." -ForegroundColor Cyan
    Write-Host ""
    exit
}

# Authenticate ngrok
Write-Host "🔐 Setting up ngrok authentication..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Your authtoken: 396G0gJcngKlKf7x0HFTdOmvrS6_2qSkotATAPUyAMkhxnBh5" -ForegroundColor Yellow
Write-Host ""

$authtoken = "396G0gJcngKlKf7x0HFTdOmvrS6_2qSkotATAPUyAMkhxnBh5"

try {
    & ngrok config add-authtoken $authtoken
    Write-Host "✅ Ngrok authenticated successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to authenticate. Please run manually:" -ForegroundColor Red
    Write-Host "ngrok config add-authtoken $authtoken" -ForegroundColor Yellow
    Write-Host ""
}

# Show next steps
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start your backend:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   uvicorn main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "2. In a new terminal, start ngrok:" -ForegroundColor White
Write-Host "   ngrok http 8000" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Copy the ngrok URL (https://xxxx.ngrok-free.app)" -ForegroundColor White
Write-Host ""
Write-Host "4. Update frontend\.env.production with the ngrok URL" -ForegroundColor White
Write-Host ""
Write-Host "5. Rebuild and deploy frontend:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host "   cd .." -ForegroundColor Gray
Write-Host "   firebase deploy --only hosting" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 See NGROK_SETUP.md for detailed instructions" -ForegroundColor Cyan
