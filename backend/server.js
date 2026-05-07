const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const authRouter = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API: Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', system: 'MERIDIAN', time: new Date().toISOString() });
});

// ── API: Auth routes (login / logout / validate) ──
app.use('/api/auth', authRouter);

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

/* ─────────────────────────────────────────────
   API: GitHub Pulse — Live repo heartbeat
   Fetches commit data from a public GitHub repo
   and derives a velocity score + target analysis.
───────────────────────────────────────────── */

const GITHUB_REPO_API =
  'https://api.github.com/repos/ridhi1903/meridian-heartbeat/commits';

// In-memory cache: { data, fetchedAt }
let _ghCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Calculate velocity score (0-100) from the time
 * elapsed since the most recent commit.
 *   ≤ 1 hour  → 90-100
 *   1-24 hours → proportional scale-down to 20
 *   > 24 hours → 20
 */
function calcVelocityScore(lastCommitDate) {
  const elapsedMs = Date.now() - new Date(lastCommitDate).getTime();
  const elapsedH  = elapsedMs / (1000 * 60 * 60);

  if (elapsedH <= 1) {
    // Within 1 hour: linear 100 → 90
    return Math.round(100 - elapsedH * 10);
  }
  if (elapsedH <= 24) {
    // 1h → 24h: linear 90 → 20
    return Math.round(90 - ((elapsedH - 1) / 23) * 70);
  }
  return 20; // stale
}

/**
 * Analyse whether today's preset target is being met.
 *   - DAILY_TARGET: 3 commits/day
 *   Returns { target, actual, met, pct, message }
 */
function analyseTargets(commits) {
  const DAILY_TARGET = 3;
  const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const todayCommits = commits.filter(c => {
    const d = (c.commit?.author?.date || '').slice(0, 10);
    return d === todayStr;
  });

  const actual = todayCommits.length;
  const pct    = Math.min(100, Math.round((actual / DAILY_TARGET) * 100));
  const met    = actual >= DAILY_TARGET;

  let message;
  if (met)           message = `Target met! ${actual}/${DAILY_TARGET} commits today. Great momentum.`;
  else if (actual > 0) message = `${actual}/${DAILY_TARGET} commits today — ${DAILY_TARGET - actual} more to hit your target.`;
  else               message = `No commits today yet — your target is ${DAILY_TARGET}. Start pushing!`;

  return { target: DAILY_TARGET, actual, met, pct, message };
}

app.get('/api/github-pulse', async (_req, res) => {
  try {
    // ── Serve cache if still fresh ──
    if (_ghCache.data && Date.now() - _ghCache.fetchedAt < CACHE_TTL_MS) {
      return res.json(_ghCache.data);
    }

    // ── Fetch from GitHub ──
    const ghRes = await fetch(GITHUB_REPO_API + '?per_page=30', {
      headers: {
        'Accept':     'application/vnd.github.v3+json',
        'User-Agent': 'MERIDIAN-CognitiveOS/1.0',
      },
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      console.warn('[github-pulse] GitHub API:', ghRes.status, errText.slice(0, 200));
      // Return graceful fallback instead of an error —
      // repo may be empty (409) or rate-limited (403).
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

    // ── Update cache ──
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

// ── Fallback: serve index.html for all other routes ──
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   MERIDIAN COGNITIVE OS — ONLINE    ║`);
  console.log(`  ╠══════════════════════════════════════╣`);
  console.log(`  ║  http://localhost:${PORT}               ║`);
  console.log(`  ║  Login: admin / meridian             ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
