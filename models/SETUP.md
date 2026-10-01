# 🛠️ Setup Guide - Install Required Tools

This guide will help you install all the tools needed to deploy your application.

## ✅ Already Installed

- ✅ Node.js v22.15.0

## 📦 Tools to Install

### 1. Firebase CLI

**Install via npm:**
```powershell
npm install -g firebase-tools
```

**Verify installation:**
```powershell
firebase --version
```

### 2. Google Cloud SDK

**Download and Install:**

1. Visit: https://cloud.google.com/sdk/docs/install-sdk#windows
2. Download the Windows installer (GoogleCloudSDKInstaller.exe)
3. Run the installer
4. Follow the installation wizard
5. When prompted, check "Run 'gcloud init'" at the end

**Alternative - Install via PowerShell:**
```powershell
# Download installer
$url = "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe"
$output = "$env:TEMP\GoogleCloudSDKInstaller.exe"
Invoke-WebRequest -Uri $url -OutFile $output

# Run installer
Start-Process -FilePath $output -Wait
```

**After Installation:**

1. **Restart your terminal/PowerShell**
2. **Initialize gcloud:**
   ```powershell
   gcloud init
   ```
3. **Login:**
   ```powershell
   gcloud auth login
   ```
4. **Set project:**
   ```powershell
   gcloud config set project bone-fracture-ai-2026
   ```
5. **Enable required APIs:**
   ```powershell
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

**Verify installation:**
```powershell
gcloud --version
```

### 3. Docker (Optional but Recommended)

Docker is optional because Cloud Run can build from source, but having it locally is useful for testing.

**Download:**
- Visit: https://www.docker.com/products/docker-desktop/
- Download Docker Desktop for Windows
- Install and restart your computer

**Verify installation:**
```powershell
docker --version
```

## 🔧 Configuration Steps

### Step 1: Install Firebase CLI

```powershell
npm install -g firebase-tools
```

### Step 2: Install Google Cloud SDK

Download from: https://cloud.google.com/sdk/docs/install-sdk#windows

### Step 3: Authenticate

```powershell
# Google Cloud
gcloud auth login

# Firebase (already done via MCP)
firebase login
```

### Step 4: Set Project

```powershell
gcloud config set project bone-fracture-ai-2026
```

### Step 5: Enable APIs

```powershell
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## ✅ Verify Everything is Ready

Run this verification script:

```powershell
Write-Host "Checking installations..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Node.js: " -NoNewline
node --version

# Check npm
Write-Host "npm: " -NoNewline
npm --version

# Check Firebase CLI
Write-Host "Firebase CLI: " -NoNewline
firebase --version

# Check gcloud
Write-Host "Google Cloud SDK: " -NoNewline
gcloud --version | Select-Object -First 1

# Check Docker (optional)
Write-Host "Docker: " -NoNewline
docker --version

Write-Host ""
Write-Host "✅ All tools installed!" -ForegroundColor Green
```

## 🚀 Ready to Deploy?

Once all tools are installed, you can deploy with:

```powershell
.\deploy.ps1
```

## 🆘 Troubleshooting

### "Command not found" after installation

**Solution**: Restart your PowerShell terminal or computer

### gcloud init fails

**Solution**: 
1. Make sure you're logged in: `gcloud auth login`
2. Select the correct project when prompted

### Permission errors

**Solution**: Run PowerShell as Administrator

### npm install -g fails

**Solution**: 
```powershell
# On Windows, you might need to run as Administrator
# Or use this to fix npm permissions:
npm config set prefix "$env:APPDATA\npm"
```

## 📚 Next Steps

After installing all tools:
1. Read `QUICKSTART.md` for deployment steps
2. Read `DEPLOYMENT.md` for detailed documentation
3. Run `.\deploy.ps1` to deploy your application

---

**Need Help?**
- Google Cloud SDK Docs: https://cloud.google.com/sdk/docs
- Firebase CLI Docs: https://firebase.google.com/docs/cli
