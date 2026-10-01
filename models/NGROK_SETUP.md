# 🌐 Ngrok Setup Guide - Expose Local Backend

This guide shows you how to expose your local backend to the internet using ngrok, so your Firebase-hosted frontend can communicate with it.

## 📋 What is This Setup?

- **Frontend**: Hosted on Firebase (https://bone-fracture-ai-2026.web.app)
- **Backend**: Running locally on your machine
- **Ngrok**: Creates a secure tunnel to expose your local backend to the internet

## 🎯 Prerequisites

1. **Ngrok Account** (Free tier works fine)
   - Sign up at: https://ngrok.com/
   - Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken

2. **Backend Running Locally**
   - Your FastAPI backend should be running on `http://localhost:8000`

## 📦 Installation Steps

### Step 1: Download and Install Ngrok

**Option A: Using Chocolatey (Recommended for Windows)**
```powershell
choco install ngrok
```

**Option B: Manual Download**
1. Download from: https://ngrok.com/download
2. Extract the zip file
3. Move `ngrok.exe` to a folder in your PATH (e.g., `C:\Windows\System32`)

### Step 2: Authenticate Ngrok

```powershell
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

Replace `YOUR_AUTHTOKEN_HERE` with your actual authtoken from the ngrok dashboard.

## 🚀 Running Ngrok with Your Backend

### Quick Start (Every Time You Work)

1. **Start your backend** (in one terminal):
```powershell
cd d:\models\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **Start ngrok** (in another terminal):
```powershell
ngrok http 8000
```

3. **Copy the ngrok URL** from the terminal output:
   - Look for the line that says: `Forwarding https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:8000`
   - Copy the `https://xxxx-xxxx-xxxx.ngrok-free.app` URL

4. **Update your frontend environment**:
   - Edit `frontend\.env.production`
   - Set: `NEXT_PUBLIC_API_URL=https://xxxx-xxxx-xxxx.ngrok-free.app`

5. **Rebuild and redeploy frontend**:
```powershell
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

## 🎨 Better Setup: Static Domain (Paid Feature)

If you want a permanent URL that doesn't change:

1. **Upgrade to ngrok paid plan** ($8/month)
2. **Reserve a static domain** in ngrok dashboard
3. **Run ngrok with your domain**:
```powershell
ngrok http 8000 --domain=your-static-domain.ngrok-free.app
```

## 🔧 Advanced Configuration

### Create Ngrok Configuration File

Create a file at `%USERPROFILE%\.ngrok2\ngrok.yml`:

```yaml
version: "2"
authtoken: YOUR_AUTHTOKEN_HERE
tunnels:
  bone-fracture-backend:
    proto: http
    addr: 8000
    inspect: true
    bind_tls: true
```

Then run:
```powershell
ngrok start bone-fracture-backend
```

### Run Ngrok in Background

```powershell
Start-Process ngrok -ArgumentList "http 8000" -WindowStyle Hidden
```

## 🔐 Important Security Notes

### Update CORS in Backend

Edit `backend/main.py` to allow your Firebase domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bone-fracture-ai-2026.web.app",
        "https://bone-fracture-ai-2026.firebaseapp.com",
        "http://localhost:3000",  # For local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Ngrok Free Tier Limitations

- URL changes every time you restart ngrok
- 40 connections/minute limit
- Ngrok banner on web interface
- Session timeout after 2 hours of inactivity

## 📝 Complete Workflow

Here's the complete workflow every time you want to work:

```powershell
# Terminal 1: Start Backend
cd d:\models\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start Ngrok
ngrok http 8000

# Copy the ngrok URL (e.g., https://1234-5678-9012.ngrok-free.app)

# Terminal 3: Update and Deploy Frontend
cd d:\models\frontend
# Edit .env.production with the new ngrok URL
npm run build
cd ..
firebase deploy --only hosting
```

## 🆘 Troubleshooting

### Issue: "ERR_NGROK_108"
**Solution**: Your authtoken is invalid or not set
```powershell
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### Issue: Backend not accessible through ngrok
**Solution**: Ensure backend is running on `0.0.0.0` not just `localhost`:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Issue: CORS errors
**Solution**: Update CORS settings in `backend/main.py` to include your Firebase domain

### Issue: Ngrok URL changes every restart
**Solution**: Either:
1. Upgrade to paid plan for static domain
2. Use a script to automatically update frontend .env and redeploy

### Issue: "Tunnel not found"
**Solution**: Make sure you're using the correct port (8000)

## 🔄 Alternative: Use Cloud Run Instead

If ngrok becomes inconvenient, consider deploying your backend to Cloud Run:

```powershell
cd backend
gcloud run deploy bone-fracture-backend --source . --platform managed --region us-central1 --project bone-fracture-ai-2026 --allow-unauthenticated --memory 4Gi --cpu 2 --timeout 300
```

This gives you a permanent URL without needing ngrok.

## 💡 Pro Tips

1. **Keep ngrok running**: Don't close the ngrok terminal while working
2. **Bookmark ngrok dashboard**: http://localhost:4040 shows request logs
3. **Use static domain**: If you use this setup frequently, the paid plan is worth it
4. **Automate updates**: Create a script to update frontend .env automatically

## 📊 Comparison: Ngrok vs Cloud Run

| Feature | Ngrok (Free) | Ngrok (Paid) | Cloud Run |
|---------|--------------|--------------|-----------|
| Cost | Free | $8/month | ~$10-50/month |
| Static URL | ❌ | ✅ | ✅ |
| Setup Time | 1 minute | 1 minute | 5-10 minutes |
| Always On | ❌ (manual) | ❌ (manual) | ✅ |
| Local Development | ✅ | ✅ | ❌ |
| Best For | Testing | Development | Production |

---

**Project**: Bone Fracture AI Detection  
**Frontend**: https://bone-fracture-ai-2026.web.app  
**Backend**: Local (exposed via ngrok)  
**Last Updated**: 2026-02-04
