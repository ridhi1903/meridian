/**
 * MERIDIAN — Cognitive Operating System · Backend
 * server.js
 *
 * Features:
 *  1. Hybrid App Tracking — real Digital Wellbeing baseline + live ADB delta
 *  2. Live Cognitive Score — computed from focus vs distraction ratio
 *  3. Session Nudges — triggers when distraction app hits 15min live time
 *  4. Ghost Mode — pauses live tracking, masks app names
 *  5. Distraction Loop Detector — 3+ consecutive distraction switches
 *  6. GitHub Pulse — live commit velocity tracking
 *  7. Auth, Devices, Tasks endpoints
 *  8. CORS, graceful cleanup
 */

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { exec } = require('child_process');

const app  = express();
const PORT = process.env.PORT || 8000;

// ── Full path to adb.exe (from .env) ──
const ADB_PATH = process.env.ADB_PATH || 'adb';

// ── Middleware ──
app.use(cors());
app.use(express.json());

// ── Serve frontend static files ──
app.use(express.static(path.join(__dirname, '../frontend')));


/* ═══════════════════════════════════════════════
   SECTION 1: HYBRID APP TRACKING ENGINE
   Baseline (hardcoded from Digital Wellbeing) +
   Live ADB delta = realistic usage stats
═══════════════════════════════════════════════ */

// ── Package → Friendly Name Map ──
const PACKAGE_MAP = {
  'com.instagram.android':              'Instagram',
  'com.google.android.youtube':         'YouTube',
  'com.whatsapp':                       'WhatsApp',
  'com.android.chrome':                 'Chrome',
  'com.google.android.gm':             'Gmail',
  'com.snapchat.android':               'Snapchat',
  'com.reddit.frontpage':               'Reddit',
  'com.twitter.android':                'X (Twitter)',
  'com.spotify.music':                  'Spotify',
  'com.netflix.mediaclient':            'Netflix',
  'com.discord':                        'Discord',
  'com.sec.android.app.launcher':       'Samsung Launcher',
  'com.google.android.apps.classroom':  'Google Classroom',
  'com.google.android.apps.docs':       'Google Docs',
  'com.samsung.android.incallui':       'Phone',
  'com.android.settings':              'Settings',
  'notion.id':                          'Notion',
  'com.visualstudio.code':              'VS Code',
  'com.termux':                         'Termux',
  'com.samsung.android.messaging':      'Messages',
  'com.google.android.apps.maps':       'Google Maps',
  'com.samsung.android.calendar':       'Calendar',
  'org.telegram.messenger':             'Telegram',
  'com.google.android.apps.docs.editors.docs': 'Google Docs',
  'com.google.android.apps.docs.editors.sheets': 'Google Sheets',
  'com.microsoft.office.word':          'Microsoft Word',
  'com.microsoft.office.excel':         'Microsoft Excel',
  'com.linkedin.android':               'LinkedIn',
  'in.startv.hotstar':                  'JioHotstar',
  'com.jio.media.ondemand':             'JioHotstar',
  'com.samsung.android.forest':         'Forest',
};

// ── Distraction vs Productive classification ──
const DISTRACTION_APPS = new Set([
  'Instagram', 'YouTube', 'Reddit', 'X (Twitter)', 'Snapchat',
  'Netflix', 'Spotify', 'JioHotstar',
]);

const PRODUCTIVE_APPS = new Set([
  'VS Code', 'Google Classroom', 'Google Docs', 'Google Sheets',
  'Microsoft Word', 'Microsoft Excel', 'Notion', 'Termux',
  'Chrome', 'Gmail', 'Calendar', 'LinkedIn',
]);

/* ─────────────────────────────────────────────
   HYBRID DATA MODEL
   dailyBaseline = hardcoded from real Digital Wellbeing (seconds)
   liveSessionStats = accumulated in real-time via ADB (seconds)
   Total = baseline + live
───────────────────────────────────────────── */

const dailyBaseline = {
  'WhatsApp':   5340,   // 1h 29m
  'Instagram':  3720,   // 1h 2m
  'JioHotstar': 1200,   // 20m
  'VS Code':    7200,   // 2h 0m
  'LinkedIn':   1320,   // 22m
};

// Live session accumulator — incremented by +2s every ADB poll
let liveSessionStats = {};

/**
 * Get the total usage time for an app (baseline + live).
 */
function getTotalTime(appName) {
  return (dailyBaseline[appName] || 0) + (liveSessionStats[appName] || 0);
}

/**
 * Get combined stats for all apps (baseline keys + live keys merged).
 */
function getAllAppStats() {
  const allApps = new Set([
    ...Object.keys(dailyBaseline),
    ...Object.keys(liveSessionStats),
  ]);

  const result = {};
  for (const app of allApps) {
    result[app] = {
      baseline: dailyBaseline[app] || 0,
      live:     liveSessionStats[app] || 0,
      total:    getTotalTime(app),
      category: classifyApp(app),
    };
  }
  return result;
}

/* ─────────────────────────────────────────────
   LIVE METRICS — Focus Time & Cognitive Score
───────────────────────────────────────────── */

/**
 * Calculate total Focus Time (productive apps) in seconds.
 * Uses baseline + live for all productive apps.
 */
function calcFocusTime() {
  let total = 0;
  const allApps = new Set([...Object.keys(dailyBaseline), ...Object.keys(liveSessionStats)]);
  for (const app of allApps) {
    if (PRODUCTIVE_APPS.has(app)) {
      total += getTotalTime(app);
    }
  }
  return total;
}

/**
 * Calculate total Distraction Time in seconds.
 */
function calcDistractionTime() {
  let total = 0;
  const allApps = new Set([...Object.keys(dailyBaseline), ...Object.keys(liveSessionStats)]);
  for (const app of allApps) {
    if (DISTRACTION_APPS.has(app)) {
      total += getTotalTime(app);
    }
  }
  return total;
}

/**
 * Live Cognitive Score (0–100).
 * Formula: 100 × (focusTime / (focusTime + distractionTime))
 * Clamped to [0, 100], biased slightly toward productivity.
 */
function calcCognitiveScore() {
  const focus      = calcFocusTime();
  const distract   = calcDistractionTime();
  const totalUsage = focus + distract;

  if (totalUsage === 0) return 50; // neutral baseline

  // Raw ratio: 0.0 (all distraction) to 1.0 (all productive)
  const ratio = focus / totalUsage;

  // Apply a slight sigmoid curve to make the score feel more dynamic
  // At 50/50 ratio → score ≈ 50. At 80/20 → score ≈ 85.
  const score = Math.round(100 * (1 / (1 + Math.exp(-6 * (ratio - 0.5)))));

  return Math.max(0, Math.min(100, score));
}

/* ─────────────────────────────────────────────
   SESSION NUDGE — triggers at 15min live distraction
───────────────────────────────────────────── */
const NUDGE_THRESHOLD_SEC = 900; // 15 minutes

function checkNudgeTrigger() {
  for (const [app, secs] of Object.entries(liveSessionStats)) {
    if (DISTRACTION_APPS.has(app) && secs >= NUDGE_THRESHOLD_SEC) {
      return { triggerNudge: true, nudgeApp: app, nudgeLiveSec: secs };
    }
  }
  return { triggerNudge: false, nudgeApp: null, nudgeLiveSec: 0 };
}

/* ─────────────────────────────────────────────
   GHOST MODE
───────────────────────────────────────────── */
let _ghostMode = false;

app.post('/api/toggle-ghost-mode', (_req, res) => {
  _ghostMode = !_ghostMode;
  console.log(`[MERIDIAN] Ghost Mode: ${_ghostMode ? 'ON — tracking paused' : 'OFF — tracking resumed'}`);
  res.json({ ghostMode: _ghostMode });
});

app.get('/api/ghost-mode', (_req, res) => {
  res.json({ ghostMode: _ghostMode });
});

/* ─────────────────────────────────────────────
   ADB STATE & LOOP TRACKER
───────────────────────────────────────────── */

let _activeApp = {
  package:       null,
  name:          'Waiting for ADB…',
  timestamp:     new Date().toISOString(),
  category:      'unknown',
  loopDetected:  false,
  loopSequence:  [],
  loopScore:     0,
  adbConnected:  false,
};

let _recentSequence = [];
let _loopScore      = 0;
let _lastPackage    = null;
let _adbPollTimer   = null;

/* ─────────────────────────────────────────────
   ADB PARSING
───────────────────────────────────────────── */

function parseActivePackage(output) {
  const lines = output.split('\n');
  for (const line of lines) {
    if (/Recent\s*#0/.test(line)) {
      const aMatch = line.match(/A=\d+:([a-zA-Z0-9._]+)/);
      if (aMatch) return aMatch[1];
      const aMatch2 = line.match(/A=([a-zA-Z][a-zA-Z0-9._]+)/);
      if (aMatch2) return aMatch2[1];
      const iMatch = line.match(/I=([a-zA-Z][a-zA-Z0-9._]+)\//);
      if (iMatch) return iMatch[1];
      break;
    }
  }
  return null;
}

function resolveName(pkg) {
  if (!pkg) return 'Unknown';
  if (PACKAGE_MAP[pkg]) return PACKAGE_MAP[pkg];
  for (const [key, name] of Object.entries(PACKAGE_MAP)) {
    if (pkg.startsWith(key) || key.startsWith(pkg)) return name;
  }
  const parts = pkg.split('.');
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function classifyApp(name) {
  if (DISTRACTION_APPS.has(name)) return 'distraction';
  if (PRODUCTIVE_APPS.has(name)) return 'productive';
  return 'neutral';
}

function updateLoop(name, category) {
  if (category === 'distraction') {
    if (_recentSequence.length === 0 || _recentSequence[_recentSequence.length - 1] !== name) {
      _recentSequence.push(name);
      _loopScore = Math.min(100, _loopScore + 8);
    }
  } else if (category === 'productive') {
    _recentSequence = [];
    _loopScore = Math.max(0, _loopScore - 5);
  }
  if (_recentSequence.length > 10) {
    _recentSequence = _recentSequence.slice(-10);
  }
  return {
    loopDetected: _recentSequence.length >= 3,
    loopSequence: _recentSequence.slice(),
    loopScore:    _loopScore,
  };
}

/* ─────────────────────────────────────────────
   ADB POLL — every 2 seconds
   Now also accumulates live session time
───────────────────────────────────────────── */

function pollADB() {
  // Ghost Mode — pause tracking
  if (_ghostMode) {
    _activeApp.name      = 'Classified Activity';
    _activeApp.package   = null;
    _activeApp.category  = 'ghost';
    _activeApp.timestamp = new Date().toISOString();
    _activeApp.adbConnected = true;
    return;
  }

  const cmd = `"${ADB_PATH}" shell dumpsys activity recents`;

  exec(cmd, { timeout: 5000, maxBuffer: 1024 * 512 }, (err, stdout) => {
    if (err) {
      _activeApp.adbConnected = false;
      _activeApp.name = 'ADB Disconnected';
      _activeApp.package = null;
      _activeApp.category = 'unknown';
      _activeApp.timestamp = new Date().toISOString();
      return;
    }

    const pkg = parseActivePackage(stdout);
    if (!pkg) return;

    const name     = resolveName(pkg);
    const category = classifyApp(name);

    // ── Accumulate live session time (+2s per poll) ──
    // Skip neutral apps like Launcher, Settings from accumulation
    if (category !== 'neutral') {
      liveSessionStats[name] = (liveSessionStats[name] || 0) + 2;
    }

    // Only update loop detection on app switch
    let loop = { loopDetected: _activeApp.loopDetected, loopSequence: _activeApp.loopSequence, loopScore: _activeApp.loopScore };
    if (pkg !== _lastPackage) {
      loop = updateLoop(name, category);
      _lastPackage = pkg;

      // Console log on switch
      const color = category === 'distraction' ? '\x1b[31m' : category === 'productive' ? '\x1b[32m' : '\x1b[33m';
      console.log(`${color}[ADB] ${name}\x1b[0m (${pkg}) [live: ${liveSessionStats[name] || 0}s]${loop.loopDetected ? ' ⚠ LOOP' : ''}`);
    }

    _activeApp = {
      package:       pkg,
      name,
      timestamp:     new Date().toISOString(),
      category,
      loopDetected:  loop.loopDetected,
      loopSequence:  loop.loopSequence,
      loopScore:     loop.loopScore,
      adbConnected:  true,
    };
  });
}

/* ─────────────────────────────────────────────
   API: Active App — The main endpoint
   Returns everything: current app, hybrid stats,
   cognitive score, focus time, nudge flags
───────────────────────────────────────────── */

app.get('/api/active-app', (_req, res) => {
  const focusTimeSec      = calcFocusTime();
  const distractionTimeSec = calcDistractionTime();
  const cognitiveScore    = calcCognitiveScore();
  const nudge             = checkNudgeTrigger();

  res.json({
    // Current app state
    ..._activeApp,
    ghostMode: _ghostMode,

    // Hybrid usage stats
    appStats:         getAllAppStats(),
    liveSessionStats: { ...liveSessionStats },

    // Computed metrics
    focusTimeSec,
    distractionTimeSec,
    cognitiveScore,

    // Nudge
    ...nudge,
  });
});

// ── API: Reset distraction loop manually ──
app.post('/api/active-app/reset-loop', (_req, res) => {
  _recentSequence = [];
  _loopScore = 0;
  _activeApp.loopDetected = false;
  _activeApp.loopSequence = [];
  _activeApp.loopScore = 0;
  res.json({ success: true, message: 'Loop cleared' });
});

// ── Start ADB polling ──
_adbPollTimer = setInterval(pollADB, 2000);
pollADB();


/* ═══════════════════════════════════════════════
   SECTION 2: EXISTING ENDPOINTS
   (Health, Auth, Devices, Tasks)
═══════════════════════════════════════════════ */

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'MERIDIAN',
    time:   new Date().toISOString(),
    adb:    _activeApp.adbConnected,
    ghost:  _ghostMode,
    cognitiveScore: calcCognitiveScore(),
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.AUTH_USERNAME || 'admin';
  const validPass = process.env.AUTH_PASSWORD || 'meridian';
  if (username === validUser && password === validPass) {
    res.json({
      success: true,
      user: { name: 'Anika Reddy', initials: 'AT', role: 'Security Engineer' },
      expiresIn: 8 * 60 * 60 * 1000,
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/devices', (_req, res) => {
  res.json([
    { id: 'tv',     name: 'Samsung QLED TV',   state: true,  room: 'living'  },
    { id: 'ac',     name: 'SmartThings AC',     state: true,  room: 'bedroom' },
    { id: 'lights', name: 'Smart Lights',       state: true,  room: 'living'  },
    { id: 'wash',   name: 'Smart Washer',       state: true,  room: 'kitchen' },
    { id: 'fridge', name: 'Smart Fridge',       state: true,  room: 'kitchen' },
    { id: 'camera', name: 'Security Camera',    state: false, room: 'office'  },
  ]);
});

app.get('/api/tasks', (_req, res) => {
  res.json([
    { id:1, text:'Fix JWT token validation edge case',    done:true,  priority:'HIGH',   source:'VS Code'  },
    { id:2, text:'Push PR #47 — feature/knox-auth',       done:true,  priority:'HIGH',   source:'GitHub'   },
    { id:3, text:'Review SmartThings SDK docs',           done:true,  priority:'MEDIUM', source:'Notion'   },
    { id:4, text:'Stand-up call with team',               done:true,  priority:'LOW',    source:'Calendar' },
    { id:5, text:'Write unit tests for refresh token',    done:false, priority:'HIGH',   source:'VS Code'  },
    { id:6, text:'Submit Friday deliverable',             done:false, priority:'HIGH',   source:'Gmail'    },
    { id:7, text:'Update Notion sprint board',            done:false, priority:'LOW',    source:'Notion'   },
  ]);
});


/* ═══════════════════════════════════════════════
   SECTION 3: GITHUB PULSE — Live Repo Heartbeat
═══════════════════════════════════════════════ */

const GITHUB_REPO     = process.env.GITHUB_REPO || 'ridhi1903/meridian-heartbeat';
const GITHUB_REPO_API = `https://api.github.com/repos/${GITHUB_REPO}/commits`;

let _ghCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60_000;

function calcVelocityScore(lastCommitDate) {
  const elapsedMs = Date.now() - new Date(lastCommitDate).getTime();
  const elapsedH  = elapsedMs / (1000 * 60 * 60);
  if (elapsedH <= 1)  return Math.round(100 - elapsedH * 10);
  if (elapsedH <= 24) return Math.round(90 - ((elapsedH - 1) / 23) * 70);
  return 20;
}

function analyseTargets(commits) {
  const DAILY_TARGET = 3;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCommits = commits.filter(c => {
    const d = (c.commit?.author?.date || '').slice(0, 10);
    return d === todayStr;
  });
  const actual = todayCommits.length;
  const pct    = Math.min(100, Math.round((actual / DAILY_TARGET) * 100));
  const met    = actual >= DAILY_TARGET;
  let message;
  if (met)             message = `Target met! ${actual}/${DAILY_TARGET} commits today. Great momentum.`;
  else if (actual > 0) message = `${actual}/${DAILY_TARGET} commits today — ${DAILY_TARGET - actual} more to hit your target.`;
  else                 message = `No commits today yet — your target is ${DAILY_TARGET}. Start pushing!`;
  return { target: DAILY_TARGET, actual, met, pct, message };
}

app.get('/api/github-pulse', async (_req, res) => {
  try {
    if (_ghCache.data && Date.now() - _ghCache.fetchedAt < CACHE_TTL_MS) {
      return res.json(_ghCache.data);
    }

    const ghRes = await fetch(GITHUB_REPO_API + '?per_page=30', {
      headers: {
        'Accept':     'application/vnd.github.v3+json',
        'User-Agent': 'MERIDIAN-CognitiveOS/1.0',
      },
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      console.warn('[github-pulse] GitHub API:', ghRes.status, errText.slice(0, 200));
      return res.json({
        lastCommitMessage: 'Waiting for first commit…',
        timestamp:         new Date().toISOString(),
        author:            'meridian-heartbeat',
        velocityScore:     0,
        commitCount:       0,
        targets:           analyseTargets([]),
        _note:             'GitHub returned ' + ghRes.status,
      });
    }

    const commits = await ghRes.json();
    if (!Array.isArray(commits) || commits.length === 0) {
      return res.json({
        lastCommitMessage: 'No commits found',
        timestamp:         new Date().toISOString(),
        author:            'unknown',
        velocityScore:     0,
        commitCount:       0,
        targets:           analyseTargets([]),
      });
    }

    const latest    = commits[0];
    const commitMsg = latest.commit?.message || '';
    const timestamp = latest.commit?.author?.date || new Date().toISOString();
    const author    = latest.commit?.author?.name || latest.author?.login || 'unknown';

    const payload = {
      lastCommitMessage: commitMsg,
      timestamp,
      author,
      velocityScore: calcVelocityScore(timestamp),
      commitCount:   commits.length,
      targets:       analyseTargets(commits),
    };

    _ghCache = { data: payload, fetchedAt: Date.now() };
    return res.json(payload);
  } catch (err) {
    console.error('[github-pulse] Fetch failed:', err.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      fallback: true,
    });
  }
});


/* ═══════════════════════════════════════════════
   SECTION 4: FALLBACK + STARTUP + CLEANUP
═══════════════════════════════════════════════ */

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║   MERIDIAN COGNITIVE OS — ONLINE             ║`);
  console.log(`  ╠══════════════════════════════════════════════╣`);
  console.log(`  ║  http://localhost:${PORT}                        ║`);
  console.log(`  ║  Login: see backend/.env                      ║`);
  console.log(`  ║  ADB:   hybrid model — baseline + live       ║`);
  console.log(`  ╚══════════════════════════════════════════════╝`);
  console.log(`  Baseline: ${Object.entries(dailyBaseline).map(([k,v]) => `${k}: ${Math.round(v/60)}m`).join(', ')}\n`);
});

function cleanup() {
  console.log('\n[MERIDIAN] Shutting down — clearing ADB poll timer…');
  if (_adbPollTimer) {
    clearInterval(_adbPollTimer);
    _adbPollTimer = null;
  }
  process.exit(0);
}

process.on('SIGINT',  cleanup);
process.on('SIGTERM', cleanup);
process.on('exit',    () => { if (_adbPollTimer) clearInterval(_adbPollTimer); });
