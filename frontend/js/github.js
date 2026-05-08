/**
 * MERIDIAN — GitHub Pulse Module
 * github.js · Loaded on dashboard.html and work.html
 *
 * Responsibilities:
 *  - Fetch live commit data from /api/github-pulse
 *  - Poll every 2 minutes (120 000 ms)
 *  - Update dashboard UI: Cognitive Score ↔ Velocity, Tasks Completed ↔ commitCount
 *  - Update work.html: Thinking Recovery hero with real commit data
 *  - Persist velocityScore to localStorage
 *  - Enforce Ghost Layer blur on sensitive commit content
 *  - Show daily target analysis badge
 */

const GitHubPulse = (() => {

  /* ── CONSTANTS ── */
  const POLL_INTERVAL = 120_000; // 2 minutes
  const API_ENDPOINT = '/api/github-pulse';
  const VELOCITY_KEY = 'meridian_velocity_score';
  const GHOST_KEY = 'meridian_ghost_mode';
  const PAUSED_KEY = 'meridian_pulse_paused';

  /* ── STATE ── */
  let _lastData = null;
  let _pollTimer = null;
  let _isGhostOn = false;
  let _isPaused = false;

  /* ─────────────────────────────────────────────
     INIT — call on DOMContentLoaded
  ───────────────────────────────────────────── */
  function init() {
    // Restore Ghost Layer state from localStorage
    _isGhostOn = localStorage.getItem(GHOST_KEY) === 'true';

    // Restore paused state — default to PAUSED unless explicitly resumed
    const savedPause = localStorage.getItem(PAUSED_KEY);
    _isPaused = savedPause === null ? true : savedPause === 'true';

    // Listen for live Ghost Mode toggle events from MERIDIAN.GhostMode
    window.addEventListener('meridian:ghostmode', (e) => {
      _isGhostOn = e.detail?.active ?? false;
      _applyGhostBlur();
    });

    // Render the pause button UI on the dashboard
    _renderPauseButton();

    // Only poll if not paused
    if (!_isPaused) {
      updateSystemPulse();
      _pollTimer = setInterval(updateSystemPulse, POLL_INTERVAL);
    } else {
      _showPausedState();
    }
  }

  /* ─────────────────────────────────────────────
     FETCH — /api/github-pulse
  ───────────────────────────────────────────── */
  async function updateSystemPulse() {
    if (_isPaused) return; // Skip fetch when monitoring is paused
    try {
      const res = await fetch(API_ENDPOINT);

      if (!res.ok) {
        console.warn('[GitHubPulse] API error:', res.status);
        return;
      }

      const data = await res.json();

      // Bail if API returned an error payload
      if (data.error || data.fallback) {
        console.warn('[GitHubPulse] Fallback data:', data.error);
        return;
      }

      _lastData = data;

      // ── Persist velocity score ──
      localStorage.setItem(VELOCITY_KEY, String(data.velocityScore));

      // ── Update UI elements on the current page ──
      _updateDashboard(data);
      _updateWorkPage(data);
      _applyGhostBlur();

    } catch (err) {
      console.error('[GitHubPulse] Network error:', err.message);
    }
  }

  /* ─────────────────────────────────────────────
     DASHBOARD UI UPDATES
     Only runs if the dashboard elements exist.
  ───────────────────────────────────────────── */
  function _updateDashboard(data) {
    // ── GitHub Pulse card (new card injected via HTML) ──
    const pulseMsg = document.getElementById('ghPulseMsg');
    const pulseAuthor = document.getElementById('ghPulseAuthor');
    const pulseTime = document.getElementById('ghPulseTime');
    const pulseDot = document.getElementById('ghPulseDot');
    const pulseScore = document.getElementById('ghPulseScore');

    if (pulseMsg) {
      pulseMsg.textContent = data.lastCommitMessage;
      pulseMsg.classList.add('blur-sensitive');
    }
    if (pulseAuthor) {
      pulseAuthor.textContent = data.author;
      pulseAuthor.classList.add('blur-sensitive');
    }
    if (pulseTime) {
      pulseTime.textContent = _formatRelativeTime(data.timestamp);
    }
    if (pulseDot) {
      // Glow colour based on velocity score
      if (data.velocityScore >= 80) {
        pulseDot.style.background = 'var(--green)';
        pulseDot.style.boxShadow = '0 0 8px var(--green)';
      } else if (data.velocityScore >= 50) {
        pulseDot.style.background = 'var(--yellow)';
        pulseDot.style.boxShadow = '0 0 8px var(--yellow)';
      } else {
        pulseDot.style.background = 'var(--red)';
        pulseDot.style.boxShadow = '0 0 8px var(--red)';
      }
    }
    if (pulseScore) {
      pulseScore.textContent = data.velocityScore;
    }

    // ── Velocity bar ──
    const velBar = document.getElementById('ghVelocityBar');
    if (velBar) velBar.style.width = data.velocityScore + '%';

    // ── GitHub Stats: commit counts ──
    const statCommits = document.getElementById('ghStatCommits');
    const statToday = document.getElementById('ghStatToday');
    if (statCommits) statCommits.textContent = data.commitCount;
    if (statToday && data.targets) statToday.textContent = data.targets.actual;

    // ── Daily target analysis ──
    const targetLabel = document.getElementById('ghTargetLabel');
    const targetBar = document.getElementById('ghTargetBar');
    const targetBadge = document.getElementById('ghTargetBadge');
    if (data.targets) {
      if (targetLabel) targetLabel.textContent = data.targets.message;
      if (targetBar) targetBar.style.width = data.targets.pct + '%';
      if (targetBadge) {
        targetBadge.textContent = data.targets.met ? '✓ TARGET MET' : `${data.targets.actual}/${data.targets.target}`;
        targetBadge.className = 'tag ' + (data.targets.met ? 'tag-green' : 'tag-yellow');
      }
    }

    // ── Update the Task Velocity bar in the Cognitive Score card ──
    const taskVelBar = document.querySelector('.score-bar-row:nth-child(2) .score-bar-fill');
    const taskVelVal = document.querySelector('.score-bar-row:nth-child(2) .score-bar-val');
    if (taskVelBar) {
      taskVelBar.style.width = data.velocityScore + '%';
      taskVelBar.setAttribute('data-w', data.velocityScore);
    }
    if (taskVelVal) taskVelVal.textContent = data.velocityScore + '%';

    // ── Update "Tasks Completed" stat card with commitCount ──
    const taskStatCard = document.querySelector('.stat-card:nth-child(3) .stat-value');
    const taskStatChange = document.querySelector('.stat-card:nth-child(3) .stat-change');
    if (taskStatCard) {
      taskStatCard.textContent = data.commitCount;
    }
    if (taskStatChange && data.targets) {
      taskStatChange.textContent = data.targets.met
        ? '↑ Daily target met!'
        : `↑ ${data.targets.actual} today / ${data.targets.target} target`;
      taskStatChange.className = 'stat-change ' + (data.targets.met ? 'up' : 'down');
    }
  }

  /* ─────────────────────────────────────────────
     WORK PAGE UI UPDATES
     Injects real commit data into the
     Thinking Recovery hero card.
  ───────────────────────────────────────────── */
  function _updateWorkPage(data) {
    // Snapshot title — show the commit message
    const snapTitle = document.querySelector('.snapshot-title');
    if (snapTitle) {
      snapTitle.innerHTML = 'Last commit: <span class="blur-sensitive">' +
        _sanitise(data.lastCommitMessage.split('\n')[0]) + '</span>';
    }

    // Snapshot file — show repo + relative time
    const snapFile = document.querySelector('.snapshot-file');
    if (snapFile) {
      snapFile.innerHTML = '🐙 ridhi1903/meridian-heartbeat &nbsp;·&nbsp; ' +
        _formatRelativeTime(data.timestamp);
      snapFile.classList.add('blur-sensitive');
    }

    // Snapshot description — detailed commit context
    const snapDesc = document.querySelector('.snapshot-desc');
    if (snapDesc) {
      snapDesc.innerHTML =
        'Latest push by <strong class="blur-sensitive">' + _sanitise(data.author) + '</strong> ' +
        'at <strong>' + new Date(data.timestamp).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }) + '</strong>. ' +
        'Velocity score is <strong>' + data.velocityScore + '/100</strong>. ' +
        (data.targets ? data.targets.message : '');
    }

    // Code block body — show the raw commit message
    const codeBody = document.querySelector('.code-body');
    if (codeBody) {
      const lines = data.lastCommitMessage.split('\n');
      let html = '<span class="c-comment">// Latest commit from ridhi1903/meridian-heartbeat</span>\n';
      html += '<span class="c-comment">// Author: ' + _sanitise(data.author) + '</span>\n\n';
      html += '<span class="c-keyword">commit</span> <span class="c-string">"' + _sanitise(lines[0]) + '"</span>\n';
      if (lines.length > 1) {
        html += '\n<span class="c-comment">// Description:</span>\n';
        lines.slice(1).filter(l => l.trim()).forEach(line => {
          html += '<span class="c-var">' + _sanitise(line) + '</span>\n';
        });
      }
      html += '\n<span class="c-highlight">  <span class="c-keyword">velocity</span>: <span class="c-num">' + data.velocityScore + '</span> / 100</span>\n';
      html += '<span class="c-highlight">  <span class="c-keyword">target</span>:   ' +
        (data.targets?.met
          ? '<span class="c-function">MET ✓</span>'
          : '<span class="c-string">' + (data.targets?.actual || 0) + '/' + (data.targets?.target || 3) + '</span>') +
        '</span>';
      codeBody.innerHTML = html;
      codeBody.classList.add('blur-sensitive');
    }

    // Code filename bar
    const codeFile = document.querySelector('.code-filename');
    if (codeFile) {
      codeFile.textContent = 'ridhi1903/meridian-heartbeat — ' +
        new Date(data.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    }

    // Snap stat: Velocity
    const snapStatVal = document.querySelector('.snap-stat:nth-child(1) .snap-stat-val');
    const snapStatLbl = document.querySelector('.snap-stat:nth-child(1) .snap-stat-label');
    if (snapStatVal) snapStatVal.textContent = data.velocityScore;
    if (snapStatLbl) snapStatLbl.textContent = 'Velocity';

    // Snap stat: Commits
    const snapStat2 = document.querySelector('.snap-stat:nth-child(2) .snap-stat-val');
    const snapLbl2 = document.querySelector('.snap-stat:nth-child(2) .snap-stat-label');
    if (snapStat2) snapStat2.textContent = data.commitCount;
    if (snapLbl2) snapLbl2.textContent = 'Commits';
  }

  /* ─────────────────────────────────────────────
     GHOST LAYER — blur sensitive DOM elements
  ───────────────────────────────────────────── */
  function _applyGhostBlur() {
    document.querySelectorAll('.blur-sensitive').forEach(el => {
      if (_isGhostOn) {
        el.style.filter = 'blur(5px)';
        el.style.userSelect = 'none';
      } else {
        el.style.filter = '';
        el.style.userSelect = '';
      }
    });
  }

  /* ─────────────────────────────────────────────
     HELPERS
  ───────────────────────────────────────────── */
  function _formatRelativeTime(isoStr) {
    const elapsed = Date.now() - new Date(isoStr).getTime();
    const sec = Math.floor(elapsed / 1000);
    if (sec < 60) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const days = Math.floor(hr / 24);
    return days + 'd ago';
  }

  function _sanitise(str) {
    const el = document.createElement('span');
    el.textContent = str || '';
    return el.innerHTML;
  }

  /* ─────────────────────────────────────────────
     PAUSE / RESUME
  ───────────────────────────────────────────── */
  function togglePause() {
    _isPaused = !_isPaused;
    localStorage.setItem(PAUSED_KEY, String(_isPaused));

    if (_isPaused) {
      // Stop polling
      clearInterval(_pollTimer);
      _pollTimer = null;
      _showPausedState();
      console.log('[GitHubPulse] ⏸ Monitoring paused');
    } else {
      // Resume polling immediately
      updateSystemPulse();
      _pollTimer = setInterval(updateSystemPulse, POLL_INTERVAL);
      _hidePausedState();
      console.log('[GitHubPulse] ▶ Monitoring resumed');
    }

    // Update button UI
    _renderPauseButton();
    return _isPaused;
  }

  function _showPausedState() {
    const dot = document.getElementById('ghPulseDot');
    if (dot) {
      dot.style.background = 'var(--text-muted)';
      dot.style.boxShadow = 'none';
    }
    const msg = document.getElementById('ghPulseMsg');
    if (msg && !_lastData) msg.textContent = '⏸ Monitoring paused';
    const score = document.getElementById('ghPulseScore');
    if (score && !_lastData) score.textContent = '—';
  }

  function _hidePausedState() {
    // Dot will be updated by the next fetch
  }

  function _renderPauseButton() {
    // Find the pulse card label on the dashboard
    const cardLabels = document.querySelectorAll('.github-pulse-card .card-label');
    if (!cardLabels.length) return;
    const label = cardLabels[0]; // first pulse card

    // Remove existing button if any
    const existing = document.getElementById('ghPauseBtn');
    if (existing) existing.remove();

    // Create the pause/resume button
    const btn = document.createElement('button');
    btn.id = 'ghPauseBtn';
    btn.style.cssText =
      'margin-left:auto;padding:4px 12px;border-radius:20px;font-size:10px;' +
      'letter-spacing:1px;cursor:pointer;font-family:"Inter",sans-serif;' +
      'transition:all 0.2s;border:1px solid;';

    if (_isPaused) {
      btn.textContent = '▶ RESUME';
      btn.style.background = 'var(--green-dim)';
      btn.style.borderColor = 'var(--green)';
      btn.style.color = 'var(--green)';
    } else {
      btn.textContent = '⏸ PAUSE';
      btn.style.background = 'var(--yellow-dim)';
      btn.style.borderColor = 'var(--yellow)';
      btn.style.color = 'var(--yellow)';
    }

    btn.addEventListener('click', () => {
      const paused = togglePause();
      if (typeof showToast === 'function') {
        showToast(paused ? '⏸ GitHub monitoring paused' : '▶ GitHub monitoring resumed');
      }
    });

    label.appendChild(btn);
  }

  /* ─────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────── */
  return {
    init,
    updateSystemPulse,
    togglePause,
    get lastData() { return _lastData; },
    get isPaused() { return _isPaused; },
  };

})();

/* ── Auto-init on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  GitHubPulse.init();
});
