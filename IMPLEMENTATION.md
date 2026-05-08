# MERIDIAN — Cognitive Operating System
## Implementation Document
**Samsung OpenCLAW Hackathon 2026**  
**Last Updated:** May 7, 2026  

---

## 1. Project Structure

```
meridian/
├── REQUIREMENTS.md            ← Product requirements
├── IMPLEMENTATION.md          ← This document
├── .gitignore
│
├── backend/
│   ├── package.json           ⚠️ exists but EMPTY — needs npm config
│   ├── server.js              ⚠️ exists but EMPTY — needs Express server
│   └── routes/                ❌ NOT CREATED
│       ├── auth.js            ❌ NOT CREATED
│       ├── user.js            ❌ NOT CREATED
│       └── data.js            ❌ NOT CREATED
│
└── frontend/
    ├── index.html             ✅ COMPLETE — Login page
    ├── dashboard.html         ✅ COMPLETE — Cognitive dashboard
    ├── work.html              ✅ COMPLETE — Work Life page
    ├── smarthome.html         ✅ COMPLETE — Personal Life / Smart Home
    ├── privacy.html           ✅ COMPLETE — Privacy & Ghost Layer
    │
    ├── assets/
    │   ├── icons/             ⚠️ folder exists but EMPTY
    │   └── images/            ⚠️ folder exists but EMPTY
    │
    ├── css/
    │   ├── global.css         ⚠️ exists but EMPTY (all styles are inline in HTML)
    │   ├── dashboard.css      ⚠️ exists but EMPTY
    │   ├── smarthome.css      ⚠️ exists but EMPTY
    │   ├── work.css           ⚠️ exists but EMPTY
    │   └── privacy.css        ⚠️ exists but EMPTY
    │
    └── js/
        ├── app.js             ✅ COMPLETE — Global shared layer
        ├── dashboard.js       ✅ COMPLETE — Dashboard logic
        ├── privacy.js         ✅ COMPLETE — Ghost Layer & permissions
        ├── work.js            ⚠️ exists but EMPTY — needs implementation
        └── smartphone.js      ⚠️ exists but EMPTY + WRONG NAME
                               ← should be smarthome.js
```

**Legend:** ✅ Complete · ⚠️ Exists but empty · ❌ Not created

---

## 2. Page-by-Page Implementation Status

---

### 2.1 `index.html` — Login Page ✅

**What it does:**
- Animated neural network canvas background (nodes + connections)
- MERIDIAN brand with glowing text effect
- Login form: username + password
- Credentials configured via `backend/.env` (see `.env.example`)
- Creates a session in `localStorage` with 8-hour expiry
- Animated feature pills showing system capabilities
- Live clock in status bar
- Bottom status bar (devices, cognitive score, privacy mode, OpenCLAW)

**JS (inline):**
- Canvas animation loop (neural network nodes)
- Login form validation & submission
- Session creation via `MERIDIAN.Session.create()`
- Animated counter on bottom stats

---

### 2.2 `dashboard.html` — Cognitive Dashboard ✅

**What it does:**
- Full sidebar navigation (shared across all pages)
- Topbar with live clock and device sync status
- Greeting banner (personalised with user name)
- 4 stat cards: Cognitive Score, Focus Time, Tasks Completed, Meetings
- Cognitive Score ring (SVG animated) with sub-scores (Focus Depth, Task Velocity, Distraction Rate, Recovery Speed)
- Focus score chart (Canvas API — hourly from 7AM to 2PM)
- Activity Timeline (chronological events from both domains)
- Smart Nudges panel (3 active, dismissible)
- Distraction Loop Detector (app chain, intensity gauge, block/clear buttons)
- App Usage Today (bar chart per app)
- Ghost Layer mini-toggle in sidebar

**JS (inline `<script>`):**
- Clock tick
- Score ring stroke-dashoffset animation
- Progress bar animations on load
- dismissNudge(), blockLoop(), clearLoop()
- drawFocusChart() using Canvas 2D
- togglePrivacy() / showToast()

**JS (`dashboard.js` — written, linked):**
- Time-of-day greeting (Good Morning / Afternoon / Evening / Working Late)
- Session user populate into sidebar and greeting
- Ghost Layer state restore on load
- Focus timer (live ticking from 45-min session)
- Cognitive score micro-fluctuation every 8 seconds (±2, updates ring + labels)
- Loop intensity escalation every 15s — fires urgent nudge at 80+
- Nudge badge counter sync after each dismissal
- Chart resize on window resize
- Keyboard shortcuts: `B` = block loop, `G` = ghost toggle, `Esc` = dismiss nudge
- Patches `dismissNudge()` to also sync badge count

---

### 2.3 `work.html` — Work Life Page ✅ HTML / ⚠️ JS empty

**What it does (HTML complete):**

**Work Resume / Context Recovery:**
- Recovery snapshot card showing last active file (VS Code — auth.js)
- Highlighted code block showing exact last position (JWT token expiry edge case)
- "Away timer" counting up from last session
- Resume Work button
- 4 context stats: Deep Work time, Last PR, TODOs left, Context % saved

**Task Management:**
- Task list (7/10 done) with priority badges (HIGH/MED/LOW) and source tags (VS Code, GitHub, WhatsApp)
- Click to toggle task done/undone
- Progress bar + percentage counter

**Daily Work Summary:**
- Focus time, Deep Work, Meetings, Tasks Done, App Switches, Distraction time
- Mini progress ring (70% done)

**Deep Work Sessions:**
- Per-session cards: VS Code (45m flow), Notion (18m planning), Chrome (22m research), GitHub (15m review)
- Animated session duration bars

**Connected Apps:**
- GitHub, Slack, Notion, WhatsApp, Calendar, Gmail
- Connection status badges
- Scan & Sync panel showing detected deadline from WhatsApp ("Submit by Friday")
- "Add to Calendar" button

**⚠️ MISSING from work.html (needs to be added):**
1. **Weekly Calendar view** — no calendar UI exists yet
2. **Work Output Summary** — no "wrote 3 Word docs, 2 spreadsheets" section
3. **Full chat scan UI** — only 1 hardcoded WhatsApp item; needs a full scan panel

**`work.js` — EMPTY, needs:**
- Task toggle with progress recalculation
- Resume Work button handler
- Away timer
- Calendar week renderer
- Chat scan simulation (parse messages for keywords)
- Work output summary builder
- Session bar animations on load
- Keyboard shortcuts
- Ghost Layer permission check (disable chat scan if `meridian_perm_msg = false`)

---

### 2.4 `smarthome.html` — Personal Life / Smart Home ✅ HTML / ⚠️ JS empty

**What it does (HTML complete):**

**Header stats:** Total devices on, energy usage (2.4kW), AC temp, next automation

**Device Grid (6 devices):**

| Device | Controls | Features |
|---|---|---|
| Samsung QLED TV | Power, Volume, Brightness | Runtime alert (3h 20m), schedule off |
| Samsung Wind-Free AC | Power, Temperature, Fan speed | Runtime bar |
| Smart Lights | Power, Brightness, Color preset | 5 color options |
| Samsung Washer | Power, Pause | Cycle progress bar + ETA countdown |
| Samsung Family Hub Fridge | Fridge/Freezer temp | Cannot be toggled off (safety) |
| SmartThings Camera | Power, Live preview | Standby/Recording states |

**Room filter tabs:** All Rooms, Living Room, Bedroom, Kitchen, Home Office

**Smart Scenes:** Morning, Work Mode, Relax, Sleep

**Energy Monitor:** Per-device power in kW, total

**Smart Routines (5):** Morning, Work Mode Trigger, TV Limit, Sleep, Burnout Guard — each with on/off toggle

**`smarthome.js` — EMPTY (was named `smartphone.js`), needs:**
- Device toggle logic (on/off state management)
- Slider input handlers (volume, brightness, temp)
- Fan speed button group
- Color preset selection
- Washer cycle progress simulation + ETA countdown
- Scene activation (applies settings to multiple devices)
- Routine toggle with persistence
- Room filter tab logic
- Energy monitor live update simulation
- Ghost Layer check (disable camera if `meridian_perm_camera = false`)
- Keyboard shortcuts

---

### 2.5 `privacy.html` — Privacy Mode ✅ COMPLETE

**What it does:**

**Ghost Layer Hero:**
- Master big toggle (on/off) with animated pip
- Active/Inactive badge with pulsing dot
- Description text that changes based on state
- Encryption flow visualization: Data Packet → Local Encryption → On-Device LLM → Knox Vault
- 4 status indicators: Doc Reading, Msg Content, App Tracking, Cloud Sync

**Document Preview Demo:**
- Live demo showing a confidential document
- When Ghost turns on: content progressively blurs line by line
- Ghost overlay ("CONTENT BLOCKED") slides in
- Status badge changes from "READING" to "BLOCKED"

**Data Permissions Panel:**
- 6 permission rows with individual toggles:
  - Document Content (Work Life — toggleable)
  - Message Content (Work Life — toggleable)
  - App Switching Events (Always On — locked)
  - Keyboard Input (Never — locked)
  - Screen Capture (Never — locked)
  - Location Data (Personal Life — toggleable)

**Privacy Audit Log:**
- Timestamped log of all data access events
- Colour coded: green (allowed), yellow (warn), purple (blocked)
- Export and Clear buttons

**Knox Shield card:**
- TrustZone, AES-256, Secure Enclave, Zero cloud data, FIPS 140-2
- Threat level indicator (SECURE)

**Ghost particle canvas:** Animated particle network appears behind UI when Ghost is ON

**`privacy.js` — ✅ WRITTEN AND LINKED:**
- Restores all state from `localStorage` on page load
- Populates user info from session
- Persists ghost state to `meridian_ghost_mode`
- Persists perms: `meridian_perm_doc`, `meridian_perm_msg`, `meridian_perm_loc`, `meridian_perm_camera`
- Annotates permission rows with domain labels (WORK LIFE / PERSONAL LIFE)
- Live audit event feed — alternates work events (VS Code, Notion, WhatsApp scan) and personal events (TV, camera, location) every 12–28 seconds
- Ghost-aware audit: work events show as BLOCKED when Ghost is ON
- Audit log persisted to `meridian_audit_log` in localStorage
- Patches inline `masterToggle()`, `togglePerm()`, `clearLog()` to add persistence
- Keyboard shortcuts: `G` = toggle Ghost, `P` = scroll to permissions

---

### 2.6 `js/app.js` — Global Layer ✅ COMPLETE

**What it provides to ALL pages:**

```
MERIDIAN.Session     — create, get, destroy, isActive, user, guard
MERIDIAN.Clock       — start(selector), stop
MERIDIAN.Toast       — show(msg, type, duration)
MERIDIAN.Nav         — highlightActive
MERIDIAN.GhostMode   — enable, disable, isActive
MERIDIAN.Nudges      — push, dismiss, getAll, clear
MERIDIAN.Shortcuts   — register, unregister
MERIDIAN.PageTransition — navigate(url)
MERIDIAN.OnDevice    — isProcessing, setProcessing
```

Credentials configured via `backend/.env`  
Session expires: 8 hours  

---

## 3. localStorage Keys (Cross-page State)

| Key | Type | Used By | Description |
|---|---|---|---|
| `meridian_session` | JSON | All pages | Auth session + user profile |
| `meridian_ghost_mode` | `"true"/"false"` | All pages | Ghost Layer on/off |
| `meridian_perm_doc` | `"true"/"false"` | work.html | Document content permission |
| `meridian_perm_msg` | `"true"/"false"` | work.html | Message scan permission |
| `meridian_perm_loc` | `"true"/"false"` | smarthome.html | Location permission |
| `meridian_perm_camera` | `"true"/"false"` | smarthome.html | Camera permission |
| `meridian_audit_log` | JSON array | privacy.html | Privacy audit entries |
| `meridian_nudges` | JSON array | dashboard.html | Active nudges |
| `meridian_theme` | string | All pages | Reserved for theme |

---

## 4. What Still Needs to Be Built

### Priority 1 — Critical (demo-breaking if missing)

| # | Task | File |
|---|---|---|
| 1 | Fill `work.js` — task toggle, away timer, session bars, Ghost check | `js/work.js` |
| 2 | Fill / rename `smartphone.js` → `smarthome.js` — all device controls | `js/smarthome.js` |
| 3 | Add Calendar widget to `work.html` | `work.html` |
| 4 | Add Work Output Summary section to `work.html` | `work.html` |
| 5 | Fill `backend/package.json` | `backend/package.json` |
| 6 | Fill `backend/server.js` — Express API with mock endpoints | `backend/server.js` |

### Priority 2 — Important (demo quality)

| # | Task | File |
|---|---|---|
| 7 | Add full Chat Scan panel to `work.html` (multiple messages) | `work.html` |
| 8 | Create `backend/routes/auth.js` | `backend/routes/` |
| 9 | Create `backend/routes/data.js` — mock work + home data API | `backend/routes/` |
| 10 | Create `backend/.env` | `backend/.env` |

### Priority 3 — Nice to Have

| # | Task | File |
|---|---|---|
| 11 | Extract inline CSS into `css/*.css` files | `css/` |
| 12 | Add icon assets for sidebar nav | `assets/icons/` |
| 13 | Add screenshot/mockup images | `assets/images/` |

---

## 5. Data Flow Diagram

```
LOGIN (index.html)
       |
       v
  localStorage
  meridian_session
       |
       +──────────────────────────────────────────────────┐
       |                                                  |
       v                                                  v
DASHBOARD (dashboard.html)                    PRIVACY (privacy.html)
  · Reads session for user name                 · Controls Ghost Layer
  · Reads meridian_ghost_mode                   · Writes all perm keys
  · Cognitive score, nudges                     · Writes audit log
       |                                                  |
       +──────────────┬───────────────────────────────────+
                      |
          ┌───────────┴──────────────┐
          |                          |
          v                          v
   WORK LIFE                   PERSONAL LIFE
   (work.html)                 (smarthome.html)
   · Reads meridian_perm_doc    · Reads meridian_perm_camera
   · Reads meridian_perm_msg    · Reads meridian_perm_loc
   · If ghost = true:           · If ghost = true:
     disable chat scan            disable camera feed
     hide doc content             disable location routines
```

---

## 6. Keyboard Shortcuts (All Pages)

| Page | Key | Action |
|---|---|---|
| Dashboard | `B` | Block distraction loop |
| Dashboard | `G` | Toggle Ghost Layer |
| Dashboard | `Esc` | Dismiss top nudge |
| Privacy | `G` | Toggle Ghost Layer |
| Privacy | `P` | Scroll to permissions |
| Work *(planned)* | `R` | Resume work session |
| Work *(planned)* | `N` | Add new task |
| Smart Home *(planned)* | `1–4` | Activate scene 1–4 |
| Smart Home *(planned)* | `G` | Toggle Ghost Layer |

---

## 7. Design System

### Colors
```css
--bg-primary:   #040812   /* Page background */
--bg-secondary: #080f1e   /* Sidebar background */
--bg-card:      #0d1628   /* Card background */
--cyan:         #00d4ff   /* Primary accent — Work Life */
--green:        #00ff88   /* Success / positive state */
--yellow:       #ffd700   /* Warning / pending */
--red:          #ff4757   /* Alert / distraction */
--purple:       #7c3aed   /* Ghost Layer / Privacy */
--text-primary: #e8f4fd   /* Main text */
--text-muted:   #6b8aad   /* Secondary text */
--border:       #1a2d4a   /* Card borders */
```

### Typography
- **Headings/Brand:** Orbitron (Google Fonts) — letter-spacing: 3–12px
- **Body:** Inter (Google Fonts) — weights 300, 400, 500, 600
- **Code/Mono:** JetBrains Mono (Google Fonts) — weights 400, 500

### Animation
- Page cards: `fadeIn 0.4–0.5s ease` with staggered `animation-delay`
- Bars/rings: CSS `transition: width/stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)`
- Toasts: opacity + translateY, 2.8–3s duration
- Ghost particles: Canvas `requestAnimationFrame` loop
