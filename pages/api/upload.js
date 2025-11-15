import { google } from 'googleapis'
import formidable from 'formidable'
import fs from 'fs'

// Disable Next's default body parser for multipart
export const config = {
  api: {
    bodyParser: false,
  },
}

// Parse multipart/form-data with formidable
const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = new formidable.IncomingForm({ multiples: false })
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      resolve({ fields, files })
    })
  })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { fields, files } = await parseForm(req)

    const uploaded = files.file
    const filename = fields.filename || (uploaded && uploaded.originalFilename) || 'audio.mp3'

    if (!uploaded || !uploaded.filepath) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Required env vars
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    const folderId = process.env.DRIVE_FOLDER_ID

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      return res.status(500).json({ 
        error: 'Missing Google OAuth or DRIVE_FOLDER_ID env variables. Please check Vercel environment variables.' 
      })
    }

    // Create OAuth2 client and set the refresh token
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    // Use the drive API with the oauth client. The library will refresh the access token automatically.
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // Read the uploaded mp3 buffer from the temp filepath
    const fileBuffer = fs.readFileSync(uploaded.filepath)

    // Upload file to Drive
    const response = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: uploaded.mimetype || 'audio/mpeg',
        body: Buffer.from(fileBuffer),
      },
      fields: 'id, name, webViewLink',
    })

    // Clean up temp file
    try {
      fs.unlinkSync(uploaded.filepath)
    } catch (cleanupError) {
      console.warn('Cleanup warning:', cleanupError)
    }

    return res.status(200).json({ 
      id: response.data.id, 
      name: response.data.name, 
      link: response.data.webViewLink 
    })

  } catch (err) {
    console.error('Upload error:', err)
    
    // Try to detect common OAuth errors and return friendly messages
    if (err && err.response && err.response.data) {
      return res.status(500).json({ error: err.response.data })
    }
    
    return res.status(500).json({ error: err.message || String(err) })
  }
}

