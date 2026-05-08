# MERIDIAN — Cognitive Operating System

> **Bridging the gap between focus and action.**

**MERIDIAN** is a Cognitive Operating System designed for the **Samsung OpenClaw Hackathon 2026**. It creates a seamless, context-aware environment that enhances focus, privacy, and smart control across your devices — powered by **Samsung Knox** for hardware-grade on-device security.

---

## Features

### 🧠 Dashboard
A unified overview of your cognitive state and daily activity.
- Real-time **Cognitive Focus Score** with animated progress ring
- Focus time, tasks completed, meetings, and distraction tracking
- **GitHub Pulse** — live commit and PR activity feed
- Activity timeline combining work and smart home events
- Smart nudge notifications (break reminders, deadline alerts, burnout warnings)

### 💼 Work Resume — Thinking Recovery Engine
Pick up exactly where you left off, even after a break.
- **Mental snapshot** of your last open file, branch, and exact code position
- Away timer counting time since last session
- One-click **Resume Work** button restoring full context
- Task list with priority badges (HIGH / MED / LOW) and completion tracking
- **Deep Work Sessions** — per-app focus sessions with animated time bars
- **Scan & Sync** — scans Gmail for deadline keywords and auto-pushes detected tasks to Calendar
- Connected apps: GitHub, Slack, Notion, Gmail, Google Calendar
- Daily work summary: focus time, deep work, meetings, app switches, distraction time

### 🏠 Smart Home Control
Full Samsung SmartThings device control from one dashboard.
- **Supported devices:** Samsung QLED TV, Wind-Free AC, Smart Lights, Washing Machine, Family Hub Fridge, SmartThings Camera
- Per-device power toggle, settings sliders, and runtime display
- **Smart Scenes:** Morning, Work Mode, Relax, Sleep — activates multiple devices at once
- **Energy Monitor** — real-time per-device power consumption (kW) and total load
- **Smart Routines** — time-based and cognitive-state-based automations (e.g. dim lights when focus score > 70, auto-off TV after 3 hours)
- Room filter (Living Room, Bedroom, Kitchen, Home Office)

### 🔒 Ghost Layer — Privacy Mode
A cross-cutting privacy layer backed by **Samsung Knox** hardware security.
- **Master Ghost Layer toggle** — instantly blocks all content reading across Work and Personal life
- **Document content blocking** — stops reading Word, PDF, and Notion page text
- **Message scan blocking** — disables Gmail body scanning and task detection
- **Camera feed disable** — cuts SmartThings camera access
- **Individual permission toggles** per domain (Work Life / Personal Life), persisted to `localStorage`
- **Privacy Audit Log** — every data access event logged with timestamp, type, and blocked/allowed status; exportable and clearable
- **Ghost mode visuals** — animated particle canvas, document blur with staggered reveal, CLASSIFIED watermark, glitch transition
- Ghost Layer state broadcast across all pages via `localStorage`

### 🛡️ Samsung Knox Integration
All sensitive processing is secured inside Samsung Knox — nothing leaves the device.

| Security Layer | Detail |
|---|---|
| **TrustZone** | Hardware-isolated secure execution environment |
| **AES-256** | All on-device data encrypted at rest |
| **Secure Enclave** | On-device LLM inference — no cloud calls |
| **Zero cloud sync** | When Ghost Layer is active, no data is transmitted externally |
| **FIPS 140-2** | Certified Knox Vault for credential and key storage |

---

## Project Structure

```
meridian/
├── backend/
│   ├── server.js          # Node.js + Express API server (port 3000)
│   ├── package.json
│   └── routes/
│       ├── auth.js        # Login / session routes
│       └── user.js        # User data routes
└── frontend/
    ├── index.html         # Login / session init
    ├── dashboard.html     # Cognitive dashboard
    ├── work.html          # Work Resume & Thinking Recovery
    ├── smarthome.html     # Smart Home control
    ├── privacy.html       # Ghost Layer & Privacy settings
    ├── css/               # Page-scoped stylesheets
    └── js/
        ├── app.js         # Global session, nudges, keyboard shortcuts
        ├── dashboard.js   # Dashboard logic & GitHub pulse
        ├── work.js        # Work resume, task management, Scan & Sync
        ├── smarthome.js   # Device control, scenes, routines
        ├── privacy.js     # Ghost Layer persistence & audit log
        └── github.js      # GitHub activity feed
```

---

## Tech Stack

- **Frontend:** Pure HTML5, CSS3 (CSS Variables, Grid, animations), Vanilla JavaScript
- **Fonts:** Orbitron (headings), Inter (body), JetBrains Mono (code)
- **Design:** Cyber-dark aesthetic — glassmorphism, glowing effects, animated canvas backgrounds
- **Backend:** Node.js + Express (running on port 3000)
- **Security:** Samsung Knox — TrustZone, AES-256, FIPS 140-2 Secure Enclave

---

## How to Run

### Backend
```bash
cd backend
npm install
node server.js
# Server starts at http://localhost:3000
```

### Frontend
Open `frontend/index.html` via any local web server (e.g. VS Code Live Server, or `npx serve frontend`).

**Login Credentials:**
| Field | Value |
|---|---|
| User ID | `admin` |
| Access Key | `meridian` |

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` | Go to Dashboard |
| `2` | Go to Work Resume |
| `3` | Go to Smart Home |
| `4` | Go to Privacy Mode |
| `G` | Toggle Ghost Layer (any page) |
| `P` | Scroll to Permissions (Privacy page) |
| `Escape` | Close active modals |

---

*Built for the Samsung OpenClaw Hackathon 2026.*
