// Health check endpoint for Vercel deployment checks
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Check if required environment variables are set
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'DRIVE_FOLDER_ID'
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    return res.status(500).json({
      status: 'unhealthy',
      error: 'Missing environment variables',
      missing: missingVars
    })
  }

  // Verify Google OAuth client can be initialized
  try {
    const { google } = require('googleapis')
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    // Just verify we can create the client, don't make actual API calls
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
        hasFolderId: !!process.env.DRIVE_FOLDER_ID,
        folderId: process.env.DRIVE_FOLDER_ID
      },
      checks: {
        envVars: 'pass',
        oauthClient: 'pass'
      }
    })
  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      checks: {
        envVars: missingVars.length === 0 ? 'pass' : 'fail',
        oauthClient: 'fail'
      }
    })
  }
}

