const express = require('express');
const path = require('path');
const { fetchFlightsAmadeus, fetchFlightsSerpApi } = require('./fetch-flights');
const { appendData, getSheetsClient, getSheetData } = require('./sheets-manager');
require('dotenv').config();

const app = express();
const PORT = 3000;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const HEADERS = [['Source', 'Airline', 'Flight', 'Direct?', 'Departure', 'Arrival', 'Return Date', 'Price', 'Link', 'Timestamp']];

// Serve static files (HTML, CSS, Client-side JS)
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
            const itinerary = f.itineraries?.[0];
            const segs = itinerary?.segments;
            if (!segs || segs.length === 0) return;

            const firstSeg = segs[0];
            const lastSeg = segs[segs.length - 1];
            const isDirect = segs.length === 1 ? 'Yes' : 'No';

            let returnDate = 'N/A';
            if (f.itineraries?.length > 1) returnDate = f.itineraries[1]?.segments?.[0]?.departure?.at || 'N/A';

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
            const returnDate = serpRaw.search_parameters?.return_date || 'N/A';

            rows.push([
                'SerpAPI',
                airline,
                flightNum,
                isDirect,
                firstLeg.departure_airport?.time || 'N/A',
                firstLeg.arrival_airport?.time || 'N/A',
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
    // Serve the Dashboard HTML by default now
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Old UI for manual triggering
app.get('/manual', (req, res) => {
    res.sendFile(path.join(__dirname, 'filter-ui.html'));
});

// API: Get Flight History for Dashboard
app.get('/api/history', async (req, res) => {
    try {
        const data = await getSheetData(GOOGLE_SHEET_ID);
        // Header: Source, Airline, Flight, Direct?, Departure, Arrival, Return Date, Price, Link, Timestamp

        if (!data || data.length < 2) {
            return res.json([]); // Only header or empty
        }

        const headers = data[0];
        const rows = data.slice(1);

        // Map to structured JSON
        const history = rows.map(row => {
            return {
                source: row[0],
                airline: row[1],
                flight: row[2],
                isDirect: row[3], // Make sure this index matches the Sheet column for 'Direct?'
                departure: row[4],
                priceStr: row[7], // e.g., "$500" or "400 EUR"
                timestamp: row[9]
            };
        });

        res.json(history);
    } catch (error) {
        console.error("Dashboard API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/run-pipeline', async (req, res) => {
    // ... (Same logic as manual pipeline, copy-pasted or imported) ...
    // For brevity in dashboard-server, we focus on the Dashboard API.
    // If the user wants to run manual checks from Dashboard, we can link it here.

    // Simplest approach: Reuse exactly code from server.js for now
    const { origin, dest, date, returnDate } = req.body;
    if (!origin || !dest || !date) return res.status(400).json({ success: false, message: 'Missing fields' });

    try {
        await ensureHeaders();
        const [amadeusRaw, serpRaw] = await Promise.all([
            fetchFlightsAmadeus(origin, dest, date, returnDate).catch(e => null),
            fetchFlightsSerpApi(origin, dest, date, returnDate).catch(e => null)
        ]);
        const rows = formatResults(amadeusRaw, serpRaw);
        if (rows.length > 0) {
            await appendData(GOOGLE_SHEET_ID, rows);
            res.json({ success: true, message: `Saved ${rows.length} flights.` });
        } else {
            res.json({ success: false, message: 'No flights found.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Dashboard Server running at http://localhost:${PORT}`);
});
