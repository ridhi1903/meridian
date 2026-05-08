# MERIDIAN — Cognitive Operating System
## Product Requirements Document (PRD)
**Samsung OpenCLAW Hackathon 2026**  
**Team:** Anika Teja Reddy  
**Date:** May 8, 2026 (updated)  

---

## 1. Product Overview

**MERIDIAN** is a Cognitive Operating System — a unified dashboard that lives on a Samsung device and acts as an intelligent layer between the user and their digital life. It is divided into two core domains:

| Domain | Purpose |
|---|---|
| **WORK LIFE** | Productivity, focus, calendar, task detection, document tracking |
| **PERSONAL LIFE** | Smart home control, device management, energy, routines |

Both domains are protected by a cross-cutting **Privacy (Ghost) Layer** powered by Samsung Knox.

---

## 2. Core System Requirements

### 2.1 Authentication
- REQ-AUTH-01: User must log in with username + password before accessing any page
- REQ-AUTH-02: Session must be stored in `localStorage` with an 8-hour expiry
- REQ-AUTH-03: Any page accessed without a valid session must redirect to `index.html`
- REQ-AUTH-04: Logout must destroy the session and redirect to login

### 2.2 Global Navigation
- REQ-NAV-01: A persistent sidebar must appear on all pages except login
- REQ-NAV-02: Sidebar must show the current user's name, initials, and role
- REQ-NAV-03: Active page must be visually highlighted in the nav
- REQ-NAV-04: A live clock must be visible in the topbar at all times
- REQ-NAV-05: Ghost Layer status must be accessible from every page's sidebar

---

## 3. WORK LIFE Requirements

### 3.1 Work Resume — Context Recovery
- REQ-WORK-01: System must save the last active app, file, and task state
- REQ-WORK-02: On return, system must show exactly where the user left off (file name, function/section, last edit)
- REQ-WORK-03: A "Resume Work" button must restore the saved context
- REQ-WORK-04: Time away from work must be tracked and displayed ("Away for 08:07")

### 3.2 Cognitive Score & Focus Tracking
- REQ-WORK-05: A real-time Cognitive Score (0–100) must be calculated and displayed
- REQ-WORK-06: Score must reflect: Focus Depth, Task Velocity, Distraction Rate, Recovery Speed
- REQ-WORK-07: Score must micro-fluctuate live to reflect real-time state
- REQ-WORK-08: Focus session timer must tick up continuously during active work
- REQ-WORK-09: Distraction loop detector must identify repeated app switching patterns (e.g. Instagram → YouTube → News)
- REQ-WORK-10: Loop intensity must escalate over time if not blocked

### 3.3 Calendar Scheduling
- REQ-WORK-11: A weekly calendar view must be shown with today's events highlighted
- REQ-WORK-12: Events must include time, title, type (meeting, deadline, focus block)
- REQ-WORK-13: Upcoming events must be shown in a sidebar/panel with countdowns

### 3.4 Task Detection from Chats
- REQ-WORK-14: System must scan Slack and Gmail message content for deadline keywords (e.g. "submit by", "due on", "deliver before")
- REQ-WORK-15: Detected tasks must appear with source, message preview, and detected date
- REQ-WORK-16: User must be able to approve and auto-add detected task to calendar with one click
- REQ-WORK-17: This feature must be disabled when Ghost Layer is active (privacy protection)

### 3.5 App Time Tracking
- REQ-WORK-18: System must track time spent per app (VS Code, Chrome, Slack, Notion, Instagram, etc.)
- REQ-WORK-19: App usage must be shown as a bar chart with daily totals
- REQ-WORK-20: Productive vs. non-productive time must be distinguished

### 3.6 Work Output Summary
- REQ-WORK-21: Daily work output must be summarized in human-readable form
  - Example: "Wrote 2 Word documents · Edited 1 spreadsheet · Pushed 3 GitHub commits · Opened 5 PRs"
- REQ-WORK-22: Output categories must include: Documents (Word/PDF), Spreadsheets, Code commits, PRs, Notion pages, Emails sent
- REQ-WORK-23: Summary must update throughout the day as work is detected

### 3.7 Smart Nudges
- REQ-WORK-24: System must push nudges to the user based on cognitive state:
  - Break suggestion after 45+ min deep work
  - Deadline reminder when detected from chat
  - Loop warning when distraction loop intensity > 60
  - Critical alert when loop intensity > 80
- REQ-WORK-25: User must be able to dismiss individual nudges
- REQ-WORK-26: Nudge count badge in nav must reflect active nudge count

---

## 4. PERSONAL LIFE Requirements

### 4.1 Smart Home Device Control
- REQ-HOME-01: Dashboard must show all connected home devices with real-time status
- REQ-HOME-02: Each device must have a power toggle (on/off)
- REQ-HOME-03: Supported devices:
  - **Samsung QLED TV** — power, volume, brightness
  - **Samsung Wind-Free AC** — power, temperature (16–32°C), fan speed (Low/Auto/High)
  - **Smart Lights** — power, brightness (0–100%), color presets (Warm/Cool/Focus/Relax/Alert)
  - **Samsung Washing Machine** — power, cycle progress display, pause
  - **Samsung Family Hub Fridge** — fridge temp (1–10°C), freezer temp display
  - **SmartThings Camera** — power, live feed preview, enable/disable
- REQ-HOME-04: Devices must be filterable by room (Living Room, Bedroom, Kitchen, Home Office)
- REQ-HOME-05: Each device must show runtime today

### 4.2 Smart Scenes
- REQ-HOME-06: Pre-defined scenes must control multiple devices at once:
  - **Morning** — Lights 80%, AC 24°C
  - **Work Mode** — Cool light, TV off
  - **Relax** — Warm light, AC 25°C
  - **Sleep** — All off, AC 22°C
- REQ-HOME-07: Only one scene can be active at a time
- REQ-HOME-08: Active scene must be visually highlighted

### 4.3 Energy Monitoring
- REQ-HOME-09: Real-time power consumption must be shown per device (in kW)
- REQ-HOME-10: Total current consumption must be displayed
- REQ-HOME-11: Devices consuming unusually high power must be flagged

### 4.4 Smart Routines
- REQ-HOME-12: User-defined routines must automate device behavior:
  - Morning Routine (7:00 AM — lights on, AC 24°C)
  - Work Mode Trigger (when focus score > 70 — dim lights)
  - TV Usage Limit (auto-off after 3 hours)
  - Sleep Routine (11:00 PM — all devices off)
  - Burnout Guard (Meridian nudge triggers 50% light dim)
- REQ-HOME-13: Each routine must have an on/off toggle
- REQ-HOME-14: Routines must be tied to both time triggers and cognitive state triggers

---

## 5. PRIVACY MODE Requirements (Cross-cutting)

### 5.1 Ghost Layer
- REQ-PRIV-01: A master Ghost Layer toggle must be available on the Privacy page and in every page's sidebar
- REQ-PRIV-02: When Ghost Layer is ON:
  - Document content must NOT be read or logged (Work Life)
  - Message body text must NOT be scanned (Work Life — disables task detection)
  - Camera feed must be disabled (Personal Life)
  - Cloud sync must be disabled
- REQ-PRIV-03: App names and window titles must ALWAYS be tracked (cannot be disabled)
- REQ-PRIV-04: Keystrokes and screen capture must NEVER be captured in any mode
- REQ-PRIV-05: Ghost Layer state must persist across page navigations via `localStorage`
- REQ-PRIV-06: All other pages must read Ghost Layer state and modify their behaviour accordingly

### 5.2 Individual Permission Toggles
- REQ-PRIV-07: The following permissions must be individually toggleable:
  - Document Content reading (Work Life)
  - Message Content reading (Work Life)
  - Location Data (Personal Life / Smart Home routines)
- REQ-PRIV-08: Permission states must persist to `localStorage`
- REQ-PRIV-09: Each permission must show which domain it belongs to (WORK LIFE / PERSONAL LIFE)

### 5.3 Privacy Audit Log
- REQ-PRIV-10: Every data access event must be logged with: timestamp, event type, description, blocked/allowed status
- REQ-PRIV-11: Log must differentiate between Work Life and Personal Life events
- REQ-PRIV-12: User must be able to export or clear the audit log
- REQ-PRIV-13: Audit log must persist to `localStorage`

### 5.4 Samsung Knox Integration
- REQ-PRIV-14: All on-device LLM processing must occur in Samsung Knox Secure Enclave
- REQ-PRIV-15: Data encryption must be AES-256
- REQ-PRIV-16: No sensitive data must be transmitted to cloud when Ghost Layer is active
- REQ-PRIV-17: Knox status, threat level, and compliance flags must be displayed

---

## 6. Dashboard Requirements

- REQ-DASH-01: Dashboard must show a unified overview of both Work Life and Personal Life
- REQ-DASH-02: Must display: Cognitive Score, Focus Time today, Tasks completed, Meetings today
- REQ-DASH-03: Activity timeline must show recent events from both domains in chronological order
- REQ-DASH-04: Active nudges must appear on the dashboard with dismiss capability
- REQ-DASH-05: Focus score chart (today, hourly) must be drawn using Canvas API
- REQ-DASH-06: Distraction loop status must be shown with loop intensity gauge
- REQ-DASH-07: App usage breakdown must be shown

---

## 7. SETTINGS Requirements

### 7.1 Settings Page
- REQ-SET-01: A dedicated Settings page must be accessible from the sidebar nav on every page
- REQ-SET-02: Settings must be organized into 8 named tabs: Profile, Appearance, Notifications, Dashboard, Integration Permissions, Privacy & Ghost Layer, Knox & Security, Advanced
- REQ-SET-03: A **Save All** button must persist all settings to `localStorage` with a toast confirmation
- REQ-SET-04: A **Reset to Defaults** button must clear all persisted settings

### 7.2 Appearance & Themes
- REQ-SET-05: Settings must show all 13 themes as visual swatches grouped by category (Dark, Warm, Cool)
- REQ-SET-06: Clicking a theme swatch must apply the theme live across the current page and persist it
- REQ-SET-07: The active theme must be highlighted with a visual indicator

### 7.3 Clock & Font
- REQ-SET-08: User must be able to select clock format: 24-hour or 12-hour (AM/PM)
- REQ-SET-09: Clock format change must take effect on all pages immediately; the topbar clock must update without page reload
- REQ-SET-10: User must be able to select base font size: 12px, 14px, or 16px
- REQ-SET-11: Font size change must apply immediately across the current page and persist to other pages via `localStorage`

### 7.4 Integration Permissions
- REQ-SET-12: Each of the 7 integrations (Gmail, Google Calendar, GitHub, Notion, Slack, SmartThings, Samsung Health) must have individually configurable permission scopes
- REQ-SET-13: Available scopes: READ, WRITE, EXECUTE, ADMIN (where applicable)
- REQ-SET-14: Permission scope changes must persist to `localStorage`

---

## 8. ANALYTICS Requirements

- REQ-ANL-01: An Analytics page must show cognitive score trends over time
- REQ-ANL-02: App usage breakdown must distinguish productive from distraction apps
- REQ-ANL-03: Focus session history and patterns must be visualized
- REQ-ANL-04: Weekly productivity summary must be shown
- REQ-ANL-05: All charts must animate on page load

---

## 9. NUDGES Page Requirements

- REQ-NUD-01: A dedicated Smart Nudges page must list all active nudges with full detail
- REQ-NUD-02: Each nudge must show: priority level (HIGH / MED / LOW), category, icon, title, description, time ago, and action buttons
- REQ-NUD-03: Nudges must be filterable by category: All, Focus, Work, Home, Health
- REQ-NUD-04: Each nudge must have a primary action button (Lock Context, Add to Calendar, etc.) and a dismiss button
- REQ-NUD-05: Dismissed nudges must decrement the badge count stored in `meridian_nudge_count` in `localStorage`
- REQ-NUD-06: Nudge badge in sidebar must sync count across all pages

---

## 10. INTEGRATIONS Requirements

- REQ-INT-01: An Integrations page must show all supported third-party services
- REQ-INT-02: Each integration must show: name, icon, connection status (Connected / Disconnected), and last sync time
- REQ-INT-03: User must be able to connect and disconnect each service individually
- REQ-INT-04: Connected integrations must be persisted to `localStorage` (`meridian_integrations`)

---

## 11. Technical Constraints

| Constraint | Requirement |
|---|---|
| **Platform** | Samsung Galaxy device (Android), demonstrated via web browser |
| **Processing** | All sensitive data processed on-device (no cloud LLM calls) |
| **Storage** | `localStorage` only — no external database for this prototype |
| **Security** | Samsung Knox encryption wrapper |
| **Frontend** | Pure HTML, CSS, JavaScript — no frameworks |
| **Backend** | Node.js + Express (port 8000, configured via `backend/.env`) |
| **Fonts** | Orbitron (headings), Inter (body), JetBrains Mono (code) |

---

## 12. Non-Functional Requirements

- REQ-NF-01: All page transitions must animate (fadeIn, 0.4s)
- REQ-NF-02: All bars/rings must animate on load (not appear instantly)
- REQ-NF-03: Multi-theme system with 13 themes across 3 categories (Dark: Cyber Dark, Midnight, Matrix, Slate, Monochrome / Warm: Ember, Rosewood, Amber, Solar / Cool: Ocean, Forest, Lilac, Aurora, Breeze). Default theme is Cyber Dark (background #040812, accent #00d4ff).
- REQ-NF-04: Keyboard shortcuts must be available for power users
- REQ-NF-05: Toast notifications must appear for all significant user actions
- REQ-NF-06: UI must be responsive within a reasonable desktop/tablet range
- REQ-NF-07: Active theme must persist across all page navigations via `localStorage` (`meridian_theme_vars`)
- REQ-NF-08: Ghost Layer and all privacy-related accent colours must follow the active theme — no hardcoded colour values
- REQ-NF-09: Clock format (24h / 12h AM/PM) must be user-configurable and persist across all pages via `localStorage`
- REQ-NF-10: Base font size must be user-configurable (12 / 14 / 16 px) and persist across all pages via `localStorage`

---

## 13. V2 Roadmap

The following capabilities are architected into the system design and are planned for the production release:

- **Samsung Knox deep API integration** — direct TrustZone process attestation and hardware-backed key management
- **Live Slack / Gmail reading** — OAuth-authenticated message scanning via official APIs
- **Real-time SmartThings device communication** — direct WebSocket control via SmartThings Cloud API
- **On-device LLM inference** — Samsung AI stack integration for fully private, local language model processing
- **Mobile-native layout** — optimised for Galaxy Z Fold / Galaxy S series form factors

