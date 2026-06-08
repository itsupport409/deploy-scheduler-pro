const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json({ limit: '10mb' }));

// Firebase Admin SDK — credentials resolved in priority order:
//   1. FIREBASE_SERVICE_ACCOUNT2 env var (JSON string)
//   2. GOOGLE_APPLICATION_CREDENTIALS env var (path to key file)
//   3. Any *-firebase-adminsdk-*.json file in the project directory
// User management endpoints return 503 if admin is not configured.
const fs = require('fs');
const admin = require('firebase-admin');
let adminAuth = null;

function findLocalServiceAccountFile() {
  try {
    const files = fs.readdirSync(__dirname).filter(f => /-firebase-adminsdk-.*\.json$/.test(f));
    return files.length > 0 ? path.join(__dirname, files[0]) : null;
  } catch { return null; }
}

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT2) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT2);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://firebase-db-project-496801-default-rtdb.firebaseio.com'
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      databaseURL: 'https://firebase-db-project-496801-default-rtdb.firebaseio.com'
    });
  } else {
    const localKeyFile = findLocalServiceAccountFile();
    if (localKeyFile) {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyFile, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://firebase-db-project-496801-default-rtdb.firebaseio.com'
      });
      console.log(`Firebase Admin: loaded credentials from ${path.basename(localKeyFile)}`);
    } else {
      console.warn('Firebase Admin: no credentials found — user management endpoints will return 503. Set FIREBASE_SERVICE_ACCOUNT2 to enable them.');
    }
  }
  if (admin.apps.length > 0) {
    adminAuth = admin.auth();
    // Pre-warm: fetch OAuth token now so the first real API call never hits a cold credential
    adminAuth.listUsers(1).then(() => {
      console.log('Firebase Admin initialized and credential pre-warmed.');
    }).catch(e => {
      console.warn('Firebase Admin initialized but pre-warm failed (will retry on first use):', e.message);
    });
  }
} catch (err) {
  console.warn('Firebase Admin init failed:', err.message);
}

const DB_URL = 'https://firebase-db-project-496801-default-rtdb.firebaseio.com';

const DEFAULT_LOCATIONS = [
  { id: '1', name: 'Downtown Service Center', calendarId: 'icecoldair_downtown@group.calendar.google.com' },
  { id: '2', name: 'Westside Rapid Repair', calendarId: 'icecoldair_westside@group.calendar.google.com' },
];

const DEFAULT_USERS = [
  { id: 'u0', name: 'A Butler', role: 'Administrator', email: 'abutler@icecoldair.com', avatar: '', eligibleLocationIds: ['1', '2'] },
];

function adminRequired(res) {
  if (!adminAuth) {
    res.status(503).json({ error: 'Firebase Admin SDK not configured. Set the FIREBASE_SERVICE_ACCOUNT2 environment variable.' });
    return false;
  }
  return true;
}

// Create a Firebase Auth user (admin adds staff)
app.post('/api/users/create', async (req, res) => {
  if (!adminRequired(res)) return;
  const { email, password, displayName } = req.body;
  // Retry once — first call can fail while OAuth token warms up
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const userRecord = await adminAuth.createUser({ email, password, displayName });
      return res.json({ ok: true, uid: userRecord.uid });
    } catch (err) {
      const isTokenErr = err.message?.includes('fetch a valid Google OAuth2');
      if (attempt === 1 && isTokenErr) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      console.error('Create user error:', err.message);
      return res.status(400).json({ error: err.message });
    }
  }
});

// Delete a Firebase Auth user by email (admin removes staff)
app.post('/api/users/delete', async (req, res) => {
  if (!adminRequired(res)) return;
  try {
    const { email } = req.body;
    const userRecord = await adminAuth.getUserByEmail(email);
    await adminAuth.deleteUser(userRecord.uid);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Reset a user's password by email (admin resets staff password)
app.post('/api/users/reset-password', async (req, res) => {
  if (!adminRequired(res)) return;
  try {
    const { email, newPassword } = req.body;
    const userRecord = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(userRecord.uid, { password: newPassword });
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Reset database to defaults (writes seed data to Firebase RTDB)
app.post('/api/state/reset', async (req, res) => {
  try {
    const defaultState = {
      users: DEFAULT_USERS,
      deletedUsers: [],
      locations: DEFAULT_LOCATIONS,
      shifts: [],
      templates: [],
      requests: [],
      notifications: [],
    };

    if (admin.apps.length > 0) {
      await admin.database().ref('appState').set(JSON.stringify(defaultState));
    } else {
      // No Admin SDK — client must handle the reset via direct RTDB write
      return res.status(503).json({ error: 'Admin SDK not configured for server-side reset.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Draft an email notification using Gemini (server-side only — API key stays off the browser)
app.post('/api/draft-notification', async (req, res) => {
  try {
    const { recipientName, changeType, status } = req.body || {};
    if (!recipientName || !changeType || !status) {
      return res.status(400).json({ error: 'Missing recipientName, changeType, or status' });
    }
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const fallback = {
      subject: `Schedule Update: ${changeType}`,
      body: `Hi ${recipientName}, your ${changeType} request has been ${status}.`
    };
    if (!apiKey) return res.json(fallback);
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Draft a professional email for an employee named ${recipientName}. The status of their "${changeType}" request is now "${status}". Return JSON with "subject" and "body" fields.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            body: { type: Type.STRING }
          },
          required: ['subject', 'body']
        }
      }
    });
    const data = JSON.parse(response?.text || '{}');
    res.json({
      subject: data.subject || fallback.subject,
      body: data.body || fallback.body
    });
  } catch (err) {
    console.error('POST /api/draft-notification', err);
    res.json({
      subject: `Update: ${req.body?.changeType || 'Request'}`,
      body: `Hi ${req.body?.recipientName || 'there'}, your request has been ${req.body?.status || 'updated'}. Check the app for details.`
    });
  }
});

// Serve static files from the dist directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
app.get('/index.js', (req, res) => res.sendFile(path.join(distPath, 'index.js')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
