// Vercel-compatible version using client-side conversion
// This endpoint handles the Google Drive upload after client-side conversion

const { google } = require('googleapis');
const { Readable } = require('stream');

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '118DIvY1YnjJ7kYat8ZsFGND4yme-cxKF';

async function getDriveClient() {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials
    const credentials = {
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    };
    
    if (process.env.GOOGLE_ACCESS_TOKEN) {
        credentials.access_token = process.env.GOOGLE_ACCESS_TOKEN;
    }
    
    oAuth2Client.setCredentials(credentials);

    // Refresh token if access token is missing or expired
    try {
        if (!process.env.GOOGLE_ACCESS_TOKEN) {
            const { credentials: newCredentials } = await oAuth2Client.refreshAccessToken();
            oAuth2Client.setCredentials(newCredentials);
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        // Continue anyway, might still work
    }

    return google.drive({ version: 'v3', auth: oAuth2Client });
}

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { audioBlob, fileName } = req.body;

        if (!audioBlob || !fileName) {
            return res.status(400).json({ error: 'Missing audioBlob or fileName' });
        }

        // Convert base64 to buffer
        const audioBuffer = Buffer.from(audioBlob, 'base64');

        // Upload to Google Drive
        const drive = await getDriveClient();
        const fileMetadata = {
            name: fileName.endsWith('.mp3') ? fileName : `${fileName}.mp3`,
            parents: [DRIVE_FOLDER_ID]
        };

        const media = {
            mimeType: 'audio/mpeg',
            body: Readable.from(audioBuffer)
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink'
        });

        return res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            driveLink: response.data.webViewLink
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};

