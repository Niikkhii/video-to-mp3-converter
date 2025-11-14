// This file is kept for reference but not used in Vercel deployment
// Vercel uses convert-v2.js which handles client-side converted files
const { google } = require('googleapis');

// Google Drive folder ID
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '118DIvY1YnjJ7kYat8ZsFGND4yme-cxKF';

// Initialize Google Drive client
async function getDriveClient() {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    // Set credentials from environment variables
    oAuth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        access_token: process.env.GOOGLE_ACCESS_TOKEN
    });

    // Refresh token if needed
    if (!process.env.GOOGLE_ACCESS_TOKEN) {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
    }

    return google.drive({ version: 'v3', auth: oAuth2Client });
}

// Upload to Google Drive
async function uploadToDrive(buffer, fileName, mimeType) {
    const drive = await getDriveClient();

    const fileMetadata = {
        name: fileName,
        parents: [DRIVE_FOLDER_ID]
    };

    const media = {
        mimeType: mimeType,
        body: stream.Readable.from(buffer)
    };

    const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
    });

    return response.data;
}

// Convert video to MP3 using external service (CloudConvert API)
async function convertVideoToMP3(videoBuffer, videoName) {
    // Option 1: Use CloudConvert API (requires API key)
    if (process.env.CLOUDCONVERT_API_KEY) {
        const FormData = require('form-data');
        const fetch = require('node-fetch');
        
        // Create job
        const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tasks: {
                    'import-1': {
                        operation: 'import/upload'
                    },
                    'convert-1': {
                        operation: 'convert',
                        input: 'import-1',
                        output_format: 'mp3',
                        audio_codec: 'mp3',
                        audio_bitrate: 192
                    },
                    'export-1': {
                        operation: 'export/url',
                        input: 'convert-1'
                    }
                }
            })
        });

        const job = await jobResponse.json();
        
        // Upload video file
        const uploadUrl = job.data.tasks.find(t => t.name === 'import-1').result.form.url;
        const uploadForm = new FormData();
        uploadForm.append('file', videoBuffer, { filename: videoName });
        
        await fetch(uploadUrl, {
            method: 'POST',
            body: uploadForm
        });

        // Wait for conversion and download
        let status = 'waiting';
        while (status !== 'finished') {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${job.data.id}`, {
                headers: {
                    'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}`
                }
            });
            const statusData = await statusResponse.json();
            status = statusData.data.status;
            
            if (status === 'error') {
                throw new Error('Conversion failed');
            }
        }

        // Download converted file
        const exportTask = job.data.tasks.find(t => t.name === 'export-1');
        const downloadResponse = await fetch(exportTask.result.files[0].url);
        return await downloadResponse.buffer();
    }
    
    // Option 2: Return error if no conversion service configured
    throw new Error('Video conversion service not configured. Please set CLOUDCONVERT_API_KEY or use a different deployment platform.');
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
        // Parse multipart form data
        const formData = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => {
                const buffer = Buffer.concat(chunks);
                // Simple multipart parsing (for production, use a library like busboy)
                resolve(buffer);
            });
            req.on('error', reject);
        });

        // For Vercel, we'll use a simpler approach with base64 or direct buffer
        // Note: Vercel has 4.5MB request limit on free tier
        
        // Extract video file and audio name from form data
        // This is simplified - in production you'd use busboy or similar
        const audioName = req.headers['x-audio-name'] || 'converted_audio';
        
        // Since Vercel has limitations, we'll use an external conversion service
        // or return instructions to use a different approach
        
        return res.status(501).json({
            error: 'Direct video conversion on Vercel is limited. Please use one of these options:',
            options: [
                'Use CloudConvert API (set CLOUDCONVERT_API_KEY)',
                'Deploy to Railway or Render for full FFmpeg support',
                'Use a client-side conversion library'
            ]
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
};

