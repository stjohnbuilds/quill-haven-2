/* ===========================================================================
   Quill Haven — THE SHELL. The one and only interface.

   This runs on EVERY page (the home backdrop AND inside Google Docs/Dabble) and
   draws, inside one shadow root so no page can touch it:
     • the top-right bar  (Wi-Fi, battery, settings, version emoji, clock)
     • the bottom-right apps button  (opens your apps + Home)
     • the one settings popup  (Look / Apps / Connection / Device / Power)
     • the one screen dimmer  (brightness + night light)

   There is ONE of everything here — one clock, one battery reader, one theme
   switcher, one app list, one settings. The home page has no controls of its own;
   it is only a wallpaper + logo backdrop. All state lives in ONE store:
   chrome.storage. (See ../STRUCTURE.md for the rule.)
   =========================================================================== */
(function () {
  'use strict';
  if (window.__qhShell) return;
  window.__qhShell = true;

  // ── Constants ──
  var THEMES = ['purple', 'wood', 'slate', 'dark'];
  var THEME_LABELS = { purple: 'Light', wood: 'Wood', slate: 'Grey', dark: 'Dark' };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var REGIONS = [['', 'Auto (device)'], ['Europe/London', 'London'], ['America/New_York', 'New York'], ['America/Los_Angeles', 'Los Angeles'], ['Australia/Sydney', 'Sydney']];
  var SWATCHES = [['#f7cfe6', '#eeb1cf'], ['#d9c2f5', '#b083e0'], ['#dfeede', '#bcd9bc'], ['#c4d4f7', '#a0bcee'], ['#f7ddc6', '#eebfa0'], ['#c2e8e0', '#8fd6c9'], ['#f7c6c6', '#ec9b9b'], ['#f6e6b8', '#e7cf86'], ['#c9efd6', '#9bdcb0'], ['#bfe3f5', '#8ec9ea'], ['#cfc4f0', '#a98fe0'], ['#dadae4', '#b3b3c2']];
  // Trusted line-icons offered in the Add form's icon picker (rendered white on the app tile).
  var ICONS = [
    { id: 'book', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
    { id: 'pencil', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>' },
    { id: 'feather', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.2 3.8a5 5 0 0 0-7 0L4 13v7h7l9.2-9.2a5 5 0 0 0 0-7z"/><path d="M16 8 4 20"/><path d="M17.5 11.5H9"/></svg>' },
    { id: 'star', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>' },
    { id: 'heart', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.1a5 5 0 0 0-7.1 0L12 6.8l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.8a5 5 0 0 0 0-7.1z"/></svg>' },
    { id: 'leaf', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13C4 8 8 4 13 3c1 6-1 11-2 17z"/><path d="M11 20c0-5 3-9 8-10"/></svg>' },
    { id: 'note', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>' }
  ];

  // Version identity. MUST agree with version.json (same number AND same emoji).
  var LOCAL = { version: '2.3.6', emoji: '🐝' };
  var REMOTE_VERSION_URL = 'https://raw.githubusercontent.com/stjohnbuilds/quill-haven-2/main/version.json';
  // The delivery repo's copy of THIS file. Before telling the laptop to install, the
  // browser confirms the new version is actually published here — so the laptop can
  // never download a half-published update and restart into the old version.
  var DELIVERY_CONTENT_URL = 'https://raw.githubusercontent.com/stjohnbuilds/quill-haven/main/extension/content.js';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function parseHue(v) { var n = parseInt(v, 10); return isFinite(n) ? Math.max(0, Math.min(360, n)) : 0; }

  var I = {
    wifi: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>',
    gear: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    battery: '<svg width="22" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="2" width="22" height="10" rx="2.5"/><rect class="qh-batt-fill" x="3.5" y="4.5" width="15" height="5" rx="1" fill="currentColor" stroke="none" opacity="0.65"/><rect x="23" y="5" width="3" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.4"/></svg><svg class="qh-batt-bolt" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="display:none;margin-left:-15px;"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
    apps: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
    home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/></svg>',
    grip: '<svg width="10" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/></svg>',
    sleep: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    screenoff: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    restart: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    poweroff: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>'
  };

  var BUILTINS = (window.QH_BUILTINS || []).map(function (a) { return { id: a.id, name: a.name, url: a.url, c1: a.c1, c2: a.c2, icon: a.icon, builtin: true }; });

  // ── State (the ONE store: chrome.storage) ──
  var state = { theme: 'purple', brightness: 100, night: false, hue: 0, tz: '', user: [], hidden: [], homeUrl: '', barPos: null, screenIdle: 300 };
  // Screen-sleep choices for the slider: index → seconds (0 = never) and its label.
  var SLEEP_SECS = [0, 30, 60, 120, 300];
  var SLEEP_LABELS = ['Off', '30 sec', '1 min', '2 min', '5 min'];
  var pendingUpdate = null;
  var _updTimer = null, _updFallback = null, _updating = false, _applySent = false;
  var pickedColor = SWATCHES[1];
  var pickedIcon = null;
  var isHome = document.documentElement.hasAttribute('data-qh-home');

  function loadState(cb) {
    try {
      chrome.storage.local.get(['qh-theme', 'qh-brightness', 'qh-night', 'qh-hue', 'qh-tz', 'qh-user-apps', 'qh-hidden-apps', 'qh-home-url', 'qh-bar-pos', 'qh-screen-idle'], function (v) {
        if (!chrome.runtime.lastError) {
          v = v || {};
          if (THEMES.indexOf(v['qh-theme']) >= 0) state.theme = v['qh-theme'];
          if (v['qh-brightness']) state.brightness = parseInt(v['qh-brightness'], 10) || 100;
          state.night = !!v['qh-night'];
          state.hue = parseHue(v['qh-hue']);
          state.tz = v['qh-tz'] || '';
          if (Array.isArray(v['qh-user-apps'])) state.user = v['qh-user-apps'];
          if (Array.isArray(v['qh-hidden-apps'])) state.hidden = v['qh-hidden-apps'];
          state.homeUrl = v['qh-home-url'] || '';
          if (v['qh-bar-pos'] && typeof v['qh-bar-pos'] === 'object') state.barPos = v['qh-bar-pos'];
          if (typeof v['qh-screen-idle'] === 'number') state.screenIdle = v['qh-screen-idle'];
        }
        cb();
      });
    } catch (e) { cb(); }
  }
  function save(o) { try { chrome.storage.local.set(o); } catch (e) {} }
  function helper(path, cb) { try { chrome.runtime.sendMessage({ type: 'helper', path: path }, function (res) { void chrome.runtime.lastError; if (cb) cb(res); }); } catch (e) { if (cb) cb(null); } }

  function allApps() { return BUILTINS.concat(state.user); }
  // An app can be hidden from the dock (toggle in Settings) without deleting it. Hidden
  // is dock-only — publishApps still allows every added site so the lockdown can't bounce her.
  function isHidden(id) { return state.hidden.indexOf(id) >= 0; }
  function visibleApps() { return allApps().filter(function (a) { return !isHidden(a.id); }); }
  function toggleHidden(id) {
    if (isHidden(id)) {
      state.hidden = state.hidden.filter(function (x) { return x !== id; });
    } else {
      if (visibleApps().length <= 1) { renderManage(); return; }   // never hide the last app — keeps the dock from going empty
      state.hidden = state.hidden.concat([id]);
    }
    save({ 'qh-hidden-apps': state.hidden }); renderApps(); renderManage();
  }
  // Publish the one app list's URLs so the lockdown (background.js) allows exactly these sites.
  function publishApps() { try { save({ 'qh-app-urls': allApps().map(function (a) { return a.url; }) }); } catch (e) {} }
  function gradOf(a) { return 'linear-gradient(145deg,' + (a.c1 || '#cdbce6') + ',' + (a.c2 || '#b083e0') + ')'; }
  function normalizeUrl(raw) { var s = (raw || '').trim(); if (!s) return ''; if (!/^https?:\/\//i.test(s)) s = 'https://' + s; try { new URL(s); return s; } catch (e) { return ''; } }

  // ── Build the shell inside one shadow root ──
  var host = document.createElement('div');
  host.id = 'qh-shell-host';
  // Start hidden so the page never shows the shell's raw, unstyled markup for a
  // split second before shell.css loads (the "flash of code" on each app switch).
  var lock = { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', margin: '0', width: '100%', height: '100%', border: '0', 'pointer-events': 'none', 'z-index': '2147483600', visibility: 'hidden' };
  for (var k in lock) host.style.setProperty(k, lock[k], 'important');
  var root = host.attachShadow({ mode: 'open' });
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('shell.css');
  // Reveal only once the stylesheet is applied (with a fallback so a failed load
  // can never leave the shell invisible).
  // Re-assert the saved bar position here too: applyBarPos() in start() can run
  // before shell.css makes .qh-bar position:fixed, so the inline left/top don't
  // take and the bar snaps back to the right edge. Re-applying once the stylesheet
  // is live makes the dragged position stick on reload.
  function revealShell() { host.style.setProperty('visibility', 'visible', 'important'); try { applyBarPos(); } catch (e) {} }
  link.addEventListener('load', revealShell);
  setTimeout(revealShell, 1500);

  var ui = document.createElement('div');
  ui.innerHTML =
    '<div class="qh-screen-filter"></div>' +
    '<div class="qh-bar">' +
      '<span class="qh-grip" title="Drag to move the bar">' + I.grip + '</span>' +
      '<button class="qh-icon" data-act="wifi" title="Wi-Fi">' + I.wifi + '</button>' +
      '<button class="qh-icon" data-act="battery" title="Battery">' + I.battery + '</button>' +
      '<span class="qh-batt-pct"></span>' +
      '<button class="qh-icon" data-act="settings" title="Settings">' + I.gear + '</button>' +
      '<button class="qh-icon qh-version" data-act="version" title="Version"><span class="qh-emoji">' + LOCAL.emoji + '</span></button>' +
      '<span class="qh-time"></span>' +
    '</div>' +
    '<button class="qh-dock-btn" title="Apps">' + I.apps + '</button>' +
    '<div class="qh-dock-panel"></div>' +
    // settings popup
    '<div class="qh-overlay" data-ov="settings"><div class="qh-card">' +
      '<div class="qh-head"><div class="qh-title">Settings</div><button class="qh-close" data-close="settings">&#x2715;</button></div>' +
      '<div class="qh-section">Look</div><div class="qh-group">' +
        '<div class="qh-row col"><div class="qh-label">Theme</div><div class="qh-theme-dots"></div></div>' +
        '<div class="qh-row col qh-hue-row"><div class="qh-row-line"><div><div class="qh-label">Tint</div><div class="qh-sub">Shift the colour</div></div><div class="qh-hue-value">0</div></div><input type="range" min="0" max="360" class="qh-hue"></div>' +
        '<div class="qh-row col"><div class="qh-label">Brightness</div><input type="range" min="35" max="100" class="qh-brightness"></div>' +
        '<div class="qh-row"><div class="qh-label">Night Light</div><label class="qh-switch"><input type="checkbox" class="qh-night"><span class="qh-slider"></span></label></div>' +
        '<div class="qh-row col"><div class="qh-row-line"><div><div class="qh-label">Screen sleep</div><div class="qh-sub">Turn the screen off when idle</div></div><div class="qh-sleep-value">5 min</div></div><input type="range" min="0" max="4" step="1" class="qh-sleep"></div>' +
      '</div>' +
      '<div class="qh-section">Apps</div><div class="qh-group">' +
        '<div class="qh-manage-list"></div>' +
        '<div class="qh-add-inline">' +
          '<input class="qh-input qh-add-name" placeholder="Name (e.g. Notion)" maxlength="24" autocomplete="off">' +
          '<input class="qh-input qh-add-url" placeholder="Website (e.g. notion.so)" autocomplete="off">' +
          '<div class="qh-pickers">' +
            '<div class="qh-pick" data-pick="colour"><button type="button" class="qh-pick-btn"><span class="qh-pick-face qh-colour-face"></span><span class="qh-pick-cap">Colour</span><span class="qh-pick-chev">&#x25BE;</span></button><div class="qh-pick-menu qh-swatches"></div></div>' +
            '<div class="qh-pick" data-pick="icon"><button type="button" class="qh-pick-btn"><span class="qh-pick-face qh-icon-face"></span><span class="qh-pick-cap">Icon</span><span class="qh-pick-chev">&#x25BE;</span></button><div class="qh-pick-menu qh-icons"></div></div>' +
          '</div>' +
          '<div class="qh-add-actions"><button class="qh-btn-save qh-add-save">Add app</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="qh-section">Connection</div><div class="qh-group">' +
        '<button class="qh-row click" data-act="wifi"><div class="qh-label">Wi-Fi</div><div class="qh-sub qh-wifi-sub">Connected</div></button>' +
        '<div class="qh-row"><div class="qh-label">Region</div><select class="qh-region"></select></div>' +
      '</div>' +
      '<div class="qh-section">Device</div><div class="qh-group">' +
        '<button class="qh-row click" data-act="terminal"><div><div class="qh-label">Open terminal</div><div class="qh-sub">Support only</div></div><div class="qh-row-arrow">&#x203A;</div></button>' +
      '</div>' +
      '<div class="qh-section">Power</div><div class="qh-group">' +
        '<div class="qh-power-row">' +
          '<button class="qh-pwr click" data-act="screenoff" title="Turn the screen off (tap a key to wake)">' + I.screenoff + '<span>Screen</span></button>' +
          '<button class="qh-pwr click" data-act="sleep" title="Sleep">' + I.sleep + '<span>Sleep</span></button>' +
          '<button class="qh-pwr click" data-act="restart" title="Restart">' + I.restart + '<span>Restart</span></button>' +
          '<button class="qh-pwr click danger" data-act="poweroff" title="Power off">' + I.poweroff + '<span>Off</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="qh-foot">Quill Haven ' + esc(LOCAL.version) + ' ' + LOCAL.emoji + '</div>' +
    '</div></div>' +
    // version / update popup
    '<div class="qh-overlay" data-ov="update"><div class="qh-card">' +
      '<div class="qh-head"><div class="qh-title">Quill Haven</div><button class="qh-close" data-close="update">&#x2715;</button></div>' +
      '<div class="qh-update-body">' +
        '<div class="qh-update-emoji">' + LOCAL.emoji + '</div>' +
        '<div class="qh-update-version">Version ' + esc(LOCAL.version) + '</div>' +
        '<div class="qh-update-status">You’re up to date.</div>' +
        '<button class="qh-btn-save qh-update-now" style="display:none;">Update now</button>' +
        '<button class="qh-update-check">Check for updates</button>' +
        '<div class="qh-update-wait"></div>' +
      '</div>' +
    '</div></div>';

  root.appendChild(link);
  while (ui.firstChild) root.appendChild(ui.firstChild);
  var $ = function (s) { return root.querySelector(s); };
  var $$ = function (s) { return root.querySelectorAll(s); };

  // ── Look (theme + brightness + night) — ONE place ──
  function applyLook() {
    // theme on the shadow host (the bar/dock/settings) AND on the page <html> (the backdrop wallpaper)
    THEMES.forEach(function (t) { host.classList.remove('theme-' + t); document.documentElement.classList.remove('theme-' + t); });
    if (state.theme !== 'purple') { host.classList.add('theme-' + state.theme); document.documentElement.classList.add('theme-' + state.theme); }
    var hueOn = state.hue && (state.theme === 'purple' || state.theme === 'dark');
    host.style.filter = hueOn ? 'hue-rotate(' + state.hue + 'deg)' : '';
    document.documentElement.classList.toggle('qh-hue-on', !!hueOn);
    document.documentElement.style.setProperty('--qh-hue', state.hue + 'deg');
    var hr = $('.qh-hue-row'); if (hr) hr.style.display = (state.theme === 'purple' || state.theme === 'dark') ? '' : 'none';
    var f = $('.qh-screen-filter');
    var op = (100 - state.brightness) / 100 * 0.6;
    if (state.night) op = Math.max(op, 0.18);
    if (f) { f.classList.toggle('night', state.night); f.style.opacity = String(op); }
  }

  // ── Apps (dock panel: Home + app launch buttons) — ONE renderer ──
  function goHome() { if (state.homeUrl) window.location.href = state.homeUrl; else helper('/go-home'); }
  function renderApps() {
    var panel = $('.qh-dock-panel'); if (!panel) return;
    var html = '<button class="qh-app" data-home="1"><span class="qh-app-icon qh-home-icon">' + I.home + '</span><span class="qh-app-name">Home</span></button><div class="qh-dock-sep"></div>';
    visibleApps().forEach(function (a) {
      var inner = a.icon ? a.icon : '<span class="qh-app-letter">' + esc((a.name[0] || '?').toUpperCase()) + '</span>';
      html += '<button class="qh-app" data-url="' + esc(a.url) + '"><span class="qh-app-icon" style="background:' + gradOf(a) + '">' + inner + '</span><span class="qh-app-name">' + esc(a.name) + '</span></button>';
    });
    panel.innerHTML = html;
    panel.querySelector('[data-home]').addEventListener('click', function () { closePanel(); goHome(); });
    [].forEach.call(panel.querySelectorAll('[data-url]'), function (b) {
      b.addEventListener('click', function () { window.location.href = b.getAttribute('data-url'); });
    });
  }
  function removeApp(id) { state.user = state.user.filter(function (a) { return a.id !== id; }); state.hidden = state.hidden.filter(function (x) { return x !== id; }); save({ 'qh-user-apps': state.user, 'qh-hidden-apps': state.hidden }); publishApps(); renderApps(); renderManage(); }
  function openPanel() { renderApps(); $('.qh-dock-panel').classList.add('open'); }
  function closePanel() { var p = $('.qh-dock-panel'); if (p) p.classList.remove('open'); }
  function togglePanel() { var p = $('.qh-dock-panel'); if (p.classList.contains('open')) closePanel(); else openPanel(); }

  // ── Settings app management ──
  function buildSwatches() {
    var wrap = $('.qh-swatches'); if (!wrap) return; wrap.innerHTML = '';
    SWATCHES.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'qh-swatch' + (pickedColor[0] === c[0] && pickedColor[1] === c[1] ? ' active' : '');
      b.innerHTML = '<span style="background:linear-gradient(145deg,' + c[0] + ',' + c[1] + ')"></span>';
      b.addEventListener('click', function () { pickedColor = c; [].forEach.call($$('.qh-swatch'), function (s) { s.classList.remove('active'); }); b.classList.add('active'); updatePickFaces(); closePicks(); });
      wrap.appendChild(b);
    });
  }
  function buildIcons() {
    var wrap = $('.qh-icons'); if (!wrap) return; wrap.innerHTML = '';
    function choice(label, ico, active) {
      var b = document.createElement('button');
      b.type = 'button'; b.title = label;
      b.className = 'qh-icon-choice' + (active ? ' active' : '');
      b.innerHTML = ico || '<span class="qh-ic-letter">A</span>';
      b.addEventListener('click', function () { pickedIcon = ico || null; [].forEach.call($$('.qh-icon-choice'), function (s) { s.classList.remove('active'); }); b.classList.add('active'); updatePickFaces(); closePicks(); });
      wrap.appendChild(b);
    }
    choice('Letter', null, !pickedIcon);
    ICONS.forEach(function (ic) { choice(ic.id, ic.svg, pickedIcon === ic.svg); });
  }
  function updatePickFaces() {
    var cf = $('.qh-colour-face'); if (cf) cf.style.background = 'linear-gradient(145deg,' + pickedColor[0] + ',' + pickedColor[1] + ')';
    var icf = $('.qh-icon-face'); if (icf) icf.innerHTML = pickedIcon || '<span class="qh-ic-letter">A</span>';
  }
  function closePicks() { [].forEach.call($$('.qh-pick'), function (p) { p.classList.remove('open'); }); }
  // Lists EVERY app (built-in + your added sites). A toggle shows/hides it in the dock;
  // Remove only appears on your own added sites (built-ins can be hidden, never removed).
  function renderManage() {
    var list = $('.qh-manage-list'); if (!list) return;
    list.innerHTML = allApps().map(function (a) {
      var on = !isHidden(a.id);
      return '<div class="qh-manage-row">' +
        '<span class="qh-manage-dot" style="background:' + gradOf(a) + '">' + (a.icon || '') + '</span>' +
        '<span class="qh-manage-name">' + esc(a.name) + '</span>' +
        '<label class="qh-switch qh-mini-switch" title="Show in dock"><input type="checkbox" data-tog="' + esc(a.id) + '"' + (on ? ' checked' : '') + '><span class="qh-slider"></span></label>' +
        (a.builtin ? '' : '<button class="qh-manage-x" data-mx="' + esc(a.id) + '">Remove</button>') +
      '</div>';
    }).join('');
    [].forEach.call(list.querySelectorAll('[data-tog]'), function (t) { t.addEventListener('change', function () { toggleHidden(t.getAttribute('data-tog')); }); });
    [].forEach.call(list.querySelectorAll('[data-mx]'), function (x) { x.addEventListener('click', function () { removeApp(x.getAttribute('data-mx')); }); });
  }
  function saveAdd() {
    var name = $('.qh-add-name').value.trim(); var url = normalizeUrl($('.qh-add-url').value);
    if (!name) { $('.qh-add-name').focus(); return; }
    if (!url) { $('.qh-add-url').focus(); return; }
    var app = { id: 'u' + Date.now().toString(36), name: name, url: url, c1: pickedColor[0], c2: pickedColor[1] };
    // app.icon is ALWAYS a string from the trusted ICONS list (never user text) — it is injected as raw SVG.
    if (pickedIcon) app.icon = pickedIcon;
    state.user = state.user.concat([app]);
    save({ 'qh-user-apps': state.user }); publishApps(); renderApps(); renderManage();
    $('.qh-add-name').value = ''; $('.qh-add-url').value = '';
    pickedIcon = null; updatePickFaces();
  }

  // ── Settings popup ──
  function buildThemeDots() {
    var wrap = $('.qh-theme-dots'); if (!wrap) return; wrap.innerHTML = '';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'qh-dot ' + t + (t === state.theme ? ' active' : ''); b.title = THEME_LABELS[t] || t; b.innerHTML = '<span></span>';
      b.addEventListener('click', function () { state.theme = t; save({ 'qh-theme': t }); [].forEach.call($$('.qh-dot'), function (d) { d.classList.remove('active'); }); b.classList.add('active'); applyLook(); });
      wrap.appendChild(b);
    });
  }
  function syncControls() {
    var br = $('.qh-brightness'); if (br) br.value = state.brightness;
    var nl = $('.qh-night'); if (nl) nl.checked = state.night;
    var hue = $('.qh-hue'); if (hue) hue.value = state.hue;
    var hv = $('.qh-hue-value'); if (hv) hv.textContent = state.hue;
    var rg = $('.qh-region'); if (rg) rg.value = state.tz;
    var sl = $('.qh-sleep'); if (sl) { var si = SLEEP_SECS.indexOf(state.screenIdle); if (si < 0) si = 4; sl.value = si; var sv = $('.qh-sleep-value'); if (sv) sv.textContent = SLEEP_LABELS[si]; }
  }

  // ── Version + updates ──
  function markUpdate(on) { var b = $('.qh-version'); if (b) b.classList.toggle('has-update', on); }
  function checkUpdate(cb) {
    fetch(REMOTE_VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.version && String(j.version) !== LOCAL.version) { pendingUpdate = j; markUpdate(true); } else { pendingUpdate = null; markUpdate(false); }
      if (cb) cb(true);
    }).catch(function () { if (cb) cb(false); });
  }
  // The "Check for updates" button: look right now, then show the result in the popup.
  function checkNow() {
    if (_updating) return;                             // don't reset the popup while an update is mid-flight
    var st = $('.qh-update-status'), btn = $('.qh-update-check');
    if (st) st.textContent = 'Checking…';
    if (btn) btn.disabled = true;
    checkUpdate(function (ok) {
      if (btn) btn.disabled = false;
      if (!ok) { if (st) st.textContent = 'Couldn’t check just now — try again in a moment.'; return; }
      fillUpdate();
    });
  }
  function resetUpdateUI() {
    if (_updTimer) { clearInterval(_updTimer); _updTimer = null; }
    if (_updFallback) { clearTimeout(_updFallback); _updFallback = null; }
    var wait = $('.qh-update-wait'), em = $('.qh-update-emoji'), chk = $('.qh-update-check'), cl = $('.qh-overlay[data-ov="update"] .qh-close');
    if (em) em.classList.remove('qh-working');
    if (wait) { wait.classList.remove('err'); wait.textContent = ''; }
    if (chk) chk.style.display = '';
    if (cl) cl.style.visibility = '';
  }
  function fillUpdate() {
    resetUpdateUI();
    var st = $('.qh-update-status'), now = $('.qh-update-now'), em = $('.qh-update-emoji');
    if (pendingUpdate) {
      if (em) em.textContent = pendingUpdate.emoji || LOCAL.emoji;
      if (st) st.textContent = 'A new version is ready.';
      if (now) now.style.display = '';
    } else {
      if (em) em.textContent = LOCAL.emoji;
      if (st) st.textContent = 'You’re up to date.';
      if (now) now.style.display = 'none';
    }
  }
  // Tapping Update: (1) the emoji breathes so it never looks frozen; (2) WAIT until
  // the new files are actually published online, so the laptop can't pull a half-
  // published update and restart into the old version; (3) only then tell the helper
  // to install; (4) if the helper can't be reached or nothing ever publishes, say so
  // plainly instead of spinning forever. No fake progress bar — every line here is true.
  var PUBLISH_TRIES = 24;                              // ~24 × 5s ≈ 2 minutes of polling
  function applyUpdate() {
    if (_updating) return;                             // already mid-update — ignore repeat taps
    if (!pendingUpdate || !pendingUpdate.version) return;
    _updating = true; _applySent = false;              // lock the popup shut until it's done
    var now = $('.qh-update-now'), st = $('.qh-update-status'), em = $('.qh-update-emoji'),
        wait = $('.qh-update-wait'), chk = $('.qh-update-check'), cl = $('.qh-overlay[data-ov="update"] .qh-close');
    if (now) now.style.display = 'none';
    if (chk) chk.style.display = 'none';
    if (cl) cl.style.visibility = 'hidden';            // no X — can't cancel mid-update
    if (em) em.classList.add('qh-working');            // breathing emoji = real sign of life
    if (wait) { wait.classList.remove('err'); wait.textContent = ''; }
    if (st) st.textContent = 'Getting your update ready…';
    waitForPublish(String(pendingUpdate.version), 0);
  }
  // Poll the delivery copy of this file until it carries the new version number —
  // proof GitHub has finished publishing, so the install below can't pull stale files.
  function waitForPublish(target, n) {
    if (!_updating) return;
    fetch(DELIVERY_CONTENT_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (txt) {
        if (!_updating) return;
        if (txt && txt.indexOf("version: '" + target + "'") >= 0) { doApply(target); return; }
        if (n >= PUBLISH_TRIES) { updateFailed('Your update hasn’t finished publishing online yet. Wait a minute, then tap Update again.'); return; }
        setTimeout(function () { waitForPublish(target, n + 1); }, 5000);
      })
      .catch(function () {
        if (!_updating) return;
        if (n >= PUBLISH_TRIES) { updateFailed('Couldn’t reach the internet to fetch your update. Check the wifi, then tap Update again.'); return; }
        setTimeout(function () { waitForPublish(target, n + 1); }, 5000);
      });
  }
  // Files confirmed live → tell the helper to install + restart. Remember the version
  // we're heading to, so that after the restart we can confirm it really landed.
  function doApply(target) {
    if (!_updating) return;
    var st = $('.qh-update-status');
    if (st) st.textContent = 'Installing your update… the screen will go dark and come back on its own. Don’t turn it off.';
    save({ 'qh-updating-to': target });
    helper('/apply-update', function (res) {
      if (!res || !res.ok) { updateFailed('Couldn’t reach the updater. Switch the laptop off and on, then tap Update again.'); return; }
      _applySent = true;                               // helper has it; an install may be underway — never re-send
    });
    // Safety net if no restart comes. If the helper already accepted it (_applySent),
    // we must NOT offer a retry (that could double-install) — keep the popup locked and
    // just reassure; a power-cycle always finishes it. If it was never even accepted,
    // release the lock so she can try again.
    if (_updFallback) clearTimeout(_updFallback);
    _updFallback = setTimeout(function () {
      if (_applySent) {
        var st2 = $('.qh-update-status'), wait = $('.qh-update-wait');
        if (st2) st2.textContent = '';
        if (wait) { wait.classList.remove('err'); wait.textContent = 'Still working… if the screen doesn’t go dark and come back in a few minutes, switch the laptop off and on — it’ll finish on its own.'; }
      } else {
        updateFailed('That took too long to start. Switch the laptop off and on, then tap Update again.');
      }
    }, 240000);
  }
  function updateFailed(msg) {
    _updating = false;                                 // let her close it to retry
    try { chrome.storage.local.remove('qh-updating-to'); } catch (e) {}   // never leave a stale "updated" flag
    if (_updFallback) { clearTimeout(_updFallback); _updFallback = null; }
    var st = $('.qh-update-status'), wait = $('.qh-update-wait'), em = $('.qh-update-emoji'),
        now = $('.qh-update-now'), chk = $('.qh-update-check'), cl = $('.qh-overlay[data-ov="update"] .qh-close');
    if (em) em.classList.remove('qh-working');
    if (st) st.textContent = '';
    if (wait) { wait.classList.add('err'); wait.textContent = msg; }
    if (now) now.style.display = '';                   // offer the retry
    if (chk) chk.style.display = '';
    if (cl) cl.style.visibility = '';
  }
  // After an update restart, if we landed on exactly the version we set out for, tell
  // her plainly it worked (the changed emoji is the proof; this names it). Cleared
  // either way so it never nags, and never claims success on a version that didn't land.
  function confirmUpdateLanded() {
    try {
      chrome.storage.local.get(['qh-updating-to'], function (v) {
        if (chrome.runtime.lastError) return;
        var t = v && v['qh-updating-to'];
        if (!t) return;
        var match = String(t) === LOCAL.version;
        try { chrome.storage.local.remove('qh-updating-to'); } catch (e) {}   // clear first so two loads can't double-toast
        if (match) showToast('Updated — you’re now on ' + LOCAL.emoji + ' version ' + LOCAL.version + '.');
      });
    } catch (e) {}
  }
  function showToast(msg) {
    try {
      var t = document.createElement('div');
      t.className = 'qh-toast'; t.textContent = msg;
      root.appendChild(t);
      requestAnimationFrame(function () { t.classList.add('show'); });
      setTimeout(function () { t.classList.remove('show'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400); }, 5000);
    } catch (e) {}
  }

  // ── Overlays (open/close any popup) ──
  function openOverlay(name) {
    if (name === 'settings') { buildThemeDots(); buildSwatches(); buildIcons(); updatePickFaces(); renderManage(); syncControls(); }
    if (name === 'update' && !_updating) fillUpdate();   // don't reset the popup while an update is mid-flight
    var ov = $('.qh-overlay[data-ov="' + name + '"]'); if (ov) ov.classList.add('open');
  }
  function closeOverlay(name) { if (name === 'update' && _updating) return; var ov = $('.qh-overlay[data-ov="' + name + '"]'); if (ov) ov.classList.remove('open'); }
  // Escape / close-all must honour the same mid-update lock as closeOverlay, or it could
  // close the update popup mid-install and leave the lock stuck on.
  function closeAll() { [].forEach.call($$('.qh-overlay'), function (o) { if (o.getAttribute('data-ov') === 'update' && _updating) return; o.classList.remove('open'); }); closePanel(); }

  // ── Clock — ONE ──
  function tick() {
    var tz = state.tz || undefined, now = new Date(), h, m, day, mon, date;
    if (tz) {
      try {
        var p = {};
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', weekday: 'short', month: 'short', day: 'numeric', hour12: false }).formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
        var dm = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }, mm = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        h = parseInt(p.hour, 10) % 24; m = +p.minute; day = dm[p.weekday]; mon = mm[p.month]; date = +p.day;
      } catch (e) { tz = null; }
    }
    if (!tz) { h = now.getHours(); m = now.getMinutes(); day = now.getDay(); mon = now.getMonth(); date = now.getDate(); }
    var el = $('.qh-time'); if (el) el.textContent = DAYS[day] + ', ' + MONTHS[mon] + ' ' + date + '  ' + pad(h) + ':' + pad(m);
  }

  // ── Battery — ONE ──
  function initBattery() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(function (b) {
      function sync() {
        var fill = $('.qh-batt-fill'), bolt = $('.qh-batt-bolt'), icon = $('[data-act="battery"]'), pctEl = $('.qh-batt-pct');
        var pct = Math.round((b.level || 0) * 100);
        if (fill) fill.setAttribute('width', String(Math.max(0.5, Math.min(15, 15 * (b.level || 0)))));
        if (bolt) bolt.style.display = b.charging ? '' : 'none';
        if (pctEl) pctEl.textContent = pct + '%';   // always visible (not hover-only)
        if (icon) { var secs = b.charging ? b.chargingTime : b.dischargingTime, extra = ''; if (secs && secs !== Infinity) { var hh = Math.floor(secs / 3600), mm = Math.round((secs % 3600) / 60); extra = ' · ' + (hh ? hh + 'h ' : '') + pad(mm) + 'm ' + (b.charging ? 'to full' : 'left'); } icon.title = pct + '%' + (b.charging ? ' (charging)' : '') + extra; }
      }
      b.addEventListener('levelchange', sync); b.addEventListener('chargingchange', sync); b.addEventListener('chargingtimechange', sync); b.addEventListener('dischargingtimechange', sync); sync();
    }).catch(function () {});
  }

  // ── Wi-Fi — ONE ──
  function syncWifi() {
    var on = navigator.onLine !== false;
    var w = $('.qh-bar [data-act="wifi"]'); if (w) { w.style.opacity = on ? '' : '0.35'; w.title = on ? 'Wi-Fi — connected' : 'Offline'; }
    var sub = $('.qh-wifi-sub'); if (sub) sub.textContent = on ? 'Connected' : 'Offline';
  }

  // ── Wire ──
  function wire() {
    $('.qh-bar [data-act="wifi"]').addEventListener('click', function () { helper('/wifi-settings'); });
    $('.qh-bar [data-act="settings"]').addEventListener('click', function () { openOverlay('settings'); });
    $('.qh-bar [data-act="version"]').addEventListener('click', function () { openOverlay('update'); });
    $('.qh-dock-btn').addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });

    [].forEach.call($$('[data-close]'), function (b) { b.addEventListener('click', function () { closeOverlay(b.getAttribute('data-close')); }); });
    [].forEach.call($$('.qh-overlay'), function (ov) { ov.addEventListener('click', function (e) { if (e.target === ov) closeOverlay(ov.getAttribute('data-ov')); }); });

    var br = $('.qh-brightness'); if (br) br.addEventListener('input', function () { state.brightness = parseInt(br.value, 10) || 100; save({ 'qh-brightness': state.brightness }); applyLook(); });
    var nl = $('.qh-night'); if (nl) nl.addEventListener('change', function () { state.night = nl.checked; save({ 'qh-night': nl.checked ? '1' : '' }); applyLook(); });
    var hue = $('.qh-hue'); if (hue) hue.addEventListener('input', function () { state.hue = parseHue(hue.value); save({ 'qh-hue': state.hue }); applyLook(); syncControls(); });
    var sl = $('.qh-sleep'); if (sl) sl.addEventListener('input', function () { var i = parseInt(sl.value, 10) || 0; state.screenIdle = SLEEP_SECS[i]; var sv = $('.qh-sleep-value'); if (sv) sv.textContent = SLEEP_LABELS[i]; save({ 'qh-screen-idle': state.screenIdle }); });
    var rg = $('.qh-region'); if (rg) { REGIONS.forEach(function (r) { var o = document.createElement('option'); o.value = r[0]; o.textContent = r[1]; rg.appendChild(o); }); rg.addEventListener('change', function () { state.tz = rg.value; save({ 'qh-tz': rg.value }); tick(); }); }

    [].forEach.call($$('.click[data-act]'), function (rowEl) {
      var act = rowEl.getAttribute('data-act');
      rowEl.addEventListener('click', function () {
        if (act === 'wifi') helper('/wifi-settings');
        else if (act === 'screenoff') helper('/screen-off');
        else if (act === 'terminal') { helper('/terminal'); }
        else if (act === 'sleep') helper('/sleep');
        else if (act === 'restart') { if (window.confirm('Restart the laptop?')) helper('/reboot'); }
        else if (act === 'poweroff') { if (window.confirm('Power off the laptop?')) helper('/poweroff'); }
      });
    });

    $('.qh-add-save').addEventListener('click', saveAdd);
    $('.qh-add-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') saveAdd(); });
    $('.qh-add-url').addEventListener('keydown', function (e) { if (e.key === 'Enter') saveAdd(); });
    $('.qh-update-now').addEventListener('click', applyUpdate);
    $('.qh-update-check').addEventListener('click', checkNow);

    [].forEach.call($$('.qh-pick-btn'), function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); var pick = btn.parentNode, wasOpen = pick.classList.contains('open'); closePicks(); if (!wasOpen) pick.classList.add('open'); });
    });
    document.addEventListener('click', function (e) { var inPick = e.composedPath && e.composedPath().some(function (n) { return n.classList && n.classList.contains('qh-pick'); }); if (!inPick) closePicks(); }, true);

    document.addEventListener('click', function (e) { if (e.composedPath && e.composedPath().indexOf($('.qh-dock-panel')) < 0 && e.composedPath().indexOf($('.qh-dock-btn')) < 0) closePanel(); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); }, true);
  }

  // ── Live updates: if any page changes the shared store, reflect it everywhere ──
  function watchStorage() {
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (changes['qh-user-apps']) { state.user = Array.isArray(changes['qh-user-apps'].newValue) ? changes['qh-user-apps'].newValue : []; renderApps(); renderManage(); }
        if (changes['qh-hidden-apps']) { state.hidden = Array.isArray(changes['qh-hidden-apps'].newValue) ? changes['qh-hidden-apps'].newValue : []; renderApps(); renderManage(); }
        if (changes['qh-theme'] && THEMES.indexOf(changes['qh-theme'].newValue) >= 0) { state.theme = changes['qh-theme'].newValue; applyLook(); buildThemeDots(); }
        if (changes['qh-brightness']) { state.brightness = parseInt(changes['qh-brightness'].newValue, 10) || 100; applyLook(); }
        if (changes['qh-night']) { state.night = !!changes['qh-night'].newValue; applyLook(); }
        if (changes['qh-hue']) { state.hue = parseHue(changes['qh-hue'].newValue); applyLook(); syncControls(); }
        if (changes['qh-tz']) { state.tz = changes['qh-tz'].newValue || ''; tick(); }
        if (changes['qh-home-url']) { state.homeUrl = changes['qh-home-url'].newValue || ''; }
        if (changes['qh-bar-pos']) { state.barPos = changes['qh-bar-pos'].newValue || null; applyBarPos(); }
      });
    } catch (e) {}
  }

  // ── Movable bar — drag from the grip; clamp on-screen; save + restore (one store) ──
  function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function applyBarPos() {
    var bar = $('.qh-bar'); if (!bar) return;
    var p = state.barPos;
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return;
    var w = bar.offsetWidth || 0, h = bar.offsetHeight || 0;
    bar.style.left = clampN(p.x, 4, Math.max(4, window.innerWidth - w - 4)) + 'px';
    bar.style.top = clampN(p.y, 4, Math.max(4, window.innerHeight - h - 4)) + 'px';
    bar.style.right = 'auto'; bar.style.bottom = 'auto';
  }
  function setupBarDrag() {
    var bar = $('.qh-bar'), grip = $('.qh-grip'); if (!bar || !grip) return;
    var startX, startY, origX, origY, dragging = false;
    grip.addEventListener('pointerdown', function (e) {
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      var r = bar.getBoundingClientRect();
      origX = r.left; origY = r.top; startX = e.clientX; startY = e.clientY; dragging = true;
      try { grip.setPointerCapture(e.pointerId); } catch (x) {}
    });
    grip.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var w = bar.offsetWidth, h = bar.offsetHeight;
      bar.style.left = clampN(origX + (e.clientX - startX), 4, Math.max(4, window.innerWidth - w - 4)) + 'px';
      bar.style.top = clampN(origY + (e.clientY - startY), 4, Math.max(4, window.innerHeight - h - 4)) + 'px';
      bar.style.right = 'auto'; bar.style.bottom = 'auto';
    });
    function end() {
      if (!dragging) return; dragging = false;
      state.barPos = { x: parseFloat(bar.style.left), y: parseFloat(bar.style.top) };
      save({ 'qh-bar-pos': state.barPos });
    }
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  }

  function start() {
    document.documentElement.appendChild(host);
    wire();
    loadState(function () {
      // On the home page, remember the way back for the Home button on other pages.
      if (isHome) { try { chrome.storage.local.set({ 'qh-home-url': location.href }); state.homeUrl = location.href; } catch (e) {} }
      applyLook();
      applyBarPos(); setupBarDrag();
      setTimeout(applyBarPos, 300);   // re-assert after layout settles (cached-CSS case)
      window.addEventListener('resize', applyBarPos);
      renderApps();
      publishApps();
      tick(); setInterval(tick, 10000);
      initBattery(); syncWifi();
      window.addEventListener('online', syncWifi); window.addEventListener('offline', syncWifi);
      checkUpdate(); setInterval(checkUpdate, 30 * 60 * 1000);
      confirmUpdateLanded();
      watchStorage();
    });
  }

  try { start(); } catch (e) { if (host && host.parentNode) host.parentNode.removeChild(host); }
})();
