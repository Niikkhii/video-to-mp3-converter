const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

async function authenticate() {
    const credentialsPath = path.join(__dirname, 'credentials.json');
    const tokenPath = path.join(__dirname, 'token.json');

    // Check if credentials exist
    try {
        await fs.access(credentialsPath);
    } catch (error) {
        console.error('❌ credentials.json not found!');
        console.error('Please download your OAuth 2.0 credentials from Google Cloud Console');
        console.error('and save them as credentials.json in this directory.');
        process.exit(1);
    }

    const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const redirectUri = redirect_uris && redirect_uris[0] || 'http://localhost:3000/oauth2callback';

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

    // Check if token already exists
    try {
        const token = JSON.parse(await fs.readFile(tokenPath, 'utf8'));
        oAuth2Client.setCredentials(token);
        console.log('✅ Token already exists and is valid!');
        return;
    } catch (error) {
        // Token doesn't exist, proceed with authentication
    }

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent'
    });

    console.log('\n📋 Authorize this app by visiting this URL:\n');
    console.log(authUrl);
    console.log('\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter the authorization code from the callback URL: ', async (code) => {
        rl.close();

        try {
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);

            await fs.writeFile(tokenPath, JSON.stringify(tokens));
            console.log('\n✅ Token saved successfully!');
            console.log('You can now start the server with: npm start\n');
        } catch (error) {
            console.error('\n❌ Error during authentication:', error.message);
            process.exit(1);
        }
    });
}

authenticate().catch(console.error);

