const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration
const API_KEY = process.env.SERPAPI_KEY || '038ee6b4459e2ffc3dbc5fb9baa0279adc02c97c9817aace98d85ed09a486610';
const OUTPUT_FILE = path.join(__dirname, 'stays_data.json');

const LOCATIONS = [
    { name: 'London', query: 'vacation rentals in London, UK' },
    { name: 'Edinburgh', query: 'vacation rentals in Edinburgh, UK' }
];

const COMMON_PARAMS = {
    engine: 'google_hotels',
    q: '',
    check_in_date: '2026-06-01',
    check_out_date: '2026-06-07',
    adults: 2,
    children: 1,
    children_ages: 15, // Updated to 15
    min_bedrooms: 2,
    currency: 'USD',
    gl: 'us',
    hl: 'en',
    api_key: API_KEY
};

async function fetchLocationData(location) {
    return new Promise((resolve, reject) => {
        const params = { ...COMMON_PARAMS, q: location.query };
        const queryString = new URLSearchParams(params).toString();
        const url = `https://serpapi.com/search.json?${queryString}`;

        console.log(`Fetching data for ${location.name}...`);

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(json.error));
                    } else {
                        resolve({ location: location.name, data: json });
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
}

function processResults(results) {
    const processedListings = [];

    results.forEach(result => {
        const locationName = result.location;
        const properties = result.data.properties || [];

        properties.forEach(prop => {
            // Safe extraction of data points
            const priceStr = prop.rate_per_night?.lowest || '0';
            const price = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;

            // Only include if we have a price and image
            if (price > 0 && prop.images && prop.images.length > 0) {
                processedListings.push({
                    title: prop.name || 'Unknown Property',
                    location: locationName,
                    rating: prop.overall_rating || 0,
                    bedrooms: 2, // Inferred from query, API doesn't always strictly return it in snippet
                    pricePerNight: price,
                    platform: 'Google Rentals', // Aggregated source
                    color: '#4285F4', // Google Blue
                    image: prop.images[0].thumbnail || prop.images[0].original,
                    link: prop.link || '#'
                });
            }
        });
    });

    return processedListings;
}

async function main() {
    if (API_KEY === 'YOUR_SERPAPI_KEY_HERE') {
        console.error('Error: Please set your SerpAPI Key in the script or via SERPAPI_KEY environment variable.');
        return;
    }

    try {
        const promises = LOCATIONS.map(loc => fetchLocationData(loc));
        const rawResults = await Promise.all(promises);

        const cleanListings = processResults(rawResults);

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cleanListings, null, 2));
        console.log(`\nSuccess! Saved ${cleanListings.length} listings to ${OUTPUT_FILE}`);
        console.log('Refresh your dashboard to see the live data.');

    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

main();
