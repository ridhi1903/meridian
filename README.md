# MERIDIAN — Cognitive Operating System

> **Bridging the gap between focus and action.**

**MERIDIAN** is a Cognitive Operating System designed for the **Samsung OpenClaw Hackathon 2026**. It aims to create a seamless, context-aware environment that enhances focus, privacy, and smart control across your devices. 

## Features

- **⚡ Real-time Cognitive Score:** Continuously measures and displays your cognitive focus level.
- **🔄 Work Resume & Recovery:** Seamlessly resume your work and manage context-switching with smart nudges.
- **🏠 Smart Home Control:** Integrated smart home management layer.
- **🔒 Ghost Layer Privacy:** An advanced privacy mode that temporarily pauses tracking and isolates activity.
- **📡 Cross-Device Sync:** Keep your cognitive state and workspace synced across all your devices.
- **🛡️ Knox Security:** Built with robust security paradigms in mind.

## Project Structure

The project currently primarily consists of a frontend web application:

- **Frontend (`/frontend`)**
  - `index.html` - Initialization / Login session.
  - `dashboard.html` - The main cognitive dashboard.
  - `smarthome.html` - Smart home device management and control.
  - `work.html` - Work activity tracking and resume interface.
  - `privacy.html` - Ghost Layer privacy configuration.
  - `css/` - Custom stylesheets utilizing a dark, cyber-aesthetic design system.
  - `js/app.js` - Global application state, session management, keyboard shortcuts, and nudge systems.

- **Backend (`/backend`)**
  - Node.js structure prepared (`server.js`, `package.json`) for backend logic implementation.

## Tech Stack

- **Frontend:** Pure HTML5, CSS3 (using CSS Variables, Inter & Orbitron fonts), and Vanilla JavaScript.
- **Design:** Modern "cyber" aesthetic with glassmorphism, dynamic glowing effects, and animated canvas backgrounds.
- **Backend:** Node.js skeleton ready for API integration.

## How to Run

1. Open the project folder in your local environment.
2. Serve the `/frontend` directory using any local web server (e.g., Live Server extension in VSCode, or `npx serve frontend`).
3. Navigate to `index.html` in your browser.
4. **Login Credentials:**
   - **User ID:** `admin`
   - **Access Key:** `meridian`

## Keyboard Shortcuts

- `1`: Go to Dashboard
- `2`: Go to Work Resume
- `3`: Go to Smart Home
- `4`: Go to Ghost Layer (Privacy)
- `g`: Toggle Ghost Mode (Privacy layer)
- `Escape`: Close any active modals

---
*Built for the Samsung OpenClaw Hackathon 2026.*
