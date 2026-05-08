/**
 * MERIDIAN — Global Application Layer
 * app.js · Shared across all pages
 *
 * Responsibilities:
 *  - Session / auth guard
 *  - User profile
 *  - Global clock
 *  - Toast notifications
 *  - Active nav highlighting
 *  - Ghost Mode persistence
 *  - Cross-page nudge system
 *  - Keyboard shortcuts
 *  - Page transition helper
 *  - On-device processing state
 */

/* ─────────────────────────────────────────────
   NAMESPACE
───────────────────────────────────────────── */
const MERIDIAN = (() => {

  /* ── CONSTANTS ── */
  const VERSION       = '1.0.0';
  const APP_NAME      = 'MERIDIAN';
  const SESSION_KEY   = 'meridian_session';
  const GHOST_KEY     = 'meridian_ghost_mode';
  const NUDGE_KEY     = 'meridian_nudges';
  const THEME_KEY     = 'meridian_theme';
  const LOGIN_PAGE    = 'index.html';

  /* ── DEFAULT USER (matches login: admin / meridian) ── */
  const DEFAULT_USER = {
    name:    'Anika Reddy',
    initials:'AT',
    role:    'Security Engineer',
    email:   'admin@meridian.io',
  };

  /* ─────────────────────────────────────────────
     SESSION — AUTH
  ───────────────────────────────────────────── */
  const Session = {

    /** Create a session on successful login */
    create(username) {
      const session = {
        username,
        user: DEFAULT_USER,
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 h
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    },

    /** Retrieve current session — null if not found / expired */
    get() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (Date.now() > session.expiresAt) {
          this.destroy();
          return null;
        }
        return session;
      } catch {
        return null;
      }
    },

    /** Destroy session (logout) */
    destroy() {
      localStorage.removeItem(SESSION_KEY);
    },

    /** Returns true when a valid session exists */
    isActive() {
      return this.get() !== null;
    },

    /** Return current user object or default */
    user() {
      const s = this.get();
      return s ? s.user : DEFAULT_USER;
    },

    /**
     * Auth guard — call at the top of every protected page.
     * Redirects to index.html when no session exists.
     */
    guard() {
      if (!this.isActive()) {
        // Avoid redirect loop on the login page itself
        if (!window.location.pathname.endsWith(LOGIN_PAGE) &&
            !window.location.pathname.endsWith('/')) {
          window.location.replace(LOGIN_PAGE);
        }
      }
    },
  };

  /* ─────────────────────────────────────────────
     CLOCK
  ───────────────────────────────────────────── */
  const Clock = {
    _intervalId: null,

    /** Inject live time into every element matching selector */
    start(selector = '#clock, [data-meridian-clock]') {
      const update = () => {
        const use12 = localStorage.getItem('meridian_clock_format') === '12';
        const time = new Date().toLocaleTimeString('en-US', { hour12: use12 });
        document.querySelectorAll(selector).forEach(el => {
          el.textContent = time;
        });
      };
      update();
      this._intervalId = setInterval(update, 1000);
    },

    stop() {
      if (this._intervalId) {
        clearInterval(this._intervalId);
        this._intervalId = null;
      }
    },

    /** Returns current time string */
    now() {
      return new Date().toLocaleTimeString('en-US', { hour12: false });
    },

    /** Returns formatted date string */
    date() {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
    },
  };

  /* ─────────────────────────────────────────────
     TOAST
  ───────────────────────────────────────────── */
  const Toast = {
    _el: null,
    _timer: null,

    _ensure() {
      if (this._el) return;
      this._el = document.getElementById('toast');
      // If the page doesn't have a #toast, create one
      if (!this._el) {
        this._el = document.createElement('div');
        this._el.id = 'meridian-toast';
        Object.assign(this._el.style, {
          position:        'fixed',
          bottom:          '24px',
          right:           '28px',
          background:      '#0d1628',
          border:          '1px solid #1a2d4a',
          borderRadius:    '8px',
          padding:         '12px 20px',
          fontSize:        '13px',
          color:           '#e8f4fd',
          opacity:         '0',
          transform:       'translateY(10px)',
          transition:      'all 0.3s',
          zIndex:          '9999',
          pointerEvents:   'none',
          maxWidth:        '340px',
          fontFamily:      'Inter, sans-serif',
        });
        document.body.appendChild(this._el);
      }
    },

    show(message, duration = 3000) {
      this._ensure();
      if (this._timer) clearTimeout(this._timer);
      this._el.textContent = message;
      this._el.style.opacity = '1';
      this._el.style.transform = 'translateY(0)';
      this._el.classList.add('show');
      this._timer = setTimeout(() => this.hide(), duration);
    },

    hide() {
      if (!this._el) return;
      this._el.style.opacity = '0';
      this._el.style.transform = 'translateY(10px)';
      this._el.classList.remove('show');
    },

    /** Convenience aliases */
    success(msg) { this.show('✓ ' + msg); },
    warn(msg)    { this.show('⚠ ' + msg); },
    error(msg)   { this.show('✕ ' + msg, 4000); },
    info(msg)    { this.show('ℹ ' + msg); },
  };

  /* ─────────────────────────────────────────────
     NAVIGATION — active link highlight
  ───────────────────────────────────────────── */
  const Nav = {
    /** Mark the nav-item matching the current page as active */
    highlight() {
      const page = window.location.pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('.nav-item').forEach(link => {
        const href = (link.getAttribute('href') || '').split('/').pop();
        link.classList.toggle('active', href === page);
      });
    },

    /** Navigate with a brief fade-out transition */
    go(url) {
      document.body.style.transition = 'opacity 0.25s';
      document.body.style.opacity = '0';
      setTimeout(() => { window.location.href = url; }, 260);
    },
  };

  /* ─────────────────────────────────────────────
     GHOST MODE — persistence across pages
  ───────────────────────────────────────────── */
  const GhostMode = {
    /** Returns true when Ghost Layer is currently active */
    isActive() {
      return localStorage.getItem(GHOST_KEY) === 'true';
    },

    /** Enable Ghost Layer — persists across pages */
    enable() {
      localStorage.setItem(GHOST_KEY, 'true');
      this._dispatch(true);
    },

    /** Disable Ghost Layer */
    disable() {
      localStorage.setItem(GHOST_KEY, 'false');
      this._dispatch(false);
    },

    /** Toggle Ghost Layer */
    toggle() {
      this.isActive() ? this.disable() : this.enable();
    },

    /** Dispatch a custom event other modules can listen to */
    _dispatch(active) {
      window.dispatchEvent(new CustomEvent('meridian:ghostmode', { detail: { active } }));
    },

    /** Apply a subtle ghost indicator to the topbar when active on non-privacy pages */
    applyIndicator() {
      if (!this.isActive()) return;
      const topbar = document.querySelector('.topbar');
      if (topbar && !topbar.classList.contains('ghost-active')) {
        topbar.style.borderBottom = '1px solid rgba(124,58,237,0.4)';
      }
      // Inject a small pill in topbar-right if not on privacy.html
      const page = window.location.pathname.split('/').pop();
      if (page !== 'privacy.html') {
        const right = document.querySelector('.topbar-right');
        if (right && !document.getElementById('ghostPill')) {
          const pill = document.createElement('a');
          pill.id = 'ghostPill';
          pill.href = 'privacy.html';
          pill.title = 'Ghost Layer is active — click to manage';
          Object.assign(pill.style, {
            padding:       '3px 10px',
            borderRadius:  '12px',
            background:    'rgba(124,58,237,0.15)',
            border:        '1px solid rgba(124,58,237,0.5)',
            color:         '#a78bfa',
            fontSize:      '10px',
            letterSpacing: '1px',
            textDecoration:'none',
            cursor:        'pointer',
            fontFamily:    'Inter,sans-serif',
          });
          pill.textContent = '🛡 GHOST ACTIVE';
          right.prepend(pill);
        }
      }
    },
  };

  /* ─────────────────────────────────────────────
     NUDGE SYSTEM — cross-page smart nudges
  ───────────────────────────────────────────── */
  const Nudges = {
    _defaults: [
      {
        id: 'nudge-focus',
        icon: '🧠',
        text: 'Your focus peaks between 09:00–11:30. Deep work session recommended.',
        priority: 'high',
        page: 'dashboard.html',
        ts: Date.now() - 600000,
      },
      {
        id: 'nudge-break',
        icon: '⏱',
        text: '52 minutes since last break. 5-minute reset suggested.',
        priority: 'medium',
        page: 'work.html',
        ts: Date.now() - 300000,
      },
      {
        id: 'nudge-distraction',
        icon: '🔁',
        text: 'Instagram → Slack → Instagram loop detected (×3). Context lock advised.',
        priority: 'high',
        page: 'dashboard.html',
        ts: Date.now() - 120000,
      },
    ],

    /** Load nudges from storage, seed defaults on first run */
    load() {
      try {
        const raw = localStorage.getItem(NUDGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch { /* ignore */ }
      // First run — persist defaults
      localStorage.setItem(NUDGE_KEY, JSON.stringify(this._defaults));
      return this._defaults;
    },

    /** Save nudges to storage */
    save(nudges) {
      localStorage.setItem(NUDGE_KEY, JSON.stringify(nudges));
    },

    /** Add a new nudge */
    add(icon, text, priority = 'medium', page = null) {
      const nudges = this.load();
      nudges.unshift({
        id:       'nudge-' + Date.now(),
        icon,
        text,
        priority,
        page:     page || window.location.pathname.split('/').pop(),
        ts:       Date.now(),
        read:     false,
      });
      this.save(nudges);
      return nudges;
    },

    /** Mark a nudge as read */
    dismiss(id) {
      const nudges = this.load().filter(n => n.id !== id);
      this.save(nudges);
    },

    /** Count of unread nudges */
    unreadCount() {
      return this.load().filter(n => !n.read).length;
    },

    /** Update nav badge(s) to reflect unread count */
    updateBadge() {
      // Use the live count saved by nudges.html; fall back to 5 on first load
      const stored = localStorage.getItem('meridian_nudge_count');
      const count = stored !== null ? parseInt(stored, 10) : 5;
      if (stored === null) localStorage.setItem('meridian_nudge_count', '5');
      document.querySelectorAll('.nav-badge').forEach(el => {
        el.textContent = count > 0 ? count : '';
        el.style.display = count > 0 ? 'inline-block' : 'none';
      });
    },
  };

  /* ─────────────────────────────────────────────
     KEYBOARD SHORTCUTS
  ───────────────────────────────────────────── */
  const Shortcuts = {
    _map: {
      '1': 'dashboard.html',
      '2': 'work.html',
      '3': 'smarthome.html',
      '4': 'privacy.html',
      'g': '_ghost_toggle',
      'Escape': '_close_modals',
    },

    init() {
      document.addEventListener('keydown', (e) => {
        // Skip when typing in an input
        if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
        if (e.metaKey || e.ctrlKey) return;

        const action = this._map[e.key];
        if (!action) return;

        if (action === '_ghost_toggle') {
          GhostMode.toggle();
          Toast.show(GhostMode.isActive()
            ? '🛡️ Ghost Layer ACTIVE'
            : '👁️ Normal Mode restored');
          return;
        }
        if (action === '_close_modals') {
          document.querySelectorAll('.modal.show, .overlay.show').forEach(el => {
            el.classList.remove('show');
          });
          return;
        }
        Nav.go(action);
      });
    },
  };

  /* ─────────────────────────────────────────────
     PAGE TRANSITION (fade-in on load)
  ───────────────────────────────────────────── */
  const Transition = {
    init() {
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.3s ease';
      // DOMContentLoaded may have already fired since app.js loads at end of <body>
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.body.style.opacity = '1';
        });
      });
    },
  };

  /* ─────────────────────────────────────────────
     UTILS — shared helper functions
  ───────────────────────────────────────────── */
  const Utils = {
    /** Format a duration in seconds to "Xh Ym" */
    formatDuration(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    },

    /** Clamp a number between min and max */
    clamp(n, min, max) {
      return Math.min(Math.max(n, min), max);
    },

    /** Return a random integer between min (inclusive) and max (inclusive) */
    randInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /** Debounce a function */
    debounce(fn, delay = 300) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
      };
    },

    /** Throttle a function */
    throttle(fn, limit = 100) {
      let last = 0;
      return (...args) => {
        const now = Date.now();
        if (now - last >= limit) { last = now; fn(...args); }
      };
    },

    /** Format epoch ms to "HH:MM" */
    formatTime(ms) {
      return new Date(ms).toLocaleTimeString('en-US', {
        hour12: false, hour: '2-digit', minute: '2-digit',
      });
    },

    /** Sanitise a string for safe DOM insertion (prevents XSS) */
    sanitise(str) {
      const el = document.createElement('div');
      el.textContent = str;
      return el.innerHTML;
    },
  };

  /* ─────────────────────────────────────────────
     DEVICE / SYSTEM INFO
  ───────────────────────────────────────────── */
  const Device = {
    /** Returns true when running on a small screen */
    isMobile() {
      return window.innerWidth < 768;
    },

    /** Battery level (0–100) — uses Battery API where available */
    async getBattery() {
      if (!navigator.getBattery) return null;
      const bat = await navigator.getBattery();
      return Math.round(bat.level * 100);
    },

    /** Connection type string */
    connection() {
      const conn = navigator.connection;
      if (!conn) return 'unknown';
      return conn.effectiveType || conn.type || 'unknown';
    },

    /** Returns "on-device" — confirms no cloud dependency */
    processingMode() {
      return 'on-device';
    },
  };

  /* ─────────────────────────────────────────────
     INIT — called automatically on script load
  ───────────────────────────────────────────── */
  /* ─────────────────────────────────────────────
     THEME — restore saved theme on every page
  ───────────────────────────────────────────── */
  const Theme = {
    apply() {
      try {
        const vars = JSON.parse(localStorage.getItem('meridian_theme_vars') || 'null');
        if (!vars) return;
        const root = document.documentElement;
        Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

        // Derive ghost layer colour from theme accent (--cyan) so
        // privacy page ghost effects match the chosen theme
        const accent = (vars['--cyan'] || '#7c3aed').slice(0, 7);
        const r = parseInt(accent.slice(1,3), 16);
        const g = parseInt(accent.slice(3,5), 16);
        const b = parseInt(accent.slice(5,7), 16);
        const rgb = `${r},${g},${b}`;
        root.style.setProperty('--ghost',     accent);
        root.style.setProperty('--ghost-rgb',  rgb);
        root.style.setProperty('--ghost-dim',  accent + '22');
        root.style.setProperty('--ghost-mid',  accent + '55');
        root.style.setProperty('--purple',     accent);
        root.style.setProperty('--purple-dim', accent + '22');

        // Inject overrides for elements with hardcoded backgrounds across all pages
        let el = document.getElementById('meridian-theme-override');
        if (!el) {
          el = document.createElement('style');
          el.id = 'meridian-theme-override';
          (document.head || document.documentElement).appendChild(el);
        }
        el.textContent = [
          '.sidebar { background: var(--bg-sidebar) !important; }',
          '.topbar  { background: var(--bg-topbar)  !important; }',
          '.grid-bg { background-image:',
          '  linear-gradient(var(--grid-color) 1px, transparent 1px),',
          '  linear-gradient(90deg, var(--grid-color) 1px, transparent 1px) !important; }',
        ].join('\n');
      } catch (_) {}
    },
  };

  function _init() {
    // Page fade-in
    Transition.init();

    // Auth guard — runs on every page except login
    const page = window.location.pathname.split('/').pop() || 'index.html';
    if (page !== 'index.html' && page !== '') {
      Session.guard();
    }

    // Apply saved theme immediately (before DOMContentLoaded for instant render)
    Theme.apply();

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', () => {
      // Re-apply theme after DOM is ready (catches sidebar/topbar vars)
      Theme.apply();

      // Apply saved font size
      const savedFs = localStorage.getItem('meridian_font_size');
      if (savedFs) document.documentElement.style.setProperty('font-size', savedFs + 'px');

      // Highlight active nav link
      Nav.highlight();

      // Start clock on elements with data-meridian-clock attribute
      Clock.start();

      // Show ghost mode indicator on non-privacy pages
      GhostMode.applyIndicator();

      // Update nudge badge
      Nudges.updateBadge();

      // Register keyboard shortcuts
      Shortcuts.init();

      console.info(
        `%c MERIDIAN v${VERSION} %c Cognitive OS — on-device · ${Clock.date()} `,
        'background:#7c3aed;color:#fff;padding:3px 8px;border-radius:4px 0 0 4px;font-family:monospace',
        'background:#0d1628;color:#a78bfa;padding:3px 8px;border-radius:0 4px 4px 0;font-family:monospace'
      );
    });
  }

  _init();

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  return {
    VERSION,
    Session,
    Clock,
    Toast,
    Nav,
    GhostMode,
    Nudges,
    Theme,
    Utils,
    Device,
  };

})();
