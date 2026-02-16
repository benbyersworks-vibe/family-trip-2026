const axios = require('axios');
const Amadeus = require('amadeus');
require('dotenv').config();

const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

async function fetchFlightsAmadeus(origin, dest, date, returnDate) {
    const amadeus = new Amadeus({
        clientId: AMADEUS_CLIENT_ID,
        clientSecret: AMADEUS_CLIENT_SECRET
    });

    try {
        const response = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: origin,
            destinationLocationCode: dest,
            departureDate: date,
            returnDate: returnDate, // Optional
            adults: '1'
        });
        return response.data;
    } catch (error) {
        console.error("Amadeus API Error:", error.response ? error.response.result : error);
        return null;
    }
}

async function fetchFlightsSerpApi(origin, dest, date, returnDate) {
    const params = {
        api_key: SERPAPI_KEY,
        engine: "google_flights",
        departure_id: origin,
        arrival_id: dest,
        outbound_date: date,
        return_date: returnDate,
        currency: "USD",
        hl: "en",
        type: returnDate ? "1" : "2" // 1 = Round Trip, 2 = One Way
    };

    try {
        const response = await axios.get('https://serpapi.com/search', { params });
        // SerpAPI response structure varies significantly for round trips vs one way
        // returning raw for server.js to parse
        return response.data;
    } catch (error) {
        console.error("SerpAPI Error:", error.message);
        return null;
    }
}

// Simple test runner
if (require.main === module) {
    (async () => {
        console.log("Fetching flight data...");
        // Example: SFO to JFK, 5 months from now (approx 2026 planning but using current date for test)
        // Amadeus/SerpApi might not support 2026 yet, so using a near future date for testing

        // Use a date 2 months from now for testing
        const today = new Date();
        today.setMonth(today.getMonth() + 2);
        const dateStr = today.toISOString().split('T')[0];

        console.log(`Testing query for ${dateStr}...`);

        console.log("--- Amadeus ---");
        const amadeusData = await fetchFlightsAmadeus('SFO', 'JFK', dateStr);
        console.log(`Amadeus Results: ${amadeusData ? amadeusData.length : 0} flights found.`);

        console.log("--- SerpAPI ---");
        const serpData = await fetchFlightsSerpApi('SFO', 'JFK', dateStr);
        console.log(`SerpAPI Results: ${serpData ? serpData.length : 0} flights found.`);
    })();
}

module.exports = { fetchFlightsAmadeus, fetchFlightsSerpApi };
