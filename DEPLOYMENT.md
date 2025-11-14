# Deployment Guide

## ⚠️ Important: Vercel Limitations

**Vercel is NOT recommended for this application** due to:

1. **Execution Time Limits**: 
   - Free tier: 10 seconds max
   - Pro tier: 60 seconds max
   - Video conversion often takes longer than this

2. **FFmpeg Installation**: 
   - FFmpeg requires system binaries that are difficult to bundle in serverless functions

3. **File Size Limits**: 
   - Request payload limit: 4.5MB (free tier)
   - Videos are typically much larger

4. **Ephemeral Storage**: 
   - Limited temporary storage in serverless functions

## ✅ Recommended Deployment Platforms

### 1. **Railway** (Recommended - Easiest)
- ✅ Full Node.js support
- ✅ Easy FFmpeg installation
- ✅ No execution time limits
- ✅ Free tier available
- ✅ Automatic deployments from GitHub

**Deploy Steps:**
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Add environment variables (see below)
6. Railway will auto-detect and deploy

### 2. **Render**
- ✅ Full Node.js support
- ✅ Easy setup
- ✅ Free tier available
- ✅ Good for long-running processes

**Deploy Steps:**
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new "Web Service"
4. Connect GitHub repository
5. Build command: `npm install`
6. Start command: `npm start`
7. Add environment variables

### 3. **DigitalOcean App Platform**
- ✅ Reliable and scalable
- ✅ Easy FFmpeg support
- ✅ Good documentation

### 4. **Heroku**
- ✅ Well-established platform
- ✅ Easy deployment
- ⚠️ Requires credit card for free tier (limited hours)

## Environment Variables Setup

For any deployment platform, you'll need to set these environment variables:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://your-app-url.com/oauth2callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
DRIVE_FOLDER_ID=118DIvY1YnjJ7kYat8ZsFGND4yme-cxKF
```

## Deployment Checklist

- [ ] Push code to GitHub (make sure `.gitignore` excludes sensitive files)
- [ ] Set up Google OAuth with production redirect URI
- [ ] Add environment variables to your hosting platform
- [ ] Install FFmpeg on the server (or use buildpack/container)
- [ ] Test the deployment
- [ ] Update OAuth redirect URI in Google Cloud Console

## Railway-Specific Setup

1. **Add Buildpack for FFmpeg:**
   - Railway usually auto-detects, but you may need to add:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     }
   }
   ```

2. **Create `railway.json` (optional):**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

## Render-Specific Setup

1. **Create `render.yaml`:**
   ```yaml
   services:
     - type: web
       name: video-converter
       env: node
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
   ```

2. **FFmpeg Installation:**
   - Add to build command: `apt-get update && apt-get install -y ffmpeg && npm install`

## If You Still Want to Try Vercel

While not recommended, if you want to attempt Vercel deployment:

1. You'll need to use Vercel's serverless functions
2. Split the conversion into chunks or use external service
3. Use streaming for large files
4. Consider using a separate service for video conversion (like AWS Lambda with FFmpeg layer)

**Better approach**: Use Vercel for frontend + separate API service (Railway/Render) for backend.

