const http = require('http');

http.get('http://localhost:3000/api/history', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("--- API Response Preview (First 3 items) ---");
            console.log(JSON.stringify(json.slice(0, 3), null, 2));

            // Check specific logic
            const directFlights = json.filter(i => i.isDirect === 'Yes');
            console.log(`\nTotal Items: ${json.length}`);
            console.log(`Items with isDirect='Yes': ${directFlights.length}`);
        } catch (e) {
            console.error("Failed to parse JSON:", e.message);
            console.log("Raw Data:", data);
        }
    });
}).on('error', (err) => {
    console.error("Error connecting to server:", err.message);
});
