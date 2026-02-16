const { google } = require('googleapis');
const { getAuthClient } = require('./drive-manager');

async function getSheetsClient() {
    const auth = await getAuthClient();
    return google.sheets({ version: 'v4', auth });
}

/**
 * Appends data to the spreadsheet.
 * @param {string} spreadsheetId 
 * @param {Array<Array<string>>} values - 2D array of values.
 */
async function appendData(spreadsheetId, values) {
    const sheets = await getSheetsClient();

    const res = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
            values,
        },
    });

    console.log(`Updated range: ${res.data.updates.updatedRange}`);
    return res.data;
}

// Test runner
if (require.main === module) {
    (async () => {
        require('dotenv').config();

        const sheetId = process.env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            console.error("❌ GOOGLE_SHEET_ID not found in .env");
            return;
        }

        console.log(`Using Sheet ID: ${sheetId}`);

        try {
            await appendData(sheetId, [
                ['Source', 'Airline', 'Flight', 'Departure', 'Arrival', 'Price', 'Link', 'Timestamp'],
                ['Manual Test', 'TestAir', 'TA123', '2026-04-15', '2026-04-15', '$500', 'http://example.com', new Date().toISOString()]
            ]);
            console.log("✅ Append successful!");
        } catch (error) {
            console.error('Failed:', error.message);
            if (error.errors) console.error(JSON.stringify(error.errors, null, 2));
        }
    })();
}

/**
 * Clears all data from the spreadsheet except the header (optional, currently clears everything).
 * @param {string} spreadsheetId 
 */
async function clearSheet(spreadsheetId) {
    const sheets = await getSheetsClient();

    try {
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: 'Sheet1!A2:Z1000', // Preserving header roughly if assumed A1
        });
        console.log(`Cleared data from ${spreadsheetId}`);
    } catch (error) {
        console.error('Error clearing sheet:', error.message);
    }
}

module.exports = { appendData, clearSheet, getSheetsClient };
