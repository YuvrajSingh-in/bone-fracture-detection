# 🚀 Deployment Guide - Bone Fracture AI Detection

This guide will help you deploy your Bone Fracture AI Detection application to Firebase Hosting (frontend) and Google Cloud Run (backend).

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Google Cloud SDK (gcloud)** installed
   - Download from: https://cloud.google.com/sdk/docs/install
   - After installation, run: `gcloud init`

2. **Firebase CLI** installed
   - Run: `npm install -g firebase-tools`
   - Already authenticated ✅

3. **Node.js and npm** installed (for frontend build)

4. **Docker** installed (optional - Cloud Run can build from source)

## 🏗️ Project Structure

```
d:\models\
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── models/            # ML model files
├── firebase.json      # Firebase configuration
├── .firebaserc        # Firebase project settings
└── deploy.ps1         # Main deployment script
```

## 🎯 Firebase Project Details

- **Project ID**: `bone-fracture-ai-2026`
- **Project Number**: `509543762002`
- **Frontend URL**: https://bone-fracture-ai-2026.web.app
- **Backend URL**: Will be generated after Cloud Run deployment

## 📦 Deployment Options

### Option 1: Full Deployment (Recommended for first deployment)

Deploy both frontend and backend in one command:

```powershell
.\deploy.ps1
```

This script will:
1. ✅ Deploy backend to Cloud Run
2. ✅ Get the backend URL
3. ✅ Update frontend environment variables
4. ✅ Build the Next.js frontend
5. ✅ Deploy to Firebase Hosting

### Option 2: Backend Only

If you only updated the backend:

```powershell
.\deploy-backend.ps1
```

**Note**: After backend deployment, you'll need to update the frontend environment variable and redeploy if the URL changed.

### Option 3: Frontend Only

If you only updated the frontend:

```powershell
.\deploy-frontend.ps1
```

## 🔧 Manual Deployment Steps

### Step 1: Deploy Backend to Cloud Run

```powershell
cd backend

gcloud run deploy bone-fracture-backend `
    --source . `
    --platform managed `
    --region us-central1 `
    --project bone-fracture-ai-2026 `
    --allow-unauthenticated `
    --memory 4Gi `
    --cpu 2 `
    --timeout 300 `
    --max-instances 10
```

**Important Configuration:**
- **Memory**: 4GB (required for ML models)
- **CPU**: 2 vCPUs (for faster inference)
- **Timeout**: 300 seconds (for model loading)
- **Max Instances**: 10 (adjust based on expected traffic)

After deployment, get your backend URL:
```powershell
gcloud run services describe bone-fracture-backend --region us-central1 --project bone-fracture-ai-2026 --format="value(status.url)"
```

### Step 2: Update Frontend Environment

Edit `frontend\.env.production` with your backend URL:

```env
NEXT_PUBLIC_API_URL=https://bone-fracture-backend-XXXXXXXXXX-uc.a.run.app
```

### Step 3: Build Frontend

```powershell
cd frontend
npm run build
cd ..
```

This creates a static export in `frontend/out/`

### Step 4: Deploy to Firebase Hosting

```powershell
firebase deploy --only hosting
```

## 🔐 Important: Model Files

**Before deploying the backend**, ensure your ML model files are in the correct location:

```
backend/
└── (model files should be accessible from main.py)

models/
├── yolov8s_28k.pt
├── yolov8s-seg.pt
├── yolov8s_lowdata.pt
├── bone_fracture_cnn.h5
├── bone_fracture_mobilenet.h5
└── cnn_advance.pth
```

**Note**: Large model files may need to be uploaded separately or stored in Google Cloud Storage due to size limitations.

## 🌐 CORS Configuration

The backend is already configured to accept requests from any origin:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, consider restricting to your Firebase domain:
```python
allow_origins=["https://bone-fracture-ai-2026.web.app"]
```

## 💰 Cost Considerations

### Firebase Hosting (Free Tier)
- ✅ 10 GB storage
- ✅ 360 MB/day transfer
- ✅ Free SSL certificate

### Cloud Run (Pay-as-you-go)
- **Pricing**: ~$0.00002400/vCPU-second, ~$0.00000250/GB-second
- **Free Tier**: 2 million requests/month
- **Estimated Cost**: ~$10-50/month depending on usage

**Cost Optimization Tips:**
1. Set `--max-instances` to limit scaling
2. Use `--min-instances 0` to scale to zero when idle
3. Optimize model loading to reduce cold start times

## 🔍 Monitoring & Logs

### View Cloud Run Logs
```powershell
gcloud run services logs read bone-fracture-backend --region us-central1 --project bone-fracture-ai-2026
```

### View Firebase Hosting Logs
Visit: https://console.firebase.google.com/project/bone-fracture-ai-2026/hosting

## 🐛 Troubleshooting

### Backend Deployment Issues

**Issue**: Out of memory errors
**Solution**: Increase memory allocation:
```powershell
gcloud run services update bone-fracture-backend --memory 8Gi --region us-central1
```

**Issue**: Timeout during model loading
**Solution**: Increase timeout:
```powershell
gcloud run services update bone-fracture-backend --timeout 600 --region us-central1
```

**Issue**: Container build fails
**Solution**: Check Docker logs and ensure all dependencies are in `requirements.txt`

### Frontend Deployment Issues

**Issue**: Build fails
**Solution**: Check for TypeScript errors and ensure all dependencies are installed:
```powershell
cd frontend
npm install
npm run build
```

**Issue**: API calls fail
**Solution**: Verify the `NEXT_PUBLIC_API_URL` in `.env.production` matches your Cloud Run URL

## 🔄 Updating Your Application

### Update Backend Code
1. Make changes to backend code
2. Run: `.\deploy-backend.ps1`
3. Cloud Run will rebuild and deploy automatically

### Update Frontend Code
1. Make changes to frontend code
2. Ensure `.env.production` has correct backend URL
3. Run: `.\deploy-frontend.ps1`

### Update Both
Run: `.\deploy.ps1`

## 📱 Testing Your Deployment

After deployment, test your application:

1. **Frontend**: Visit https://bone-fracture-ai-2026.web.app
2. **Backend API**: Visit your Cloud Run URL + `/docs` for API documentation
3. **Upload Test**: Try uploading an X-ray image through the frontend

## 🔒 Security Recommendations

1. **Enable Firebase App Check** to prevent abuse
2. **Restrict CORS** to your Firebase domain only
3. **Add authentication** for production use
4. **Set up Cloud Armor** for DDoS protection
5. **Enable Cloud Run authentication** if needed

## 📊 Next Steps

- [ ] Set up custom domain (optional)
- [ ] Configure Cloud CDN for faster global access
- [ ] Set up monitoring and alerts
- [ ] Implement user authentication
- [ ] Add rate limiting to API endpoints
- [ ] Set up CI/CD pipeline with GitHub Actions

## 🆘 Support

For issues:
1. Check Cloud Run logs: `gcloud run services logs read bone-fracture-backend --region us-central1`
2. Check Firebase console: https://console.firebase.google.com/project/bone-fracture-ai-2026
3. Review this documentation

---

**Project**: Bone Fracture AI Detection  
**Firebase Project**: bone-fracture-ai-2026  
**Region**: us-central1  
**Last Updated**: 2026-02-02
