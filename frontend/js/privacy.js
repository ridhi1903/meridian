/**
 * MERIDIAN — Privacy Mode Module
 * privacy.js · Loaded after app.js on privacy.html
 *
 * Architecture context:
 *  MERIDIAN is split into two life domains:
 *
 *  WORK LIFE  (work.html)
 *    - Document summaries, calendar scheduling
 *    - Resume work from last context
 *    - Detect tasks from chats → auto-add to calendar
 *    - App time tracking (VS Code, Chrome, Notion…)
 *    - Work output summary (docs written, sheets, PRs)
 *
 *  PERSONAL LIFE  (smarthome.html)
 *    - Smart home control (TV, AC, lights, fridge, washer)
 *    - Energy monitoring, smart scenes & routines
 *    - Camera feeds, location-based automations
 *
 *  PRIVACY MODE (this page) is the cross-cutting layer:
 *    - Ghost Layer blocks document/message CONTENT in Work Life
 *    - Ghost Layer also disables camera feeds and location tracking in Personal Life
 *    - All permission toggles persist to localStorage
 *    - Other pages (work.html, smarthome.html, dashboard.html) READ these
 *      permissions before processing sensitive data
 *
 * Responsibilities of privacy.js:
 *  - Restore Ghost Layer and all permission states on load
 *  - Populate user info from session
 *  - Persist every permission change to localStorage
 *  - Cross-page broadcast via localStorage events
 *  - Live audit log — simulate incoming work & personal events
 *  - Work-life vs personal-life permission context labels
 *  - Keyboard shortcut: G = toggle Ghost Layer
 */

/* ─────────────────────────────────────────────
   STORAGE KEYS  (shared with other pages)
───────────────────────────────────────────── */
const PRIVACY_KEYS = {
  GHOST:       'meridian_ghost_mode',
  PERM_DOC:    'meridian_perm_doc',
  PERM_MSG:    'meridian_perm_msg',
  PERM_LOC:    'meridian_perm_loc',
  PERM_CAM:    'meridian_perm_camera',
  AUDIT_LOG:   'meridian_audit_log',
};

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Privacy.init();
});

/* ─────────────────────────────────────────────
   PRIVACY MODULE
───────────────────────────────────────────── */
const Privacy = (() => {

  /* ── STATE ── */
  const state = {
    ghostOn:  false,
    perms: {
      doc:    true,   // Work Life — read document content
      msg:    true,   // Work Life — read message content (task detection)
      loc:    true,   // Personal Life — location for smart home routines
      cam:    true,   // Personal Life — camera feed access
    },
  };

  /* ─────────────────────────
     INIT
  ───────────────────────────*/
  function init() {
    _populateUser();
    _restoreState();
    _bindKeyboardShortcuts();
    _startLiveAuditFeed();
    _annotateDomWithContext();
  }

  /* ─────────────────────────
     POPULATE USER FROM SESSION
  ───────────────────────────*/
  function _populateUser() {
    try {
      const raw = localStorage.getItem('meridian_session');
      if (!raw) return;
      const { user } = JSON.parse(raw);
      if (!user) return;

      const avatar = document.querySelector('#sideAvatar');
      const name   = document.querySelector('.user-info .name');
      const role   = document.querySelector('#sideRole');

      if (avatar && user.initials) avatar.textContent = user.initials;
      if (name   && user.name)     name.textContent   = user.name;
      if (role   && user.role)     role.textContent   = user.role.toUpperCase();
    } catch (_) {}
  }

  /* ─────────────────────────
     RESTORE STATE FROM localStorage
  ───────────────────────────*/
  function _restoreState() {
    // Ghost Layer
    const ghostSaved = localStorage.getItem(PRIVACY_KEYS.GHOST) === 'true';
    if (ghostSaved !== state.ghostOn) {
      state.ghostOn = ghostSaved;
      // Let inline applyGhostMode() handle all visuals
      if (typeof applyGhostMode === 'function') applyGhostMode(state.ghostOn);
    }

    // Permission toggles
    const permMap = {
      doc: PRIVACY_KEYS.PERM_DOC,
      msg: PRIVACY_KEYS.PERM_MSG,
      loc: PRIVACY_KEYS.PERM_LOC,
    };
    for (const [key, storageKey] of Object.entries(permMap)) {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'false') {
        state.perms[key] = false;
        _applyPermUI(key, false);
      }
    }

    // Camera (smarthome cross-page perm)
    const camSaved = localStorage.getItem(PRIVACY_KEYS.PERM_CAM);
    if (camSaved === 'false') {
      state.perms.cam = false;
    }
  }

  /* ─────────────────────────
     APPLY PERM TOGGLE UI (for restored state)
  ───────────────────────────*/
  function _applyPermUI(key, isOn) {
    const togId = { doc: 'ptog-doc', msg: 'ptog-msg', loc: 'ptog-loc' }[key];
    const tagId = { doc: 'ptag-doc', msg: 'ptag-msg', loc: 'ptag-loc' }[key];
    if (!togId) return;

    const tog = document.getElementById(togId);
    const tag = document.getElementById(tagId);
    if (!tog || !tag) return;

    if (isOn) {
      tog.classList.add('on');
      tag.className = 'perm-tag allowed';
      tag.textContent = 'ALLOWED';
    } else {
      tog.classList.remove('on');
      tag.className = 'perm-tag blocked';
      tag.textContent = 'BLOCKED';
    }
  }

  /* ─────────────────────────
     PERSIST GHOST LAYER STATE
     Called by the inline masterToggle() after applyGhostMode()
  ───────────────────────────*/
  function persistGhost(isOn) {
    state.ghostOn = isOn;
    localStorage.setItem(PRIVACY_KEYS.GHOST, String(isOn));

    // When Ghost turns on, also disable doc + msg perms in storage
    // (so work.html stops processing content) — but keep UI toggles as-is
    if (isOn) {
      localStorage.setItem(PRIVACY_KEYS.PERM_DOC, 'false');
      localStorage.setItem(PRIVACY_KEYS.PERM_MSG, 'false');
      localStorage.setItem(PRIVACY_KEYS.PERM_CAM, 'false');
    } else {
      // Restore individual perm states when Ghost turns off
      localStorage.setItem(PRIVACY_KEYS.PERM_DOC, String(state.perms.doc));
      localStorage.setItem(PRIVACY_KEYS.PERM_MSG, String(state.perms.msg));
      localStorage.setItem(PRIVACY_KEYS.PERM_CAM, String(state.perms.cam));
    }

    // Log to audit store
    _appendAuditStore({
      time: _timeNow(),
      type: isOn ? 'block' : 'allow',
      action: `Ghost Layer ${isOn ? 'activated' : 'deactivated'} by user`,
      detail: isOn
        ? 'Work docs + messages blocked · Camera feed disabled · Knox engaged'
        : 'Normal mode restored · Work content + camera access resumed',
      tag: isOn ? 'GHOST ON' : 'GHOST OFF',
      tagClass: isOn ? 'blocked' : 'allowed',
    });
  }

  /* ─────────────────────────
     PERSIST INDIVIDUAL PERMISSION
     Called by the inline togglePerm()
  ───────────────────────────*/
  function persistPerm(key, isOn) {
    state.perms[key] = isOn;
    const storageKey = {
      doc: PRIVACY_KEYS.PERM_DOC,
      msg: PRIVACY_KEYS.PERM_MSG,
      loc: PRIVACY_KEYS.PERM_LOC,
    }[key];
    if (storageKey) localStorage.setItem(storageKey, String(isOn));

    // Log permission change
    const labels = {
      doc: 'Document content reading (Work Life)',
      msg: 'Message scan / task detection (Work Life)',
      loc: 'Location access (Personal Life / Smart Home)',
    };
    _appendAuditStore({
      time:     _timeNow(),
      type:     isOn ? 'allow' : 'block',
      action:   `Permission changed — ${labels[key] || key}`,
      detail:   isOn ? 'Access granted by user' : 'Access blocked by user',
      tag:      isOn ? 'ALLOWED' : 'BLOCKED',
      tagClass: isOn ? 'allowed' : 'blocked',
    });
  }

  /* ─────────────────────────
     ADD CONTEXT LABELS TO PERMISSIONS DOM
     Annotates each permission row with its domain
  ───────────────────────────*/
  function _annotateDomWithContext() {
    const annotations = {
      'ptog-doc': { domain: 'WORK LIFE',     color: 'var(--cyan)' },
      'ptog-msg': { domain: 'WORK LIFE',     color: 'var(--cyan)' },
      'ptog-app': { domain: 'BOTH',          color: 'var(--yellow)' },
      'ptog-loc': { domain: 'PERSONAL LIFE', color: 'var(--green)' },
    };

    for (const [id, meta] of Object.entries(annotations)) {
      const tog = document.getElementById(id);
      if (!tog) continue;
      const row = tog.closest('.perm-row');
      if (!row) continue;

      // Only add if not already annotated
      if (row.querySelector('.domain-label')) continue;

      const label = document.createElement('span');
      label.className = 'domain-label';
      label.textContent = meta.domain;
      label.style.cssText = `
        font-size:9px; letter-spacing:1.5px; padding:2px 7px;
        border-radius:10px; border:1px solid ${meta.color};
        color:${meta.color}; background:${meta.color}22;
        flex-shrink:0; margin-right:6px;
      `;
      // Insert before the tag
      const tag = row.querySelector('.perm-tag');
      if (tag) row.insertBefore(label, tag);
    }
  }

  /* ─────────────────────────
     LIVE AUDIT FEED
     Simulates incoming events from both life domains
  ───────────────────────────*/
  const _workEvents = [
    { type:'allow', action:'VS Code — file open event',            detail:'auth.service.ts · Work Life context tracker', tag:'WORK', tagClass:'info' },
    { type:'allow', action:'Notion — page scan for task keywords', detail:'Sprint board · "due this week" → Calendar',   tag:'SCAN & SYNC', tagClass:'info' },
    { type:'warn',  action:'WhatsApp — deadline scan triggered',   detail:'Work Life · "deliver by Monday" detected',    tag:'WORK', tagClass:'info' },
    { type:'allow', action:'GitHub — PR event logged',             detail:'PR #48 opened · Work Life tracker',           tag:'ALLOWED', tagClass:'allowed' },
    { type:'allow', action:'Calendar — event auto-created',        detail:'"Monday deadline" added from WhatsApp scan',  tag:'WORK', tagClass:'info' },
    { type:'allow', action:'App time tracked — Chrome 35m',        detail:'Work Life app usage summary updated',         tag:'ALLOWED', tagClass:'allowed' },
  ];

  const _personalEvents = [
    { type:'allow', action:'Smart Home — TV usage logged',         detail:'Personal Life · Samsung TV on for 3h 20m',    tag:'PERSONAL', tagClass:'info' },
    { type:'allow', action:'Location trigger — arrived home',      detail:'Personal Life · Morning routine activated',   tag:'PERSONAL', tagClass:'info' },
    { type:'warn',  action:'Camera feed access request',           detail:'Personal Life · SmartThings Cam front door',  tag:'PERSONAL', tagClass:'info' },
    { type:'allow', action:'Smart Home — AC temp adjusted',        detail:'Personal Life · 23°C cooling mode',           tag:'PERSONAL', tagClass:'info' },
    { type:'allow', action:'Energy monitor update',                detail:'Personal Life · Total 2.4kW in use',          tag:'PERSONAL', tagClass:'info' },
    { type:'allow', action:'Sleep routine scheduled',              detail:'Personal Life · All devices off at 11 PM',    tag:'PERSONAL', tagClass:'info' },
  ];

  let _auditIdx = 0;

  function _startLiveAuditFeed() {
    // Random interval between 12–28 seconds
    const schedule = () => {
      const delay = 12000 + Math.random() * 16000;
      setTimeout(() => {
        _injectLiveAuditEvent();
        schedule();
      }, delay);
    };
    schedule();
  }

  function _injectLiveAuditEvent() {
    const logEl = document.getElementById('auditLog');
    if (!logEl) return;

    // Alternate between work and personal events
    const pool = _auditIdx % 2 === 0 ? _workEvents : _personalEvents;
    const evt  = pool[Math.floor(Math.random() * pool.length)];
    _auditIdx++;

    // If ghost is on, work events become blocked
    const blocked = state.ghostOn && evt.tag === 'WORK';
    const row = document.createElement('div');
    row.className = 'log-row';
    row.style.opacity = '0';
    row.style.transform = 'translateY(-6px)';
    row.style.transition = 'all 0.4s ease';
    row.innerHTML = `
      <div class="log-time">${_timeNow()}</div>
      <div class="log-dot ${blocked ? 'block' : evt.type}"></div>
      <div class="log-content">
        <div class="log-action">${blocked ? '[BLOCKED] ' : ''}${evt.action}</div>
        <div class="log-detail">${blocked ? 'Ghost Layer active — content not read' : evt.detail}</div>
      </div>
      <div class="log-tag ${blocked ? 'blocked' : evt.tagClass}">${blocked ? 'BLOCKED' : evt.tag}</div>
    `;

    logEl.insertBefore(row, logEl.firstChild);
    requestAnimationFrame(() => {
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    });

    // Update event count
    const countEl = document.getElementById('auditCount');
    if (countEl) {
      const current = parseInt(countEl.textContent) || 0;
      countEl.textContent = (current + 1) + ' events today';
    }
  }

  /* ─────────────────────────
     AUDIT LOG PERSISTENCE
  ───────────────────────────*/
  function _appendAuditStore(entry) {
    try {
      const raw = localStorage.getItem(PRIVACY_KEYS.AUDIT_LOG) || '[]';
      const log = JSON.parse(raw);
      log.unshift(entry);
      // Keep last 100 entries
      if (log.length > 100) log.splice(100);
      localStorage.setItem(PRIVACY_KEYS.AUDIT_LOG, JSON.stringify(log));
    } catch (_) {}
  }

  /* ─────────────────────────
     KEYBOARD SHORTCUTS
     G — toggle Ghost Layer
     P — focus on permissions card
  ───────────────────────────*/
  function _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.key.toLowerCase()) {
        case 'g':
          if (typeof masterToggle === 'function') masterToggle();
          break;
        case 'p': {
          const permCard = document.getElementById('permCard');
          if (permCard) permCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    });
  }

  /* ─────────────────────────
     HELPER — current time HH:MM
  ───────────────────────────*/
  function _timeNow() {
    return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  }

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────────*/
  return { init, persistGhost, persistPerm };

})();

/* ─────────────────────────────────────────────
   PATCH INLINE FUNCTIONS to persist state
   (inline JS runs first, then privacy.js hooks in)
───────────────────────────────────────────── */
(function patchInlineHandlers() {
  // Patch masterToggle → persist ghost state after visual update
  const _origMasterToggle = window.masterToggle;
  window.masterToggle = function () {
    if (typeof _origMasterToggle === 'function') _origMasterToggle();
    // Read current ghost state from DOM (set by inline applyGhostMode)
    const isOn = document.getElementById('masterToggleBtn')?.classList.contains('on') ?? false;
    Privacy.persistGhost(isOn);
  };

  // Patch togglePerm → persist individual perm after visual update
  const _origTogglePerm = window.togglePerm;
  window.togglePerm = function (el, tagId, name) {
    if (typeof _origTogglePerm === 'function') _origTogglePerm(el, tagId, name);
    const isOn = el.classList.contains('on');
    // Map toggle element ID to perm key
    const keyMap = { 'ptog-doc': 'doc', 'ptog-msg': 'msg', 'ptog-loc': 'loc' };
    const key = keyMap[el.id];
    if (key) Privacy.persistPerm(key, isOn);
  };

  // Patch clearLog → also clear stored audit log
  const _origClearLog = window.clearLog;
  window.clearLog = function () {
    if (typeof _origClearLog === 'function') _origClearLog();
    localStorage.removeItem('meridian_audit_log');
  };
})();
