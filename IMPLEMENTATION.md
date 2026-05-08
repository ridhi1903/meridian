# MERIDIAN — Cognitive Operating System
## Implementation Document
**Samsung OpenCLAW Hackathon 2026**  
**Last Updated:** May 8, 2026  

---

## 1. Project Structure

```
meridian/
├── REQUIREMENTS.md            ← Product requirements
├── IMPLEMENTATION.md          ← This document
├── README.md                  ← Setup & feature guide
├── .gitignore
│
├── backend/
│   ├── package.json           ← Express, dotenv, cors dependencies
│   ├── server.js              ← Full Express API (port 8000)
│   ├── .env                   ← Environment config (AUTH_USERNAME, AUTH_PASSWORD, PORT)
│   └── routes/
│       ├── auth.js            ← Authentication routes
│       └── user.js            ← User data routes
│
└── frontend/
    ├── index.html             ← Login page
    ├── dashboard.html         ← Cognitive dashboard
    ├── work.html              ← Work Life / Thinking Recovery
    ├── smarthome.html         ← Personal Life / Smart Home
    ├── privacy.html           ← Ghost Layer & Privacy
    ├── analytics.html         ← Analytics & productivity trends
    ├── nudges.html            ← Smart Nudges management centre
    ├── integrations.html      ← Third-party integrations hub
    ├── settings.html          ← System settings (8 tabs, 13 themes)
    │
    ├── assets/
    │   ├── icons/             ← Navigation and UI icon assets
    │   └── images/            ← Application image assets
    │
    ├── css/
    │   ├── global.css         ← Global shared styles
    │   ├── dashboard.css      ← Dashboard page styles
    │   ├── github-pulse.css   ← GitHub pulse component styles
    │   ├── smarthome.css      ← Smart home page styles
    │   ├── work.css           ← Work life page styles
    │   └── privacy.css        ← Privacy page styles
    │
    └── js/
        ├── app.js             ← Global shared layer (session, theme, clock, nudges, shortcuts)
        ├── dashboard.js       ← Dashboard logic & GitHub pulse
        ├── github.js          ← GitHub activity feed
        ├── privacy.js         ← Ghost Layer persistence & audit log
        ├── work.js            ← Task management, context recovery, Scan & Sync
        └── smarthome.js       ← Device control, scenes, routines, energy monitor
```

---

## 2. Backend Implementation

### 2.1 `backend/server.js` — Express API ✅ COMPLETE

**Port:** 8000 (via `backend/.env` → `PORT=8000`)  
**Dependencies:** `express`, `cors`, `dotenv`, `child_process`

**API Endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticates user; returns session token |
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/active-app` | Returns current foreground app + cognitive metrics |
| `POST` | `/api/active-app/reset-loop` | Resets distraction loop detector state |
| `GET` | `/api/cognitive-score` | Returns current computed cognitive score |
| `GET` | `/api/narrative-insight` | Returns AI-generated focus narrative |
| `GET` | `/api/mental-snapshot` | Returns mental state summary for current session |
| `GET` | `/api/nudges` | Returns active nudge list |
| `GET` | `/api/devices` | Returns SmartThings device list |
| `GET` | `/api/tasks` | Returns task list |
| `GET` | `/api/github-pulse` | Returns recent GitHub activity feed |
| `GET` | `/api/ghost-mode` | Returns current ghost mode state |
| `POST` | `/api/toggle-ghost-mode` | Toggles ghost mode on/off |

**Key Systems:**
- **Hybrid App Tracker:** ADB polling + Digital Wellbeing baseline; detects foreground app changes
- **Loop Detector:** Identifies repeated app-switching patterns; escalates intensity over 15 min; triggers urgent nudge at intensity ≥ 80
- **Cognitive Score Formula:** Based on focus depth, distraction rate, task velocity, recovery speed
- **Auth:** Credentials from `process.env.AUTH_USERNAME` / `process.env.AUTH_PASSWORD` (defaults: `admin` / `meridian`)

---

## 3. Page-by-Page Implementation Status

---

### 3.1 `index.html` — Login Page ✅ COMPLETE

**Features:**
- Animated neural network canvas (nodes + particle connections)
- MERIDIAN brand with glowing Orbitron text
- Login form: username + password; session created with 8-hour expiry
- Animated feature pills and bottom status bar (devices, cognitive score, privacy mode)
- Live clock in status bar

**JS (inline):**
- Canvas neural network animation loop
- `MERIDIAN.Session.create()` on successful login → redirects to `dashboard.html`

---

### 3.2 `dashboard.html` — Cognitive Dashboard ✅ COMPLETE

**Features:**
- Sidebar navigation (shared pattern, all nav links wired)
- Topbar with live clock (`#clock`) and device sync status
- Personalised greeting (time-of-day: Good Morning / Afternoon / Evening / Working Late)
- 4 stat cards: Cognitive Score, Focus Time, Tasks Completed, Meetings today
- Cognitive Score ring (SVG animated, stroke-dashoffset) with 4 sub-scores
- Focus score chart (Canvas 2D, hourly from 7AM–2PM)
- Activity Timeline (mixed work + personal events, chronological)
- Smart Nudges panel (3 nudges, dismissible, badge-synced)
- Distraction Loop Detector (app chain, escalating intensity gauge, block + clear)
- App Usage breakdown bar chart
- Ghost Layer mini-toggle in sidebar
- GitHub Pulse feed (live commits/PRs)

**JS (`dashboard.js` — linked):**
- Time-of-day greeting, session user populate
- Ghost Layer state restore on load
- Focus timer ticking from 45-min session
- Cognitive score micro-fluctuation every 8s (±2, updates ring + labels)
- Loop intensity escalation every 15s → urgent nudge at 80+
- Nudge badge counter sync on each dismiss
- Canvas focus chart, window resize handler
- Keyboard shortcuts: `B` = block loop, `G` = ghost toggle, `Esc` = dismiss nudge
- Patches `dismissNudge()` to sync badge

---

### 3.3 `work.html` — Work Life / Thinking Recovery ✅ COMPLETE

**Features:**
- Context Recovery card: last active file (VS Code — auth.js), exact code position, away timer
- Resume Work button
- 4 context stats: Deep Work time, Last PR, TODOs left, Context % saved
- Task list (7/10 done) with HIGH/MED/LOW priority badges and VS Code / GitHub / Slack source tags; click to toggle
- Progress bar + percentage counter
- Daily Work Summary: focus time, deep work, meetings, tasks done, app switches, distraction time
- Deep Work Sessions: per-app animated bars (VS Code, Notion, Chrome, GitHub)
- Scan & Sync: Gmail deadline detected → "submit by Friday" → Add to Calendar
- Connected Apps: GitHub, Slack, Notion, Calendar, Gmail

**JS (`work.js` — linked):**
- Task toggle with live progress recalculation
- Resume Work handler + away timer
- Session bar animations on load
- Ghost Layer permission check (disables Scan & Sync if `meridian_perm_msg = false`)
- Keyboard shortcuts

---

### 3.4 `smarthome.html` — Personal Life / Smart Home ✅ COMPLETE

**Features:**
- Header stats: total devices on, energy usage (2.4 kW), AC temp, next automation
- 6 device cards: Samsung QLED TV, Wind-Free AC, Smart Lights, Washing Machine, Family Hub Fridge, SmartThings Camera
- Per-device: power toggle, settings sliders, runtime bar
- Room filter tabs: All Rooms, Living Room, Bedroom, Kitchen, Home Office
- Smart Scenes: Morning, Work Mode, Relax, Sleep (one active at a time)
- Energy Monitor: per-device kW + total consumption
- Smart Routines (5): Morning, Work Mode Trigger, TV Limit, Sleep, Burnout Guard — each with on/off toggle

**JS (`smarthome.js` — linked):**
- Device toggle state management
- Slider handlers (volume, brightness, temperature, fan speed)
- Color preset selection for smart lights
- Washer cycle progress simulation + ETA countdown
- Scene activation (multi-device state apply)
- Routine toggle with `localStorage` persistence
- Room filter tab logic
- Energy monitor live update simulation
- Ghost Layer check (disables camera if `meridian_perm_camera = false`)
- Keyboard shortcuts

---

### 3.5 `privacy.html` — Privacy Mode ✅ COMPLETE

**Features:**
- Master Ghost Layer toggle (big animated pip, active/inactive badge, pulsing dot)
- Description text changes based on Ghost state
- Encryption flow visualization: Data Packet → Local Encryption → On-Device LLM → Knox Vault
- 4 status indicators: Doc Reading, Msg Content, App Tracking, Cloud Sync
- Live Document Preview Demo — content blurs line-by-line when Ghost turns on, CONTENT BLOCKED overlay slides in
- Data Permissions Panel: 6 rows (Doc Content, Message Content, App Switching, Keyboard Input, Screen Capture, Location Data) — toggleable where applicable, locked for others
- Privacy Audit Log: timestamped events, green (allowed) / yellow (warn) / accent (blocked), Export + Clear buttons
- Knox Shield card: TrustZone, AES-256, Secure Enclave, FIPS 140-2, threat level indicator
- Ghost particle canvas (animated network, appears when Ghost is ON)

**Theme integration:** All ghost/privacy accent colours use `var(--ghost-rgb)` and CSS vars derived from the active theme — no hardcoded purple values.

**JS (`privacy.js` — linked):**
- Restores all state from `localStorage` on page load
- Persists ghost state to `meridian_ghost_mode`
- Persists permissions: `meridian_perm_doc`, `meridian_perm_msg`, `meridian_perm_loc`, `meridian_perm_camera`
- Live audit event feed: alternates work events (VS Code, Notion, Gmail) and personal events (TV, camera, location) every 12–28s
- Ghost-aware audit: work events shown as BLOCKED when Ghost is ON
- Audit log persisted to `meridian_audit_log`
- Patches `masterToggle()`, `togglePerm()`, `clearLog()`
- Keyboard shortcuts: `G` = toggle Ghost, `P` = scroll to permissions

---

### 3.6 `analytics.html` — Analytics ✅ COMPLETE

**Features:**
- Cognitive score trend charts over time
- App usage breakdown (productive vs. distraction split)
- Focus session history and patterns
- Weekly productivity summary

---

### 3.7 `nudges.html` — Smart Nudges Centre ✅ COMPLETE

**Features:**
- Page title: SMART NUDGES with live active badge count
- Category filter tabs: All, Focus, Work, Home, Health
- 5 nudge cards with HIGH / MEDIUM / LOW priority colour indicators (left border stripe)
- Per-nudge: icon, title, description, time ago, action button + dismiss
- Nudge IDs: `n1` (Context Switch HIGH), `n2` (Gmail Deadline HIGH), `n3` (Break Reminder MED), `n4` (Home MED), `n5` (Health LOW)
- Dismiss animation: opacity fade + translateX + max-height collapse (0.4s)
- Badge count starts at 5 in `meridian_nudge_count`; decrements on each dismiss; syncs across all pages
- `updateCounts()` writes updated count to `localStorage` and syncs `#navBadge` and `#headerBadge`

---

### 3.8 `integrations.html` — Integrations Hub ✅ COMPLETE

**Features:**
- Lists all supported third-party services: Gmail, Google Calendar, GitHub, Notion, Slack, SmartThings, Samsung Health
- Per-integration: icon, name, connection status badge, last sync time
- Connect / Disconnect controls
- Connected service IDs persisted to `meridian_integrations` in `localStorage`

---

### 3.9 `settings.html` — System Settings ✅ COMPLETE

**Features:**
- 8 left-tab sections: Profile, Appearance, Notifications, Dashboard, Integration Permissions, Privacy & Ghost Layer, Knox & Security, Advanced
- Live topbar clock with `id="clock"` (syncs with MERIDIAN.Clock)

**Appearance tab — 13 themes:**

| Category | Themes |
|---|---|
| Dark | `cyber-dark`, `midnight`, `matrix`, `slate`, `monochrome` |
| Warm | `ember`, `rosewood`, `amber`, `solar` |
| Cool | `ocean`, `forest`, `lilac`, `aurora`, `breeze` |

**Advanced tab — Clock & Font:**
- `id="clockFormatSelect"` — options: `value="24"` (default), `value="12"`
- `id="fontSizeSelect"` — options: `value="12"`, `value="14"` (default), `value="16"`
- `applyClockFormat(val)` — saves to `meridian_clock_format`, calls `MERIDIAN.Clock.stop()` + `MERIDIAN.Clock.start()` to apply live
- `applyFontSize(val)` — saves to `meridian_font_size`, sets `document.documentElement.style.fontSize`

**Integration Permissions tab:**
- 7 service cards (Gmail, GCal, GitHub, Notion, Slack, SmartThings, Samsung Health)
- Per-service READ / WRITE / EXECUTE / ADMIN scope toggles

**Key JS functions (inline):**
- `setTheme(id)` — applies theme vars to `:root`, saves to `meridian_theme` + `meridian_theme_vars`
- `applyTheme(id)` — calls `MERIDIAN.Theme.apply()` after saving
- `saveAll()` — persists theme + toggles + clockFormat + fontSize to `localStorage`
- `resetAll()` — clears all settings keys and reloads page
- On-load IIFE restores saved clockFormat and fontSize selections

---

### 3.10 `js/app.js` — Global Shared Layer ✅ COMPLETE

**MERIDIAN namespace exports:**

```
MERIDIAN.Session         — create, get, destroy, isActive, user, guard
MERIDIAN.Clock           — start('#clock, [data-meridian-clock]'), stop()
MERIDIAN.Toast           — show(msg, type, duration)
MERIDIAN.Nav             — highlightActive()
MERIDIAN.GhostMode       — enable, disable, isActive
MERIDIAN.Nudges          — push, dismiss, getAll, clear, getBadgeCount, setBadgeCount
MERIDIAN.Shortcuts       — register, unregister
MERIDIAN.PageTransition  — navigate(url)
MERIDIAN.OnDevice        — isProcessing, setProcessing
MERIDIAN.Theme           — apply()
```

**Key behaviours:**
- `Clock.start()` default selector: `'#clock, [data-meridian-clock]'` — targets clock on all pages
- `Clock.start()` reads `meridian_clock_format` on every tick — clock format always reflects current setting
- `Theme.apply()` reads `meridian_theme_vars` from `localStorage`, sets all CSS vars on `:root`, then derives `--ghost`, `--ghost-rgb`, `--ghost-dim`, `--ghost-mid`, `--purple`, `--purple-dim` from `--cyan` to ensure privacy page follows active theme accent
- `Theme.apply()` also injects `<style id="meridian-theme-override">` with `!important` overrides for `.sidebar`, `.topbar`, `.grid-bg` to prevent inline styles from blocking theme application
- On `DOMContentLoaded`: restores `meridian_font_size` to `document.documentElement.style.fontSize` and initialises nudge badge from `meridian_nudge_count`

---

## 4. localStorage Keys Reference

| Key | Type | Used By | Description |
|---|---|---|---|
| `meridian_session` | JSON | All pages | Auth session + user profile, 8h expiry |
| `meridian_ghost_mode` | `"true"/"false"` | All pages | Ghost Layer on/off |
| `meridian_theme` | string | All pages | Active theme ID (e.g. `"cyber-dark"`) |
| `meridian_theme_vars` | JSON | All pages | Full CSS variable map for active theme |
| `meridian_clock_format` | `"12"/"24"` | All pages | Clock format for topbar clock |
| `meridian_font_size` | string (px) | All pages | Base font size, e.g. `"14"` |
| `meridian_nudge_count` | string (int) | All pages | Active nudge count for badge |
| `meridian_settings_toggles` | JSON | settings.html | Toggle states (notifications, dashboard widgets) |
| `meridian_integrations` | JSON array | integrations.html | Connected integration IDs |
| `meridian_perm_doc` | `"true"/"false"` | work.html, privacy.html | Document content scan permission |
| `meridian_perm_msg` | `"true"/"false"` | work.html, privacy.html | Message body scan permission |
| `meridian_perm_loc` | `"true"/"false"` | smarthome.html, privacy.html | Location data permission |
| `meridian_perm_camera` | `"true"/"false"` | smarthome.html, privacy.html | Camera feed permission |
| `meridian_audit_log` | JSON array | privacy.html | Privacy audit log entries |
| `meridian_nudges` | JSON array | dashboard.html | Active nudge objects |

---

## 5. Data Flow

```
LOGIN (index.html)
       |
       v
  localStorage: meridian_session
       |
       +─────────────────────────────────────────────────────────────┐
       |                                                             |
       v                                                             v
DASHBOARD (dashboard.html)                             PRIVACY (privacy.html)
  · Reads session for user name                          · Controls Ghost Layer
  · Reads meridian_ghost_mode                            · Writes all perm keys
  · Cognitive score, nudges, GitHub pulse                · Writes audit log
  · Loop detector → nudge push                          · Knox shield display
       |
       +──────────────────┬──────────────────────────────────────────+
                          |                                          |
              ┌───────────┴──────────────┐                          |
              v                          v                          v
       WORK LIFE                   PERSONAL LIFE               SETTINGS
       (work.html)                 (smarthome.html)            (settings.html)
       · Reads perm_doc             · Reads perm_camera         · Writes theme vars
       · Reads perm_msg             · Reads perm_loc            · Writes clock format
       · Task management            · Device control            · Writes font size
       · Context recovery           · Scenes + routines         · Writes integration perms
                                    · Energy monitor
              |                          |
              +──────────────────────────+
                          |
              ┌───────────┴──────────────┐
              v                          v
       ANALYTICS                    NUDGES
       (analytics.html)             (nudges.html)
       · Reads session              · Reads nudge_count
       · Score trends               · Decrements badge on dismiss
       · App usage charts
```

---

## 6. Keyboard Shortcuts

| Page | Key | Action |
|---|---|---|
| All pages | `1` | Go to Dashboard |
| All pages | `2` | Go to Work Resume |
| All pages | `3` | Go to Smart Home |
| All pages | `4` | Go to Privacy Mode |
| All pages | `5` | Go to Analytics |
| All pages | `6` | Go to Nudges |
| All pages | `7` | Go to Integrations |
| All pages | `G` | Toggle Ghost Layer |
| Dashboard | `B` | Block distraction loop |
| Dashboard | `Esc` | Dismiss top nudge |
| Privacy | `P` | Scroll to permissions |
| Work | `R` | Resume work session |
| Work | `N` | Add new task |
| Smart Home | `1–4` | Activate scene 1–4 |

---

## 7. Design System

### Colors (Cyber Dark default — overridden by active theme)
```css
--bg-primary:   #040812   /* Page background */
--bg-secondary: #080f1e   /* Sidebar background */
--bg-card:      #0d1628   /* Card background */
--bg-card2:     #111c35   /* Alternate card background */
--cyan:         #00d4ff   /* Primary accent — Work Life */
--green:        #00ff88   /* Success / positive state */
--yellow:       #ffd700   /* Warning / pending */
--red:          #ff4757   /* Alert / distraction */
--ghost:        derived from --cyan   /* Privacy/Ghost Layer accent (theme-driven) */
--ghost-rgb:    derived from --cyan   /* RGB components for rgba() usage */
--ghost-dim:    derived from --cyan   /* Ghost dim overlay (#22 alpha) */
--ghost-mid:    derived from --cyan   /* Ghost medium overlay (#55 alpha) */
--text-primary: #e8f4fd   /* Main text */
--text-muted:   #6b8aad   /* Secondary text */
--border:       #1a2d4a   /* Card borders */
--grid-color:   per-theme /* Background dot-grid colour */
```

### Typography
- **Headings/Brand:** Orbitron — letter-spacing 3–12px
- **Body:** Inter — weights 300, 400, 500, 600
- **Code/Mono:** JetBrains Mono — weights 400, 500

### Animation
- Page cards: `fadeIn 0.4–0.5s ease` with staggered `animation-delay`
- Bars/rings: `transition: width/stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)`
- Toasts: `opacity + translateY`, 2.8–3s duration
- Ghost particles: Canvas `requestAnimationFrame` loop
- Nudge dismiss: `opacity:0 + translateX(30px) + max-height:0`, 0.4s ease





