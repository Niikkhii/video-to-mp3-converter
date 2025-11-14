const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Google Drive folder ID from the URL (can be overridden via env)
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '118DIvY1YnjJ7kYat8ZsFGND4yme-cxKF';

// Configure multer for file uploads
const upload = multer({
    dest: os.tmpdir(),
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    }
});

// Serve static files
app.use(express.static('public'));

// Google Drive authentication
let authClient = null;

async function authenticateGoogleDrive() {
    try {
        let client_id, client_secret, redirect_uris;
        
        // Try environment variables first (for production deployment)
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            client_id = process.env.GOOGLE_CLIENT_ID;
            client_secret = process.env.GOOGLE_CLIENT_SECRET;
            redirect_uris = [process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'];
        } else {
            // Fall back to credentials.json file (for local development)
            const credentialsPath = path.join(__dirname, 'credentials.json');
            let credentials;
            try {
                credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
            } catch (error) {
                console.error('\n❌ Please create credentials.json file or set environment variables. See README.md for instructions.');
                throw new Error('Google Drive credentials not found. Please set up credentials.json or environment variables');
            }
            const creds = credentials.installed || credentials.web;
            client_id = creds.client_id;
            client_secret = creds.client_secret;
            redirect_uris = creds.redirect_uris || ['http://localhost:3000/oauth2callback'];
        }

        const redirectUri = redirect_uris[0];
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

        // Try to load existing token (from file or environment variable)
        let token;
        const tokenPath = path.join(__dirname, 'token.json');
        
        // Check environment variable first (for production)
        if (process.env.GOOGLE_REFRESH_TOKEN) {
            token = {
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
                // If access token is provided, use it; otherwise it will be refreshed
                access_token: process.env.GOOGLE_ACCESS_TOKEN
            };
            oAuth2Client.setCredentials(token);
        } else {
            // Try to load from file (for local development)
            try {
                token = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
                oAuth2Client.setCredentials(token);
                
                // Check if token is expired and refresh if needed
                if (token.expiry_date && token.expiry_date <= Date.now()) {
                    const { credentials: newToken } = await oAuth2Client.refreshAccessToken();
                    oAuth2Client.setCredentials(newToken);
                    // Only save to file if we're not using env vars
                    if (!process.env.GOOGLE_REFRESH_TOKEN) {
                        await fs.writeFile(tokenPath, JSON.stringify(newToken));
                    }
                }
            } catch (error) {
                // No token file found, will need authentication
                console.log('\n⚠️  No existing token found. Please authenticate via browser.');
                const authUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: ['https://www.googleapis.com/auth/drive.file'],
                    prompt: 'consent'
                });
                console.log('\n📋 Authorize this app by visiting this URL:');
                console.log('\n' + authUrl + '\n');
                console.log('After authorization, you will be redirected. Copy the "code" parameter from the URL.');
                throw new Error('Please authenticate first. Check server logs for auth URL.');
            }
        }
        
        authClient = oAuth2Client;
        return oAuth2Client;
    } catch (error) {
        throw error;
    }
}

// Upload file to Google Drive
async function uploadToDrive(filePath, fileName) {
    if (!authClient) {
        await authenticateGoogleDrive();
    }

    const drive = google.drive({ version: 'v3', auth: authClient });

    const fileMetadata = {
        name: fileName,
        parents: [DRIVE_FOLDER_ID]
    };

    const media = {
        mimeType: 'audio/mpeg',
        body: require('fs').createReadStream(filePath)
    };

    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink'
        });

        return response.data;
    } catch (error) {
        console.error('Error uploading to Drive:', error);
        throw new Error('Failed to upload to Google Drive: ' + error.message);
    }
}

// Convert video to MP3
async function convertVideoToMP3(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('mp3')
            .audioCodec('libmp3lame')
            .audioBitrate(192)
            .on('end', () => {
                console.log('Conversion finished');
                resolve();
            })
            .on('error', (err) => {
                console.error('Conversion error:', err);
                reject(new Error('Video conversion failed: ' + err.message));
            })
            .save(outputPath);
    });
}

// API endpoint for conversion
app.post('/api/convert', upload.single('video'), async (req, res) => {
    const videoPath = req.file.path;
    const audioName = req.body.audioName || 'converted_audio';
    const outputPath = path.join(os.tmpdir(), `${audioName}.mp3`);

    try {
        // Convert video to MP3
        await convertVideoToMP3(videoPath, outputPath);

        // Upload to Google Drive
        const driveFile = await uploadToDrive(outputPath, `${audioName}.mp3`);

        // Clean up temporary files
        await fs.unlink(videoPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});

        res.json({
            success: true,
            message: 'File converted and uploaded successfully',
            driveLink: driveFile.webViewLink
        });
    } catch (error) {
        // Clean up on error
        await fs.unlink(videoPath).catch(() => {});
        await fs.unlink(outputPath).catch(() => {});

        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// OAuth callback endpoint
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('No authorization code provided');
    }

    try {
        let client_id, client_secret, redirect_uri;
        
        // Use environment variables if available, otherwise use credentials file
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            client_id = process.env.GOOGLE_CLIENT_ID;
            client_secret = process.env.GOOGLE_CLIENT_SECRET;
            redirect_uri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
        } else {
            const credentialsPath = path.join(__dirname, 'credentials.json');
            const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
            const creds = credentials.installed || credentials.web;
            client_id = creds.client_id;
            client_secret = creds.client_secret;
            redirect_uri = (creds.redirect_uris && creds.redirect_uris[0]) || 'http://localhost:3000/oauth2callback';
        }
        
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Save token for future use
        await fs.writeFile(
            path.join(__dirname, 'token.json'),
            JSON.stringify(tokens)
        );

        authClient = oAuth2Client;
        res.send('Authentication successful! You can close this window and return to the app.');
    } catch (error) {
        console.error('Error during OAuth:', error);
        res.status(500).send('Authentication failed: ' + error.message);
    }
});

app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Attempting to authenticate with Google Drive...');
    
    try {
        await authenticateGoogleDrive();
        console.log('Google Drive authentication successful!');
    } catch (error) {
        console.log('Note:', error.message);
        console.log('The server will start, but you may need to authenticate first.');
    }
});

