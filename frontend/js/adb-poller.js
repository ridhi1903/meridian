/**
 * MERIDIAN — ADB Active App Poller
 * adb-poller.js · Loaded on dashboard.html
 *
 * Polls /api/active-app every 2 seconds and updates:
 *  - Active app name display
 *  - Distraction loop badge, chain, score, and gauge
 *  - Activity timeline with real app switch events
 *  - App category color coding (red = distraction, cyan = productive)
 *
 * Designed to plug directly into existing dashboard.html elements:
 *   #loopBadge, #loopCount, #loopGauge, .loop-chain
 */

const ADBPoller = (() => {

  /* ── CONFIG ── */
  const POLL_INTERVAL = 2000; // 2 seconds
  const API_ENDPOINT  = '/api/active-app';
  const RESET_ENDPOINT = '/api/active-app/reset-loop';

  /* ── STATE ── */
  let _pollTimer   = null;
  let _lastAppName = null;
  let _switchLog   = []; // Recent app switches for timeline injection

  /* ── APP ICON MAP ── */
  const APP_ICONS = {
    'Instagram':        '📸',
    'YouTube':          '▶️',
    'WhatsApp':         '💬',
    'Chrome':           '🌐',
    'Gmail':            '📧',
    'Snapchat':         '👻',
    'Reddit':           '🔴',
    'X (Twitter)':      '🐦',
    'Spotify':          '🎵',
    'Netflix':          '🎬',
    'Discord':          '🎮',
    'Samsung Launcher': '🏠',
    'Google Classroom': '🎓',
    'Google Docs':      '📝',
    'Google Sheets':    '📊',
    'Microsoft Word':   '📄',
    'Microsoft Excel':  '📊',
    'Phone':            '📞',
    'Settings':         '⚙️',
    'Notion':           '📋',
    'VS Code':          '💻',
    'Termux':           '💻',
    'Telegram':         '✈️',
    'Calendar':         '📅',
    'Messages':         '💬',
    'Google Maps':      '🗺️',
  };

  /* ─────────────────────────────────────────────
     INIT — call on DOMContentLoaded
  ───────────────────────────────────────────── */
  function init() {
    poll();
    _pollTimer = setInterval(poll, POLL_INTERVAL);
    console.log('[ADBPoller] Started — polling every 2s');
  }

  /* ─────────────────────────────────────────────
     POLL — fetch active app data from backend
  ───────────────────────────────────────────── */
  async function poll() {
    try {
      const res = await fetch(API_ENDPOINT);
      if (!res.ok) return;

      const data = await res.json();
      updateUI(data);
    } catch (err) {
      // Server may not be running — silently skip
    }
  }

  /* ─────────────────────────────────────────────
     UI UPDATE — inject data into dashboard elements
  ───────────────────────────────────────────── */
  function updateUI(data) {
    // ── 1. Active App Name (injected into greeting subtitle) ──
    const activeAppEl = document.getElementById('active-app-name');
    if (activeAppEl) {
      const icon = APP_ICONS[data.name] || '📱';
      activeAppEl.textContent = `${icon} ${data.name}`;
      activeAppEl.style.color = data.category === 'distraction'
        ? '#ff4757'
        : data.category === 'productive'
          ? '#00ffaa'
          : '#e8f4fd';
    }

    // ── 2. Loop Badge (#loopBadge) ──
    const loopBadge = document.getElementById('loopBadge');
    if (loopBadge) {
      if (data.loopDetected) {
        loopBadge.textContent = 'LOOP DETECTED';
        loopBadge.className = 'loop-badge';
        loopBadge.style.background = 'var(--red-dim)';
        loopBadge.style.color = 'var(--red)';
        loopBadge.style.borderColor = 'var(--red)';
      } else {
        loopBadge.textContent = 'NO LOOP';
        loopBadge.className = 'loop-badge safe';
        loopBadge.style.background = 'var(--green-dim)';
        loopBadge.style.color = 'var(--green)';
        loopBadge.style.borderColor = 'var(--green)';
      }
    }

    // ── 3. Loop Repeat Count ──
    const loopRepeat = document.getElementById('loopRepeatCount');
    if (loopRepeat) {
      loopRepeat.textContent = data.loopSequence.length >= 3
        ? `Repeated ${data.loopSequence.length}× in a row`
        : 'No consecutive distractions';
    }

    // ── 4. Loop Chain (.loop-chain) ──
    const loopChain = document.querySelector('.loop-chain');
    if (loopChain && data.loopSequence.length > 0) {
      let html = '';
      data.loopSequence.forEach((app, i) => {
        const icon = APP_ICONS[app] || '📱';
        html += `<div class="loop-app">${icon} ${app}</div>`;
        if (i < data.loopSequence.length - 1) {
          html += '<div class="loop-arrow">→</div>';
        }
      });
      loopChain.innerHTML = html;
    } else if (loopChain && data.loopSequence.length === 0) {
      loopChain.innerHTML = '<div class="loop-app" style="color:var(--green)">✓ Clean session</div>';
    }

    // ── 5. Loop Score (#loopCount) ──
    const loopCount = document.getElementById('loopCount');
    if (loopCount) {
      loopCount.textContent = data.loopScore;
      // Color based on intensity
      if (data.loopScore >= 60) {
        loopCount.style.color = 'var(--red)';
        loopCount.style.textShadow = '0 0 20px var(--red-dim)';
      } else if (data.loopScore >= 30) {
        loopCount.style.color = 'var(--yellow)';
        loopCount.style.textShadow = '0 0 20px var(--yellow-dim)';
      } else {
        loopCount.style.color = 'var(--green)';
        loopCount.style.textShadow = '0 0 20px var(--green-dim)';
      }
    }

    // ── 6. Loop Gauge (#loopGauge) ──
    const loopGauge = document.getElementById('loopGauge');
    if (loopGauge) {
      loopGauge.style.width = data.loopScore + '%';
    }

    // ── 7. Loop Status text (if element exists) ──
    const loopStatus = document.getElementById('loop-status');
    if (loopStatus) {
      if (data.loopDetected) {
        loopStatus.textContent = '⚠ Loop: ' + data.loopSequence.join(' → ');
        loopStatus.style.color = '#ff4757';
      } else {
        loopStatus.textContent = 'No Loop Detected';
        loopStatus.style.color = '#00ffaa';
      }
    }

    // ── 8. Loop Score element (if exists) ──
    const loopScoreEl = document.getElementById('loop-score');
    if (loopScoreEl) {
      loopScoreEl.textContent = data.loopScore;
    }

    // ── 9. Log app switches to the activity timeline ──
    if (data.name !== _lastAppName && data.name !== 'Waiting for ADB…' && data.name !== 'ADB Disconnected') {
      _logSwitch(data);
      _lastAppName = data.name;
    }

    // ── 10. ADB connection indicator ──
    const adbDot = document.getElementById('adbStatusDot');
    if (adbDot) {
      if (data.adbConnected) {
        adbDot.style.background = 'var(--green)';
        adbDot.style.boxShadow = '0 0 8px var(--green)';
      } else {
        adbDot.style.background = 'var(--red)';
        adbDot.style.boxShadow = '0 0 8px var(--red)';
      }
    }
  }

  /* ─────────────────────────────────────────────
     ACTIVITY LOG — prepend app switch to timeline
  ───────────────────────────────────────────── */
  function _logSwitch(data) {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;

    const icon = APP_ICONS[data.name] || '📱';
    const dotClass = data.category === 'distraction' ? 'red'
      : data.category === 'productive' ? 'cyan'
      : 'yellow';

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const desc = data.category === 'distraction'
      ? 'Distraction app opened · Loop score: ' + data.loopScore
      : data.category === 'productive'
        ? 'Productive session started'
        : 'App switch detected';

    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="t-dot ${dotClass}"></div>
      <div class="t-line"></div>
      <div class="t-content">
        <div class="t-app">${icon} ${data.name}</div>
        <div class="t-desc">${desc}</div>
      </div>
      <div class="t-time">${time}</div>
    `;

    // Animate in
    item.style.opacity = '0';
    item.style.transform = 'translateY(-8px)';
    timeline.prepend(item);
    requestAnimationFrame(() => {
      item.style.transition = 'opacity 0.3s, transform 0.3s';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });

    // Keep timeline to max 15 items
    const items = timeline.querySelectorAll('.timeline-item');
    if (items.length > 15) {
      items[items.length - 1].remove();
    }

    // Store for reference
    _switchLog.push({ name: data.name, category: data.category, time });
    if (_switchLog.length > 50) _switchLog.shift();
  }

  /* ─────────────────────────────────────────────
     RESET LOOP — called from dashboard button
  ───────────────────────────────────────────── */
  async function resetLoop() {
    try {
      await fetch(RESET_ENDPOINT, { method: 'POST' });
      if (typeof showToast === 'function') {
        showToast('✓ Distraction loop cleared');
      }
    } catch (err) {
      console.warn('[ADBPoller] Reset failed:', err.message);
    }
  }

  /* ─────────────────────────────────────────────
     CLEANUP
  ───────────────────────────────────────────── */
  function stop() {
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
    }
  }

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  return {
    init,
    poll,
    resetLoop,
    stop,
    get switchLog() { return _switchLog; },
  };

})();

/* ── Auto-init on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  ADBPoller.init();
});
