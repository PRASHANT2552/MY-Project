require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Sessions (keeps the user logged in via a cookie) ----------
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-.env',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
  })
);

// ---------- Very simple file-based "database" ----------
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

// ---------- Auth routes ----------
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are all required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const users = readUsers();
    const emailLower = email.trim().toLowerCase();

    if (users.some((u) => u.email === emailLower)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'user_' + Date.now(),
      name: name.trim(),
      email: emailLower,
      passwordHash
    };

    users.push(newUser);
    writeUsers(users);

    req.session.user = publicUser(newUser);
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Something went wrong while signing up.' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = readUsers();
    const emailLower = email.trim().toLowerCase();
    const user = users.find((u) => u.email === emailLower);

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    req.session.user = publicUser(user);
    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong while logging in.' });
  }
});

app.get('/auth/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Please sign in first.' });
  }
  next();
}

// ---------- Chat endpoint (Gemini API), now login-protected ----------
const MODEL = 'gemini-3.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const SYSTEM_PROMPT =
  'You are Edith, a helpful AI assistant. Answer clearly and concisely, including step-by-step reasoning for logic or math questions.';

app.post('/api/chat', requireLogin, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: 'Server is missing GEMINI_API_KEY. Add it to your .env file and restart the server.' });
    }

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini API error:', response.status, errBody);
      return res.status(response.status).json({ error: `Gemini API error (${response.status})` });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({ reply: reply || '(empty response)' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
