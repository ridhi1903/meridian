/**
 * MERIDIAN — Cognitive Operating System · Backend
 * server.js
 *
 * Features:
 *  1. Serves frontend static files
 *  2. Auth login endpoint (mock)
 *  3. Device states endpoint (mock)
 *  4. Tasks endpoint (mock)
 *  5. GitHub Pulse — live commit velocity tracking
 *  6. ADB Active App Tracker — polls Samsung phone every 2s
 *     via USB-connected ADB, detects distraction loops
 *  7. CORS enabled, graceful cleanup on exit
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
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
   SECTION 1: ADB ACTIVE APP TRACKER
   Polls `adb shell dumpsys activity recents`
   every 2 seconds, parses Recent #0, tracks
   distraction loops in real-time.
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
};

// ── Distraction vs Productive classification ──
const DISTRACTION_APPS = new Set([
  'Instagram', 'YouTube', 'Reddit', 'X (Twitter)', 'Snapchat',
  'Netflix', 'Spotify',
]);

const PRODUCTIVE_APPS = new Set([
  'VS Code', 'Google Classroom', 'Google Docs', 'Google Sheets',
  'Microsoft Word', 'Microsoft Excel', 'Notion', 'Termux',
  'Chrome', 'Gmail', 'Calendar',
]);

// ── ADB State ──
let _activeApp = {
  package:       null,
  name:          'Waiting for ADB…',
  timestamp:     new Date().toISOString(),
  category:      'unknown', // 'distraction' | 'productive' | 'neutral'
  loopDetected:  false,
  loopSequence:  [],
  loopScore:     0,
  adbConnected:  false,
};

let _recentSequence = [];  // Rolling list of recently opened distraction apps
let _loopScore      = 0;   // Increments on each distraction switch, resets on productive
let _lastPackage    = null; // Track last package to avoid duplicates
let _adbPollTimer   = null; // Interval reference for cleanup

/**
 * Parse the output of `adb shell dumpsys activity recents`
 * and extract the package name from `Recent #0`.
 *
 * Example line:
 *   * Recent #0: Task{8ac8e85 #26140 type=standard A=1000:com.android.settings}
 *
 * We grab the package from A=UID:PACKAGE or fallback to I=PACKAGE/
 */
function parseActivePackage(output) {
  const lines = output.split('\n');

  for (const line of lines) {
    // Find the Recent #0 line
    if (/Recent\s*#0/.test(line)) {
      // Strategy 1: Match A=UID:com.package.name
      const aMatch = line.match(/A=\d+:([a-zA-Z0-9._]+)/);
      if (aMatch) return aMatch[1];

      // Strategy 2: Match A=com.package.name (no UID prefix)
      const aMatch2 = line.match(/A=([a-zA-Z][a-zA-Z0-9._]+)/);
      if (aMatch2) return aMatch2[1];

      // Strategy 3: Match I=com.package.name/
      const iMatch = line.match(/I=([a-zA-Z][a-zA-Z0-9._]+)\//);
      if (iMatch) return iMatch[1];

      break; // Only care about Recent #0
    }
  }

  return null;
}

/**
 * Resolve a package name to a friendly name.
 * Falls back to the raw package name with truncation.
 */
function resolveName(pkg) {
  if (!pkg) return 'Unknown';
  if (PACKAGE_MAP[pkg]) return PACKAGE_MAP[pkg];

  // Try partial match (e.g., com.google.android.apps.docs.editors.docs)
  for (const [key, name] of Object.entries(PACKAGE_MAP)) {
    if (pkg.startsWith(key) || key.startsWith(pkg)) return name;
  }

  // Fallback: extract the last segment of the package name
  const parts = pkg.split('.');
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/**
 * Classify an app as distraction, productive, or neutral.
 */
function classifyApp(name) {
  if (DISTRACTION_APPS.has(name)) return 'distraction';
  if (PRODUCTIVE_APPS.has(name)) return 'productive';
  return 'neutral';
}

/**
 * Update the distraction loop tracker.
 * Loop is detected when 3+ distraction apps are opened
 * consecutively without a productive app in between.
 */
function updateLoop(name, category) {
  if (category === 'distraction') {
    // Add to sequence (avoid consecutive duplicates)
    if (_recentSequence.length === 0 || _recentSequence[_recentSequence.length - 1] !== name) {
      _recentSequence.push(name);
      _loopScore = Math.min(100, _loopScore + 8); // +8 per distraction switch
    }
  } else if (category === 'productive') {
    // Productive app breaks the loop — reset sequence
    _recentSequence = [];
    _loopScore = Math.max(0, _loopScore - 5); // Slowly decay score
  }
  // Neutral apps (launcher, settings, etc.) don't affect the loop

  // Cap the rolling sequence at last 10 entries
  if (_recentSequence.length > 10) {
    _recentSequence = _recentSequence.slice(-10);
  }

  return {
    loopDetected: _recentSequence.length >= 3,
    loopSequence: _recentSequence.slice(), // copy
    loopScore:    _loopScore,
  };
}

/**
 * Execute the ADB command and update state.
 * Runs every 2 seconds via setInterval.
 */
function pollADB() {
  const cmd = `"${ADB_PATH}" shell dumpsys activity recents`;

  exec(cmd, { timeout: 5000, maxBuffer: 1024 * 512 }, (err, stdout, stderr) => {
    if (err) {
      // ADB not connected or command failed
      _activeApp.adbConnected = false;
      _activeApp.name = 'ADB Disconnected';
      _activeApp.package = null;
      _activeApp.category = 'unknown';
      _activeApp.timestamp = new Date().toISOString();
      return;
    }

    const pkg = parseActivePackage(stdout);

    if (!pkg) {
      // Could not parse — keep last known state
      return;
    }

    // Skip if same app as last poll (no switch happened)
    if (pkg === _lastPackage) {
      // Still update timestamp
      _activeApp.timestamp = new Date().toISOString();
      return;
    }

    _lastPackage = pkg;

    const name     = resolveName(pkg);
    const category = classifyApp(name);
    const loop     = updateLoop(name, category);

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

    // Console log for debugging during hackathon demo
    const color = category === 'distraction' ? '\x1b[31m' : category === 'productive' ? '\x1b[32m' : '\x1b[33m';
    console.log(`${color}[ADB] ${name}\x1b[0m (${pkg})${loop.loopDetected ? ' ⚠ LOOP DETECTED' : ''}`);
  });
}

// ── API: Get active app state ──
app.get('/api/active-app', (_req, res) => {
  res.json(_activeApp);
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
pollADB(); // Immediate first poll


/* ═══════════════════════════════════════════════
   SECTION 2: EXISTING ENDPOINTS
   (Health, Auth, Devices, Tasks)
═══════════════════════════════════════════════ */

// ── API: Health check ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'MERIDIAN',
    time:   new Date().toISOString(),
    adb:    _activeApp.adbConnected,
  });
});

// ── API: Mock session validate (credentials from .env) ──
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

// ── API: Mock device states ──
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

// ── API: Mock tasks ──
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

const GITHUB_REPO  = process.env.GITHUB_REPO || 'ridhi1903/meridian-heartbeat';
const GITHUB_REPO_API = `https://api.github.com/repos/${GITHUB_REPO}/commits`;

// In-memory cache
let _ghCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60_000; // 60 seconds

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
      error:    'Internal server error',
      message:  err.message,
      fallback: true,
    });
  }
});


/* ═══════════════════════════════════════════════
   SECTION 4: FALLBACK + STARTUP + CLEANUP
═══════════════════════════════════════════════ */

// ── Fallback: serve index.html for all other routes ──
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║   MERIDIAN COGNITIVE OS — ONLINE             ║`);
  console.log(`  ╠══════════════════════════════════════════════╣`);
  console.log(`  ║  http://localhost:${PORT}                        ║`);
  console.log(`  ║  Login: see backend/.env                      ║`);
  console.log(`  ║  ADB:   polling every 2s                     ║`);
  console.log(`  ╚══════════════════════════════════════════════╝\n`);
});

// ── Graceful cleanup — stop ADB polling on exit ──
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
process.on('exit',    () => {
  if (_adbPollTimer) clearInterval(_adbPollTimer);
});
