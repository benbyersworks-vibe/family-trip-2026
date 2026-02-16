const { fetchFlightsAmadeus, fetchFlightsSerpApi } = require('./fetch-flights');
const { appendData } = require('./sheets-manager');
require('dotenv').config();

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!GOOGLE_SHEET_ID) {
    console.error("❌ GOOGLE_SHEET_ID missing in .env");
    process.exit(1);
}

// Function to format Amadeus results
function formatAmadeus(flights) {
    if (!flights) return [];
    return flights.map(f => {
        const seg = f.itineraries[0].segments[0];
        return [
            'Amadeus',
            seg.carrierCode + seg.number, // Airline/Flight
            seg.number,
            seg.departure.at,
            seg.arrival.at,
            f.price.grandTotal + ' ' + f.price.currency,
            'N/A', // Link not always direct
            new Date().toISOString()
        ];
    });
}

// Function to format SerpAPI results
function formatSerpApi(flights) {
    if (!flights) return [];
    return flights.map(f => {
        // SerpAPI structure varies, simple check
        const flightSegment = f.flights ? f.flights[0] : {};
        return [
            'SerpAPI',
            flightSegment.airline || f.airline,
            flightSegment.flight_number || f.flight_number,
            flightSegment.departure_airport ? flightSegment.departure_airport.time : 'N/A',
            flightSegment.arrival_airport ? flightSegment.arrival_airport.time : 'N/A',
            f.price,
            f.share_url || 'N/A', // Link
            new Date().toISOString()
        ];
    });
}

async function runPipeline() {
    console.log("🚀 Starting Flight Data Pipeline...");

    // Configuration
    const ORIGIN = 'SFO';
    const DEST = 'JFK';
    // Date: 2 months from now
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    const DEPART_DATE = date.toISOString().split('T')[0];

    console.log(`📅 Querying for: ${DEPART_DATE} (${ORIGIN} -> ${DEST})`);

    // 1. Fetch Data
    const [amadeusRaw, serpRaw] = await Promise.all([
        fetchFlightsAmadeus(ORIGIN, DEST, DEPART_DATE),
        fetchFlightsSerpApi(ORIGIN, DEST, DEPART_DATE)
    ]);

    console.log(`\n📥 Fetched ${amadeusRaw ? amadeusRaw.length : 0} Amadeus flights`);
    console.log(`📥 Fetched ${serpRaw ? serpRaw.length : 0} SerpAPI flights`);

    // 2. Transform Data
    const rows = [
        ...formatAmadeus(amadeusRaw),
        ...formatSerpApi(serpRaw)
    ];

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
    }
}

if (require.main === module) {
    runPipeline();
}
