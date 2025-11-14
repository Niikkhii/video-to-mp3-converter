# Video to MP3 Converter

A web application that converts video files to MP3 format and automatically uploads them to Google Drive.

## Features

- 📹 Upload videos in any format
- 🎵 Convert to MP3 format
- ✏️ Custom naming for output files
- ☁️ Automatic upload to Google Drive
- 🎨 Modern, beautiful UI

## Prerequisites

1. **Node.js** (v14 or higher)
2. **FFmpeg** - Required for video conversion
   - **macOS**: `brew install ffmpeg`
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

3. **Google Drive API Credentials**

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google Drive API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Desktop app** (or Web application)
6. Download the credentials JSON file
7. Save it as `credentials.json` in the project root directory

### 3. Authenticate Google Drive

**Option 1: Using the auth helper (Recommended)**
```bash
npm run auth
```
Follow the prompts to authenticate.

**Option 2: Manual authentication**
1. Start the server: `npm start`
2. Check the console for an authentication URL
3. Visit the URL in your browser and authorize the application
4. Copy the authorization code from the callback URL
5. The token will be saved automatically for future use

**Important:** Make sure to add `http://localhost:3000/oauth2callback` as an authorized redirect URI in your Google Cloud Console OAuth 2.0 Client settings.

### 4. Run the Application

```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage

1. Open the application in your browser
2. Click or drag and drop a video file
3. Enter your preferred name for the audio file
4. Click "Convert & Upload to Drive"
5. Wait for the conversion and upload to complete
6. The file will appear in your Google Drive folder

## Project Structure

```
.
├── public/
│   ├── index.html      # Frontend HTML
│   ├── styles.css      # Styling
│   └── script.js       # Frontend JavaScript
├── server.js           # Backend server
├── package.json        # Dependencies
├── credentials.json    # Google Drive API credentials (you need to add this)
└── token.json          # OAuth token (generated after authentication)
```

## Notes

- Maximum file size: 500MB (can be adjusted in `server.js`)
- The converted MP3 files are temporarily stored and automatically deleted after upload
- Make sure you have write permissions to the Google Drive folder

## Deployment

### Vercel Deployment (Client-Side Conversion)

The app is now configured for **Vercel** using client-side video conversion! See [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) for detailed instructions.

**Quick Deploy to Vercel:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Set environment variables in Vercel dashboard
4. Done! 🎉

**Note**: Vercel uses browser-based FFmpeg (FFmpeg.wasm) for conversion, which works around serverless limitations.

### Other Deployment Options

See [DEPLOYMENT.md](./DEPLOYMENT.md) for other platforms:

- **Railway** (Recommended for server-side): Full FFmpeg support, no execution limits
- **Render**: Good free tier option
- **DigitalOcean App Platform**: Reliable and scalable

## Troubleshooting

- **FFmpeg not found**: Make sure FFmpeg is installed and available in your PATH
- **Google Drive authentication errors**: Verify your `credentials.json` file is correct or environment variables are set
- **Upload fails**: Check that the folder ID matches your Google Drive folder
- **Deployment issues**: See DEPLOYMENT.md for platform-specific troubleshooting

