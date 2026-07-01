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
    { id: 'feather', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/></svg>' },
    { id: 'star', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.8 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>' },
    { id: 'heart', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.1a5 5 0 0 0-7.1 0L12 6.8l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.8a5 5 0 0 0 0-7.1z"/></svg>' },
    { id: 'leaf', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>' },
    { id: 'note', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>' }
  ];

  // Version identity. MUST agree with version.json (same number AND same emoji).
  var LOCAL = { version: '2.3.23', emoji: '🐇' };
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
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    lock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    sleep: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    restart: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
    poweroff: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>',
    terminal: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l3 3-3 3M13 15h4"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>'
  };

  var BUILTINS = (window.QH_BUILTINS || []).map(function (a) { return { id: a.id, name: a.name, url: a.url, c1: a.c1, c2: a.c2, icon: a.icon, builtin: true }; });

  // ── State (the ONE store: chrome.storage) ──
  var state = { theme: 'purple', brightness: 100, hue: 0, tz: '', user: [], hidden: [], homeUrl: '', barPos: null, screenIdle: 300 };
  // Screen-sleep choices for the slider: index → seconds (0 = never) and its label.
  var SLEEP_SECS = [0, 30, 60, 120, 300];
  var SLEEP_LABELS = ['Off', '30 sec', '1 min', '2 min', '5 min'];
  var pendingUpdate = null;
  var _updFallback = null, _updating = false, _applySent = false;
  var pickedColor = SWATCHES[1];
  var pickedIcon = null;
  var editingId = null;   // when set, the add/edit popup is renaming this user app instead of adding a new one
  var _confirmYes = null; // the action to run if the user taps Confirm in the are-you-sure popup
  var isHome = document.documentElement.hasAttribute('data-qh-home');

  function loadState(cb) {
    try {
      chrome.storage.local.get(['qh-theme', 'qh-brightness', 'qh-hue', 'qh-tz', 'qh-user-apps', 'qh-hidden-apps', 'qh-home-url', 'qh-bar-pos', 'qh-screen-idle'], function (v) {
        if (!chrome.runtime.lastError) {
          v = v || {};
          if (THEMES.indexOf(v['qh-theme']) >= 0) state.theme = v['qh-theme'];
          if (v['qh-brightness']) state.brightness = parseInt(v['qh-brightness'], 10) || 100;
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
  function helper(path, cb, opts) { try { chrome.runtime.sendMessage({ type: 'helper', path: path, method: opts && opts.method, body: opts && opts.body }, function (res) { if (cb) cb(res || { ok: false, reason: (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'no-sw' }); }); } catch (e) { if (cb) cb({ ok: false, reason: String(e) }); } }

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
  function grad(c1, c2) { return 'linear-gradient(145deg,' + c1 + ',' + c2 + ')'; }
  function gradOf(a) { return grad(a.c1 || '#cdbce6', a.c2 || '#b083e0'); }
  function normalizeUrl(raw) { var s = (raw || '').trim(); if (!s) return ''; if (!/^https?:\/\//i.test(s)) s = 'https://' + s; try { new URL(s); return s; } catch (e) { return ''; } }

  // ── Build the shell inside one shadow root ──
  var host = document.createElement('div');
  host.id = 'qh-shell-host';
  // Start hidden so the page never shows the shell's raw, unstyled markup for a
  // split second before shell.css loads (the "flash of code" on each app switch).
  var lock = { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', margin: '0', width: '100%', height: '100%', border: '0', 'pointer-events': 'none', 'z-index': '2147483600', visibility: 'hidden' };
  for (var k in lock) host.style.setProperty(k, lock[k], 'important');
  // 'closed' so page scripts can never reach in and press our buttons —
  // document.getElementById('qh-shell-host').shadowRoot is null to them.
  var root = host.attachShadow({ mode: 'closed' });
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
      '<div class="qh-section">Device</div><div class="qh-group">' +
        '<div class="qh-row"><div class="qh-hue-row"><div class="qh-label">Tint</div><input type="range" min="0" max="360" class="qh-hue"></div><div class="qh-theme-col"><div class="qh-label">Theme</div><div class="qh-theme-dots"></div></div></div>' +
        '<div class="qh-row col"><div class="qh-two-btns">' +
          '<button class="qh-pwr click qh-wifi-btn" data-act="wifi" title="Wi-Fi">' + I.wifi + '<span>Wi-Fi</span></button>' +
          '<button class="qh-pwr click" data-act="terminal" title="Open terminal">' + I.terminal + '<span>Terminal</span></button>' +
        '</div></div>' +
        '<div class="qh-row col"><div class="qh-label">Brightness</div><input type="range" min="35" max="100" class="qh-brightness"></div>' +
        '<div class="qh-row col"><div class="qh-two">' +
          '<div class="qh-two-field"><div class="qh-label">Screen sleep</div><select class="qh-sleep"></select></div>' +
          '<div class="qh-two-field"><div class="qh-label">Region</div><select class="qh-region"></select></div>' +
        '</div></div>' +
      '</div>' +
      '<div class="qh-section">Apps</div><div class="qh-group">' +
        '<div class="qh-manage-list"></div>' +
        '<div class="qh-add-row"><button class="qh-btn-save qh-add-open">Add app</button></div>' +
      '</div>' +
      '<div class="qh-section">Power</div><div class="qh-group">' +
        '<div class="qh-power-row">' +
          '<button class="qh-pwr click" data-act="sleep" title="Sleep">' + I.sleep + '<span>Sleep</span></button>' +
          '<button class="qh-pwr click" data-act="restart" title="Restart">' + I.restart + '<span>Restart</span></button>' +
          '<button class="qh-pwr click danger" data-act="poweroff" title="Power off">' + I.poweroff + '<span>Off</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="qh-foot">Quill Haven ' + esc(LOCAL.version) + ' ' + LOCAL.emoji + '</div>' +
    '</div></div>' +
    // add / edit app popup
    '<div class="qh-overlay" data-ov="addapp"><div class="qh-card qh-card-sm">' +
      '<div class="qh-head"><div class="qh-title qh-add-title">Add app</div><button class="qh-close" data-close="addapp">&#x2715;</button></div>' +
      '<div class="qh-add-inline">' +
        '<input class="qh-input qh-add-name" placeholder="Name (e.g. Notion)" maxlength="24" autocomplete="off">' +
        '<input class="qh-input qh-add-url" placeholder="Website (e.g. notion.so)" autocomplete="off">' +
        '<div class="qh-pick-label">Colour</div><div class="qh-swatches"></div>' +
        '<div class="qh-pick-label">Icon</div><div class="qh-icons"></div>' +
        '<div class="qh-add-actions"><button class="qh-btn-save qh-add-save">Add app</button></div>' +
      '</div>' +
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
    '</div></div>' +
    // are-you-sure confirm popup (kiosk Chromium blocks window.confirm, so we use our own)
    '<div class="qh-overlay" data-ov="confirm"><div class="qh-card qh-card-sm">' +
      '<div class="qh-confirm-body">' +
        '<div class="qh-confirm-msg"></div>' +
        '<div class="qh-confirm-actions">' +
          '<button class="qh-confirm-cancel">Cancel</button>' +
          '<button class="qh-btn-save qh-confirm-yes">Confirm</button>' +
        '</div>' +
      '</div>' +
    '</div></div>' +
    // in-app Wi-Fi picker (replaces the native window)
    '<div class="qh-overlay" data-ov="wifi"><div class="qh-card qh-card-sm">' +
      '<div class="qh-head"><div class="qh-title">Wi-Fi</div>' +
        '<label class="qh-switch qh-mini-switch qh-wifi-head-toggle" title="Wi-Fi on/off"><input type="checkbox" class="qh-wifi-radio" checked><span class="qh-slider"></span></label>' +
        '<button class="qh-close" data-close="wifi">&#x2715;</button></div>' +
      '<div class="qh-wifi-list"></div>' +
      '<div class="qh-wifi-foot"><button class="qh-wifi-rescan">' + I.wifi + '<span>Refresh</span></button></div>' +
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
    if (f) f.style.opacity = String(op);
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
  function pickOne(sel, btn) { [].forEach.call($$(sel), function (s) { s.classList.remove('active'); }); btn.classList.add('active'); }
  function buildSwatches() {
    var wrap = $('.qh-swatches'); if (!wrap) return; wrap.innerHTML = '';
    SWATCHES.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'qh-swatch' + (pickedColor[0] === c[0] && pickedColor[1] === c[1] ? ' active' : '');
      b.innerHTML = '<span style="background:' + grad(c[0], c[1]) + '"></span>';
      b.addEventListener('click', function () { pickedColor = c; pickOne('.qh-swatch', b); });
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
      b.addEventListener('click', function () { pickedIcon = ico || null; pickOne('.qh-icon-choice', b); });
      wrap.appendChild(b);
    }
    choice('Letter', null, !pickedIcon);
    ICONS.forEach(function (ic) { choice(ic.id, ic.svg, pickedIcon === ic.svg); });
  }
  // Lists EVERY app (built-in + your added sites). A toggle shows/hides it in the dock;
  // Remove only appears on your own added sites (built-ins can be hidden, never removed).
  function renderManage() {
    var list = $('.qh-manage-list'); if (!list) return;
    list.innerHTML = allApps().map(function (a) {
      var on = !isHidden(a.id);
      return '<div class="qh-manage-row">' +
        '<span class="qh-manage-dot" style="background:' + gradOf(a) + '">' + (a.icon || '') + '</span>' +
        '<span class="qh-manage-name">' + esc(a.name) + '</span>' +
        (a.builtin ? '' :
          '<button class="qh-manage-act" data-edit="' + esc(a.id) + '" title="Edit">' + I.edit + '</button>' +
          '<button class="qh-manage-act qh-manage-del" data-mx="' + esc(a.id) + '" title="Remove">' + I.trash + '</button>') +
        '<label class="qh-switch qh-mini-switch" title="Show in dock"><input type="checkbox" data-tog="' + esc(a.id) + '"' + (on ? ' checked' : '') + '><span class="qh-slider"></span></label>' +
      '</div>';
    }).join('');
    [].forEach.call(list.querySelectorAll('[data-tog]'), function (t) { t.addEventListener('change', function () { toggleHidden(t.getAttribute('data-tog')); }); });
    [].forEach.call(list.querySelectorAll('[data-mx]'), function (x) { x.addEventListener('click', function () { removeApp(x.getAttribute('data-mx')); }); });
    [].forEach.call(list.querySelectorAll('[data-edit]'), function (e) { e.addEventListener('click', function () { var id = e.getAttribute('data-edit'); openAddapp(state.user.filter(function (x) { return x.id === id; })[0]); }); });
  }
  // Open the add/edit popup: pass an app to rename/recolour it, or null to add a new one.
  function openAddapp(a) { editingId = a ? a.id : null; fillAddForm(a || null); openOverlay('addapp'); }
  function fillAddForm(a) {
    var t = $('.qh-add-title'); if (t) t.textContent = a ? 'Edit app' : 'Add app';
    var sv = $('.qh-add-save'); if (sv) sv.textContent = a ? 'Save' : 'Add app';
    var nm = $('.qh-add-name'), ur = $('.qh-add-url');
    if (nm) nm.value = a ? a.name : '';
    if (ur) ur.value = a ? a.url : '';
    // match the picker state to this app (or reset for a new one)
    pickedColor = (a && a.c1) ? [a.c1, a.c2 || a.c1] : SWATCHES[1];
    pickedIcon = (a && a.icon) ? a.icon : null;
    buildSwatches(); buildIcons();
  }
  function saveAdd() {
    var name = $('.qh-add-name').value.trim(); var url = normalizeUrl($('.qh-add-url').value);
    if (!name) { $('.qh-add-name').focus(); return; }
    if (!url) { $('.qh-add-url').focus(); return; }
    // One app shape for both add and rename; editing keeps the id so its hidden state stays put.
    // app.icon is ALWAYS a trusted ICONS string (never user text) — it is injected as raw SVG.
    var app = { id: editingId || ('u' + Date.now().toString(36)), name: name, url: url, c1: pickedColor[0], c2: pickedColor[1] };
    if (pickedIcon) app.icon = pickedIcon;
    state.user = editingId ? state.user.map(function (a) { return a.id === editingId ? app : a; }) : state.user.concat([app]);
    save({ 'qh-user-apps': state.user }); publishApps(); renderApps(); renderManage();
    editingId = null; closeOverlay('addapp');
  }

  // ── Settings popup ──
  function buildThemeDots() {
    var wrap = $('.qh-theme-dots'); if (!wrap) return; wrap.innerHTML = '';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'qh-dot ' + t + (t === state.theme ? ' active' : ''); b.title = THEME_LABELS[t] || t; b.innerHTML = '<span></span>';
      b.addEventListener('click', function () { state.theme = t; save({ 'qh-theme': t }); pickOne('.qh-dot', b); applyLook(); });
      wrap.appendChild(b);
    });
  }
  function syncControls() {
    var br = $('.qh-brightness'); if (br) br.value = state.brightness;
    var hue = $('.qh-hue'); if (hue) hue.value = state.hue;
    var rg = $('.qh-region'); if (rg) rg.value = state.tz;
    var sl = $('.qh-sleep'); if (sl) { var si = SLEEP_SECS.indexOf(state.screenIdle); if (si < 0) si = 4; sl.value = String(si); }
  }

  // ── Version + updates ──
  function markUpdate(on) { var b = $('.qh-version'); if (b) b.classList.toggle('has-update', on); }
  function checkUpdate(cb) {
    fetch(REMOTE_VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.version && String(j.version) !== LOCAL.version) { pendingUpdate = j; markUpdate(true); } else { pendingUpdate = null; markUpdate(false); }
      if (cb) cb(true);
    }).catch(function () { if (cb) cb(false); });
  }
  // One accessor for every element in the update popup (the long close-X selector lives here only).
  function updEls() { return { st: $('.qh-update-status'), now: $('.qh-update-now'), em: $('.qh-update-emoji'),
    wait: $('.qh-update-wait'), chk: $('.qh-update-check'), cl: $('.qh-overlay[data-ov="update"] .qh-close') }; }
  // The "Check for updates" button: look right now, then show the result in the popup.
  function checkNow() {
    if (_updating) return;                             // don't reset the popup while an update is mid-flight
    var u = updEls();
    if (u.st) u.st.textContent = 'Checking…';
    if (u.chk) u.chk.disabled = true;
    checkUpdate(function (ok) {
      if (u.chk) u.chk.disabled = false;
      if (!ok) { if (u.st) u.st.textContent = 'Couldn’t check just now — try again in a moment.'; return; }
      fillUpdate();
    });
  }
  function resetUpdateUI() {
    if (_updFallback) { clearTimeout(_updFallback); _updFallback = null; }
    var u = updEls();
    if (u.em) u.em.classList.remove('qh-working');
    if (u.wait) { u.wait.classList.remove('err'); u.wait.textContent = ''; }
    if (u.chk) u.chk.style.display = '';
    if (u.cl) u.cl.style.visibility = '';
  }
  function fillUpdate() {
    resetUpdateUI();
    var u = updEls();
    if (pendingUpdate) {
      if (u.em) u.em.textContent = pendingUpdate.emoji || LOCAL.emoji;
      if (u.st) u.st.textContent = 'A new version is ready.';
      if (u.now) u.now.style.display = '';
    } else {
      if (u.em) u.em.textContent = LOCAL.emoji;
      if (u.st) u.st.textContent = 'You’re up to date.';
      if (u.now) u.now.style.display = 'none';
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
    var u = updEls();
    if (u.now) u.now.style.display = 'none';
    if (u.chk) u.chk.style.display = 'none';
    if (u.cl) u.cl.style.visibility = 'hidden';        // no X — can't cancel mid-update
    if (u.em) u.em.classList.add('qh-working');        // breathing emoji = real sign of life
    if (u.wait) { u.wait.classList.remove('err'); u.wait.textContent = ''; }
    if (u.st) u.st.textContent = 'Getting your update ready…';
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
    var u = updEls();
    if (u.st) u.st.textContent = 'Installing your update… the screen will go dark and come back on its own. Don’t turn it off.';
    save({ 'qh-updating-to': target });
    helper('/apply-update', function (res) {
      if (!res || !res.ok) { updateFailed('Couldn’t reach the updater (' + ((res && res.reason) || 'no-sw') + '). Switch the laptop off and on, then tap Update again.'); return; }
      _applySent = true;                               // helper has it; an install may be underway — never re-send
    });
    // Safety net if no restart comes. If the helper already accepted it (_applySent),
    // we must NOT offer a retry (that could double-install) — keep the popup locked and
    // just reassure; a power-cycle always finishes it. If it was never even accepted,
    // release the lock so she can try again.
    if (_updFallback) clearTimeout(_updFallback);
    _updFallback = setTimeout(function () {
      if (_applySent) {
        if (u.st) u.st.textContent = '';
        if (u.wait) { u.wait.classList.remove('err'); u.wait.textContent = 'Still working… if the screen doesn’t go dark and come back in a few minutes, switch the laptop off and on — it’ll finish on its own.'; }
      } else {
        updateFailed('That took too long to start. Switch the laptop off and on, then tap Update again.');
      }
    }, 240000);
  }
  function updateFailed(msg) {
    _updating = false;                                 // let her close it to retry
    try { chrome.storage.local.remove('qh-updating-to'); } catch (e) {}   // never leave a stale "updated" flag
    if (_updFallback) { clearTimeout(_updFallback); _updFallback = null; }
    var u = updEls();
    if (u.em) u.em.classList.remove('qh-working');
    if (u.st) u.st.textContent = '';
    if (u.wait) { u.wait.classList.add('err'); u.wait.textContent = msg; }
    if (u.now) u.now.style.display = '';               // offer the retry
    if (u.chk) u.chk.style.display = '';
    if (u.cl) u.cl.style.visibility = '';
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
  // After a blocked site bounces us home, say so once (background.js sets the flag).
  function confirmBlocked() {
    try {
      chrome.storage.local.get(['qh-blocked-at'], function (v) {
        if (chrome.runtime.lastError) return;
        if (!(v && v['qh-blocked-at'])) return;
        try { chrome.storage.local.remove('qh-blocked-at'); } catch (e) {}
        showToast('Sorry — that site is blocked.');
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
    if (name === 'settings') { buildThemeDots(); renderManage(); syncControls(); }
    if (name === 'update' && !_updating) fillUpdate();   // don't reset the popup while an update is mid-flight
    var ov = $('.qh-overlay[data-ov="' + name + '"]'); if (ov) ov.classList.add('open');
  }
  // In-app "are you sure?" — kiosk Chromium blocks window.confirm, so power actions use this.
  function askConfirm(msg, yesLabel, onYes) {
    var m = $('.qh-confirm-msg'); if (m) m.textContent = msg;
    var y = $('.qh-confirm-yes'); if (y) y.textContent = yesLabel || 'Confirm';
    _confirmYes = onYes || null;
    openOverlay('confirm');
  }
  function closeOverlay(name) { if (name === 'update' && _updating) return; var ov = $('.qh-overlay[data-ov="' + name + '"]'); if (ov) ov.classList.remove('open'); }
  // Escape / close-all must honour the same mid-update lock as closeOverlay, or it could
  // close the update popup mid-install and leave the lock stuck on.
  function closeAll() { [].forEach.call($$('.qh-overlay'), function (o) { if (o.getAttribute('data-ov') === 'update' && _updating) return; o.classList.remove('open'); }); closePanel(); }

  // ── Clock — ONE ──
  function tick() {
    var tz = state.tz || undefined, now = new Date(), h, m, wd, mo, date;
    if (tz) {
      try {
        var p = {};
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', weekday: 'short', month: 'short', day: 'numeric', hour12: false }).formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
        h = parseInt(p.hour, 10) % 24; m = +p.minute; wd = p.weekday; mo = p.month; date = +p.day;  // 'short' parts already read 'Mon'/'Jun'
      } catch (e) { tz = null; }
    }
    if (!tz) { h = now.getHours(); m = now.getMinutes(); wd = DAYS[now.getDay()]; mo = MONTHS[now.getMonth()]; date = now.getDate(); }
    var el = $('.qh-time'); if (el) el.textContent = wd + ', ' + mo + ' ' + date + '  ' + pad(h) + ':' + pad(m);
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
    var btn = $('.qh-wifi-btn'); if (btn) { btn.classList.toggle('connected', on); btn.title = on ? 'Wi-Fi — connected' : 'Wi-Fi — offline'; }
  }

  // ── Wi-Fi picker (in-app, via the helper) — ONE ──
  var _wifiConnecting = '';
  var _lastNets = [], _lastRadio = true;   // last scan, so the password box can re-draw without re-scanning
  // The same Wi-Fi glyph, with the arcs faded to match how strong the signal is
  // (full / medium / weak) — like every phone's Wi-Fi list.
  function wifiIcon(sig) {
    var mid = sig >= 35 ? 1 : 0.25, top = sig >= 65 ? 1 : 0.25;
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<path opacity="' + mid + '" d="M5 12.55a11 11 0 0 1 14.08 0"/>' +
      '<path opacity="' + top + '" d="M1.42 9a16 16 0 0 1 21.16 0"/>' +
      '<path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>' +
      '<circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>';
  }
  function setRadioSwitch(on) { var t = $('.qh-wifi-radio'); if (t) t.checked = !!on; }
  function openWifi() { openOverlay('wifi'); scanWifi(); }
  function scanWifi() {
    var list = $('.qh-wifi-list'); if (!list) return;
    list.innerHTML = '<div class="qh-wifi-msg">Looking for networks…</div>';
    helper('/wifi-list', function (res) {
      if (!res || !res.ok) { list.innerHTML = '<div class="qh-wifi-msg">Couldn’t read Wi-Fi. Tap Refresh.</div>'; return; }
      var nets = [], radio = true;
      try { var d = JSON.parse(res.body || '{}'); nets = d.networks || []; if (d.radio === false) radio = false; } catch (e) {}
      _lastNets = nets; _lastRadio = radio;
      setRadioSwitch(radio);
      renderWifi(nets, radio);
    }, { method: 'GET' });
  }
  function renderWifi(nets, radio) {
    var list = $('.qh-wifi-list'); if (!list) return;
    if (radio === false) { list.innerHTML = '<div class="qh-wifi-msg">Wi-Fi is off. Use the switch above to turn it on.</div>'; return; }
    if (!nets.length) { list.innerHTML = '<div class="qh-wifi-msg">No networks found. Tap Refresh.</div>'; return; }
    var html = '';
    nets.filter(function (n) { return n.active; }).forEach(function (n) {
      html += '<div class="qh-wifi-row connected"><span class="qh-wifi-name">' + wifiIcon(n.signal) + '<span>' + esc(n.ssid) + '<em>Connected</em></span></span><span class="qh-wifi-side"><span class="qh-wifi-tick">' + I.check + '</span><button class="qh-wifi-off" data-ssid="' + esc(n.ssid) + '">Disconnect</button></span></div>';
    });
    var rest = nets.filter(function (n) { return !n.active; });
    if (rest.length) html += '<div class="qh-wifi-label">Other networks</div>';
    rest.forEach(function (n) {
      html += '<button class="qh-wifi-row" data-ssid="' + esc(n.ssid) + '" data-secure="' + (n.secure ? '1' : '') + '"><span class="qh-wifi-name">' + wifiIcon(n.signal) + '<span>' + esc(n.ssid) + '</span></span>' + (n.secure ? '<span class="qh-wifi-lock">' + I.lock + '</span>' : '') + '</button>';
    });
    list.innerHTML = html;
    [].forEach.call(list.querySelectorAll('.qh-wifi-row[data-ssid]:not(.connected)'), function (row) { row.addEventListener('click', function (e) { if (e.isTrusted === false) return; pickWifi(row); }); });
    var off = list.querySelector('.qh-wifi-off');
    if (off) off.addEventListener('click', function (e) {
      if (e.isTrusted === false) return;
      var ssid = off.getAttribute('data-ssid');
      askConfirm('Disconnect from ' + ssid + '?', 'Disconnect', function () {
        if (list) list.innerHTML = '<div class="qh-wifi-msg">Disconnecting…</div>';
        helper('/wifi-disconnect', function () { setTimeout(scanWifi, 800); });
      });
    });
  }
  function setWifiRadio(on) {
    var list = $('.qh-wifi-list');
    if (list) list.innerHTML = '<div class="qh-wifi-msg">' + (on ? 'Turning Wi-Fi on…' : 'Turning Wi-Fi off…') + '</div>';
    helper('/wifi-toggle', function (res) {
      if (res && res.ok) { setRadioSwitch(on); setTimeout(scanWifi, on ? 1200 : 200); }
      else { setRadioSwitch(!on); if (list) list.innerHTML = '<div class="qh-wifi-msg err">Couldn’t switch Wi-Fi. Try again.</div>'; setTimeout(scanWifi, 2600); }
    }, { method: 'POST', body: { on: on } });
  }
  function pickWifi(row) {
    // Like a phone: tap a network and just try — a remembered network reconnects
    // with its saved password. Only ask for one if the network says it needs it.
    var ssid = row.getAttribute('data-ssid');
    doConnect(ssid, '');
  }
  function askWifiPassword(ssid) {
    // Re-draw the list, then open a password box under that network.
    renderWifi(_lastNets, _lastRadio);
    var list = $('.qh-wifi-list'); if (!list) return;
    var row = list.querySelector('.qh-wifi-row[data-ssid="' + (window.CSS && CSS.escape ? CSS.escape(ssid) : ssid) + '"]');
    if (!row) { scanWifi(); return; }
    var box = document.createElement('div');
    box.className = 'qh-wifi-edit';
    box.innerHTML = '<input type="password" class="qh-wifi-pw" placeholder="Password for ' + esc(ssid) + '" autocomplete="off"><button class="qh-btn-save qh-wifi-go">Connect</button>';
    row.insertAdjacentElement('afterend', box);
    var pw = box.querySelector('.qh-wifi-pw'); pw.focus();
    box.querySelector('.qh-wifi-go').addEventListener('click', function () { if (pw.value) doConnect(ssid, pw.value); });
    pw.addEventListener('keydown', function (e) { if (e.key === 'Enter' && pw.value) doConnect(ssid, pw.value); });
  }
  function doConnect(ssid, pw) {
    if (_wifiConnecting) return; _wifiConnecting = ssid;
    var list = $('.qh-wifi-list');
    if (list) list.innerHTML = '<div class="qh-wifi-msg">Connecting to ' + esc(ssid) + '…</div>';
    helper('/wifi-connect', function (res) {
      _wifiConnecting = '';
      if (res && res.ok) { syncWifi(); scanWifi(); return; }
      var needsPw = res && (res.reason === 'http-401' || res.body === 'needs-password');
      if (needsPw && !pw) { askWifiPassword(ssid); return; }
      var msg = needsPw ? 'That password didn’t work. Try again.' : ((res && res.body) ? res.body : 'Couldn’t connect. Try again.');
      if (list) list.innerHTML = '<div class="qh-wifi-msg err">' + esc(msg) + '</div>';
      setTimeout(function () { if (needsPw) askWifiPassword(ssid); else scanWifi(); }, needsPw ? 1600 : 2600);
    }, { method: 'POST', body: { ssid: ssid, password: pw } });
  }

  // ── Wire ──
  function wire() {
    $('.qh-bar [data-act="wifi"]').addEventListener('click', function () { openWifi(); });
    var wr = $('.qh-wifi-rescan'); if (wr) wr.addEventListener('click', scanWifi);
    var rad = $('.qh-wifi-radio');
    if (rad) rad.addEventListener('change', function (e) {
      if (e.isTrusted === false) { rad.checked = !rad.checked; return; }
      if (rad.checked) { setWifiRadio(true); return; }
      // Turning Wi-Fi OFF cuts the laptop off from its writing apps — ask first.
      rad.checked = true;
      askConfirm('Turn off Wi-Fi? Your writing apps need it.', 'Turn off', function () { setWifiRadio(false); });
    });
    $('.qh-bar [data-act="settings"]').addEventListener('click', function () { openOverlay('settings'); });
    $('.qh-bar [data-act="version"]').addEventListener('click', function () { openOverlay('update'); });
    $('.qh-dock-btn').addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });

    [].forEach.call($$('[data-close]'), function (b) { b.addEventListener('click', function () { closeOverlay(b.getAttribute('data-close')); }); });
    [].forEach.call($$('.qh-overlay'), function (ov) { ov.addEventListener('click', function (e) { if (e.target === ov) closeOverlay(ov.getAttribute('data-ov')); }); });
    var cy = $('.qh-confirm-yes'); if (cy) cy.addEventListener('click', function () { var fn = _confirmYes; _confirmYes = null; closeOverlay('confirm'); if (fn) fn(); });
    var cc = $('.qh-confirm-cancel'); if (cc) cc.addEventListener('click', function () { _confirmYes = null; closeOverlay('confirm'); });

    var br = $('.qh-brightness'); if (br) br.addEventListener('input', function () { state.brightness = parseInt(br.value, 10) || 100; save({ 'qh-brightness': state.brightness }); applyLook(); });
    var hue = $('.qh-hue'); if (hue) hue.addEventListener('input', function () { state.hue = parseHue(hue.value); save({ 'qh-hue': state.hue }); applyLook(); syncControls(); });
    var sl = $('.qh-sleep'); if (sl) { fillSelect(sl, SLEEP_LABELS.map(function (lab, i) { return [String(i), lab]; })); sl.addEventListener('change', function () { var i = parseInt(sl.value, 10) || 0; state.screenIdle = SLEEP_SECS[i]; save({ 'qh-screen-idle': state.screenIdle }); }); }
    var rg = $('.qh-region'); if (rg) { fillSelect(rg, REGIONS); rg.addEventListener('change', function () { state.tz = rg.value; save({ 'qh-tz': rg.value }); tick(); }); }

    [].forEach.call($$('.click[data-act]'), function (rowEl) {
      var act = rowEl.getAttribute('data-act');
      rowEl.addEventListener('click', function (e) {
        // Only a REAL tap counts — a page script faking a click (isTrusted:false)
        // can't reach the power/terminal actions. Second half of the back-door lock.
        if (e.isTrusted === false) return;
        if (act === 'wifi') openWifi();
        else if (act === 'terminal') askConfirm('Open the support terminal?', 'Open', function () { helper('/terminal'); });
        else if (act === 'sleep') helper('/sleep');
        else if (act === 'restart') askConfirm('Restart the laptop?', 'Restart', function () { helper('/reboot'); });
        else if (act === 'poweroff') askConfirm('Turn the laptop off?', 'Turn off', function () { helper('/poweroff'); });
      });
    });

    $('.qh-add-open').addEventListener('click', function () { openAddapp(null); });
    $('.qh-add-save').addEventListener('click', saveAdd);
    $('.qh-add-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') saveAdd(); });
    $('.qh-add-url').addEventListener('keydown', function (e) { if (e.key === 'Enter') saveAdd(); });
    $('.qh-update-now').addEventListener('click', function (e) { if (e.isTrusted === false) return; applyUpdate(); });
    $('.qh-update-check').addEventListener('click', checkNow);

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
        if (changes['qh-hue']) { state.hue = parseHue(changes['qh-hue'].newValue); applyLook(); syncControls(); }
        if (changes['qh-tz']) { state.tz = changes['qh-tz'].newValue || ''; tick(); }
        if (changes['qh-home-url']) { state.homeUrl = changes['qh-home-url'].newValue || ''; }
        if (changes['qh-bar-pos']) { state.barPos = changes['qh-bar-pos'].newValue || null; applyBarPos(); }
      });
    } catch (e) {}
  }

  // ── Movable bar — drag from the grip; clamp on-screen; save + restore (one store) ──
  function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function fillSelect(el, pairs) { pairs.forEach(function (p) { var o = document.createElement('option'); o.value = p[0]; o.textContent = p[1]; el.appendChild(o); }); }
  function placeBar(x, y) {
    var bar = $('.qh-bar'); if (!bar) return;
    var w = bar.offsetWidth || 0, h = bar.offsetHeight || 0;
    bar.style.left = clampN(x, 4, Math.max(4, window.innerWidth - w - 4)) + 'px';
    bar.style.top = clampN(y, 4, Math.max(4, window.innerHeight - h - 4)) + 'px';
    bar.style.right = 'auto'; bar.style.bottom = 'auto';
  }
  function applyBarPos() {
    var p = state.barPos;
    if (p && typeof p.x === 'number' && typeof p.y === 'number') placeBar(p.x, p.y);
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
      placeBar(origX + (e.clientX - startX), origY + (e.clientY - startY));
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
      confirmBlocked();
      watchStorage();
    });
  }

  try { start(); } catch (e) { if (host && host.parentNode) host.parentNode.removeChild(host); }
})();
