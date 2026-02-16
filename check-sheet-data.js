const { getSheetData } = require('./sheets-manager');
require('dotenv').config();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

(async () => {
    console.log("Reading Sheet Data...");
    const data = await getSheetData(SHEET_ID);

    if (!data || data.length === 0) {
        console.log("No data found.");
        return;
    }

    console.log("Header:", data[0]);

    // Check first 5 rows
    console.log("\nSample Rows:");
    data.slice(1, 6).forEach((row, i) => {
        console.log(`Row ${i + 1}: Direct='${row[3]}' (Length: ${row[3] ? row[3].length : 0})`);
    });

    // Check unique values in Direct column
    const directValues = [...new Set(data.slice(1).map(r => r[3]))];
    console.log("\nUnique values in 'Direct?' column:", directValues);
})();
