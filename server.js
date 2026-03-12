const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json({ limit: '10mb' }));

// API: get full state (no currentUser - client rehydrates from users + localStorage)
app.get('/api/state', (req, res) => {
  try {
    const state = db.getState();
    res.json(state);
  } catch (err) {
    console.error('GET /api/state', err);
    res.status(500).json({ error: 'Failed to load state' });
  }
});

// API: save full state
app.post('/api/state', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    db.setState(payload);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/state', err);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// API: database size (for Admin panel)
app.get('/api/state/size', (req, res) => {
  try {
    const size = db.getDbSize();
    res.json(size);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get size' });
  }
});

// API: reset database to seed data (Format System)
app.post('/api/state/reset', (req, res) => {
  try {
    db.resetDatabase();
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/state/reset', err);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// API: draft email notification (server-side Gemini; no @google/genai in browser)
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

// Serve static files from the 'dist' directory (explicit paths for Cloud Run)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Explicitly serve index.html at root and index.js so 404s are avoided on some hosts
app.get('/', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});
app.get('/index.js', (req, res) => {
  res.sendFile(path.join(distPath, 'index.js'));
});

// SPA fallback: any other GET (except API) returns index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database init failed:', err);
  process.exit(1);
});
