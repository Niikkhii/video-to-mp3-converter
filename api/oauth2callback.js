const { google } = require('googleapis');

module.exports = async (req, res) => {
    const code = req.query.code;
    
    if (!code) {
        return res.status(400).send('No authorization code provided');
    }

    try {
        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const { tokens } = await oAuth2Client.getToken(code);
        
        // Return tokens (user should save these as environment variables)
        return res.send(`
            <html>
                <head><title>Authentication Successful</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                    <h1>✅ Authentication Successful!</h1>
                    <p>Please save these values as environment variables in Vercel:</p>
                    <div style="background: #f5f5f5; padding: 20px; margin: 20px; border-radius: 8px; text-align: left;">
                        <p><strong>GOOGLE_REFRESH_TOKEN:</strong></p>
                        <code style="background: white; padding: 10px; display: block; word-break: break-all;">${tokens.refresh_token}</code>
                        <br>
                        <p><strong>GOOGLE_ACCESS_TOKEN:</strong></p>
                        <code style="background: white; padding: 10px; display: block; word-break: break-all;">${tokens.access_token}</code>
                    </div>
                    <p>Add these to your Vercel project settings → Environment Variables</p>
                    <p>You can close this window.</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Error during OAuth:', error);
        return res.status(500).send(`Authentication failed: ${error.message}`);
    }
};

