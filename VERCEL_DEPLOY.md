# Vercel Deployment Guide

This app has been configured for Vercel deployment using **client-side video conversion** (FFmpeg runs in the browser) to work around Vercel's serverless limitations.

## Key Changes for Vercel

1. **Client-Side Conversion**: Video to MP3 conversion happens in the browser using FFmpeg.wasm
2. **Serverless Functions**: API routes are in `/api` folder (Vercel format)
3. **No Server-Side FFmpeg**: Removed dependency on server-side FFmpeg

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

Or connect your GitHub repo to Vercel:
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration

### 4. Set Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/oauth2callback
GOOGLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_ACCESS_TOKEN=your_access_token (optional, will be refreshed if needed)
DRIVE_FOLDER_ID=118DIvY1YnjJ7kYat8ZsFGND4yme-cxKF
```

### 5. Get Google OAuth Token

1. Visit: `https://your-app.vercel.app/api/oauth2callback?code=YOUR_CODE`
   - Replace `YOUR_CODE` with the authorization code from Google OAuth
2. The page will display your tokens
3. Copy and paste them into Vercel environment variables

Or use the auth helper locally:
```bash
npm run auth
```
Then copy the refresh_token to Vercel environment variables.

### 6. Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to your OAuth 2.0 Client
3. Add authorized redirect URI: `https://your-app.vercel.app/api/oauth2callback`

## How It Works

1. **User uploads video** → Browser loads FFmpeg.wasm
2. **Conversion happens in browser** → No server processing needed
3. **Converted MP3 sent to API** → Base64 encoded audio
4. **API uploads to Google Drive** → Serverless function handles upload

## Limitations

- **File Size**: Vercel has a 4.5MB request limit on free tier (Pro: 4.5MB body, 50MB total)
- **Execution Time**: 10 seconds (free) / 60 seconds (Pro)
- **Browser Performance**: Large videos may be slow to convert in browser
- **Memory**: Browser memory limits for very large files

## Troubleshooting

### "Failed to load FFmpeg"
- Check browser console for errors
- Try a different browser (Chrome/Edge recommended)
- Clear browser cache

### "Upload failed"
- Check environment variables are set correctly
- Verify Google Drive API is enabled
- Check that refresh token is valid

### "Request too large"
- Vercel free tier has 4.5MB limit
- Consider upgrading to Pro or using Railway/Render

## Alternative: Use Railway/Render

For better performance and no file size limits, consider deploying to:
- **Railway**: Full FFmpeg support, no execution limits
- **Render**: Good free tier, supports long-running processes

See `DEPLOYMENT.md` for details.

