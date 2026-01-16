
// Supabase Configuration
// REPLACE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://wbsfbctughwcnvvbhwsi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic2ZiY3R1Z2h3Y252dmJod3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzU5MzYsImV4cCI6MjA4Mzk1MTkzNn0.4Xj4EL3aW6bKEY1q2ILH_bSlsOgCMwmfwDWsWkJ95s4';

// Initialize Supabase client
// We use 'supabaseClient' to avoid conflict with the global 'supabase' object from the CDN library
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;

console.log('Supabase client initialized');
