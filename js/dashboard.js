// Dashboard JavaScript with Supabase

// Global variables
let currentUser = null;
let userData = null;
let qrcode = null;
let currentQRData = null;
let activityChart = null;

// Note: PLAN_LIMITS is defined in auth.js which is loaded before this file

// Initialize dashboard
async function initDashboard() {
    // Check authentication
    currentUser = await requireAuth('login.html');
    if (!currentUser) return;

    // Load user data
    await loadUserData();

    // Load QR history
    await loadQRHistory();

    // Update stats
    updateStats();

    // Setup UI
    setupTabs();
    setupSidebar();
    setupLogout();
}

// Load user data from Supabase
async function loadUserData() {
    try {
        const result = await getUserData(currentUser.id);
        if (result.success) {
            userData = result.data;
            updateUserUI();
            updateLimitBanner();
        } else {
            console.error('Failed to load user data:', result.error);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update user info in sidebar
function updateUserUI() {
    const userName = document.getElementById('user-name');
    const userPlan = document.getElementById('user-plan');
    const userAvatar = document.getElementById('user-avatar');

    // Supabase user metadata or profile data
    const displayName = userData?.display_name || currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];

    userName.textContent = displayName;
    userPlan.textContent = `${(userData?.plan || 'free').charAt(0).toUpperCase() + (userData?.plan || 'free').slice(1)} Plan`;
    userAvatar.textContent = displayName.substring(0, 2).toUpperCase();

    // Update branding visibility
    const brandingSec = document.getElementById('branding-section');
    const brandingCheck = document.getElementById('use-logo');
    if (brandingSec && brandingCheck) {
        const plan = userData?.plan || 'free';
        if (plan === 'free') {
            brandingSec.style.display = 'block';
            brandingCheck.checked = true;
            brandingCheck.disabled = true;
            if (brandingCheck.nextElementSibling) {
                brandingCheck.nextElementSibling.textContent = 'Add ZSOS Logo to QR Code (Free Plan Only)';
            }
        } else {
            brandingSec.style.display = 'none';
            brandingCheck.checked = false;
        }
    }
}

// Update limit banner
function updateLimitBanner() {
    const banner = document.getElementById('limit-banner');
    const title = document.getElementById('limit-title');
    const message = document.getElementById('limit-message');
    const qrUsed = document.getElementById('qr-used');
    const qrLimit = document.getElementById('qr-limit');

    const plan = userData?.plan || 'free';
    const used = userData?.qr_count || 0;
    const limit = PLAN_LIMITS[plan]?.qrCodes || 5;

    qrUsed.textContent = used;
    qrLimit.textContent = limit === Infinity ? '∞' : limit;

    if (plan === 'free') {
        banner.style.display = 'flex';
        title.textContent = "You're on the Free plan";
    } else if (plan === 'pro') {
        banner.style.display = 'none';
    } else {
        banner.style.display = 'none';
    }

    // Warning if near limit
    if (limit !== Infinity && used >= limit * 0.8) {
        banner.style.display = 'flex';
        banner.style.background = 'linear-gradient(135deg, #fef3c7, #fde68a)';
        title.textContent = 'Almost at your limit!';
    }
}

// Setup tabs
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab panel
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');

            // Clear QR code
            clearQR();
        });
    });
}

// Setup mobile sidebar
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggle = document.getElementById('sidebar-toggle');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });
}

// Setup logout
function setupLogout() {
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut();
    });
}

// Generate QR Code
async function generateQR(type) {
    // Check if user can create more QR codes
    const canCreate = await canCreateQR(currentUser.id);
    if (!canCreate.allowed) {
        alert(canCreate.reason);
        // If they can't create, we should probably stop them from generating even locally? 
        // Or let them generate but fail to save? 
        // The original code stopped here.
        return;
    }

    let data = '';
    let label = '';
    let isDynamic = false;
    let shortCode = null;
    let destination = null;

    // Get data based on type
    if (type === 'url') {
        const urlInput = document.getElementById('url-input').value.trim();
        label = document.getElementById('url-label').value.trim() || urlInput;

        if (!urlInput) {
            alert('Please enter a URL');
            return;
        }

        if (!isValidURL(urlInput)) {
            alert('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        data = urlInput;
    }
    else if (type === 'text') {
        const textInput = document.getElementById('text-input').value.trim();
        label = document.getElementById('text-label').value.trim() || textInput.substring(0, 30);

        if (!textInput) {
            alert('Please enter some text');
            return;
        }
        data = textInput;
    }
    else if (type === 'wifi') {
        const ssid = document.getElementById('wifi-ssid').value.trim();
        const password = document.getElementById('wifi-password').value;
        const encryption = document.getElementById('wifi-encryption').value;

        if (!ssid) {
            alert('Please enter a Wi-Fi network name (SSID)');
            return;
        }

        label = ssid;

        if (encryption === 'nopass') {
            data = `WIFI:T:nopass;S:${ssid};;`;
        } else {
            data = `WIFI:T:${encryption};S:${ssid};P:${password};;`;
        }
    }
    else if (type === 'dynamic') {
        const dynamicUrl = document.getElementById('dynamic-url').value.trim();
        label = document.getElementById('dynamic-label').value.trim() || 'Dynamic Link';

        if (!dynamicUrl) {
            alert('Please enter a destination URL');
            return;
        }

        if (!isValidURL(dynamicUrl)) {
            alert('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        // Generate a unique short code
        shortCode = generateShortCode();

        // Get the base URL for redirects
        const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', '');

        // The QR code points to the redirect page
        data = `${baseUrl}r.html?code=${shortCode}`;
        destination = dynamicUrl;
        isDynamic = true;

        // Store the redirect info for saving (needs to wait for user to click save)
        currentQRData = {
            type,
            data,
            label,
            is_dynamic: true,
            short_code: shortCode,
            destination: destination
        };

        // Note: Original code generated QR immediately for dynamic. Let's do that.
        // Create the QR code
        clearQR();
        const qrcodeElement = document.getElementById('qrcode');
        qrcode = new QRCode(qrcodeElement, {
            text: data,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Update UI
        document.getElementById('qr-placeholder').style.display = 'none';
        document.getElementById('qr-preview').classList.add('active');
        document.getElementById('download-btn').disabled = false;
        document.getElementById('save-btn').disabled = false;

        return; // Exit early, we've handled everything for dynamic
    }
    else if (type === 'vcard') {
        const fn = document.getElementById('vcard-first-name').value.trim();
        const ln = document.getElementById('vcard-last-name').value.trim();
        const phone = document.getElementById('vcard-phone').value.trim();
        const email = document.getElementById('vcard-email').value.trim();
        const company = document.getElementById('vcard-company').value.trim();
        const job = document.getElementById('vcard-job').value.trim();
        const site = document.getElementById('vcard-website').value.trim();

        if (!fn && !ln && !company) {
            alert('Please enter at least a name or company');
            return;
        }

        label = `${fn} ${ln}`.trim() || company;

        data = `BEGIN:VCARD
VERSION:3.0
N:${ln};${fn};;;
FN:${fn} ${ln}
ORG:${company}
TITLE:${job}
TEL;TYPE=CELL:${phone}
EMAIL:${email}
URL:${site}
END:VCARD`;
    }

    // Clear previous QR code
    clearQR();

    // Create new QR code
    const qrcodeElement = document.getElementById('qrcode');
    qrcode = new QRCode(qrcodeElement, {
        text: data,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Store current QR data
    currentQRData = { type, data, label, is_dynamic: isDynamic };

    // Check plan for branding (Free = Mandatory, Others = None)
    const activePlan = userData?.plan || 'free';
    if (activePlan === 'free') {
        setTimeout(addLogoToQR, 50);
    }

    // Update UI
    document.getElementById('qr-placeholder').style.display = 'none';
    document.getElementById('qr-preview').classList.add('active');
    document.getElementById('download-btn').disabled = false;
    document.getElementById('save-btn').disabled = false;
}

// Clear QR Code
function clearQR() {
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';
    document.getElementById('qr-placeholder').style.display = 'block';
    document.getElementById('qr-preview').classList.remove('active');
    document.getElementById('download-btn').disabled = true;
    document.getElementById('save-btn').disabled = true;
    qrcode = null;
    currentQRData = null;
}

// Download QR Code
function downloadQR() {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) {
        alert('No QR code to download. Please generate a QR code first.');
        return;
    }

    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `qrcode-${currentQRData?.label || Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Save QR Code to Supabase
async function saveQR() {
    if (!currentQRData) {
        alert('No QR code to save. Please generate a QR code first.');
        return;
    }

    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png');

    try {
        // Demo mode - save to memory
        if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
            const newQR = {
                id: 'demo-qr-' + Date.now(),
                user_id: currentUser.id,
                type: currentQRData.type,
                content: currentQRData.data,
                label: currentQRData.label,
                data_url: dataURL,
                is_dynamic: currentQRData.is_dynamic || false,
                short_code: currentQRData.short_code || null,
                destination: currentQRData.destination || null,
                created_at: new Date().toISOString()
            };
            demoQRHistory.unshift(newQR);

            if (currentQRData.is_dynamic) {
                demoRedirects[currentQRData.short_code] = {
                    destination: currentQRData.destination,
                    label: currentQRData.label,
                    active: true,
                    clicks: 0
                };
            }

            await incrementQRCount(currentUser.id);
            await loadUserData();
            await loadQRHistory();
            updateStats();
            clearQR();
            clearInputs();

            const message = currentQRData.is_dynamic
                ? 'Dynamic QR code saved! You can edit the destination URL anytime from your history.'
                : 'QR code saved successfully!';
            alert(message);
            return;
        }

        // If this is a dynamic QR code, also save the redirect
        if (currentQRData.is_dynamic) {
            // Note: In Supabase we should insert into redirects table
            const { error: redirectError } = await supabaseClient
                .from('redirects')
                .insert({
                    short_code: currentQRData.short_code,
                    user_id: currentUser.id,
                    destination: currentQRData.destination,
                    label: currentQRData.label,
                    active: true,
                    clicks: 0
                });

            if (redirectError) throw redirectError;
        }

        // Save QR code data
        const { error: qrError } = await supabaseClient
            .from('qr_codes')
            .insert({
                user_id: currentUser.id,
                type: currentQRData.type,
                content: currentQRData.data,
                label: currentQRData.label,
                data_url: dataURL,
                is_dynamic: currentQRData.is_dynamic || false,
                short_code: currentQRData.short_code || null,
                destination: currentQRData.destination || null
            });

        if (qrError) throw qrError;

        // Increment user's QR count
        await incrementQRCount(currentUser.id);

        // Reload user data and history
        await loadUserData();
        await loadQRHistory();
        updateStats();

        // Clear form
        clearQR();
        clearInputs();

        const message = currentQRData.is_dynamic
            ? 'Dynamic QR code saved! You can edit the destination URL anytime from your history.'
            : 'QR code saved successfully!';
        alert(message);
    } catch (error) {
        console.error('Error saving QR code:', error);
        alert('Failed to save QR code. Please try again.');
    }
}

// Clear input fields
function clearInputs() {
    document.getElementById('url-input').value = '';
    document.getElementById('url-label').value = '';
    document.getElementById('text-input').value = '';
    document.getElementById('text-label').value = '';
    document.getElementById('wifi-ssid').value = '';
    document.getElementById('wifi-password').value = '';
    document.getElementById('dynamic-url').value = '';
    document.getElementById('dynamic-label').value = '';
    document.getElementById('vcard-first-name').value = '';
    document.getElementById('vcard-last-name').value = '';
    document.getElementById('vcard-phone').value = '';
    document.getElementById('vcard-email').value = '';
    document.getElementById('vcard-company').value = '';
    document.getElementById('vcard-job').value = '';
    document.getElementById('vcard-website').value = '';
}

// Add logo to QR code
function addLogoToQR() {
    const qrContainer = document.getElementById('qrcode');
    const canvas = qrContainer.querySelector('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    // Use the Base64 logo from js/logo.js to avoid "tainted canvas" security errors
    // caused by loading local files directly in browser
    if (typeof ZSOS_LOGO_BASE64 !== 'undefined') {
        img.src = ZSOS_LOGO_BASE64;
    } else {
        // Fallback or error
        console.error('ZSOS_LOGO_BASE64 not found. Make sure js/logo.js is loaded.');
        return;
    }

    img.onload = () => {
        // Calculate size (20% of QR size)
        const size = canvas.width * 0.2;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;

        // Draw white background for logo
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 5, y - 5, size + 10, size + 10);

        // Draw logo
        ctx.drawImage(img, x, y, size, size);

        // Update the img element created by qrcodejs (it usually creates both canvas and img for fallback)
        const qrImg = qrContainer.querySelector('img');
        if (qrImg) {
            qrImg.src = canvas.toDataURL();
        }
    };
}

// Generate short code for dynamic URLs
function generateShortCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Load QR History from Supabase
async function loadQRHistory() {
    const historyGrid = document.getElementById('history-grid');
    const emptyState = document.getElementById('empty-state');

    // Clear existing cards (except empty state)
    Array.from(historyGrid.children).forEach(child => {
        if (child.id !== 'empty-state') {
            child.remove();
        }
    });

    // Demo mode - use in-memory data
    if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
        if (demoQRHistory.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        demoQRHistory.forEach(qr => {
            const card = createHistoryCard(qr.id, qr);
            historyGrid.appendChild(card);
        });
        return;
    }

    try {
        const plan = userData?.plan || 'free';
        const historyDays = PLAN_LIMITS[plan]?.historyDays || 7;

        let query = supabaseClient
            .from('qr_codes')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);

        // Apply date filter for free/pro plans
        if (historyDays !== Infinity) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - historyDays);
            query = query.gte('created_at', cutoffDate.toISOString());
        }

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        data.forEach(qr => {
            const card = createHistoryCard(qr.id, qr);
            historyGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading QR history:', error);
    }
}

// Create history card element
function createHistoryCard(id, data) {
    const card = document.createElement('div');
    card.className = 'history-card';

    // Check if this is a dynamic QR code
    const isDynamic = data.is_dynamic || data.type === 'dynamic';
    const typeLabel = isDynamic ? 'DYNAMIC' : data.type.toUpperCase();
    const escLabel = (data.label || '').replace(/'/g, "\\'");

    // Format date properly from ISO string
    const dateStr = data.created_at ? new Date(data.created_at) : new Date();

    card.innerHTML = `
        <div class="history-qr">
            <img src="${data.data_url}" alt="QR Code">
        </div>
        <div class="history-info">
            <div class="history-type" style="${isDynamic ? 'color: var(--success);' : ''}">${typeLabel}</div>
            <div class="history-content" title="${data.label}">${data.label}</div>
            <div class="history-date">${formatDate(dateStr)}</div>
            ${isDynamic ? `<div style="font-size: 11px; color: var(--gray-400); margin-top: 2px;">→ ${truncateUrl(data.destination)}</div>` : ''}
        </div>
        <div class="history-actions">
            ${isDynamic ? `
            <button onclick="editDynamicQR('${data.short_code}', '${escLabel}')" title="Edit Destination" style="background: var(--primary-light); color: var(--primary);">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
            </button>
            ` : ''}
            <button onclick="downloadHistoryQR('${data.data_url}', '${escLabel}')" title="Download">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
            <button class="delete" onclick="deleteQR('${id}', ${isDynamic}, '${data.short_code || ''}')" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </div>
    `;
    return card;
}

// Truncate URL for display
function truncateUrl(url) {
    if (!url) return '';
    if (url.length <= 35) return url;
    return url.substring(0, 35) + '...';
}

// Edit dynamic QR code destination
async function editDynamicQR(shortCode, label) {
    // Fetch current destination
    const { data: currentDoc, error } = await supabaseClient
        .from('redirects')
        .select('destination')
        .eq('short_code', shortCode)
        .single();

    const currentDestination = currentDoc ? currentDoc.destination : '';

    const newDestination = prompt(`Edit destination URL for "${label}":`, currentDestination);

    if (newDestination === null) return; // User cancelled

    if (!newDestination.trim()) {
        alert('Destination URL cannot be empty.');
        return;
    }

    if (!isValidURL(newDestination.trim())) {
        alert('Please enter a valid URL (e.g., https://example.com)');
        return;
    }

    try {
        const { error: updateError } = await supabaseClient
            .from('redirects')
            .update({
                destination: newDestination.trim(),
                updated_at: new Date().toISOString()
            })
            .eq('short_code', shortCode);

        if (updateError) throw updateError;

        // Also update in qr_codes collection
        const { error: qrError } = await supabaseClient
            .from('qr_codes')
            .update({ destination: newDestination.trim() })
            .eq('short_code', shortCode);

        // Even if qr code update failed (unlikely), we should alert success as redirect is key
        if (qrError) console.error("Error updating duplicate in qr_codes", qrError);

        alert('Destination URL updated successfully! The QR code now points to the new URL.');
        await loadQRHistory();
    } catch (error) {
        console.error('Error updating destination:', error);
        alert('Failed to update destination. Please try again.');
    }
}

// Download QR from history
function downloadHistoryQR(dataUrl, label) {
    const link = document.createElement('a');
    link.download = `qrcode-${label || Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Delete QR code
async function deleteQR(id, isDynamic = false, shortCode = '') {
    if (!confirm('Are you sure you want to delete this QR code?')) return;

    try {
        const { error: deleteError } = await supabaseClient
            .from('qr_codes')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // If dynamic, also delete the redirect
        if (isDynamic && shortCode) {
            await supabaseClient
                .from('redirects')
                .delete()
                .eq('short_code', shortCode);
        }

        // Decrement QR count
        await decrementQRCount(currentUser.id);

        // Reload
        await loadUserData();
        await loadQRHistory();
        updateStats();
    } catch (error) {
        console.error('Error deleting QR code:', error);
        alert('Failed to delete QR code. Please try again.');
    }
}

// Update stats
async function updateStats() {
    try {
        const plan = userData?.plan || 'free';
        const used = userData?.qr_count || 0;
        const limit = PLAN_LIMITS[plan]?.qrCodes || 5;
        const remaining = limit === Infinity ? '∞' : Math.max(0, limit - used);

        document.getElementById('stat-total').textContent = used;
        document.getElementById('stat-remaining').textContent = remaining;

        // Demo mode - count from memory
        if (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) {
            let urlCount = 0;
            let wifiCount = 0;
            demoQRHistory.forEach(qr => {
                if (qr.type === 'url') urlCount++;
                if (qr.type === 'wifi') wifiCount++;
            });
            document.getElementById('stat-urls').textContent = urlCount;
            document.getElementById('stat-wifi').textContent = wifiCount;

            renderChart(demoQRHistory);
            return;
        }

        // Count by type
        // Efficient way: use count() with filters, but that effectively costs read units or similar.
        // Or just fetch all (capped at say 1000 for stats?).

        const { data: qrData, error } = await supabaseClient
            .from('qr_codes')
            .select('type, created_at')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        let urlCount = 0;
        let wifiCount = 0;

        qrData.forEach(data => {
            const type = data.type;
            if (type === 'url') urlCount++;
            if (type === 'wifi') wifiCount++;
        });

        document.getElementById('stat-urls').textContent = urlCount;
        document.getElementById('stat-wifi').textContent = wifiCount;

        renderChart(qrData);
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Helper: Validate URL
function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Helper: Format date
function formatDate(date) {
    if (!date) return 'Just now';

    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// Render Analytics Chart
function renderChart(data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    // Process data: Group by date (last 7 days)
    const counts = {};
    const labels = [];
    const today = new Date();

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        labels.push(dateStr);
        counts[dateStr] = 0;
    }

    data.forEach(item => {
        const k = item.created_at || item.createdAt; // handle both just in case
        if (!k) return;

        const date = new Date(k);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (counts[dateStr] !== undefined) {
            counts[dateStr]++;
        }
    });

    const chartData = labels.map(label => counts[label]);

    // Destroy existing chart if any
    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'QR Codes Created',
                data: chartData,
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3498db',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return `${context.parsed.y} QR Codes`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Handle sidebar navigation on mobile when resizing
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initDashboard);
