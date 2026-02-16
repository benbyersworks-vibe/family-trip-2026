const axios = require('axios');

async function testServer() {
    const url = 'http://localhost:3000/run-pipeline';

    // Test 1: Missing Fields
    try {
        console.log("Test 1: Sending empty request...");
        await axios.post(url, {});
    } catch (e) {
        console.log("✅ Expected Error:", e.response ? e.response.data : e.message);
    }

    // Test 2: Origin == Dest
    try {
        console.log("\nTest 2: Sending Origin == Dest...");
        await axios.post(url, { origin: 'SFO', dest: 'SFO', date: '2026-05-01' });
    } catch (e) {
        console.log("✅ Expected Error:", e.response ? e.response.data : e.message);
    }

    // Test 3: Past Date
    try {
        console.log("\nTest 3: Sending Past Date...");
        await axios.post(url, { origin: 'SFO', dest: 'JFK', date: '2020-01-01' });
    } catch (e) {
        console.log("✅ Expected Error:", e.response ? e.response.data : e.message);
    }

    // Test 4: Return Date Before Departure
    try {
        console.log("\nTest 4: Return Date < Departure...");
        await axios.post(url, { origin: 'SFO', dest: 'JFK', date: '2026-05-05', returnDate: '2026-05-01' });
    } catch (e) {
        console.log("✅ Expected Error:", e.response ? e.response.data : e.message);
    }

    console.log("\n--- Tests Complete ---");
}

testServer();
