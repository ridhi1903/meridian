const express = require('express');
const router  = express.Router();

/* ─────────────────────────────────────────────────────────────────
   AUTH ROUTES  —  /api/auth/*
   Purpose: Handle user authentication for the MERIDIAN OS.

   Why this file exists:
   • Keeps authentication logic separate from server.js so the main
     server file stays readable and each concern has one home.
   • In a real deployment you'd swap the hardcoded credential check
     here with a DB lookup + bcrypt compare — only this file changes.
   • Provides three endpoints the frontend (app.js) calls:
       POST /api/auth/login    — validate credentials, return session
       POST /api/auth/logout   — acknowledge logout (client clears state)
       GET  /api/auth/validate — check if a token/session is still live
───────────────────────────────────────────────────────────────── */

// Hardcoded user (replace with DB lookup in production)
const USERS = [
  {
    username : 'admin',
    password : 'meridian',          // ⚠ plain-text only acceptable for demo
    name     : 'Anika Reddy',
    initials : 'AT',
    role     : 'Security Engineer',
    email    : 'admin@meridian.io',
  },
];

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// In-memory active-session store  { token → { user, expiresAt } }
// (A real app would use Redis or signed JWTs)
const _sessions = new Map();

function _generateToken() {
  return [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
}

// ── POST /api/auth/login ──────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required.' });
  }

  const user = USERS.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const token     = _generateToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  _sessions.set(token, { user, expiresAt });

  return res.json({
    success   : true,
    token,
    expiresIn : SESSION_TTL_MS,
    user      : { name: user.name, initials: user.initials, role: user.role, email: user.email },
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────
router.post('/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (token) _sessions.delete(token);
  return res.json({ success: true, message: 'Logged out.' });
});

// ── GET /api/auth/validate ────────────────────────────────────────
router.get('/validate', (req, res) => {
  const token   = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const session = _sessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    _sessions.delete(token);
    return res.status(401).json({ valid: false, message: 'Session expired or invalid.' });
  }

  return res.json({
    valid : true,
    user  : { name: session.user.name, initials: session.user.initials, role: session.user.role, email: session.user.email },
    expiresAt: session.expiresAt,
  });
});

module.exports = router;
