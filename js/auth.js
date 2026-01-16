// Authentication Module with Supabase

// ========== DEMO MODE ==========
// Set to true to bypass Supabase authentication for testing
const DEMO_MODE = false;

// Demo user data (used when DEMO_MODE is true)
const DEMO_USER = {
    id: 'demo-user-123',
    email: 'demo@qrbaker.com',
    user_metadata: { full_name: 'Demo User' }
};

const DEMO_USER_DATA = {
    email: 'demo@qrbaker.com',
    display_name: 'Demo User',
    plan: 'pro',  // Give demo user Pro plan to show all features
    qr_count: 3,
    created_at: new Date()
};

// Demo QR history (stored in memory)
let demoQRHistory = [
    {
        id: 'demo-qr-1',
        user_id: 'demo-user-123',
        type: 'url',
        content: 'https://example.com',
        label: 'Example Website',
        data_url: '',
        is_dynamic: false,
        created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'demo-qr-2',
        user_id: 'demo-user-123',
        type: 'dynamic',
        content: 'https://qrbaker.com/r.html?code=DemoLink',
        label: 'My Campaign',
        data_url: '',
        is_dynamic: true,
        short_code: 'DemoLink',
        destination: 'https://google.com',
        created_at: new Date(Date.now() - 3600000).toISOString()
    }
];

let demoRedirects = {
    'DemoLink': {
        destination: 'https://google.com',
        label: 'My Campaign',
        active: true,
        clicks: 42
    }
};
// ================================

// Plan limits
const PLAN_LIMITS = {
    free: { qrCodes: 5, historyDays: 7 },
    pro: { qrCodes: 100, historyDays: 30 },
    business: { qrCodes: Infinity, historyDays: Infinity }
};

// Sign Up
async function signUp(email, password, name = '') {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                },
            },
        });

        if (error) throw error;
        const user = data.user;

        // Create user profile in 'profiles' table 
        // Note: Existing trigger might handle this, but if not we do it manually.
        // We'll update if it exists or insert if it doesn't.
        if (user) {
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: email,
                    display_name: name || email.split('@')[0],
                    plan: 'free',
                    qr_count: 0,
                    created_at: new Date().toISOString()
                });

            if (profileError) {
                console.error('Error creating profile:', profileError);
                // Proceed anyway as auth was successful
            }
        }

        return { success: true, user, session: data.session };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
    }
}

// Sign In
async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
    }
}

// Sign Out
async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: error.message };
    }
}

// Password Reset
async function resetPassword(email) {
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        return { success: false, error: error.message };
    }
}

// Resend Confirmation Email
async function resendConfirmationEmail(email) {
    try {
        const { error } = await supabaseClient.auth.resend({
            type: 'signup',
            email: email,
        });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Resend confirmation error:', error);
        return { success: false, error: error.message };
    }
}

// Get current user
async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

// Auth state listener
function onAuthStateChange(callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null);
    });
}

// Get user data from Database
async function getUserData(userId) {
    // Demo mode
    if (DEMO_MODE) {
        return { success: true, data: DEMO_USER_DATA };
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        // If error is code PGRST116, it means no rows returned (user exists in Auth but not in profiles)
        // We should try to create the profile now.
        if (error && (error.code === 'PGRST116' || error.message.includes('JSON object requested, multiple (or no) rows returned'))) {
            console.log('Profile missing, correcting...');
            const user = await getCurrentUser();

            if (user) {
                const { data: newProfile, error: createError } = await supabaseClient
                    .from('profiles')
                    .upsert({
                        id: userId,
                        email: user.email,
                        display_name: user.user_metadata?.full_name || user.email.split('@')[0],
                        plan: 'free',
                        qr_count: 0,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                return { success: true, data: newProfile };
            }
        }

        if (error) throw error;

        if (data) {
            return { success: true, data: data };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('Get user data error:', error);
        return { success: false, error: error.message };
    }
}

// Update user plan
async function updateUserPlan(userId, plan) {
    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ plan: plan })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update plan error:', error);
        return { success: false, error: error.message };
    }
}

// Check if user can create more QR codes
async function canCreateQR(userId) {
    // Demo mode - always allow
    if (DEMO_MODE) {
        return { allowed: true, limit: 100, used: DEMO_USER_DATA.qr_count };
    }

    try {
        const userData = await getUserData(userId);
        if (!userData.success) return { allowed: false, reason: 'User not found' };

        const { plan, qr_count } = userData.data;
        // Map null/undefined plan to free
        const effectivePlan = plan || 'free';
        const limit = PLAN_LIMITS[effectivePlan]?.qrCodes || PLAN_LIMITS.free.qrCodes;
        const used = qr_count || 0;

        if (used >= limit) {
            return {
                allowed: false,
                reason: `You've reached your ${effectivePlan} plan limit of ${limit} QR codes. Upgrade to create more!`,
                limit,
                used: used
            };
        }

        return { allowed: true, limit, used: used };
    } catch (error) {
        console.error('Check QR limit error:', error);
        return { allowed: false, reason: error.message };
    }
}

// Increment QR count
async function incrementQRCount(userId) {
    // Demo mode
    if (DEMO_MODE) {
        DEMO_USER_DATA.qr_count++;
        return { success: true };
    }

    try {
        // We can't use FieldValue.increment in Supabase client directly in the same way.
        // Best practice is a stored procedure (RPC) or just read-modify-write if concurrency isn't huge.
        // For simplicity, we'll use a read-modify-write or assume the trigger handles it? 
        // Let's implement a simple RPC call if we had one, but standard update is safer for now.
        // Or better: let's fetch current count and update.

        const { data: profile, error: fetchError } = await supabaseClient
            .from('profiles')
            .select('qr_count')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const newCount = (profile.qr_count || 0) + 1;

        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ qr_count: newCount })
            .eq('id', userId);

        if (updateError) throw updateError;

        return { success: true };
    } catch (error) {
        console.error('Increment QR count error:', error);
        return { success: false, error: error.message };
    }
}

// Decrement QR count
async function decrementQRCount(userId) {
    // Demo mode
    if (DEMO_MODE) {
        DEMO_USER_DATA.qr_count--;
        return { success: true };
    }

    try {
        const { data: profile, error: fetchError } = await supabaseClient
            .from('profiles')
            .select('qr_count')
            .eq('id', userId)
            .single();

        if (fetchError) throw fetchError;

        const newCount = Math.max(0, (profile.qr_count || 0) - 1);

        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({ qr_count: newCount })
            .eq('id', userId);

        if (updateError) throw updateError;

        return { success: true };
    } catch (error) {
        console.error('Decrement QR count error:', error);
        return { success: false, error: error.message };
    }
}


// Route protection - redirect if not authenticated
async function requireAuth(redirectUrl = 'login.html') {
    // Demo mode
    if (DEMO_MODE) {
        return DEMO_USER;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = redirectUrl;
        return null;
    }

    return session.user;
}

// Redirect if already authenticated
async function redirectIfAuth(redirectUrl = 'dashboard.html') {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        window.location.href = redirectUrl;
        return session.user;
    }
    return null;
}

// Password strength checker (unchanged)
function checkPasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
}
