const { getDriveClient } = require('./drive-manager');

async function checkQuota() {
    try {
        const drive = await getDriveClient();
        const res = await drive.about.get({
            fields: 'storageQuota, user'
        });
        console.log('User:', res.data.user.emailAddress);
        console.log('Quota:', res.data.storageQuota);
    } catch (error) {
        console.error('Error checking quota:', error.message);
    }
}

if (require.main === module) {
    checkQuota();
}
