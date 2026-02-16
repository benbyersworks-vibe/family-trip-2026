const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Path to your Service Account Key
const KEY_PATH = path.join(__dirname, 'credentials.json');

// Scopes required for Drive and Sheets
const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets'
];

async function getAuthClient() {
    if (!fs.existsSync(KEY_PATH)) {
        throw new Error('❌ Missing credentials.json! Please follow the steps to create your Service Account Key.');
    }

    return new google.auth.GoogleAuth({
        keyFile: KEY_PATH,
        scopes: SCOPES,
    });
}

async function getDriveClient() {
    const auth = await getAuthClient();
    return google.drive({ version: 'v3', auth });
}

async function createFolder(folderName) {
    const drive = await getDriveClient();

    // Check if folder exists
    console.log(`🔍 Checking if folder "${folderName}" exists...`);
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
        fields: 'files(id, name)',
    });

    if (res.data.files.length > 0) {
        console.log(`✅ Folder found: ${res.data.files[0].id}`);
        return res.data.files[0].id;
    }

    // Create folder if not found
    console.log(`📁 Creating new folder: "${folderName}"...`);
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };

    const folder = await drive.files.create({
        resource: fileMetadata,
        fields: 'id',
    });

    console.log(`🎉 Folder Created! ID: ${folder.data.id}`);
    return folder.data.id;
}

// Run if called directly
if (require.main === module) {
    createFolder('Family Trip 2026')
        .catch(console.error);
}

module.exports = { createFolder, getDriveClient, getAuthClient };
