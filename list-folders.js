const { getDriveClient } = require('./drive-manager');

async function listFolders() {
    try {
        const drive = await getDriveClient();
        const res = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder'",
            fields: 'files(id, name, owners, shared)',
        });

        console.log('Folders found:');
        res.data.files.forEach(file => {
            const owner = file.owners && file.owners[0] ? file.owners[0].emailAddress : 'Unknown';
            console.log(`- [${file.name}] (ID: ${file.id}) | Owner: ${owner} | Shared: ${file.shared}`);
        });
    } catch (error) {
        console.error('Error listing folders:', error.message);
    }
}

if (require.main === module) {
    listFolders();
}
