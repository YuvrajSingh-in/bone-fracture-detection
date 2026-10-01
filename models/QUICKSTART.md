# 🚀 Quick Start - Deploy in 5 Minutes

## Prerequisites Check

Run these commands to verify you have everything installed:

```powershell
# Check Node.js
node --version

# Check npm
npm --version

# Check Firebase CLI
firebase --version

# Check Google Cloud SDK
gcloud --version
```

## 🎯 First Time Deployment

### 1. Install Missing Tools (if needed)

**Google Cloud SDK** (if not installed):
- Download: https://cloud.google.com/sdk/docs/install-sdk
- After install: `gcloud init`
- Login: `gcloud auth login`

**Firebase CLI** (if not installed):
```powershell
npm install -g firebase-tools
```

### 2. Set Google Cloud Project

```powershell
gcloud config set project bone-fracture-ai-2026
```

### 3. Enable Required APIs

```powershell
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 4. Deploy Everything

```powershell
.\deploy.ps1
```

That's it! Your app will be live at:
- **Frontend**: https://bone-fracture-ai-2026.web.app
- **Backend**: (URL will be shown after deployment)

## 🔄 Subsequent Deployments

**Full deployment:**
```powershell
.\deploy.ps1
```

**Backend only:**
```powershell
.\deploy-backend.ps1
```

**Frontend only:**
```powershell
.\deploy-frontend.ps1
```

## ⚠️ Important Notes

1. **Model Files**: Ensure all ML model files are in the `models/` directory before deploying backend
2. **First Deployment**: May take 5-10 minutes due to Docker build and model loading
3. **Costs**: Cloud Run has a generous free tier, but monitor usage in Google Cloud Console

## 🆘 Quick Troubleshooting

**"gcloud: command not found"**
- Install Google Cloud SDK from link above

**"Permission denied"**
- Run: `gcloud auth login`

**"Build failed"**
- Check that all model files exist
- Verify `requirements.txt` is complete

**Frontend build errors**
- Run: `cd frontend && npm install`

## 📚 Full Documentation

See `DEPLOYMENT.md` for complete documentation.
