/**
 * MERIDIAN — ADB Active App Poller + Task Manager
 * adb-poller.js · Loaded on dashboard.html
 *
 * Responsibilities:
 *  1. Poll /api/active-app every 2s — render hybrid usage data
 *  2. Update cognitive score ring, focus time, distraction stats
 *  3. Update distraction loop badge, chain, gauge
 *  4. Update app usage bars with real baseline+live times
 *  5. Trigger UI nudge alert when 15-min distraction threshold hit
 *  6. Activity timeline injection on app switch
 *  7. Task list click-to-toggle with counter update
 */

const ADBPoller = (() => {

  /* ── CONFIG ── */
  const POLL_INTERVAL  = 2000;
  const API_ENDPOINT   = '/api/active-app';
  const RESET_ENDPOINT = '/api/active-app/reset-loop';
  const GHOST_ENDPOINT = '/api/toggle-ghost-mode';

  /* ── STATE ── */
  let _pollTimer    = null;
  let _lastAppName  = null;
  let _nudgeFired   = {};  // Track which apps already triggered a nudge alert

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
    'LinkedIn':         '💼',
    'JioHotstar':       '🎬',
    'Forest':           '🌲',
    'Classified Activity': '🛡️',
  };

  /* ─────────────────────────────────────────────
     INIT
  ───────────────────────────────────────────── */
  function init() {
    poll();
    _pollTimer = setInterval(poll, POLL_INTERVAL);
    _initTaskClicks();
    console.log('[ADBPoller] Started — hybrid model, polling every 2s');
  }

  /* ─────────────────────────────────────────────
     POLL
  ───────────────────────────────────────────── */
  async function poll() {
    try {
      const res = await fetch(API_ENDPOINT);
      if (!res.ok) return;
      const data = await res.json();
      updateUI(data);
    } catch (err) {
      // Server not running — silent
    }
  }

  /* ─────────────────────────────────────────────
     FORMAT HELPERS
  ───────────────────────────────────────────── */
  function fmtDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function fmtDurationLong(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  /* ─────────────────────────────────────────────
     MAIN UI UPDATE
  ───────────────────────────────────────────── */
  function updateUI(data) {

    // ── 1. Active App Name ──
    const activeAppEl = document.getElementById('active-app-name');
    if (activeAppEl) {
      const icon = APP_ICONS[data.name] || '📱';
      activeAppEl.textContent = `${icon} ${data.name}`;
      activeAppEl.style.color = data.category === 'distraction'
        ? '#ff4757'
        : data.category === 'productive'
          ? '#00ffaa'
          : data.ghostMode
            ? '#a78bfa'
            : '#e8f4fd';
    }

    // ── 2. Cognitive Score ──
    updateCognitiveScore(data.cognitiveScore);

    // ── 3. Focus Time stat card ──
    const focusEl = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (focusEl) {
      focusEl.textContent = fmtDuration(data.focusTimeSec);
    }

    // ── 4. Loop Badge ──
    const loopBadge = document.getElementById('loopBadge');
    if (loopBadge) {
      if (data.loopDetected) {
        loopBadge.textContent = 'LOOP DETECTED';
        loopBadge.style.background = 'var(--red-dim)';
        loopBadge.style.color = 'var(--red)';
        loopBadge.style.borderColor = 'var(--red)';
      } else {
        loopBadge.textContent = 'NO LOOP';
        loopBadge.style.background = 'var(--green-dim)';
        loopBadge.style.color = 'var(--green)';
        loopBadge.style.borderColor = 'var(--green)';
      }
    }

    // ── 5. Loop Repeat Count ──
    const loopRepeat = document.getElementById('loopRepeatCount');
    if (loopRepeat) {
      loopRepeat.textContent = data.loopSequence.length >= 3
        ? `Repeated ${data.loopSequence.length}× in a row`
        : 'No consecutive distractions';
    }

    // ── 6. Loop Chain ──
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

    // ── 7. Loop Score & Gauge ──
    const loopCount = document.getElementById('loopCount');
    if (loopCount) {
      loopCount.textContent = data.loopScore;
      if (data.loopScore >= 60) {
        loopCount.style.color = 'var(--red)';
      } else if (data.loopScore >= 30) {
        loopCount.style.color = 'var(--yellow)';
      } else {
        loopCount.style.color = 'var(--green)';
      }
    }
    const loopGauge = document.getElementById('loopGauge');
    if (loopGauge) {
      loopGauge.style.width = data.loopScore + '%';
    }

    // ── 8. App Usage Bars (hybrid: baseline + live) ──
    updateAppUsageBars(data.appStats);

    // ── 9. Session Nudge Alert ──
    if (data.triggerNudge && data.nudgeApp && !_nudgeFired[data.nudgeApp]) {
      _nudgeFired[data.nudgeApp] = true;
      fireNudgeAlert(data.nudgeApp, data.nudgeLiveSec);
    }

    // ── 10. ADB Connection Indicator ──
    const adbDot = document.getElementById('adbStatusDot');
    if (adbDot) {
      if (data.adbConnected) {
        adbDot.style.background = data.ghostMode ? 'var(--purple)' : 'var(--green)';
        adbDot.style.boxShadow = data.ghostMode ? '0 0 8px var(--purple)' : '0 0 8px var(--green)';
      } else {
        adbDot.style.background = 'var(--red)';
        adbDot.style.boxShadow = '0 0 8px var(--red)';
      }
    }

    // ── 11. Activity Timeline — log app switches ──
    if (data.name !== _lastAppName && data.name !== 'Waiting for ADB…' && data.name !== 'ADB Disconnected') {
      _logSwitch(data);
      _lastAppName = data.name;
    }
  }

  /* ─────────────────────────────────────────────
     COGNITIVE SCORE — update the SVG ring + labels
  ───────────────────────────────────────────── */
  function updateCognitiveScore(score) {
    // Score value text
    const scoreVal = document.getElementById('cogScoreVal');
    if (scoreVal) scoreVal.textContent = score;

    // SVG ring
    const ring = document.getElementById('cogRingFill');
    if (ring) {
      const circumference = 2 * Math.PI * 52; // r=52
      const offset = circumference - (score / 100) * circumference;
      ring.style.strokeDashoffset = offset;

      // Color based on score
      if (score >= 70) {
        ring.style.stroke = 'url(#scoreGrad)'; // default gradient
      } else if (score >= 40) {
        ring.style.stroke = '#ffd700';
      } else {
        ring.style.stroke = '#ff4757';
      }
    }

    // Score label
    const scoreLabel = document.getElementById('cogScoreLabel');
    if (scoreLabel) {
      if (score >= 80) scoreLabel.textContent = 'EXCELLENT';
      else if (score >= 60) scoreLabel.textContent = 'GOOD FOCUS';
      else if (score >= 40) scoreLabel.textContent = 'MODERATE';
      else scoreLabel.textContent = 'LOW FOCUS';
    }

    // Main stat card
    const statScore = document.querySelector('.stat-card:nth-child(1) .stat-value');
    if (statScore) statScore.textContent = score;
  }

  /* ─────────────────────────────────────────────
     APP USAGE BARS — render from hybrid stats
  ───────────────────────────────────────────── */
  function updateAppUsageBars(appStats) {
    const container = document.querySelector('.app-list');
    if (!container) return;

    // Sort apps by total time descending
    const sorted = Object.entries(appStats)
      .filter(([_, s]) => s.total > 0 && s.category !== 'neutral')
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6); // Top 6

    if (sorted.length === 0) return;

    const maxTime = sorted[0][1].total;

    let html = '';
    for (const [app, stats] of sorted) {
      const icon = APP_ICONS[app] || '📱';
      const pct  = Math.round((stats.total / maxTime) * 100);
      const fillClass = stats.category === 'distraction'
        ? 'style="background:linear-gradient(90deg,var(--red),#cc0022)"'
        : stats.category === 'productive'
          ? 'class="app-bar-fill fill-cyan"'
          : 'class="app-bar-fill fill-yellow"';

      html += `
        <div class="app-row">
          <div class="app-icon-sm">${icon}</div>
          <div class="app-name">${app}</div>
          <div class="app-bar-track">
            <div ${fillClass.startsWith('style') ? fillClass : fillClass} style="${fillClass.startsWith('style') ? fillClass.slice(7, -1) + ';' : ''}width:${pct}%" data-w="${pct}"></div>
          </div>
          <div class="app-time">${fmtDuration(stats.total)}</div>
        </div>`;
    }

    container.innerHTML = html;
  }

  /* ─────────────────────────────────────────────
     NUDGE ALERT — 15-min distraction threshold
  ───────────────────────────────────────────── */
  function fireNudgeAlert(appName, liveSec) {
    const icon = APP_ICONS[appName] || '📱';

    // Add to MERIDIAN nudge system if available
    if (typeof MERIDIAN !== 'undefined' && MERIDIAN.Nudges) {
      MERIDIAN.Nudges.add(
        '🔁',
        `${icon} ${appName} has been open for ${fmtDurationLong(liveSec)} this session. Consider taking a break.`,
        'high',
        'dashboard.html'
      );
      MERIDIAN.Nudges.updateBadge();
    }

    // Show toast
    if (typeof showToast === 'function') {
      showToast(`⚠️ ${appName} open for ${fmtDurationLong(liveSec)} — time for a focus break?`);
    }

    // Inject into nudge panel if it exists
    const nudgePanel = document.querySelector('.nudge-list');
    if (nudgePanel) {
      const item = document.createElement('div');
      item.className = 'nudge-item';
      item.innerHTML = `
        <div class="nudge-icon">🔁</div>
        <div class="nudge-content">
          <div class="nudge-text"><strong style="color:var(--red)">${icon} ${appName}</strong> has been active for <strong>${fmtDurationLong(liveSec)}</strong> this session. Context lock advised.</div>
          <div class="nudge-meta">Just now · Distraction Guard</div>
        </div>
        <button class="nudge-dismiss" onclick="this.parentElement.remove()">✕</button>
      `;
      item.style.borderColor = 'var(--red)';
      item.style.animation = 'fadeIn 0.4s ease both';
      nudgePanel.prepend(item);
    }

    console.log(`\x1b[35m[NUDGE] ⚠ ${appName} hit ${fmtDurationLong(liveSec)} live time\x1b[0m`);
  }

  /* ─────────────────────────────────────────────
     ACTIVITY TIMELINE
  ───────────────────────────────────────────── */
  function _logSwitch(data) {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;

    const icon = APP_ICONS[data.name] || '📱';
    const dotClass = data.category === 'distraction' ? 'red'
      : data.category === 'productive' ? 'cyan'
      : data.ghostMode ? 'purple'
      : 'yellow';

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const liveTime = data.liveSessionStats?.[data.name];
    const desc = data.ghostMode
      ? 'Ghost Mode active — tracking paused'
      : data.category === 'distraction'
        ? `Distraction app opened${liveTime ? ' · Live: ' + fmtDurationLong(liveTime) : ''}`
        : data.category === 'productive'
          ? `Productive session${liveTime ? ' · Live: ' + fmtDurationLong(liveTime) : ''}`
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

    item.style.opacity = '0';
    item.style.transform = 'translateY(-8px)';
    timeline.prepend(item);
    requestAnimationFrame(() => {
      item.style.transition = 'opacity 0.3s, transform 0.3s';
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });

    const items = timeline.querySelectorAll('.timeline-item');
    if (items.length > 15) items[items.length - 1].remove();
  }

  /* ─────────────────────────────────────────────
     GHOST MODE TOGGLE
  ───────────────────────────────────────────── */
  async function toggleGhost() {
    try {
      const res = await fetch(GHOST_ENDPOINT, { method: 'POST' });
      const data = await res.json();
      if (typeof showToast === 'function') {
        showToast(data.ghostMode ? '🛡️ Ghost Mode ON — tracking paused' : '👁️ Ghost Mode OFF — tracking resumed');
      }
      return data.ghostMode;
    } catch (err) {
      console.warn('[ADBPoller] Ghost toggle failed:', err.message);
    }
  }

  /* ─────────────────────────────────────────────
     LOOP RESET
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
     TASK LIST — click-to-toggle + counter update
  ───────────────────────────────────────────── */
  function _initTaskClicks() {
    document.addEventListener('DOMContentLoaded', () => {
      // Find all task items
      const taskItems = document.querySelectorAll('.task-item');
      taskItems.forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          item.classList.toggle('completed');

          // Toggle the checkbox visual
          const checkbox = item.querySelector('.task-check');
          if (checkbox) {
            const isDone = item.classList.contains('completed');
            checkbox.textContent = isDone ? '✓' : '';
            checkbox.style.background = isDone ? 'var(--green)' : 'transparent';
            checkbox.style.borderColor = isDone ? 'var(--green)' : 'var(--border)';
            checkbox.style.color = isDone ? '#040812' : '';
          }

          // Strikethrough the text
          const text = item.querySelector('.task-text');
          if (text) {
            text.style.textDecoration = item.classList.contains('completed') ? 'line-through' : 'none';
            text.style.opacity = item.classList.contains('completed') ? '0.5' : '1';
          }

          // Update the counter
          _updateTaskCounter();
        });
      });

      // Initial counter sync
      _updateTaskCounter();
    });
  }

  function _updateTaskCounter() {
    const all  = document.querySelectorAll('.task-item');
    const done = document.querySelectorAll('.task-item.completed');
    const total    = all.length;
    const complete = done.length;

    // Update counter text (e.g., "7/10")
    const counter = document.getElementById('taskCounter');
    if (counter) counter.textContent = `${complete}/${total}`;

    // Update progress bar
    const bar = document.getElementById('taskProgressBar');
    if (bar) bar.style.width = total > 0 ? Math.round((complete / total) * 100) + '%' : '0%';

    // Update percentage text
    const pct = document.getElementById('taskProgressPct');
    if (pct) pct.textContent = total > 0 ? Math.round((complete / total) * 100) + '%' : '0%';
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
    toggleGhost,
    stop,
  };

})();

/* ── Auto-init on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  ADBPoller.init();
});
