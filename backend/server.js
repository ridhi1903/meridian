const express = require('express');
const cors    = require('cors');
const path    = require('path');

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

// ── API: Mock session validate ──
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'meridian') {
    res.json({
      success: true,
      user: { name: 'Anika Reddy', initials: 'AT', role: 'Security Engineer', email: 'admin@meridian.io' },
      expiresIn: 8 * 60 * 60 * 1000
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
