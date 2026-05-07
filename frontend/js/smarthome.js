/**
 * MERIDIAN — Smart Home Module (Personal Life)
 * smarthome.js · Loaded after app.js on smarthome.html
 *
 * The inline <script> in smarthome.html handles basic UI:
 *   toggleDevice, updateSlider, setFan, setColor, activateScene,
 *   filterRoom, toggleRoutine, pauseWash, scheduleOff, showToast
 *
 * This module adds everything on top:
 *  - Populate user info from session
 *  - Restore Ghost Layer state & apply camera/location permission
 *  - Persist device states, scene, routines to localStorage
 *  - Restore persisted state on page load
 *  - Live energy monitoring simulation (kW fluctuation)
 *  - TV runtime escalation → Meridian alert nudge
 *  - Washer cycle complete notification
 *  - AC smart adjust (if Work Mode routine is ON & focus score high)
 *  - Burnout Guard routine integration
 *  - Privacy cross-page check (disable camera if Ghost Layer is ON)
 *  - Keyboard shortcuts: 1–4 = scenes, G = ghost, A = all off
 */

/* ─────────────────────────────────────────────
   STORAGE KEYS
───────────────────────────────────────────── */
const SH_KEYS = {
  DEVICE_STATES : 'meridian_sh_devices',
  ACTIVE_SCENE  : 'meridian_sh_scene',
  ROUTINES      : 'meridian_sh_routines',
  GHOST         : 'meridian_ghost_mode',
  PERM_CAMERA   : 'meridian_perm_camera',
  PERM_LOC      : 'meridian_perm_loc',
};

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  SmartHome.init();
});

/* ─────────────────────────────────────────────
   SMARTHOME MODULE
───────────────────────────────────────────── */
const SmartHome = (() => {

  /* ── INTERNAL STATE ── */
  let tvRuntimeSeconds   = 3 * 3600 + 20 * 60; // 3h 20m as initial
  let tvAlertFired       = false;
  let washComplete       = false;
  let energyBase         = { tv:0.7, ac:0.9, wash:0.5, lights:0.2, fridge:0.1 };

  /* ─────────────────────────
     INIT
  ───────────────────────────*/
  function init() {
    _populateUser();
    _restoreGhostLayer();
    _applyCameraPermission();
    _restoreDeviceStates();
    _restoreScene();
    _restoreRoutines();
    _startEnergySimulation();
    _startTVRuntimeMonitor();
    _startWashMonitor();
    _bindPersistencePatches();
    _bindKeyboardShortcuts();
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
    const isOn = localStorage.getItem(SH_KEYS.GHOST) === 'true';
    const pip  = document.getElementById('ghostPip');
    if (pip && isOn) pip.classList.add('on');
  }

  /* ─────────────────────────
     APPLY CAMERA PERMISSION
     If Ghost Layer is ON or camera perm is false → keep camera off
  ───────────────────────────*/
  function _applyCameraPermission() {
    const ghostOn   = localStorage.getItem(SH_KEYS.GHOST) === 'true';
    const camAllowed = localStorage.getItem(SH_KEYS.PERM_CAMERA) !== 'false';

    if (ghostOn || !camAllowed) {
      // Ensure camera is off in the device state
      if (typeof deviceStates !== 'undefined' && deviceStates.camera) {
        deviceStates.camera = false;
        const card  = document.getElementById('dev-camera');
        const badge = document.getElementById('camera-badge');
        const led   = document.getElementById('camera-led');
        const status= document.getElementById('camera-status');
        if (card)   card.classList.remove('on');
        if (badge)  badge.className = 'device-status-badge off';
        if (led)    led.className   = 'status-led off';
        if (status) status.textContent = 'PRIVACY BLOCKED';

        // Disable the power button
        const powerBtn = document.querySelector('#dev-camera .power-btn');
        if (powerBtn) {
          powerBtn.disabled = true;
          powerBtn.title = 'Camera blocked by Ghost Layer / Privacy settings';
          powerBtn.style.opacity = '0.3';
          powerBtn.style.cursor  = 'not-allowed';
        }

        // Add a privacy badge to the card
        if (card && !card.querySelector('.cam-privacy-note')) {
          const note = document.createElement('div');
          note.className = 'cam-privacy-note';
          note.style.cssText = 'font-size:10px;color:#7c3aed;letter-spacing:1px;margin-top:8px;padding:6px 10px;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:6px;';
          note.textContent = '🛡️ Camera disabled — Ghost Layer active';
          card.appendChild(note);
        }
      }
      if (typeof showToast === 'function' && ghostOn) {
        showToast('🛡️ Camera feed blocked — Ghost Layer is ON');
      }
    }
  }

  /* ─────────────────────────
     PERSIST DEVICE STATES TO localStorage
  ───────────────────────────*/
  function _saveDeviceStates() {
    if (typeof deviceStates === 'undefined') return;
    localStorage.setItem(SH_KEYS.DEVICE_STATES, JSON.stringify(deviceStates));
  }

  /* ─────────────────────────
     RESTORE DEVICE STATES FROM localStorage
  ───────────────────────────*/
  function _restoreDeviceStates() {
    try {
      const raw = localStorage.getItem(SH_KEYS.DEVICE_STATES);
      if (!raw || typeof deviceStates === 'undefined') return;
      const saved = JSON.parse(raw);

      // Apply saved states — toggle any device that differs from current
      Object.entries(saved).forEach(([id, shouldBeOn]) => {
        const isOn = deviceStates[id];
        if (isOn !== shouldBeOn && typeof toggleDevice === 'function') {
          // Silently sync state without toast
          _silentToggle(id, shouldBeOn);
        }
      });
    } catch (_) {}
  }

  /* Silent toggle — sets DOM state without triggering toast */
  function _silentToggle(id, on) {
    if (typeof deviceStates === 'undefined') return;
    deviceStates[id] = on;

    const card   = document.getElementById('dev-' + id);
    const badge  = document.getElementById(id + '-badge');
    const led    = document.getElementById(id + '-led');
    const status = document.getElementById(id + '-status');

    const statusMap = {
      tv:     { on:'ON',             off:'OFF' },
      ac:     { on:'ON — Cooling',   off:'OFF' },
      lights: { on:'ON — 3 zones',   off:'OFF' },
      wash:   { on:'ON — Spin Cycle',off:'OFF' },
      camera: { on:'RECORDING',      off:'STANDBY' },
    };

    if (card)   card.classList.toggle('on', on);
    if (badge)  badge.className = `device-status-badge ${on ? 'on' : 'off'}`;
    if (led)    led.className   = `status-led ${on ? 'on' : 'off'}`;
    if (status) status.textContent = statusMap[id]?.[on ? 'on' : 'off'] || (on ? 'ON' : 'OFF');
  }

  /* ─────────────────────────
     RESTORE ACTIVE SCENE
  ───────────────────────────*/
  function _restoreScene() {
    const saved = localStorage.getItem(SH_KEYS.ACTIVE_SCENE);
    if (!saved) return;

    // Highlight the saved scene card without re-toggling devices
    document.querySelectorAll('.scene-card').forEach(c => c.classList.remove('active'));
    const el = document.getElementById('scene-' + saved);
    if (el) el.classList.add('active');
  }

  /* ─────────────────────────
     RESTORE ROUTINE TOGGLE STATES
  ───────────────────────────*/
  function _restoreRoutines() {
    try {
      const raw = localStorage.getItem(SH_KEYS.ROUTINES);
      if (!raw) return;
      const saved = JSON.parse(raw); // { 0: true, 1: false, ... }

      const toggles = document.querySelectorAll('.routine-toggle');
      toggles.forEach((el, idx) => {
        const shouldBeOn = saved[idx];
        if (shouldBeOn === false && el.classList.contains('on')) {
          el.classList.remove('on');
        } else if (shouldBeOn === true && !el.classList.contains('on')) {
          el.classList.add('on');
        }
      });
    } catch (_) {}
  }

  function _saveRoutines() {
    const toggles = document.querySelectorAll('.routine-toggle');
    const state = {};
    toggles.forEach((el, idx) => { state[idx] = el.classList.contains('on'); });
    localStorage.setItem(SH_KEYS.ROUTINES, JSON.stringify(state));
  }

  /* ─────────────────────────
     LIVE ENERGY SIMULATION
     Small fluctuation every 5 seconds
  ───────────────────────────*/
  function _startEnergySimulation() {
    const fillEls = document.querySelectorAll('.energy-bar-fill');

    setInterval(() => {
      let total = 0;

      const deviceOrder = ['tv','ac','wash','lights','fridge'];
      deviceOrder.forEach((id, i) => {
        const isOn  = typeof deviceStates !== 'undefined' ? deviceStates[id] : true;
        const base  = energyBase[id] || 0;
        const flick = isOn ? (base + (Math.random() - 0.5) * 0.05).toFixed(2) : 0;
        total += parseFloat(flick);

        // Update energy bar width (max device is AC at 0.9kW = 100%)
        const pct = isOn ? Math.min(100, (flick / 1.0) * 100) : 0;
        if (fillEls[i]) {
          fillEls[i].style.width = pct + '%';
        }
      });

      // Update total
      const totalEl = document.querySelector('.topbar-sub') ;
      // Find the energy total span in the energy card
      const energyTotal = document.querySelector('.card .energy-row ~ * [style*="Orbitron"]');
      if (energyTotal) energyTotal.textContent = total.toFixed(1) + ' kW';

      // Also update stat strip power usage
      const statPower = document.querySelector('.card .stat-num.cyan');
      if (statPower && statPower.textContent.includes('kW')) {
        statPower.textContent = total.toFixed(1) + ' kW';
      }
    }, 5000);
  }

  /* ─────────────────────────
     TV RUNTIME MONITOR
     Escalates every second when TV is on
     Fires a nudge alert when > 3h 30m (12600s)
  ───────────────────────────*/
  function _startTVRuntimeMonitor() {
    setInterval(() => {
      if (typeof deviceStates === 'undefined' || !deviceStates.tv) return;

      tvRuntimeSeconds++;
      const h   = Math.floor(tvRuntimeSeconds / 3600);
      const m   = Math.floor((tvRuntimeSeconds % 3600) / 60);
      const str = h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`;

      // Update TV runtime label in device card
      const runtimeEl = document.querySelector('#dev-tv .usage-label span:last-child');
      if (runtimeEl) runtimeEl.textContent = str;

      // Update stat strip
      const statRuntime = document.querySelector('.stat-num.red');
      if (statRuntime) statRuntime.textContent = str;

      // Fire alert nudge at 3h 30m
      if (tvRuntimeSeconds >= 3.5 * 3600 && !tvAlertFired) {
        tvAlertFired = true;
        if (typeof showToast === 'function') {
          showToast('📺 TV has been on for 3h 30m — consider a break');
        }
        // Show the device alert
        const alertEl = document.querySelector('#dev-tv .device-alert');
        if (alertEl) {
          alertEl.textContent = '🚨 TV on for 3h 30m — Turn off to reduce screen time';
          alertEl.style.color = 'var(--red)';
        }
      }
    }, 1000);
  }

  /* ─────────────────────────
     WASH CYCLE COMPLETE MONITOR
  ───────────────────────────*/
  function _startWashMonitor() {
    // Check every 30 seconds if washer pct has reached ~100%
    setInterval(() => {
      if (washComplete) return;
      const pctEl = document.getElementById('wash-pct');
      if (!pctEl) return;
      const pct = parseInt(pctEl.textContent);
      if (pct >= 99) {
        washComplete = true;
        if (typeof showToast === 'function') {
          showToast('🫧 Washing machine cycle complete — ready to unload');
        }
        const statusEl = document.getElementById('wash-status');
        const etaEl    = document.getElementById('wash-eta');
        if (statusEl) statusEl.textContent = 'DONE — Cycle Complete';
        if (etaEl)    etaEl.textContent     = 'Complete ✓';
        // Auto-toggle washer off after 5 seconds
        setTimeout(() => {
          if (typeof deviceStates !== 'undefined' && deviceStates.wash) {
            if (typeof toggleDevice === 'function') toggleDevice('wash');
          }
        }, 5000);
      }
    }, 30000);
  }

  /* ─────────────────────────
     PATCH INLINE FUNCTIONS
     to add persistence & privacy checks
  ───────────────────────────*/
  function _bindPersistencePatches() {

    /* Patch toggleDevice → save state after each toggle */
    const _origToggleDevice = window.toggleDevice;
    window.toggleDevice = function(id) {
      // Block camera if privacy rules forbid it
      if (id === 'camera') {
        const ghostOn    = localStorage.getItem(SH_KEYS.GHOST) === 'true';
        const camAllowed = localStorage.getItem(SH_KEYS.PERM_CAMERA) !== 'false';
        if (ghostOn || !camAllowed) {
          if (typeof showToast === 'function') {
            showToast('🛡️ Camera blocked by Privacy settings — disable Ghost Layer first');
          }
          return; // abort toggle
        }
      }
      if (typeof _origToggleDevice === 'function') _origToggleDevice(id);
      _saveDeviceStates();
    };

    /* Patch activateScene → persist active scene */
    const _origActivateScene = window.activateScene;
    window.activateScene = function(scene) {
      if (typeof _origActivateScene === 'function') _origActivateScene(scene);
      localStorage.setItem(SH_KEYS.ACTIVE_SCENE, scene);
      _saveDeviceStates();
    };

    /* Patch toggleRoutine → persist routines */
    const _origToggleRoutine = window.toggleRoutine;
    window.toggleRoutine = function(el) {
      if (typeof _origToggleRoutine === 'function') _origToggleRoutine(el);
      _saveRoutines();

      // Burnout Guard: if enabling burnout routine, dim lights
      const routineName = el.closest('.routine-row')?.querySelector('.routine-name')?.textContent || '';
      if (routineName.includes('Burnout') && el.classList.contains('on')) {
        const lightsSlider = document.getElementById('lights-br');
        const lightsVal    = document.getElementById('lights-br-val');
        if (lightsSlider) {
          lightsSlider.value = '50';
          if (typeof updateSlider === 'function') {
            updateSlider(lightsSlider, 'lights-br-val', '%', 'var(--yellow)');
          }
          if (lightsVal) lightsVal.textContent = '50%';
        }
        if (typeof showToast === 'function') {
          showToast('🧠 Burnout Guard ON — lights dimmed to 50%');
        }
      }
    };

    /* Patch togglePrivacy → persist ghost state cross-page */
    const _origTogglePrivacy = window.togglePrivacy;
    window.togglePrivacy = function() {
      if (typeof _origTogglePrivacy === 'function') _origTogglePrivacy();
      const isOn = document.getElementById('ghostPip')?.classList.contains('on') ?? false;
      localStorage.setItem(SH_KEYS.GHOST, String(isOn));

      // Re-apply camera permission immediately
      _applyCameraPermission();
    };
  }

  /* ─────────────────────────
     KEYBOARD SHORTCUTS
     1 → Morning scene
     2 → Work Mode scene
     3 → Relax scene
     4 → Sleep scene
     A → All Off
     G → Toggle Ghost Layer
  ───────────────────────────*/
  function _bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.key) {
        case '1':
          if (typeof activateScene === 'function') activateScene('morning');
          break;
        case '2':
          if (typeof activateScene === 'function') activateScene('work');
          break;
        case '3':
          if (typeof activateScene === 'function') activateScene('relax');
          break;
        case '4':
          if (typeof activateScene === 'function') activateScene('sleep');
          break;
        case 'a':
        case 'A':
          if (typeof allOff === 'function') allOff();
          break;
        case 'g':
        case 'G': {
          const btn = document.querySelector('.privacy-toggle-mini');
          if (btn) btn.click();
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
