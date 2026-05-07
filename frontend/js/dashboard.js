/**
 * MERIDIAN — Dashboard Module
 * dashboard.js · Loaded after app.js on dashboard.html
 *
 * Responsibilities:
 *  - Dynamic greeting (time-of-day aware)
 *  - Populate user info from session
 *  - Restore Ghost Layer state
 *  - Live cognitive score micro-fluctuations
 *  - Focus session timer
 *  - Nudge badge counter sync
 *  - Distraction loop auto-escalation simulation
 *  - Focus chart resize handler
 *  - Keyboard shortcuts (dashboard-specific)
 */

/* ─────────────────────────────────────────────
   INIT — wait for DOM
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Dashboard.init();
});

/* ─────────────────────────────────────────────
   DASHBOARD MODULE
───────────────────────────────────────────── */
const Dashboard = (() => {

  /* ── STATE ── */
  let cognitiveScore   = 78;
  let focusSeconds     = 45 * 60;   // 45 min into current session
  let focusTimerActive = true;
  let loopIntensity    = 62;

  /* ─────────────────────────
     INIT
  ───────────────────────────*/
  function init() {
    _populateUser();
    _setGreeting();
    _restoreGhostLayer();
    _startFocusTimer();
    _startScoreFluctuation();
    _startLoopEscalation();
    _syncNudgeBadge();
    _bindKeyboardShortcuts();
    _bindResizeChart();
  }

  /* ─────────────────────────
     USER INFO FROM SESSION
  ───────────────────────────*/
  function _populateUser() {
    try {
      const raw = localStorage.getItem('meridian_session');
      if (!raw) return;
      const session = JSON.parse(raw);
      const user = session.user || {};

      // Sidebar avatar initials
      const avatar = document.querySelector('.avatar');
      if (avatar && user.initials) avatar.textContent = user.initials;

      // Sidebar name / role
      const nameEl = document.querySelector('.user-info .name');
      const roleEl = document.querySelector('.user-info .role');
      if (nameEl && user.name) nameEl.textContent = user.name;
      if (roleEl && user.role) roleEl.textContent = user.role.toUpperCase();

      // Greeting name span
      const span = document.querySelector('.greeting-text h1 span');
      if (span && user.name) {
        const firstName = user.name.split(' ')[0];
        span.textContent = firstName;
      }
    } catch (_) {}
  }

  /* ─────────────────────────
     TIME-OF-DAY GREETING
  ───────────────────────────*/
  function _setGreeting() {
    const h = new Date().getHours();
    let greeting = 'Good Morning';
    if (h >= 12 && h < 17) greeting = 'Good Afternoon';
    else if (h >= 17 && h < 21) greeting = 'Good Evening';
    else if (h >= 21 || h < 5) greeting = 'Working Late';

    const h1 = document.querySelector('.greeting-text h1');
    if (!h1) return;

    // Preserve the <span> child
    const span = h1.querySelector('span');
    const name = span ? span.textContent : 'Anika';
    h1.childNodes[0].textContent = greeting + ', ';
    if (span) span.textContent = name;

    // Subtext varies with time
    const sub = document.querySelector('.greeting-text p');
    if (sub) {
      const subTexts = {
        morning:   'Your cognitive layer is active. Focus session detected — 45 min deep work streak.',
        afternoon: 'Afternoon performance detected. Stay hydrated — next deep work window in 12 min.',
        evening:   'Evening wind-down mode. 3 tasks remain open. Suggested: wrap up before 9 PM.',
        late:      'Late-night session detected. Cognitive performance at 60%. Consider rest.',
      };
      if (h >= 5  && h < 12)  sub.textContent = subTexts.morning;
      if (h >= 12 && h < 17)  sub.textContent = subTexts.afternoon;
      if (h >= 17 && h < 21)  sub.textContent = subTexts.evening;
      if (h >= 21 || h < 5)   sub.textContent = subTexts.late;
    }
  }

  /* ─────────────────────────
     RESTORE GHOST LAYER
  ───────────────────────────*/
  function _restoreGhostLayer() {
    const isOn = localStorage.getItem('meridian_ghost_mode') === 'true';
    const pip  = document.getElementById('ghostPip');
    if (pip && isOn) pip.classList.add('on');
  }

  /* ─────────────────────────
     FOCUS SESSION TIMER
  ───────────────────────────*/
  function _startFocusTimer() {
    const el = document.getElementById('statFocus');
    if (!el) return;

    setInterval(() => {
      if (!focusTimerActive) return;
      focusSeconds++;
      const h = Math.floor(focusSeconds / 3600);
      const m = Math.floor((focusSeconds % 3600) / 60);
      el.textContent = h > 0
        ? `${h}h ${String(m).padStart(2,'0')}m`
        : `${m}m`;
    }, 1000);
  }

  /* ─────────────────────────
     LIVE COGNITIVE SCORE MICRO-FLUCTUATION
     Subtle ±1-2 drift every 8 seconds
  ───────────────────────────*/
  function _startScoreFluctuation() {
    const ringEl  = document.getElementById('scoreRing');
    const numEl   = document.getElementById('ringNum');
    const statEl  = document.getElementById('statScore');
    const total   = 364.4;

    setInterval(() => {
      const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
      cognitiveScore = Math.max(40, Math.min(100, cognitiveScore + delta));

      const offset = total - (cognitiveScore / 100) * total;
      if (ringEl) ringEl.style.strokeDashoffset = offset;
      if (numEl)  numEl.textContent  = cognitiveScore;
      if (statEl) statEl.textContent = cognitiveScore;

      // Update status label
      const statusEl = document.querySelector('.score-status');
      if (statusEl) {
        if      (cognitiveScore >= 85) { statusEl.textContent = 'PEAK FOCUS';  statusEl.style.color = 'var(--green)'; }
        else if (cognitiveScore >= 70) { statusEl.textContent = 'GOOD FOCUS';  statusEl.style.color = 'var(--green)'; }
        else if (cognitiveScore >= 50) { statusEl.textContent = 'MODERATE';    statusEl.style.color = 'var(--yellow)'; }
        else                           { statusEl.textContent = 'LOW FOCUS';   statusEl.style.color = 'var(--red)'; }
      }

      // Update stat change label
      const changeEl = document.querySelector('.stat-card:first-child .stat-change');
      if (changeEl) {
        if (delta >= 0) {
          changeEl.textContent = `↑ +${Math.abs(delta)} this cycle`;
          changeEl.className = 'stat-change up';
        } else {
          changeEl.textContent = `↓ ${Math.abs(delta)} this cycle`;
          changeEl.className = 'stat-change down';
        }
      }
    }, 8000);
  }

  /* ─────────────────────────
     LOOP ESCALATION SIMULATION
     Slowly ticks up if not blocked
  ───────────────────────────*/
  function _startLoopEscalation() {
    const badge   = document.getElementById('loopBadge');
    const countEl = document.getElementById('loopCount');
    const gauge   = document.getElementById('loopGauge');
    if (!badge) return;

    setInterval(() => {
      // Only escalate while loop badge shows DETECTED
      if (badge.textContent !== 'LOOP DETECTED') return;
      const tick = Math.floor(Math.random() * 3); // 0-2 per interval
      loopIntensity = Math.min(100, loopIntensity + tick);
      if (countEl) countEl.textContent = loopIntensity;
      if (gauge)   gauge.style.width   = loopIntensity + '%';

      if (loopIntensity >= 80) {
        _pushUrgentNudge();
      }
    }, 15000);
  }

  /* ─────────────────────────
     INJECT URGENT NUDGE when loop is critical
  ───────────────────────────*/
  function _pushUrgentNudge() {
    const list = document.getElementById('nudgeList');
    if (!list) return;

    // Don't push duplicate urgent nudges
    if (list.querySelector('[data-nudge-urgent]')) return;

    const el = document.createElement('div');
    el.className = 'nudge';
    el.setAttribute('data-nudge-urgent', '1');
    el.style.borderColor = 'var(--red)';
    el.innerHTML = `
      <div class="nudge-icon">🚨</div>
      <div>
        <div class="nudge-text"><strong>Critical:</strong> Distraction loop intensity reached 80+. Your cognitive score is dropping. Block now?</div>
        <div class="nudge-time">Just now</div>
      </div>
      <button class="nudge-dismiss" onclick="dismissNudge(this)">×</button>
    `;
    list.prepend(el);
    _syncNudgeBadge();
    if (typeof showToast === 'function') showToast('🚨 Critical loop intensity detected');
  }

  /* ─────────────────────────
     NUDGE BADGE COUNTER SYNC
  ───────────────────────────*/
  function _syncNudgeBadge() {
    const badge = document.querySelector('.nav-badge');
    const list  = document.getElementById('nudgeList');
    if (!badge || !list) return;
    const count = list.querySelectorAll('.nudge').length;
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  }

  /* Expose so dismissNudge inline can call it */
  window.Dashboard_syncNudgeBadge = _syncNudgeBadge;

  /* ─────────────────────────
     CHART RESIZE HANDLER
  ───────────────────────────*/
  function _bindResizeChart() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (typeof drawFocusChart === 'function') drawFocusChart();
      }, 250);
    });
  }

  /* ─────────────────────────
     KEYBOARD SHORTCUTS
     B — Block loop
     G — Toggle Ghost Layer
     Escape — Dismiss latest nudge
  ───────────────────────────*/
  function _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Skip if user is typing in an input
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.key.toLowerCase()) {
        case 'b':
          if (typeof blockLoop === 'function') blockLoop();
          break;
        case 'g': {
          const btn = document.querySelector('.privacy-toggle-mini');
          if (btn) btn.click();
          break;
        }
        case 'escape': {
          const firstDismiss = document.querySelector('.nudge-dismiss');
          if (firstDismiss) firstDismiss.click();
          break;
        }
      }
    });
  }

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────────*/
  return { init };

})();

/* ─────────────────────────────────────────────
   PATCH inline dismissNudge to also sync badge
───────────────────────────────────────────── */
(function patchDismissNudge() {
  const _orig = window.dismissNudge;
  window.dismissNudge = function (btn) {
    if (typeof _orig === 'function') _orig(btn);
    setTimeout(() => {
      if (typeof window.Dashboard_syncNudgeBadge === 'function') {
        window.Dashboard_syncNudgeBadge();
      }
    }, 350);
  };
})();
