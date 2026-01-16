const https = require('https');

// Config from js/supabase-config.js
const SUPABASE_URL = 'https://wbsfbctughwcnvvbhwsi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic2ZiY3R1Z2h3Y252dmJod3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzU5MzYsImV4cCI6MjA4Mzk1MTkzNn0.4Xj4EL3aW6bKEY1q2ILH_bSlsOgCMwmfwDWsWkJ95s4';

console.log(`Testing connection to ${SUPABASE_URL}...`);

const options = {
    hostname: 'wbsfbctughwcnvvbhwsi.supabase.co',
    path: '/rest/v1/', // Root of the API
    method: 'GET',
    headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
};

const req = https.request(options, (res) => {
    console.log(`Response Status Code: ${res.statusCode}`);

    if (res.statusCode === 200) {
        console.log('✅ SUCCESS: Connected to Supabase backend successfully.');
        console.log('The backend IS connected and working.');
    } else {
        console.log('❌ FAILURE: Received unexpected status code.');
        console.log('This might indicate a backend issue, but the server was reachable.');
    }
});

req.on('error', (e) => {
    console.error(`❌ ERROR: Could not connect to Supabase: ${e.message}`);
});

req.end();
