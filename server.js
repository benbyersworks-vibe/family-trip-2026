const express = require('express');
const path = require('path');
const { fetchFlightsAmadeus, fetchFlightsSerpApi } = require('./fetch-flights');
const { appendData, getSheetsClient } = require('./sheets-manager');
require('dotenv').config();

const app = express();
const PORT = 3000;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const HEADERS = [['Source', 'Airline', 'Flight', 'Direct?', 'Departure', 'Arrival', 'Return Date', 'Price', 'Link', 'Timestamp']];

app.use(express.static(__dirname));
app.use(express.json());

// --- QA & Safety Checks ---

function validateEnv() {
    const required = ['AMADEUS_CLIENT_ID', 'AMADEUS_CLIENT_SECRET', 'SERPAPI_KEY', 'GOOGLE_SHEET_ID'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error("❌ CRITICAL ERROR: Missing required environment variables:");
        missing.forEach(key => console.error(`   - ${key}`));
        console.error("Server cannot start. Please update .env");
        process.exit(1);
    }
    console.log("✅ Environment checks passed.");
}

// Run startup check immediately
validateEnv();

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
        console.error("Values check failed (might be empty sheet or permissions):", e.message);
    }
}

function formatResults(amadeusRaw, serpRaw) {
    const rows = [];

    // Amadeus Parsing
    if (amadeusRaw && Array.isArray(amadeusRaw)) {
        amadeusRaw.forEach(f => {
            // Safety: Optional chaining for deep access
            const itinerary = f.itineraries?.[0];
            const segs = itinerary?.segments;

            if (!segs || segs.length === 0) return; // Skip malformed result

            const firstSeg = segs[0];
            const lastSeg = segs[segs.length - 1];

            const isDirect = segs.length === 1 ? 'Yes' : 'No';

            // Return date logic
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

            // Validate properties exist
            const extensions = f.extensions || [];
            const isDirect = extensions.includes("Nonstop") || legs.length === 1 ? 'Yes' : 'No';

            const airline = firstLeg.airline || f.airline || "Unknown";
            const flightNum = firstLeg.flight_number || f.flight_number || "N/A";

            const depTime = firstLeg.departure_airport?.time || 'N/A';
            const arrTime = firstLeg.arrival_airport?.time || 'N/A';

            // Global return date from search parameters if available
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

// --- Routes ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'filter-ui.html'));
});

app.post('/run-pipeline', async (req, res) => {
    const { origin, dest, date, returnDate } = req.body;
    console.log(`Received request: ${origin} -> ${dest} on ${date} (Return: ${returnDate || 'None'})`);

    // Input Validation
    if (!origin || !dest || !date) {
        return res.status(400).json({ success: false, message: 'Missing required fields: origin, dest, date' });
    }

    if (origin === dest) {
        return res.status(400).json({ success: false, message: 'Origin and Destination cannot be the same.' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
        return res.status(400).json({ success: false, message: 'Departure date cannot be in the past.' });
    }

    if (returnDate && returnDate <= date) {
        return res.status(400).json({ success: false, message: 'Return date must be after departure date.' });
    }

    try {
        await ensureHeaders();

        // Run in parallel but safely
        const [amadeusRaw, serpRaw] = await Promise.all([
            fetchFlightsAmadeus(origin, dest, date, returnDate).catch(err => {
                console.error("Amadeus internal fail:", err.message);
                return null;
            }),
            fetchFlightsSerpApi(origin, dest, date, returnDate).catch(err => {
                console.error("SerpAPI internal fail:", err.message);
                return null;
            })
        ]);

        const rows = formatResults(amadeusRaw, serpRaw);

        if (rows.length > 0) {
            await appendData(GOOGLE_SHEET_ID, rows);
            res.json({ success: true, message: `Successfully saved ${rows.length} flights to Sheet!` });
        } else {
            res.json({ success: false, message: 'No flights found for this query. Check logs for API details.' });
        }
    } catch (error) {
        console.error("Pipeline Error:", error);
        res.status(500).json({ success: false, message: 'Pipeline failed: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

