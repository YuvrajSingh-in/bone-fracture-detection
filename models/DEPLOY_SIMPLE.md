# Firebase Hosting Deployment - Simple Approach
# This guide shows how to deploy without automated scripts

## 🎯 What You Need

Your Firebase project is already set up:
- **Project ID**: bone-fracture-ai-2026
- **Project URL**: https://bone-fracture-ai-2026.web.app

## 📦 Installation Steps

### Step 1: Fix PowerShell Execution Policy (Run as Administrator)

Open PowerShell as Administrator and run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 2: Install Firebase CLI

```powershell
npm install -g firebase-tools
```

### Step 3: Install Google Cloud SDK

**Download**: https://cloud.google.com/sdk/docs/install-sdk#windows

After installation:
1. Restart your terminal
2. Run: `gcloud init`
3. Login: `gcloud auth login`
4. Set project: `gcloud config set project bone-fracture-ai-2026`

## 🚀 Manual Deployment (No Scripts Needed)

### Deploy Frontend Only (Easiest Option)

If you just want to deploy the frontend to Firebase Hosting:

```powershell
# 1. Build the frontend
cd frontend
npm run build

# 2. Go back to root
cd ..

# 3. Deploy to Firebase
firebase deploy --only hosting
```

Your site will be live at: **https://bone-fracture-ai-2026.web.app**

### Deploy Backend to Cloud Run

```powershell
# 1. Navigate to backend
cd backend

# 2. Deploy to Cloud Run
gcloud run deploy bone-fracture-backend --source . --platform managed --region us-central1 --project bone-fracture-ai-2026 --allow-unauthenticated --memory 4Gi --cpu 2 --timeout 300

# 3. Get the backend URL
gcloud run services describe bone-fracture-backend --region us-central1 --project bone-fracture-ai-2026 --format="value(status.url)"

# 4. Go back to root
cd ..
```

### Update Frontend with Backend URL

After deploying backend, update `frontend\.env.production`:

```env
NEXT_PUBLIC_API_URL=<your-cloud-run-url>
```

Then rebuild and redeploy frontend:
```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

## 🎨 Alternative: Frontend-Only Deployment

If you want to keep the backend running locally and only deploy the frontend:

1. **Keep backend running locally**
2. **Update CORS in backend** to allow your Firebase domain:
   ```python
   allow_origins=["https://bone-fracture-ai-2026.web.app"]
   ```
3. **Deploy frontend** as shown above

**Note**: This approach requires your local machine to be running for the backend to work.

## 📝 Configuration Files Created

All necessary configuration files have been created:

- ✅ `firebase.json` - Firebase Hosting configuration
- ✅ `.firebaserc` - Firebase project settings
- ✅ `frontend/next.config.ts` - Next.js static export configuration
- ✅ `frontend/.env.production` - Production environment variables
- ✅ `backend/Dockerfile` - Docker configuration for Cloud Run
- ✅ `backend/.dockerignore` - Docker ignore rules

## 🔍 Verify Your Setup

Before deploying, verify:

```powershell
# Check if firebase.json exists
Test-Path firebase.json

# Check if frontend build works
cd frontend
npm run build
cd ..

# Check if out directory was created
Test-Path frontend/out
```

## 💡 Recommended Deployment Flow

**For Development:**
1. Run backend locally: `cd backend && uvicorn main:app --reload`
2. Run frontend locally: `cd frontend && npm run dev`
3. Test everything works

**For Production:**
1. Deploy backend to Cloud Run (gets you a permanent URL)
2. Update `frontend/.env.production` with Cloud Run URL
3. Build and deploy frontend to Firebase Hosting

## 🆘 Common Issues

### Issue: "firebase: command not found"
**Solution**: Install Firebase CLI and restart terminal

### Issue: "gcloud: command not found"
**Solution**: Install Google Cloud SDK and restart terminal

### Issue: Build fails
**Solution**: 
```powershell
cd frontend
rm -r node_modules
rm package-lock.json
npm install
npm run build
```

### Issue: Can't run PowerShell scripts
**Solution**: Run PowerShell as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📚 Documentation Files

- `SETUP.md` - Tool installation guide
- `DEPLOYMENT.md` - Comprehensive deployment documentation
- `QUICKSTART.md` - Quick deployment guide
- This file - Simple manual deployment steps

---

**Your Firebase Project**: bone-fracture-ai-2026  
**Frontend URL**: https://bone-fracture-ai-2026.web.app  
**Status**: ✅ Ready to deploy
