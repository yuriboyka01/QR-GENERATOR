# 🔲 QRForge - Professional QR Code SaaS Platform

A production-ready, multi-page QR Code SaaS web application with authentication, pricing plans, dashboard, and user-scoped data persistence.

## ✨ Features

- **Multi-page Architecture**: Landing, Login, Signup, Pricing, Dashboard
- **User Authentication**: Firebase Auth with email/password and Google OAuth
- **QR Code Generation**: URL, Text, Wi-Fi QR codes with instant generation
- **User Dashboard**: Personal QR history, stats, and account management
- **Plan-based Limits**: Free (5 QR/mo), Pro (100 QR/mo), Business (unlimited)
- **Cloud Storage**: Firestore database for user data and QR history
- **Modern SaaS Design**: Professional UI with indigo accent color
- **Fully Responsive**: Works on all devices

## 📁 Project Structure

```
qr app/
├── index.html              # Landing page
├── login.html              # Login page
├── signup.html             # Signup page
├── pricing.html            # Pricing/plans page
├── dashboard.html          # Protected dashboard
├── r.html                  # Redirect handler for dynamic QR codes
├── css/
│   ├── style.css           # Global design system
│   └── dashboard.css       # Dashboard-specific styles
├── js/
│   ├── firebase-config.js  # Firebase configuration
│   ├── auth.js             # Authentication logic
│   ├── app.js              # Landing page scripts
│   └── dashboard.js        # Dashboard & QR logic
└── README.md               # This file
```

## 🔧 Setup Instructions

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable Authentication:
   - Go to Build → Authentication → Get started
   - Enable Email/Password sign-in
   - Enable Google sign-in (optional)
4. Enable Firestore:
   - Go to Build → Firestore Database → Create database
   - Start in test mode (or configure rules for production)

### 2. Get Firebase Config

1. In Firebase Console, go to Project Settings (gear icon)
2. Scroll to "Your apps" and click the web icon (</>)
3. Register your app and copy the config object

### 3. Update Firebase Config

Edit `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};
```

### 4. Configure Firestore Rules

In Firebase Console → Firestore → Rules, add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own QR codes
    match /qr_codes/{qrId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Redirects - allow anyone to read (for redirect handler), only owner can write
    match /redirects/{shortCode} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### 5. Create Firestore Indexes

If you see index errors in the console, click the link provided to create the required index, or create manually:
- Collection: `qr_codes`
- Fields: `userId (Ascending)`, `createdAt (Descending)`

## 🚀 Deployment

### Option 1: Vercel (Recommended)

```bash
npm i -g vercel
cd "c:\Users\welcome\Desktop\qr app"
vercel
```

Or drag-and-drop folder at [vercel.com](https://vercel.com)

### Option 2: Netlify

1. Visit [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `qr app` folder
3. Done!

### Option 3: GitHub Pages

```bash
cd "c:\Users\welcome\Desktop\qr app"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/qrforge.git
git push -u origin main
```

Enable Pages in repository Settings → Pages

## 💻 Local Development

Open `index.html` directly or use a local server:

```bash
npx serve
```

## 🗂️ Database Schema

### Users Collection (`users/{userId}`)
```javascript
{
  email: "user@example.com",
  displayName: "John Doe",
  plan: "free", // free | pro | business
  qrCount: 5,
  createdAt: Timestamp
}
```

### QR Codes Collection (`qr_codes/{qrId}`)
```javascript
{
  userId: "uid123",
  type: "url", // url | text | wifi | dynamic
  content: "https://example.com",
  label: "My Website",
  dataUrl: "data:image/png;base64,...",
  isDynamic: false,      // true for dynamic QR codes
  shortCode: null,       // e.g., "AbC12xYz" for dynamic
  destination: null,     // actual URL for dynamic
  createdAt: Timestamp
}
```

### Redirects Collection (`redirects/{shortCode}`)
```javascript
{
  userId: "uid123",
  shortCode: "AbC12xYz",
  destination: "https://example.com",
  label: "My Campaign",
  active: true,
  clicks: 42,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## 🔄 Dynamic QR Codes

Dynamic QR codes let you **change the destination URL anytime** without reprinting the QR code!

**How it works:**
1. QR code points to → `yoursite.com/r.html?code=AbC12xYz`
2. `r.html` looks up the short code in Firestore
3. Redirects user to the actual destination
4. You can update the destination in your dashboard anytime!

**Use cases:**
- Marketing campaigns (change landing pages)
- Event links (update event details)
- Product pages (redirect to new products)
- A/B testing (swap destinations)

## 💰 Pricing Tiers

| Feature | Free | Pro ($9/mo) | Business ($29/mo) |
|---------|------|-------------|-------------------|
| QR codes/month | 5 | 100 | Unlimited |
| History retention | 7 days | 30 days | Unlimited |
| QR types | All | All | All |
| Download PNG | ✓ | ✓ | ✓ |
| Priority support | ✗ | ✓ | ✓ |
| Custom branding | ✗ | ✗ | ✓ |

## 🔒 Security Notes

- All authentication handled by Firebase Auth
- User data isolated via Firestore security rules
- No sensitive data stored on client
- HTTPS required for production

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase (Auth + Firestore)
- **QR Generation**: qrcodejs library
- **Hosting**: Vercel / Netlify / GitHub Pages

## 📄 License

Free to use and modify. Built for learning and production use.

---

**Built with ❤️ as a Micro-SaaS MVP**
