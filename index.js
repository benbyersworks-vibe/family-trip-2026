const { fetchFlightsAmadeus, fetchFlightsSerpApi } = require('./fetch-flights');
const { appendData, getSheetsClient } = require('./sheets-manager');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const HEADERS = [['Source', 'Airline', 'Flight', 'Direct?', 'Departure', 'Arrival', 'Return Date', 'Price', 'Link', 'Timestamp']];

if (!GOOGLE_SHEET_ID) {
    console.error("❌ GOOGLE_SHEET_ID missing in .env");
    process.exit(1);
}

// --- Helpers ---

async function ensureHeaders() {
    try {
        const sheets = await getSheetsClient();
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_SHEET_ID,
            range: 'Sheet1!A1:A1'
        });

        if (!res.data.values || res.data.values.length === 0) {
            console.log("📄 Headers missing. Creating them...");
            await sheets.spreadsheets.values.update({
                spreadsheetId: GOOGLE_SHEET_ID,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: HEADERS }
            });
        }
    } catch (e) {
        console.error("Values check failed (might be empty sheet):", e.message);
    }
}

function formatResults(amadeusRaw, serpRaw) {
    const rows = [];

    // Amadeus Parsing
    if (amadeusRaw && Array.isArray(amadeusRaw)) {
        amadeusRaw.forEach(f => {
            const itinerary = f.itineraries?.[0];
            const segs = itinerary?.segments;

            if (!segs || segs.length === 0) return;

            const firstSeg = segs[0];
            const lastSeg = segs[segs.length - 1];

            const isDirect = segs.length === 1 ? 'Yes' : 'No';

            let returnDate = 'N/A';
            if (f.itineraries?.length > 1) {
                returnDate = f.itineraries[1]?.segments?.[0]?.departure?.at || 'N/A';
            }

            rows.push([
                'Amadeus',
                firstSeg.carrierCode || 'UNK',
                firstSeg.number || 'UNK',
                isDirect,
                firstSeg.departure?.at || 'N/A',
                lastSeg.arrival?.at || 'N/A',
                returnDate,
                (f.price?.grandTotal || '0') + ' ' + (f.price?.currency || ''),
                'N/A',
                new Date().toISOString()
            ]);
        });
    }

    // SerpAPI Parsing
    if (serpRaw) {
        let flights = [];
        if (serpRaw.flights) flights = flights.concat(serpRaw.flights);
        if (serpRaw.best_flights) flights = flights.concat(serpRaw.best_flights);
        if (serpRaw.other_flights) flights = flights.concat(serpRaw.other_flights);

        flights.forEach(f => {
            const legs = f.flights || [f];
            if (legs.length === 0) return;

            const firstLeg = legs[0];

            const extensions = f.extensions || [];
            const isDirect = extensions.includes("Nonstop") || legs.length === 1 ? 'Yes' : 'No';

            const airline = firstLeg.airline || f.airline || "Unknown";
            const flightNum = firstLeg.flight_number || f.flight_number || "N/A";

            const depTime = firstLeg.departure_airport?.time || 'N/A';
            const arrTime = firstLeg.arrival_airport?.time || 'N/A';

            const returnDate = serpRaw.search_parameters?.return_date || 'N/A';

            rows.push([
                'SerpAPI',
                airline,
                flightNum,
                isDirect,
                depTime,
                arrTime,
                returnDate,
                f.price || 'N/A',
                f.share_url || 'N/A',
                new Date().toISOString()
            ]);
        });
    }
    return rows;
}

async function runPipeline() {
    console.log("🚀 Starting Flight Data Pipeline...");

    // Configuration - Hardcoded for daily automation for now
    // Future: Read from config file or environment variables
    const ORIGIN = 'SFO';
    const DEST = 'JFK';

    // Date: 2 months from now
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    const DEPART_DATE = date.toISOString().split('T')[0];

    // Optional: Add Return Date logic for automation if desired
    // For now we stick to one-way or whatever fetchFlights supports by default

    console.log(`📅 Querying for: ${DEPART_DATE} (${ORIGIN} -> ${DEST})`);

    await ensureHeaders();

    // 1. Fetch Data
    const [amadeusRaw, serpRaw] = await Promise.all([
        fetchFlightsAmadeus(ORIGIN, DEST, DEPART_DATE).catch(e => {
            console.error("Amadeus Error:", e.message);
            return null;
        }),
        fetchFlightsSerpApi(ORIGIN, DEST, DEPART_DATE).catch(e => {
            console.error("SerpAPI Error:", e.message);
            return null;
        })
    ]);

    console.log(`\n📥 Fetched ${amadeusRaw ? amadeusRaw.length : 0} Amadeus flights`);
    console.log(`📥 Fetched ${serpRaw ? (serpRaw.flights?.length || 0) : 'undefined'} SerpAPI flights`);

    // 2. Transform Data
    const rows = formatResults(amadeusRaw, serpRaw);

    if (rows.length === 0) {
        console.log("⚠️ No flights found from any source.");
        return;
    }

    console.log(`\n🔄 Transformed ${rows.length} total rows.`);

    // 3. Store Data
    try {
        console.log(`💾 Appending to Sheet (${GOOGLE_SHEET_ID})...`);
        await appendData(GOOGLE_SHEET_ID, rows);
        console.log("✅ Pipeline Completed Successfully!");
    } catch (err) {
        console.error("❌ Failed to write to Sheet:", err.message);
        process.exit(1); // Fail action if write fails
    }
}

if (require.main === module) {
    runPipeline();
}
