const { clearSheet, appendData } = require('./sheets-manager');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

(async () => {
    if (!GOOGLE_SHEET_ID) {
        console.error("No Sheet ID found");
        return;
    }

    console.log("🧹 Clearing old test data...");
    await clearSheet(GOOGLE_SHEET_ID);

    // Optional: Re-add headers if they were wiped (our clearSheet preserves A1 but good to be safe)
    console.log("📝 Adding fresh headers...");
    const headers = [['Source', 'Airline', 'Flight', 'Direct?', 'Departure', 'Arrival', 'Return Date', 'Price', 'Link', 'Timestamp']];

    // We can just append headers to the (now empty) A2 spot, or overwrite A1. 
    // Since we cleared A2:Z, A1 should still be there. 
    // But let's overwrite A1 just in case to ensure new format.

    const { google } = require('googleapis');
    const { getAuthClient } = require('./drive-manager');
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: { values: headers }
    });

    console.log("✅ Sheet reset and headers updated!");
})();
