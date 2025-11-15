# Video to MP3 Converter (Next.js)

A Next.js web application that converts video files to MP3 format in the browser using FFmpeg.wasm and automatically uploads them to Google Drive.

## Features

- 📹 Upload videos in any format
- 🎵 Convert to MP3 format (client-side using FFmpeg.wasm)
- ✏️ Custom naming for output files
- ☁️ Automatic upload to Google Drive
- 🎨 Modern, beautiful UI
- ⚡ Deployable on Vercel

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web application**
6. Add authorized redirect URI: `http://localhost:3000/api/oauth2callback` (for local dev)
7. Download the credentials or copy the Client ID and Client Secret

### 3. Get Refresh Token

You can use the provided refresh token or generate a new one:

**Option 1: Use provided refresh token**
- The refresh token is already provided in the environment variables below

**Option 2: Generate new refresh token**
- Use the OAuth 2.0 Playground: https://developers.google.com/oauthplayground/
- Select "Drive API v3" → "https://www.googleapis.com/auth/drive.file"
- Authorize and exchange for refresh token

### 4. Environment Variables

Create a `.env.local` file in the project root:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
DRIVE_FOLDER_ID=your_folder_id_here
```

**⚠️ Important:** 
- Never commit credentials to Git! 
- Add them to Vercel Environment Variables in your project settings
- For local development, create a `.env.local` file (already in .gitignore)

### 5. Run Locally

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all 4 variables from `.env.local`:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REFRESH_TOKEN`
     - `DRIVE_FOLDER_ID`
5. Deploy!

### 3. Update OAuth Redirect URI

After deployment, update the OAuth redirect URI in Google Cloud Console:
- Add: `https://your-app.vercel.app/api/oauth2callback`

## Usage

1. Open the application in your browser
2. Click or drag and drop a video file
3. Enter your preferred name for the audio file (without .mp3 extension)
4. Click "Convert & Upload to Drive"
5. Wait for the conversion and upload to complete
6. The file will appear in your Google Drive folder

## How It Works

1. **Client-Side Conversion**: Video to MP3 conversion happens in the browser using FFmpeg.wasm (no server processing needed)
2. **Server API**: The converted MP3 is sent to `/api/upload` which handles Google Drive upload
3. **OAuth2**: Uses refresh token to authenticate with Google Drive API

## Project Structure

```
.
├── pages/
│   ├── index.jsx          # Main UI component
│   └── api/
│       ├── upload.js       # Google Drive upload API
│       └── health.js       # Health check endpoint
├── public/
│   └── ffmpeg-core/       # FFmpeg core files (single-threaded mode)
│       ├── ffmpeg-core.js
│       ├── ffmpeg-core.wasm
│       └── ffmpeg-core.worker.js
├── styles/
│   └── Home.module.css     # Component styles
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
└── README.md              # This file
```

### FFmpeg Core Files

The `public/ffmpeg-core/` directory contains pre-built FFmpeg WebAssembly files that are served locally to avoid SharedArrayBuffer requirements (which need cross-origin isolation headers that break Vercel deployments).

**Current Version**: Compatible with `@ffmpeg/ffmpeg@0.11.6` (uses `@ffmpeg/core@0.11.0`)

**To Regenerate Core Files** (if you update `@ffmpeg/ffmpeg` version):

1. Check the compatible `@ffmpeg/core` version in `node_modules/@ffmpeg/ffmpeg/package.json` (look for `"@ffmpeg/core"` in dependencies)

2. Download the matching core files:
   ```bash
   mkdir -p public/ffmpeg-core
   curl -L "https://unpkg.com/@ffmpeg/core@<VERSION>/dist/ffmpeg-core.js" -o public/ffmpeg-core/ffmpeg-core.js
   curl -L "https://unpkg.com/@ffmpeg/core@<VERSION>/dist/ffmpeg-core.wasm" -o public/ffmpeg-core/ffmpeg-core.wasm
   curl -L "https://unpkg.com/@ffmpeg/core@<VERSION>/dist/ffmpeg-core.worker.js" -o public/ffmpeg-core/ffmpeg-core.worker.js
   ```

3. Replace `<VERSION>` with the actual core version (e.g., `0.11.0`)

**Why Local Files?**
- Avoids SharedArrayBuffer requirement (no cross-origin isolation needed)
- Works reliably on Vercel without special headers
- Faster loading (served from same origin)
- Single-threaded mode (sufficient for video conversion)

## Notes

- **FFmpeg.wasm**: Uses local core files from `public/ffmpeg-core/` (single-threaded mode, no SharedArrayBuffer required). First load will download ~23MB WASM file. Subsequent loads are cached.
- **File Size**: Large videos may take time to convert in the browser. Recommended for files under 500MB.
- **Browser Support**: Works best on modern browsers (Chrome, Firefox, Edge, Safari)
- **Google Drive**: Make sure the OAuth app has access to the specified folder
- **Vercel Compatibility**: Uses single-threaded FFmpeg core to avoid cross-origin isolation requirements

## Troubleshooting

- **FFmpeg not loading**: Check browser console for errors. Try refreshing the page.
- **Upload fails**: Verify environment variables are set correctly in Vercel
- **OAuth errors**: Check that the refresh token is valid and the folder ID is correct

## License

MIT
