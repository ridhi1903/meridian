/**
 * MERIDIAN — Work Resume Module (Work Life Domain)
 * work.js · Loaded after app.js on work.html
 *
 * The inline <script> in work.html already handles:
 *   tick(), awaySeconds/updateAway(), load animations,
 *   toggleTask(), updateProgress(), resumeWork(),
 *   togglePrivacy(), showToast()
 *
 * This module adds everything on top:
 *  - Populate user from session
 *  - Restore Ghost Layer state, apply work-specific privacy effects
 *  - Away timer persistence (accurate across page reloads)
 *  - Task state persistence (done/undone survives refresh)
 *  - Work Output Summary card (inject into DOM)
 *  - Weekly Calendar widget (inject into DOM)
 *  - Enhanced Chat Scan panel (multiple detected deadlines)
 *  - Live "last sync" counter in topbar
 *  - Keyboard shortcuts: R=resume, G=ghost, N=add task
 *  - Patch resumeWork, toggleTask, togglePrivacy for persistence
 */

/* ─────────────────────────────────────────────
   STORAGE KEYS
───────────────────────────────────────────── */
const WORK_KEYS = {
  TASKS     : 'meridian_tasks',
  AWAY_START: 'meridian_away_start',
  GHOST     : 'meridian_ghost_mode',
  PERM_MSG  : 'meridian_perm_msg',
  PERM_DOC  : 'meridian_perm_doc',
};

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  WorkResume.init();
});

/* ─────────────────────────────────────────────
   WORKRESUME MODULE
───────────────────────────────────────────── */
const WorkResume = (() => {

  let syncSeconds = 120; // start at "2 min ago"

  /* ─────────────────────────
     INIT
  ───────────────────────────*/
  function init() {
    _populateUser();
    _restoreGhostLayer();
    _initAwayTimer();
    _restoreTaskStates();
    _injectWorkOutputSummary();
    _injectCalendarWidget();
    _enhanceChatScan();
    _applyGhostEffects();
    _bindPersistencePatches();
    _bindKeyboardShortcuts();
    _startSyncCounter();
  }

  /* ─────────────────────────
     POPULATE USER
  ───────────────────────────*/
  function _populateUser() {
    try {
      const raw = localStorage.getItem('meridian_session');
      if (!raw) return;
      const { user } = JSON.parse(raw);
      if (!user) return;

      const avatar = document.querySelector('.avatar');
      const name   = document.querySelector('.user-info .name');
      const role   = document.querySelector('.user-info .role');

      if (avatar && user.initials) avatar.textContent = user.initials;
      if (name   && user.name)     name.textContent   = user.name;
      if (role   && user.role)     role.textContent   = user.role.toUpperCase();
    } catch (_) {}
  }

  /* ─────────────────────────
     RESTORE GHOST LAYER
  ───────────────────────────*/
  function _restoreGhostLayer() {
    const isOn = localStorage.getItem(WORK_KEYS.GHOST) === 'true';
    const pip  = document.getElementById('ghostPip');
    if (pip && isOn) pip.classList.add('on');
  }

  /* ─────────────────────────
     AWAY TIMER PERSISTENCE
     Saves the "last active" timestamp so the timer
     shows real elapsed time across page reloads.
  ───────────────────────────*/
  function _initAwayTimer() {
    const stored = localStorage.getItem(WORK_KEYS.AWAY_START);
    if (stored) {
      const elapsed = Math.floor((Date.now() - parseInt(stored, 10)) / 1000);
      // Override the awaySeconds variable that the inline script already declared
      if (typeof window.awaySeconds !== 'undefined' && elapsed > 0) {
        window.awaySeconds = elapsed;
        // Trigger an immediate display update
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        const el = document.getElementById('awayTimer');
        if (el) el.textContent = `Away for ${m}:${s}`;
      }
    } else {
      // First visit — save now as the away start
      localStorage.setItem(WORK_KEYS.AWAY_START, String(Date.now() - 487000)); // preserve the 487s default
    }
  }

  /* ─────────────────────────
     TASK STATE PERSISTENCE
  ───────────────────────────*/
  function _saveTaskStates() {
    const items = document.querySelectorAll('#taskList .task-item');
    const states = Array.from(items).map(item => item.classList.contains('done'));
    localStorage.setItem(WORK_KEYS.TASKS, JSON.stringify(states));
  }

  function _restoreTaskStates() {
    try {
      const raw = localStorage.getItem(WORK_KEYS.TASKS);
      if (!raw) return;
      const states = JSON.parse(raw);

      const items = document.querySelectorAll('#taskList .task-item');
      items.forEach((item, i) => {
        if (states[i] === undefined) return;
        const check = item.querySelector('.task-check');
        if (!check) return;

        if (states[i] && !item.classList.contains('done')) {
          check.classList.add('checked');
          check.textContent = '✓';
          item.classList.add('done');
        } else if (!states[i] && item.classList.contains('done')) {
          check.classList.remove('checked');
          check.textContent = '';
          item.classList.remove('done');
        }
      });

      // Re-calculate progress after restoring
      if (typeof window.updateProgress === 'function') {
        window.updateProgress();
      }
    } catch (_) {}
  }

  /* ─────────────────────────
     INJECT WORK OUTPUT SUMMARY
     Inserted after the Tasks + Daily Summary row.
  ───────────────────────────*/
  function _injectWorkOutputSummary() {
    if (document.getElementById('workOutputCard')) return; // already injected

    const outputs = [
      { icon: '💻', label: 'Code Written',   value: '847 lines',  color: 'cyan',   pct: 85 },
      { icon: '📄', label: 'Docs Updated',   value: '3 Word docs',color: 'green',  pct: 60 },
      { icon: '📊', label: 'Spreadsheets',   value: '2 tables',   color: 'yellow', pct: 40 },
      { icon: '🔀', label: 'Git Commits',    value: '5 commits',  color: 'purple', pct: 70 },
      { icon: '🔍', label: 'PRs Reviewed',   value: '2 PRs',      color: 'cyan',   pct: 50 },
      { icon: '💬', label: 'Slack Messages', value: '34 sent',    color: 'yellow', pct: 34 },
    ];

    const gradMap = {
      cyan:   'linear-gradient(90deg,#00d4ff,#0099cc)',
      green:  'linear-gradient(90deg,#00ff88,#00aa44)',
      yellow: 'linear-gradient(90deg,#ffd700,#cc9900)',
      purple: 'linear-gradient(90deg,#a78bfa,#7c3aed)',
    };

    const rows = outputs.map(o => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(26,45,74,0.4)">
        <div style="font-size:18px;width:28px;text-align:center">${o.icon}</div>
        <div style="font-size:12px;color:var(--text-muted);width:130px;flex-shrink:0">${o.label}</div>
        <div style="font-family:'Orbitron',sans-serif;font-size:13px;font-weight:600;color:var(--${o.color});width:90px;flex-shrink:0">${o.value}</div>
        <div style="flex:1;height:4px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden">
          <div class="wo-bar" data-w="${o.pct}" style="height:100%;width:0;background:${gradMap[o.color]};border-radius:2px;transition:width 1.5s ease"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);width:36px;text-align:right">${o.pct}%</div>
      </div>`).join('');

    const card = document.createElement('div');
    card.id = 'workOutputCard';
    card.className = 'card mb-20';
    card.style.animationDelay = '0.35s';
    card.innerHTML = `
      <div class="card-label"><div class="card-label-dot"></div>WORK OUTPUT SUMMARY · TODAY</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 32px">
        ${rows}
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <span class="tag tag-green">5 commits pushed</span>
        <span class="tag tag-cyan">2 PRs reviewed</span>
        <span class="tag tag-yellow">3 docs updated</span>
        <span class="tag tag-purple">847 lines written</span>
        <span style="margin-left:auto;font-size:11px;color:var(--green)">↑ +18% vs yesterday</span>
      </div>`;

    // Insert after the grid-3-1 row (tasks + summary)
    const taskRow = document.querySelector('.grid-3-1');
    if (taskRow && taskRow.parentNode) {
      taskRow.parentNode.insertBefore(card, taskRow.nextSibling);
    } else {
      document.querySelector('.content')?.appendChild(card);
    }

    // Animate bars on load
    window.addEventListener('load', () => {
      setTimeout(() => {
        card.querySelectorAll('.wo-bar').forEach(bar => {
          bar.style.width = (bar.dataset.w || 0) + '%';
        });
      }, 700);
    });
  }

  /* ─────────────────────────
     INJECT WEEKLY CALENDAR WIDGET
  ───────────────────────────*/
  /* ══════════════════════════════════════════════════════
     INTERACTIVE CALENDAR
     Full month grid · Add / Edit / Delete events
     Prev/Next month · Prev/Next year · Jump to today
     Events persisted in localStorage: meridian_cal_events
  ══════════════════════════════════════════════════════ */
  function _injectCalendarWidget() {
    if (document.getElementById('calendarCard')) return;

    /* ── SEED DEFAULT EVENTS (only if nothing stored yet) ── */
    const CAL_KEY = 'meridian_cal_events';
    const todayRef = new Date();
    function _ymd(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    function _loadEvents() {
      try { return JSON.parse(localStorage.getItem(CAL_KEY)) || {}; } catch(_) { return {}; }
    }
    function _saveEvents(evs) {
      localStorage.setItem(CAL_KEY, JSON.stringify(evs));
    }

    if (!localStorage.getItem(CAL_KEY)) {
      const seed = {};
      const d = (offset) => { const x = new Date(todayRef); x.setDate(x.getDate()+offset); return _ymd(x); };
      seed[d(-3)] = [{ id:'s1', time:'09:00', label:'Stand-up',       color:'cyan'   },
                     { id:'s2', time:'14:00', label:'Sprint Review',   color:'yellow' }];
      seed[d(-2)] = [{ id:'s3', time:'11:00', label:'1:1 with Lead',  color:'purple' }];
      seed[d(0)]  = [{ id:'s4', time:'10:00', label:'PR Review',      color:'green'  },
                     { id:'s5', time:'16:00', label:'Deploy',          color:'red'    }];
      seed[d(1)]  = [{ id:'s6', time:'13:00', label:'Deadline ⚠️',    color:'red'    }];
      _saveEvents(seed);
    }

    /* ── STATE ── */
    let viewYear  = todayRef.getFullYear();
    let viewMonth = todayRef.getMonth(); // 0-based
    let editingEvent = null; // { dateKey, eventId } when editing

    /* ── CARD SHELL ── */
    const card = document.createElement('div');
    card.id = 'calendarCard';
    card.className = 'card mb-20';
    card.style.animationDelay = '0.4s';

    /* Inject card CSS once */
    if (!document.getElementById('cal-styles')) {
      const st = document.createElement('style');
      st.id = 'cal-styles';
      st.textContent = `
        /* ── CALENDAR LAYOUT ── */
        #calInner { display:flex; gap:0; }
        #calGridWrap { flex:1; min-width:0; }
        #calGrid { display:grid; grid-template-columns:repeat(7,1fr); gap:4px; margin-top:12px; }
        .cal-dow  { text-align:center; font-size:9px; letter-spacing:2px; color:#2a3d55;
                    font-family:'Orbitron',sans-serif; padding:6px 0; }
        .cal-day  { min-height:72px; border-radius:7px; border:1px solid transparent;
                    padding:6px 5px; cursor:pointer; transition:all 0.15s; position:relative; }
        .cal-day:hover   { border-color:#253d5a; background:rgba(255,255,255,0.02); }
        .cal-day.today   { border-color:var(--cyan); background:rgba(0,212,255,0.05); }
        .cal-day.other-month { opacity:0.3; }
        .cal-day.selected { border-color:var(--green) !important; background:rgba(0,255,136,0.06) !important; }
        .cal-date { font-size:12px; font-weight:600; margin-bottom:4px; }
        .cal-day.today .cal-date { color:var(--cyan); }
        .cal-today-dot { width:4px; height:4px; background:var(--cyan); border-radius:50%;
                         margin:0 auto 4px; box-shadow:0 0 4px var(--cyan); }
        .cal-ev { font-size:9px; padding:2px 5px; border-radius:3px; margin-bottom:2px;
                  border:1px solid; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
                  cursor:pointer; display:flex; align-items:center; gap:3px; }
        .cal-ev:hover { filter:brightness(1.3); }
        .cal-ev-time { opacity:0.7; flex-shrink:0; }
        .cal-add-btn { font-size:10px; color:#253d5a; text-align:center; margin-top:4px;
                       transition:color 0.15s; line-height:1; }
        .cal-day:hover .cal-add-btn { color:var(--cyan); }

        /* ── DAY PANEL ── */
        #calDayPanel {
          width:0; overflow:hidden; transition:width 0.3s cubic-bezier(0.4,0,0.2,1);
          flex-shrink:0;
        }
        #calDayPanel.open { width:260px; }
        #calDayPanelInner {
          width:260px; padding:0 0 0 16px; height:100%;
          display:flex; flex-direction:column;
        }
        #calDayPanelBox {
          background:#080f1e; border:1px solid var(--border); border-radius:10px;
          padding:16px; display:flex; flex-direction:column; gap:0;
          height:100%; min-height:300px;
        }
        .cdp-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px; }
        .cdp-date-big { font-family:'Orbitron',sans-serif; font-size:28px; font-weight:900; color:var(--cyan); line-height:1; }
        .cdp-month    { font-size:10px; color:var(--text-muted); letter-spacing:2px; margin-top:3px; }
        .cdp-close    { background:none; border:none; color:var(--text-muted); font-size:16px;
                        cursor:pointer; padding:2px 6px; border-radius:4px; transition:all 0.15s; }
        .cdp-close:hover { color:var(--text-primary); background:rgba(255,255,255,0.05); }
        .cdp-divider  { height:1px; background:var(--border); margin-bottom:12px; }
        .cdp-ev-list  { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; }
        .cdp-ev-empty { font-size:12px; color:#2a3d55; text-align:center; padding:24px 0;
                        font-style:italic; }
        .cdp-ev-card  {
          border-radius:8px; border:1px solid; padding:10px 12px;
          background:rgba(0,0,0,0.25); cursor:pointer; transition:all 0.15s;
          position:relative;
        }
        .cdp-ev-card:hover { filter:brightness(1.15); transform:translateX(2px); }
        .cdp-ev-card-time { font-size:10px; opacity:0.65; letter-spacing:1px; margin-bottom:4px; font-family:'Orbitron',sans-serif; }
        .cdp-ev-card-title { font-size:13px; font-weight:600; margin-bottom:6px; }
        .cdp-ev-card-tag { display:inline-block; padding:2px 8px; border-radius:10px; font-size:9px;
                            letter-spacing:1px; border:1px solid; }
        .cdp-ev-card-edit { position:absolute; top:8px; right:8px; font-size:11px; opacity:0.4;
                             transition:opacity 0.15s; }
        .cdp-ev-card:hover .cdp-ev-card-edit { opacity:0.9; }
        .cdp-add-btn {
          margin-top:12px; width:100%; padding:10px; border-radius:8px;
          background:var(--cyan-dim); border:1px solid var(--cyan); color:var(--cyan);
          font-size:12px; letter-spacing:1px; font-family:'Orbitron',sans-serif;
          cursor:pointer; transition:all 0.2s; display:flex; align-items:center;
          justify-content:center; gap:8px;
        }
        .cdp-add-btn:hover { background:var(--cyan); color:#040812; }

        /* ── EVENT FORM MODAL ── */
        #calModal { display:none; position:fixed; inset:0; z-index:9999;
                    background:rgba(4,8,18,0.88); backdrop-filter:blur(6px);
                    align-items:center; justify-content:center; }
        #calModal.open { display:flex; }
        #calModalBox { background:#0d1628; border:1px solid var(--cyan); border-radius:14px;
                       padding:28px 28px 24px; width:360px; box-shadow:0 0 60px rgba(0,212,255,0.14); }
        #calModal h3 { font-family:'Orbitron',sans-serif; font-size:13px; letter-spacing:3px;
                       color:var(--cyan); margin-bottom:6px; }
        #calModalDateSub { font-size:11px; color:var(--text-muted); margin-bottom:18px; }
        .cal-field { margin-bottom:14px; }
        .cal-field label { font-size:10px; letter-spacing:2px; color:var(--text-muted);
                           display:block; margin-bottom:6px; }
        .cal-field input, .cal-field select, .cal-field textarea {
          width:100%; background:#080f1e; border:1px solid #1a2d4a; border-radius:7px;
          padding:9px 12px; font-size:13px; color:var(--text-primary);
          font-family:'Inter',sans-serif; outline:none; transition:border-color 0.2s; resize:vertical; }
        .cal-field input:focus, .cal-field select:focus, .cal-field textarea:focus { border-color:var(--cyan); }
        .cal-field select option { background:#080f1e; }
        .cal-modal-actions { display:flex; gap:10px; margin-top:20px; }
        .cal-modal-actions .btn { flex:1; justify-content:center; }
        #calDelBtn { display:none; flex:0 0 auto; }
      `;
      document.head.appendChild(st);
    }

    /* ── EVENT FORM MODAL ── */
    if (!document.getElementById('calModal')) {
      const modal = document.createElement('div');
      modal.id = 'calModal';
      modal.innerHTML = `
        <div id="calModalBox">
          <h3 id="calModalTitle">ADD EVENT</h3>
          <div id="calModalDateSub"></div>
          <div class="cal-field">
            <label>DATE</label>
            <input type="date" id="calEvDate"/>
          </div>
          <div class="cal-field">
            <label>TIME</label>
            <input type="time" id="calEvTime" value="09:00"/>
          </div>
          <div class="cal-field">
            <label>EVENT TITLE</label>
            <input type="text" id="calEvLabel" placeholder="e.g. Team Stand-up" maxlength="80"/>
          </div>
          <div class="cal-field">
            <label>DESCRIPTION (optional)</label>
            <textarea id="calEvDesc" rows="2" placeholder="Add notes, links, or context..." maxlength="300" style="min-height:56px"></textarea>
          </div>
          <div class="cal-field">
            <label>COLOR / TYPE</label>
            <select id="calEvColor">
              <option value="cyan">🔵 Cyan — Meeting / Default</option>
              <option value="green">🟢 Green — Completed / Done</option>
              <option value="yellow">🟡 Yellow — Reminder / Review</option>
              <option value="red">🔴 Red — Deadline / Urgent</option>
              <option value="purple">🟣 Purple — Focus / Personal</option>
            </select>
          </div>
          <div class="cal-modal-actions">
            <button class="btn btn-ghost" onclick="Cal.closeModal()">Cancel</button>
            <button id="calDelBtn" class="btn" style="background:var(--red-dim);border-color:var(--red);color:var(--red)" onclick="Cal.deleteEvent()">🗑 Delete</button>
            <button class="btn btn-cyan" onclick="Cal.saveEvent()">Save Event</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) Cal.closeModal(); });
    }

    card.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:4px">
        <span style="display:flex;align-items:center;gap:8px">
          <div class="card-label-dot"></div>
          <span style="font-size:10px;letter-spacing:3px;color:var(--text-muted)">CALENDAR</span>
        </span>
        <div style="display:flex;align-items:center;gap:8px">
          <select id="calMonthSel" onchange="Cal.goMonthSel()" style="background:#0d1628;border:1px solid #1a2d4a;color:var(--text-primary);border-radius:7px;padding:5px 10px;font-size:12px;font-family:'Inter',sans-serif;cursor:pointer;outline:none;transition:border-color 0.2s" onfocus="this.style.borderColor='var(--cyan)'" onblur="this.style.borderColor='#1a2d4a'">
            <option value="0">January</option><option value="1">February</option><option value="2">March</option>
            <option value="3">April</option><option value="4">May</option><option value="5">June</option>
            <option value="6">July</option><option value="7">August</option><option value="8">September</option>
            <option value="9">October</option><option value="10">November</option><option value="11">December</option>
          </select>
          <select id="calYearSel" onchange="Cal.goYearSel()" style="background:#0d1628;border:1px solid #1a2d4a;color:var(--text-primary);border-radius:7px;padding:5px 10px;font-size:12px;font-family:'Inter',sans-serif;cursor:pointer;outline:none;transition:border-color 0.2s" onfocus="this.style.borderColor='var(--cyan)'" onblur="this.style.borderColor='#1a2d4a'">
          </select>
          <button onclick="Cal.goToday()" style="background:var(--cyan-dim);border:1px solid var(--cyan);color:var(--cyan);border-radius:7px;padding:5px 12px;cursor:pointer;font-size:10px;letter-spacing:1px;font-family:'Orbitron',sans-serif;transition:all 0.2s" onmouseover="this.style.background='var(--cyan)';this.style.color='#040812'" onmouseout="this.style.background='var(--cyan-dim)';this.style.color='var(--cyan)'">TODAY</button>
        </div>
      </div>
      <div id="calInner">
        <div id="calGridWrap">
          <div id="calGrid"></div>
        </div>
        <div id="calDayPanel">
          <div id="calDayPanelInner">
            <div id="calDayPanelBox">
              <div class="cdp-header">
                <div>
                  <div class="cdp-date-big" id="cdpDateNum">—</div>
                  <div class="cdp-month" id="cdpMonthStr"></div>
                </div>
                <button class="cdp-close" onclick="Cal.closePanel()" title="Close">✕</button>
              </div>
              <div class="cdp-divider"></div>
              <div class="cdp-ev-list" id="cdpEvList"></div>
              <button class="cdp-add-btn" id="cdpAddBtn" onclick="Cal.openAddFromPanel()">＋ ADD EVENT</button>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <span id="calEventCount" style="font-size:11px;color:var(--text-muted)"></span>
        <span style="margin-left:auto;font-size:10px;color:#2a3d55">Click a day to view · Click an event to edit</span>
      </div>`;

    // Insert after work output card, before sessions row
    const outputCard = document.getElementById('workOutputCard');
    const sessionsRow = document.querySelector('.grid-2');
    if (outputCard && outputCard.parentNode) {
      outputCard.parentNode.insertBefore(card, sessionsRow || outputCard.nextSibling);
    } else if (sessionsRow && sessionsRow.parentNode) {
      sessionsRow.parentNode.insertBefore(card, sessionsRow);
    } else {
      document.querySelector('.content')?.appendChild(card);
    }

    /* ── PUBLIC Cal OBJECT ── */
    let activeDateKey = null;

    window.Cal = {
      /* ── RENDER MONTH GRID ── */
      render() {
        const events   = _loadEvents();
        const today    = new Date();
        const todayKey = _ymd(today);
        const grid     = document.getElementById('calGrid');
        if (!grid) return;

        // Sync month dropdown
        const mSel = document.getElementById('calMonthSel');
        if (mSel) mSel.value = viewMonth;

        // Build/sync year dropdown (current year ±10)
        const ySel = document.getElementById('calYearSel');
        if (ySel) {
          if (!ySel.options.length || !Array.from(ySel.options).find(o => parseInt(o.value) === viewYear)) {
            const baseYear = new Date().getFullYear();
            ySel.innerHTML = '';
            for (let y = baseYear - 10; y <= baseYear + 10; y++) {
              const opt = document.createElement('option');
              opt.value = y; opt.textContent = y;
              ySel.appendChild(opt);
            }
          }
          ySel.value = viewYear;
        }

        const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
        let html = DAYS.map(d => `<div class="cal-dow">${d}</div>`).join('');

        const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
        const daysInMonth= new Date(viewYear, viewMonth+1, 0).getDate();
        const daysInPrev = new Date(viewYear, viewMonth,   0).getDate();

        for (let i = firstDay - 1; i >= 0; i--) {
          const d = daysInPrev - i;
          const pm = viewMonth === 0 ? 11 : viewMonth - 1;
          const py = viewMonth === 0 ? viewYear - 1 : viewYear;
          const key = `${py}-${String(pm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          html += _dayCell(key, d, true, false, key === todayKey, key === activeDateKey, events[key]||[]);
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const key = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          html += _dayCell(key, d, false, key === todayKey, key === todayKey, key === activeDateKey, events[key]||[]);
        }
        const totalCells = firstDay + daysInMonth;
        const trailing   = (7 - (totalCells % 7)) % 7;
        for (let d = 1; d <= trailing; d++) {
          const nm = viewMonth === 11 ? 0  : viewMonth + 1;
          const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
          const key = `${ny}-${String(nm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          html += _dayCell(key, d, true, false, false, key === activeDateKey, events[key]||[]);
        }

        grid.innerHTML = html;

        const allEvCount = Object.values(events).reduce((s,a) => s + a.length, 0);
        const countEl = document.getElementById('calEventCount');
        if (countEl) countEl.textContent = `📅 ${allEvCount} event${allEvCount !== 1 ? 's' : ''} total`;

        // If panel is open, refresh it too
        if (activeDateKey) Cal.renderPanel(activeDateKey);
      },

      /* ── OPEN DAY PANEL ── */
      openDay(dateKey) {
        activeDateKey = dateKey;
        Cal.render(); // re-render to update .selected highlight
        Cal.renderPanel(dateKey);
        const panel = document.getElementById('calDayPanel');
        if (panel) panel.classList.add('open');
      },

      /* ── RENDER DAY PANEL CONTENT ── */
      renderPanel(dateKey) {
        const events  = _loadEvents();
        const dayEvs  = events[dateKey] || [];
        const parts   = dateKey.split('-');
        const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
        const dayNum  = dateObj.getDate();
        const monthStr= dateObj.toLocaleDateString('en-US', { weekday:'short', month:'long', year:'numeric' }).toUpperCase();

        const numEl = document.getElementById('cdpDateNum');
        const moEl  = document.getElementById('cdpMonthStr');
        const list  = document.getElementById('cdpEvList');
        const addBtn= document.getElementById('cdpAddBtn');
        if (!numEl || !moEl || !list) return;

        numEl.textContent = dayNum;
        moEl.textContent  = monthStr;

        const colorMap = { cyan:'#00d4ff', green:'#00ff88', yellow:'#ffd700', red:'#ff4757', purple:'#a78bfa' };
        const tagMap   = { cyan:'MEETING', green:'DONE', yellow:'REMINDER', red:'DEADLINE', purple:'FOCUS' };

        if (dayEvs.length === 0) {
          list.innerHTML = `<div class="cdp-ev-empty">No events scheduled<br>for this day.</div>`;
        } else {
          list.innerHTML = dayEvs.map(ev => {
            const c = ev.color || 'cyan';
            const col = colorMap[c] || '#00d4ff';
            const tag = tagMap[c] || 'EVENT';
            const desc = ev.desc ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.5">${ev.desc}</div>` : '';
            return `
              <div class="cdp-ev-card" style="border-color:${col};color:${col}"
                   onclick="Cal.openEdit('${dateKey}','${ev.id}')">
                <div class="cdp-ev-card-time">${ev.time}</div>
                <div class="cdp-ev-card-title" style="color:var(--text-primary)">${ev.label}</div>
                ${desc}
                <span class="cdp-ev-card-tag" style="color:${col};border-color:${col};background:${col}18">${tag}</span>
                <span class="cdp-ev-card-edit">✎ edit</span>
              </div>`;
          }).join('');
        }

        // Store dateKey on the ADD button for use by openAddFromPanel
        if (addBtn) addBtn.dataset.dateKey = dateKey;
      },

      /* ── CLOSE DAY PANEL ── */
      closePanel() {
        activeDateKey = null;
        const panel = document.getElementById('calDayPanel');
        if (panel) panel.classList.remove('open');
        Cal.render();
      },

      /* ── OPEN ADD FROM PANEL ── */
      openAddFromPanel() {
        const btn = document.getElementById('cdpAddBtn');
        const dk  = btn ? btn.dataset.dateKey : activeDateKey;
        Cal.openAdd(dk || _ymd(new Date()));
      },

      /* ── OPEN ADD MODAL ── */
      openAdd(dateKey) {
        editingEvent = null;
        const parts  = (dateKey || '').split('-');
        const dateObj= parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2])) : new Date();
        const nice   = dateObj.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

        document.getElementById('calModalTitle').textContent   = 'ADD EVENT';
        document.getElementById('calModalDateSub').textContent = nice;
        document.getElementById('calEvDate').value  = dateKey || _ymd(new Date());
        document.getElementById('calEvTime').value  = '09:00';
        document.getElementById('calEvLabel').value = '';
        document.getElementById('calEvDesc').value  = '';
        document.getElementById('calEvColor').value = 'cyan';
        document.getElementById('calDelBtn').style.display = 'none';
        document.getElementById('calModal').classList.add('open');
        setTimeout(() => document.getElementById('calEvLabel').focus(), 50);
      },

      /* ── OPEN EDIT MODAL ── */
      openEdit(dateKey, eventId) {
        const events = _loadEvents();
        const ev = (events[dateKey]||[]).find(e => e.id === eventId);
        if (!ev) return;
        editingEvent = { dateKey, eventId };

        const parts  = dateKey.split('-');
        const dateObj= new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
        const nice   = dateObj.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

        document.getElementById('calModalTitle').textContent   = 'EDIT EVENT';
        document.getElementById('calModalDateSub').textContent = nice;
        document.getElementById('calEvDate').value  = dateKey;
        document.getElementById('calEvTime').value  = ev.time;
        document.getElementById('calEvLabel').value = ev.label;
        document.getElementById('calEvDesc').value  = ev.desc || '';
        document.getElementById('calEvColor').value = ev.color;
        document.getElementById('calDelBtn').style.display = 'block';
        document.getElementById('calModal').classList.add('open');
        setTimeout(() => document.getElementById('calEvLabel').focus(), 50);
      },

      /* ── SAVE EVENT ── */
      saveEvent() {
        const dateKey = document.getElementById('calEvDate').value;
        const time    = document.getElementById('calEvTime').value;
        const label   = document.getElementById('calEvLabel').value.trim();
        const desc    = document.getElementById('calEvDesc').value.trim();
        const color   = document.getElementById('calEvColor').value;

        if (!dateKey || !label) {
          if (typeof showToast === 'function') showToast('⚠️ Please fill in date and title');
          return;
        }

        const events = _loadEvents();

        if (editingEvent) {
          const oldKey = editingEvent.dateKey;
          if (events[oldKey]) {
            events[oldKey] = events[oldKey].filter(e => e.id !== editingEvent.eventId);
            if (!events[oldKey].length) delete events[oldKey];
          }
          if (!events[dateKey]) events[dateKey] = [];
          events[dateKey].push({ id: editingEvent.eventId, time, label: _sanitize(label), desc: _sanitize(desc), color });
          events[dateKey].sort((a,b) => a.time.localeCompare(b.time));
          // Update active panel date if date changed
          if (activeDateKey === editingEvent.dateKey) activeDateKey = dateKey;
          if (typeof showToast === 'function') showToast('✓ Event updated');
        } else {
          if (!events[dateKey]) events[dateKey] = [];
          const id = 'ev_' + Date.now();
          events[dateKey].push({ id, time, label: _sanitize(label), desc: _sanitize(desc), color });
          events[dateKey].sort((a,b) => a.time.localeCompare(b.time));
          activeDateKey = dateKey;
          if (typeof showToast === 'function') showToast('✓ Event added to calendar');
        }

        _saveEvents(events);
        Cal.closeModal();
        Cal.render();
        // Re-open panel on the saved date
        Cal.openDay(activeDateKey || dateKey);
      },

      /* ── DELETE EVENT ── */
      deleteEvent() {
        if (!editingEvent) return;
        const events = _loadEvents();
        const { dateKey, eventId } = editingEvent;
        if (events[dateKey]) {
          events[dateKey] = events[dateKey].filter(e => e.id !== eventId);
          if (!events[dateKey].length) delete events[dateKey];
        }
        _saveEvents(events);
        Cal.closeModal();
        Cal.render();
        if (activeDateKey) Cal.openDay(activeDateKey);
        if (typeof showToast === 'function') showToast('🗑 Event deleted');
      },

      /* ── CLOSE MODAL ── */
      closeModal() {
        document.getElementById('calModal').classList.remove('open');
        editingEvent = null;
      },

      prevMonth() { if (viewMonth === 0) { viewMonth=11; viewYear--; } else viewMonth--; Cal.render(); },
      nextMonth() { if (viewMonth===11) { viewMonth=0;  viewYear++; } else viewMonth++; Cal.render(); },
      prevYear()  { viewYear--;  Cal.render(); },
      nextYear()  { viewYear++;  Cal.render(); },
      goToday()   { viewYear = todayRef.getFullYear(); viewMonth = todayRef.getMonth(); Cal.render(); },
      goMonthSel(){ const s = document.getElementById('calMonthSel'); if(s) viewMonth = parseInt(s.value); Cal.render(); },
      goYearSel() { const s = document.getElementById('calYearSel');  if(s) viewYear  = parseInt(s.value); Cal.render(); },
    };

    /* ── KEYBOARD ── */
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('calModal');
      if (modal && modal.classList.contains('open')) {
        if (e.key === 'Escape') Cal.closeModal();
        if (e.key === 'Enter' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) Cal.saveEvent();
        return;
      }
      if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === 'Escape')     Cal.closePanel();
      if (e.key === 'ArrowLeft')  Cal.prevMonth();
      if (e.key === 'ArrowRight') Cal.nextMonth();
    });

    /* ── HELPER: day cell ── */
    function _dayCell(key, dateNum, otherMonth, isToday, _todayFlag, isSelected, evList) {
      const cls = ['cal-day',
        otherMonth  ? 'other-month' : '',
        isToday     ? 'today'       : '',
        isSelected  ? 'selected'    : ''
      ].filter(Boolean).join(' ');

      const dot       = isToday ? '<div class="cal-today-dot"></div>' : '';
      const dateColor = isToday ? 'var(--cyan)' : (otherMonth ? 'var(--text-muted)' : 'var(--text-primary)');

      const evHtml = evList.slice(0, 2).map(ev => {
        const borderCol = `var(--${ev.color})`;
        return `<div class="cal-ev" style="color:var(--${ev.color});border-color:${borderCol};background:rgba(0,0,0,0.3)"
                  onclick="event.stopPropagation();Cal.openDay('${key}')" title="${ev.label}">
                  <span class="cal-ev-time">${ev.time}</span>
                  <span style="overflow:hidden;text-overflow:ellipsis">${ev.label}</span>
                </div>`;
      }).join('');

      const more = evList.length > 2
        ? `<div style="font-size:9px;color:var(--text-muted);margin-top:2px">+${evList.length-2} more</div>` : '';

      return `<div class="${cls}" onclick="Cal.openDay('${key}')">
                <div class="cal-date" style="color:${dateColor}">${dateNum}</div>
                ${dot}${evHtml}${more}
                <div class="cal-add-btn">+</div>
              </div>`;
    }

    Cal.render();
  }

  /* ─────────────────────────
     ENHANCE CHAT SCAN PANEL
     Adds more detected deadlines beyond the 1 hardcoded in HTML.
  ───────────────────────────*/
  function _enhanceChatScan() {
    const scanContainer = document.querySelector('[style*="margin-top:14px"][style*="border-top"]');
    if (!scanContainer) return;

    const detected = [
      { source:'Team Chat · 11:32 AM',  label:'"Submit by Friday" — deadline detected',      severity:'yellow', addedToCalendar: false },
      { source:'WhatsApp · 09:15 AM',   label:'"Review PR before EOD" — task detected',       severity:'cyan',   addedToCalendar: false },
      { source:'Slack · #dev-team · 10:47 AM', label:'"Sprint planning at 2 PM today"',       severity:'purple', addedToCalendar: true  },
    ];

    const scanHtml = `
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;letter-spacing:2px">SCAN & SYNC — Detected from Messages</div>
      <div id="scanItems" style="display:flex;flex-direction:column;gap:8px">
        ${detected.map((d, i) => `
          <div style="background:var(--bg-card2);border:1px solid var(--${d.severity});border-radius:8px;padding:10px 12px;display:flex;align-items:center;gap:10px;opacity:0;transform:translateY(6px);transition:all 0.4s ease ${i * 0.1}s" class="scan-item">
            <span style="font-size:15px">${d.severity === 'red' || d.severity === 'yellow' ? '⚠️' : d.severity === 'purple' ? '📅' : '🔔'}</span>
            <div style="flex:1">
              <div style="font-size:12px;color:var(--text-primary)">${d.label}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">From: ${d.source}</div>
            </div>
            ${d.addedToCalendar
              ? `<span style="font-size:10px;color:var(--green);padding:3px 8px;border:1px solid var(--green);border-radius:10px">✓ Added</span>`
              : `<button class="btn btn-cyan" style="padding:5px 10px;font-size:10px;flex-shrink:0"
                   onclick="this.textContent='✓ Added';this.style.background='var(--green)';this.style.color='#040812';this.style.borderColor='var(--green)';showToast('✓ Added to Calendar')">
                   Add to Calendar
                 </button>`
            }
          </div>`).join('')}
      </div>`;

    // Replace existing scan content
    scanContainer.innerHTML = scanHtml;

    // Animate scan items in
    setTimeout(() => {
      scanContainer.querySelectorAll('.scan-item').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }, 800);
  }

  /* ─────────────────────────
     GHOST LAYER EFFECTS ON WORK PAGE
     If Ghost Layer is ON:
       - Blur / disable Chat Scan panel (it contains message data)
       - Disable "Scan & Sync" button
       - Add a privacy overlay notice
  ───────────────────────────*/
  function _applyGhostEffects() {
    const ghostOn   = localStorage.getItem(WORK_KEYS.GHOST) === 'true';
    const msgAllowed = localStorage.getItem(WORK_KEYS.PERM_MSG) !== 'false';

    if (ghostOn || !msgAllowed) {
      // Find the connected apps card (contains Scan & Sync)
      const appsCard = document.querySelector('.grid-2 .card:last-child');
      if (!appsCard) return;

      const scanSection = appsCard.querySelector('[style*="border-top"]');
      if (scanSection && !scanSection.querySelector('.ghost-block-notice')) {
        scanSection.style.position = 'relative';
        scanSection.style.userSelect = 'none';

        // Blur the content
        const inner = scanSection.querySelector('[id="scanItems"]') || scanSection.lastElementChild;
        if (inner) inner.style.filter = 'blur(4px)';

        const notice = document.createElement('div');
        notice.className = 'ghost-block-notice';
        notice.style.cssText = `
          position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          background:rgba(4,8,18,0.7);border-radius:8px;flex-direction:column;gap:6px;
          backdrop-filter:blur(2px);`;
        notice.innerHTML = `
          <span style="font-size:20px">🛡️</span>
          <span style="font-size:11px;color:#7c3aed;letter-spacing:2px;font-family:'Orbitron',sans-serif">GHOST LAYER ACTIVE</span>
          <span style="font-size:11px;color:var(--text-muted)">Chat scan blocked — message data hidden</span>`;
        scanSection.appendChild(notice);
      }
    }
  }

  /* ─────────────────────────
     LIVE SYNC COUNTER
  ───────────────────────────*/
  function _startSyncCounter() {
    const subEl = document.querySelector('.topbar-sub');
    if (!subEl) return;

    function _update() {
      syncSeconds++;
      const m = Math.floor(syncSeconds / 60);
      const s = syncSeconds % 60;
      const label = m > 0
        ? `Last sync ${m}m ${s > 0 ? s + 's ' : ''}ago`
        : `Last sync ${s}s ago`;
      subEl.textContent = `Thinking Recovery Engine — ${label}`;
    }
    setInterval(_update, 1000);
  }

  /* ─────────────────────────
     PATCH INLINE FUNCTIONS
  ───────────────────────────*/
  function _bindPersistencePatches() {

    /* Patch toggleTask → save task states after each toggle */
    const _origToggleTask = window.toggleTask;
    window.toggleTask = function(checkEl) {
      if (typeof _origToggleTask === 'function') _origToggleTask(checkEl);
      _saveTaskStates();
    };

    /* Patch resumeWork → reset away timer on resume */
    const _origResumeWork = window.resumeWork;
    window.resumeWork = function() {
      localStorage.setItem(WORK_KEYS.AWAY_START, String(Date.now()));
      if (typeof window.awaySeconds !== 'undefined') window.awaySeconds = 0;
      const el = document.getElementById('awayTimer');
      if (el) el.textContent = 'Away for 00:00';
      if (typeof _origResumeWork === 'function') _origResumeWork();
      if (typeof showToast === 'function') showToast('▶ Work resumed — context locked in');
    };

    /* Patch togglePrivacy → persist ghost state cross-page + re-apply effects */
    const _origTogglePrivacy = window.togglePrivacy;
    window.togglePrivacy = function(el) {
      if (typeof _origTogglePrivacy === 'function') _origTogglePrivacy(el);
      const isOn = document.getElementById('ghostPip')?.classList.contains('on') ?? false;
      localStorage.setItem(WORK_KEYS.GHOST, String(isOn));
      _applyGhostEffects();
    };
  }

  /* ─────────────────────────
     KEYBOARD SHORTCUTS
     R → Resume Work
     G → Toggle Ghost Layer
     N → Focus on "Add Task" (if implemented)
  ───────────────────────────*/
  function _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.key) {
        case 'r':
        case 'R':
          if (typeof window.resumeWork === 'function') window.resumeWork();
          break;
        case 'g':
        case 'G': {
          const pip = document.querySelector('.privacy-toggle-mini');
          if (pip) pip.click();
          break;
        }
        case 'n':
        case 'N': {
          // Show add-task prompt
          const taskText = window.prompt('Add new task (press Enter):');
          if (taskText && taskText.trim()) {
            _addTask(taskText.trim());
          }
          break;
        }
      }
    });
  }

  /* ─────────────────────────
     ADD TASK DYNAMICALLY
  ───────────────────────────*/
  function _addTask(text) {
    const list = document.getElementById('taskList');
    if (!list) return;

    const item = document.createElement('div');
    item.className = 'task-item';
    item.innerHTML = `
      <div class="task-check" onclick="toggleTask(this)"></div>
      <div class="task-text">${_sanitize(text)}</div>
      <span class="task-priority tp-medium">MED</span>
      <span class="task-source">Manual</span>`;
    list.appendChild(item);

    if (typeof window.updateProgress === 'function') window.updateProgress();
    _saveTaskStates();
    if (typeof showToast === 'function') showToast(`✓ Task added: ${text.substring(0, 40)}`);
  }

  /* Simple XSS guard for injected text */
  function _sanitize(str) {
    const el = document.createElement('div');
    el.textContent = str;
    return el.innerHTML;
  }

  /* ─────────────────────────
     PUBLIC API
  ───────────────────────────*/
  return { init };

})();
