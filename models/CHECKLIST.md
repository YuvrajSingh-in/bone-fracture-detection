# 📋 Deployment Checklist

Use this checklist to track your deployment progress.

## Phase 1: Setup (One-time)

- [ ] **Install Firebase CLI**
  ```powershell
  npm install -g firebase-tools
  ```
  Verify: `firebase --version`

- [ ] **Install Google Cloud SDK**
  - Download: https://cloud.google.com/sdk/docs/install-sdk#windows
  - Install and restart terminal
  - Verify: `gcloud --version`

- [ ] **Fix PowerShell Execution Policy** (if needed)
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

- [ ] **Authenticate with Google Cloud**
  ```powershell
  gcloud auth login
  gcloud config set project bone-fracture-ai-2026
  ```

- [ ] **Enable Required APIs**
  ```powershell
  gcloud services enable run.googleapis.com
  gcloud services enable cloudbuild.googleapis.com
  ```

## Phase 2: Prepare Application

- [ ] **Verify Model Files**
  - Check that all ML model files are in the `models/` directory
  - Models needed:
    - [ ] yolov8s_28k.pt
    - [ ] yolov8s-seg.pt
    - [ ] yolov8s_lowdata.pt
    - [ ] bone_fracture_cnn.h5
    - [ ] bone_fracture_mobilenet.h5
    - [ ] cnn_advance.pth

- [ ] **Test Frontend Build**
  ```powershell
  cd frontend
  npm install
  npm run build
  cd ..
  ```

- [ ] **Verify Configuration Files**
  - [ ] `firebase.json` exists
  - [ ] `.firebaserc` exists
  - [ ] `frontend/next.config.ts` has `output: 'export'`
  - [ ] `backend/Dockerfile` exists

## Phase 3: Deploy Backend (Optional but Recommended)

- [ ] **Deploy to Cloud Run**
  ```powershell
  cd backend
  gcloud run deploy bone-fracture-backend --source . --platform managed --region us-central1 --project bone-fracture-ai-2026 --allow-unauthenticated --memory 4Gi --cpu 2 --timeout 300
  cd ..
  ```

- [ ] **Get Backend URL**
  ```powershell
  gcloud run services describe bone-fracture-backend --region us-central1 --project bone-fracture-ai-2026 --format="value(status.url)"
  ```

- [ ] **Update Frontend Environment**
  - Edit `frontend/.env.production`
  - Set `NEXT_PUBLIC_API_URL=<your-cloud-run-url>`

## Phase 4: Deploy Frontend

- [ ] **Build Frontend with Production Config**
  ```powershell
  cd frontend
  npm run build
  cd ..
  ```

- [ ] **Deploy to Firebase Hosting**
  ```powershell
  firebase deploy --only hosting
  ```

- [ ] **Verify Deployment**
  - Visit: https://bone-fracture-ai-2026.web.app
  - Test image upload functionality
  - Check that API calls work

## Phase 5: Post-Deployment

- [ ] **Test Application**
  - [ ] Frontend loads correctly
  - [ ] Can upload images
  - [ ] API calls work
  - [ ] All models respond

- [ ] **Update CORS** (for production security)
  - Edit `backend/main.py`
  - Change `allow_origins=["*"]` to `allow_origins=["https://bone-fracture-ai-2026.web.app"]`
  - Redeploy backend

- [ ] **Monitor Costs**
  - Check Cloud Run usage: https://console.cloud.google.com/run?project=bone-fracture-ai-2026
  - Set up billing alerts if needed

- [ ] **Set Up Monitoring** (optional)
  - Enable Cloud Run logging
  - Set up error alerts
  - Monitor performance

## Quick Commands Reference

### Deploy Everything
```powershell
.\deploy.ps1
```

### Deploy Backend Only
```powershell
.\deploy-backend.ps1
```

### Deploy Frontend Only
```powershell
.\deploy-frontend.ps1
```

### View Logs
```powershell
# Cloud Run logs
gcloud run services logs read bone-fracture-backend --region us-central1

# Firebase Hosting logs
# Visit: https://console.firebase.google.com/project/bone-fracture-ai-2026/hosting
```

### Update Backend
```powershell
cd backend
# Make changes
gcloud run deploy bone-fracture-backend --source . --region us-central1
cd ..
```

### Update Frontend
```powershell
cd frontend
# Make changes
npm run build
cd ..
firebase deploy --only hosting
```

## Troubleshooting Checklist

If deployment fails, check:

- [ ] All required tools are installed
- [ ] Authenticated with both Firebase and Google Cloud
- [ ] Project ID is set correctly
- [ ] APIs are enabled
- [ ] Model files exist in correct location
- [ ] Frontend builds without errors
- [ ] Environment variables are set correctly

## Success Criteria

Your deployment is successful when:

- ✅ Frontend is accessible at https://bone-fracture-ai-2026.web.app
- ✅ Backend API is accessible (if deployed)
- ✅ Can upload images and get predictions
- ✅ No console errors in browser
- ✅ API calls complete successfully

## Notes

**Estimated Time:**
- First deployment: 20-30 minutes (including setup)
- Subsequent deployments: 5-10 minutes

**Costs:**
- Firebase Hosting: FREE (within limits)
- Cloud Run: ~$10-50/month (with free tier)

**Support:**
- See `DEPLOYMENT.md` for detailed documentation
- See `DEPLOY_SIMPLE.md` for manual steps
- See `TROUBLESHOOTING.md` for common issues

---

**Project**: bone-fracture-ai-2026  
**Last Updated**: 2026-02-02  
**Status**: Ready to Deploy ✅
