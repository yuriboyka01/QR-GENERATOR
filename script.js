// Global QR code instance
let qrcode = null;

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active tab panel
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Clear previous QR code
        clearQR();
    });
});

// Generate QR Code
function generateQR(type) {
    let data = '';

    // Get data based on type
    if (type === 'url') {
        const urlInput = document.getElementById('url-input').value.trim();
        if (!urlInput) {
            alert('Please enter a URL');
            return;
        }

        // Basic URL validation
        if (!isValidURL(urlInput)) {
            alert('Please enter a valid URL (e.g., https://example.com)');
            return;
        }

        data = urlInput;
    }
    else if (type === 'text') {
        const textInput = document.getElementById('text-input').value.trim();
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

        // Wi-Fi QR code format
        // Format: WIFI:T:WPA;S:ssid;P:password;;
        if (encryption === 'nopass') {
            data = `WIFI:T:nopass;S:${ssid};;`;
        } else {
            data = `WIFI:T:${encryption};S:${ssid};P:${password};;`;
        }
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

    // Show QR code and download button
    document.querySelector('.qr-placeholder').style.display = 'none';
    qrcodeElement.classList.add('active');
    document.getElementById('download-btn').style.display = 'block';
}

// Clear QR Code
function clearQR() {
    const qrcodeElement = document.getElementById('qrcode');
    qrcodeElement.innerHTML = '';
    qrcodeElement.classList.remove('active');
    document.querySelector('.qr-placeholder').style.display = 'block';
    document.getElementById('download-btn').style.display = 'none';
    qrcode = null;
}

// Download QR Code
function downloadQR() {
    const qrcodeElement = document.getElementById('qrcode');
    const canvas = qrcodeElement.querySelector('canvas');

    if (!canvas) {
        alert('No QR code to download. Please generate a QR code first.');
        return;
    }

    // Convert canvas to data URL
    const dataURL = canvas.toDataURL('image/png');

    // Create temporary download link
    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = dataURL;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// URL Validation Helper
function isValidURL(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Allow Enter key to generate QR code
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;

        // Don't trigger on textarea
        if (e.target.tagName === 'TEXTAREA') return;

        e.preventDefault();
        generateQR(activeTab);
    }
});
