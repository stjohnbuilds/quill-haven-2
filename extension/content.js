/* ===========================================================================
   Quill Haven — THE SHELL. The one and only interface.

   This runs on EVERY page (the home backdrop AND inside Google Docs/Dabble) and
   draws, inside one shadow root so no page can touch it:
     • the top-right bar  (Wi-Fi, battery, power, settings, version emoji, clock)
     • the bottom-right apps button  (opens your apps + Home + Add a website)
     • the one settings popup  (Look / Connection / Power)
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
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var REGIONS = [['', 'Auto (device)'], ['Europe/London', 'London'], ['America/New_York', 'New York'], ['America/Los_Angeles', 'Los Angeles'], ['Australia/Sydney', 'Sydney']];
  var SWATCHES = [['#f7cfe6', '#eeb1cf'], ['#d9c2f5', '#b083e0'], ['#dfeede', '#bcd9bc'], ['#c4d4f7', '#a0bcee'], ['#f7ddc6', '#eebfa0'], ['#c2e8e0', '#8fd6c9']];

  // Version identity. MUST agree with version.json (same number AND same emoji).
  var LOCAL = { version: '2.1.0', emoji: '🌳' };
  var REMOTE_VERSION_URL = 'https://raw.githubusercontent.com/stjohnbuilds/quill-haven-2/main/version.json';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  var I = {
    wifi: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>',
    power: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>',
    gear: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    battery: '<svg width="22" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="2" width="22" height="10" rx="2.5"/><rect class="qh-batt-fill" x="3.5" y="4.5" width="15" height="5" rx="1" fill="currentColor" stroke="none" opacity="0.65"/><rect x="23" y="5" width="3" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.4"/></svg><svg class="qh-batt-bolt" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="display:none;margin-left:-15px;"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
    apps: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
    home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/></svg>',
    add: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><line x1="12" y1="6" x2="12" y2="18"/><line x1="6" y1="12" x2="18" y2="12"/></svg>'
  };

  var BUILTINS = (window.QH_BUILTINS || []).map(function (a) { return { id: a.id, name: a.name, url: a.url, c1: a.c1, c2: a.c2, icon: a.icon, builtin: true }; });

  // ── State (the ONE store: chrome.storage) ──
  var state = { theme: 'purple', brightness: 100, night: false, tz: '', user: [], homeUrl: '' };
  var pendingUpdate = null;
  var pickedColor = SWATCHES[3];
  var isHome = document.documentElement.hasAttribute('data-qh-home');

  function loadState(cb) {
    try {
      chrome.storage.local.get(['qh-theme', 'qh-brightness', 'qh-night', 'qh-tz', 'qh-user-apps', 'qh-home-url'], function (v) {
        if (!chrome.runtime.lastError) {
          v = v || {};
          if (THEMES.indexOf(v['qh-theme']) >= 0) state.theme = v['qh-theme'];
          if (v['qh-brightness']) state.brightness = parseInt(v['qh-brightness'], 10) || 100;
          state.night = !!v['qh-night'];
          state.tz = v['qh-tz'] || '';
          if (Array.isArray(v['qh-user-apps'])) state.user = v['qh-user-apps'];
          state.homeUrl = v['qh-home-url'] || '';
        }
        cb();
      });
    } catch (e) { cb(); }
  }
  function save(o) { try { chrome.storage.local.set(o); } catch (e) {} }
  function helper(path) { try { chrome.runtime.sendMessage({ type: 'helper', path: path }, function () { void chrome.runtime.lastError; }); } catch (e) {} }

  function allApps() { return BUILTINS.concat(state.user); }
  // Publish the one app list's URLs so the lockdown (background.js) allows exactly these sites.
  function publishApps() { try { save({ 'qh-app-urls': allApps().map(function (a) { return a.url; }) }); } catch (e) {} }
  function gradOf(a) { return 'linear-gradient(145deg,' + (a.c1 || '#cdbce6') + ',' + (a.c2 || '#b083e0') + ')'; }
  function normalizeUrl(raw) { var s = (raw || '').trim(); if (!s) return ''; if (!/^https?:\/\//i.test(s)) s = 'https://' + s; try { new URL(s); return s; } catch (e) { return ''; } }

  // ── Build the shell inside one shadow root ──
  var host = document.createElement('div');
  host.id = 'qh-shell-host';
  var lock = { position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', margin: '0', width: '100%', height: '100%', border: '0', 'pointer-events': 'none', 'z-index': '2147483600' };
  for (var k in lock) host.style.setProperty(k, lock[k], 'important');
  var root = host.attachShadow({ mode: 'open' });
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('shell.css');

  var ui = document.createElement('div');
  ui.innerHTML =
    '<div class="qh-screen-filter"></div>' +
    '<div class="qh-bar">' +
      '<button class="qh-icon" data-act="wifi" title="Wi-Fi">' + I.wifi + '</button>' +
      '<button class="qh-icon" data-act="battery" title="Battery">' + I.battery + '</button>' +
      '<button class="qh-icon" data-act="power" title="Power">' + I.power + '</button>' +
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
        '<div class="qh-row col"><div class="qh-label">Brightness</div><input type="range" min="35" max="100" class="qh-brightness"></div>' +
        '<div class="qh-row"><div class="qh-label">Night Light</div><label class="qh-switch"><input type="checkbox" class="qh-night"><span class="qh-slider"></span></label></div>' +
      '</div>' +
      '<div class="qh-section">Connection</div><div class="qh-group">' +
        '<button class="qh-row click" data-act="wifi"><div class="qh-label">Wi-Fi</div><div class="qh-sub qh-wifi-sub">Connected</div></button>' +
        '<div class="qh-row"><div class="qh-label">Region</div><select class="qh-region"></select></div>' +
      '</div>' +
      '<div class="qh-section">Power</div><div class="qh-group">' +
        '<button class="qh-row click" data-act="sleep"><div class="qh-label">Sleep</div></button>' +
        '<button class="qh-row click" data-act="restart"><div class="qh-label">Restart</div></button>' +
        '<button class="qh-row click danger" data-act="poweroff"><div class="qh-label">Power off</div></button>' +
      '</div>' +
      '<div class="qh-foot">Quill Haven ' + esc(LOCAL.version) + ' ' + LOCAL.emoji + '</div>' +
    '</div></div>' +
    // add-a-website popup
    '<div class="qh-overlay" data-ov="add"><div class="qh-card">' +
      '<div class="qh-head"><div class="qh-title">Add a website</div><button class="qh-close" data-close="add">&#x2715;</button></div>' +
      '<div class="qh-add-body">' +
        '<input class="qh-input qh-add-name" placeholder="Name (e.g. Notion)" maxlength="24" autocomplete="off">' +
        '<input class="qh-input qh-add-url" placeholder="Website (e.g. notion.so)" autocomplete="off">' +
        '<div class="qh-mini">Colour</div><div class="qh-swatches"></div>' +
        '<div class="qh-add-actions"><button class="qh-btn-cancel" data-close="add">Cancel</button><button class="qh-btn-save qh-add-save">Add</button></div>' +
        '<div class="qh-mini qh-manage-label" style="display:none;">Your sites</div><div class="qh-manage-list"></div>' +
      '</div>' +
    '</div></div>' +
    // version / update popup
    '<div class="qh-overlay" data-ov="update"><div class="qh-card">' +
      '<div class="qh-head"><div class="qh-title">Quill Haven</div><button class="qh-close" data-close="update">&#x2715;</button></div>' +
      '<div class="qh-update-body">' +
        '<div class="qh-update-emoji">' + LOCAL.emoji + '</div>' +
        '<div class="qh-update-version">Version ' + esc(LOCAL.version) + '</div>' +
        '<div class="qh-update-status">You’re up to date.</div>' +
        '<div class="qh-update-notes"></div>' +
        '<button class="qh-btn-save qh-update-now" style="display:none;">Update now</button>' +
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
    var f = $('.qh-screen-filter');
    var op = (100 - state.brightness) / 100 * 0.6;
    if (state.night) op = Math.max(op, 0.18);
    if (f) { f.classList.toggle('night', state.night); f.style.opacity = String(op); }
  }

  // ── Apps (dock panel: Home + apps + Add) — ONE renderer ──
  function goHome() { if (state.homeUrl) window.location.href = state.homeUrl; else helper('/come-home'); }
  function renderApps() {
    var panel = $('.qh-dock-panel'); if (!panel) return;
    var html = '<button class="qh-app" data-home="1"><span class="qh-app-icon qh-home-icon">' + I.home + '</span><span class="qh-app-name">Home</span></button><div class="qh-dock-sep"></div>';
    allApps().forEach(function (a) {
      var inner = (a.builtin && a.icon) ? a.icon : '<span class="qh-app-letter">' + esc((a.name[0] || '?').toUpperCase()) + '</span>';
      html += '<button class="qh-app' + (a.builtin ? '' : ' removable') + '" data-url="' + esc(a.url) + '"><span class="qh-app-icon" style="background:' + gradOf(a) + '">' + inner + '</span><span class="qh-app-name">' + esc(a.name) + '</span>' + (a.builtin ? '' : '<button class="qh-app-x" data-remove="' + esc(a.id) + '">&#x2715;</button>') + '</button>';
    });
    html += '<div class="qh-dock-sep"></div><button class="qh-app" data-add="1"><span class="qh-app-icon qh-add-icon">' + I.add + '</span><span class="qh-app-name">Add a website</span></button>';
    panel.innerHTML = html;
    panel.querySelector('[data-home]').addEventListener('click', function () { closePanel(); goHome(); });
    panel.querySelector('[data-add]').addEventListener('click', function () { closePanel(); openOverlay('add'); });
    [].forEach.call(panel.querySelectorAll('[data-url]'), function (b) {
      b.addEventListener('click', function (e) { if (e.target.closest('[data-remove]')) { e.stopPropagation(); removeApp(e.target.closest('[data-remove]').getAttribute('data-remove')); return; } window.location.href = b.getAttribute('data-url'); });
    });
  }
  function removeApp(id) { state.user = state.user.filter(function (a) { return a.id !== id; }); save({ 'qh-user-apps': state.user }); publishApps(); renderApps(); renderManage(); }
  function openPanel() { renderApps(); $('.qh-dock-panel').classList.add('open'); }
  function closePanel() { var p = $('.qh-dock-panel'); if (p) p.classList.remove('open'); }
  function togglePanel() { var p = $('.qh-dock-panel'); if (p.classList.contains('open')) closePanel(); else openPanel(); }

  // ── Add-a-website ──
  function buildSwatches() {
    var wrap = $('.qh-swatches'); if (!wrap) return; wrap.innerHTML = '';
    SWATCHES.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'qh-swatch' + (i === 3 ? ' active' : '');
      b.innerHTML = '<span style="background:linear-gradient(145deg,' + c[0] + ',' + c[1] + ')"></span>';
      b.addEventListener('click', function () { pickedColor = c; [].forEach.call($$('.qh-swatch'), function (s) { s.classList.remove('active'); }); b.classList.add('active'); });
      wrap.appendChild(b);
    });
  }
  function renderManage() {
    var list = $('.qh-manage-list'), label = $('.qh-manage-label'); if (!list) return;
    label.style.display = state.user.length ? '' : 'none';
    list.innerHTML = state.user.map(function (a) { return '<div class="qh-manage-row"><span class="qh-manage-dot" style="background:' + gradOf(a) + '"></span><span class="qh-manage-name">' + esc(a.name) + '</span><button class="qh-manage-x" data-mx="' + esc(a.id) + '">Remove</button></div>'; }).join('');
    [].forEach.call(list.querySelectorAll('[data-mx]'), function (x) { x.addEventListener('click', function () { removeApp(x.getAttribute('data-mx')); }); });
  }
  function saveAdd() {
    var name = $('.qh-add-name').value.trim(); var url = normalizeUrl($('.qh-add-url').value);
    if (!name) { $('.qh-add-name').focus(); return; }
    if (!url) { $('.qh-add-url').focus(); return; }
    state.user = state.user.concat([{ id: 'u' + Date.now().toString(36), name: name, url: url, c1: pickedColor[0], c2: pickedColor[1] }]);
    save({ 'qh-user-apps': state.user }); publishApps(); renderApps(); closeOverlay('add');
  }

  // ── Settings popup ──
  function buildThemeDots() {
    var wrap = $('.qh-theme-dots'); if (!wrap) return; wrap.innerHTML = '';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'qh-dot ' + t + (t === state.theme ? ' active' : ''); b.title = t; b.innerHTML = '<span></span>';
      b.addEventListener('click', function () { state.theme = t; save({ 'qh-theme': t }); [].forEach.call($$('.qh-dot'), function (d) { d.classList.remove('active'); }); b.classList.add('active'); applyLook(); });
      wrap.appendChild(b);
    });
  }
  function syncControls() {
    var br = $('.qh-brightness'); if (br) br.value = state.brightness;
    var nl = $('.qh-night'); if (nl) nl.checked = state.night;
    var rg = $('.qh-region'); if (rg) rg.value = state.tz;
  }

  // ── Version + updates ──
  function markUpdate(on) { var b = $('.qh-version'); if (b) b.classList.toggle('has-update', on); }
  function checkUpdate() {
    fetch(REMOTE_VERSION_URL, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.version && String(j.version) !== LOCAL.version) { pendingUpdate = j; markUpdate(true); } else { pendingUpdate = null; markUpdate(false); }
    }).catch(function () {});
  }
  function fillUpdate() {
    var st = $('.qh-update-status'), nt = $('.qh-update-notes'), now = $('.qh-update-now'), em = $('.qh-update-emoji');
    if (pendingUpdate) {
      if (em) em.textContent = pendingUpdate.emoji || LOCAL.emoji;
      if (st) st.textContent = 'A new version is ready' + (pendingUpdate.emoji ? ' ' + pendingUpdate.emoji : '') + '.';
      if (nt) nt.textContent = pendingUpdate.notes || '';
      if (now) now.style.display = '';
    } else {
      if (em) em.textContent = LOCAL.emoji;
      if (st) st.textContent = 'You’re up to date.';
      if (nt) nt.textContent = '';
      if (now) now.style.display = 'none';
    }
  }
  function applyUpdate() { if (window.confirm('Update Quill Haven now? The screen will restart to apply it.')) helper('/apply-update'); }

  // ── Overlays (open/close any popup) ──
  function openOverlay(name) {
    if (name === 'settings') { buildThemeDots(); syncControls(); }
    if (name === 'add') { $('.qh-add-name').value = ''; $('.qh-add-url').value = ''; pickedColor = SWATCHES[3]; buildSwatches(); renderManage(); }
    if (name === 'update') fillUpdate();
    var ov = $('.qh-overlay[data-ov="' + name + '"]'); if (ov) ov.classList.add('open');
    if (name === 'add') setTimeout(function () { var n = $('.qh-add-name'); if (n) n.focus(); }, 30);
  }
  function closeOverlay(name) { var ov = $('.qh-overlay[data-ov="' + name + '"]'); if (ov) ov.classList.remove('open'); }
  function closeAll() { [].forEach.call($$('.qh-overlay'), function (o) { o.classList.remove('open'); }); closePanel(); }

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
        var fill = $('.qh-batt-fill'), bolt = $('.qh-batt-bolt'), icon = $('[data-act="battery"]');
        if (fill) fill.setAttribute('width', String(Math.max(0.5, Math.min(15, 15 * (b.level || 0)))));
        if (bolt) bolt.style.display = b.charging ? '' : 'none';
        if (icon) { var pct = Math.round((b.level || 0) * 100); var secs = b.charging ? b.chargingTime : b.dischargingTime, extra = ''; if (secs && secs !== Infinity) { var hh = Math.floor(secs / 3600), mm = Math.round((secs % 3600) / 60); extra = ' · ' + (hh ? hh + 'h ' : '') + pad(mm) + 'm ' + (b.charging ? 'to full' : 'left'); } icon.title = pct + '%' + (b.charging ? ' (charging)' : '') + extra; }
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
    $('.qh-bar [data-act="power"]').addEventListener('click', function () { openOverlay('settings'); });
    $('.qh-bar [data-act="settings"]').addEventListener('click', function () { openOverlay('settings'); });
    $('.qh-bar [data-act="version"]').addEventListener('click', function () { openOverlay('update'); });
    $('.qh-dock-btn').addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });

    [].forEach.call($$('[data-close]'), function (b) { b.addEventListener('click', function () { closeOverlay(b.getAttribute('data-close')); }); });
    [].forEach.call($$('.qh-overlay'), function (ov) { ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('open'); }); });

    var br = $('.qh-brightness'); if (br) br.addEventListener('input', function () { state.brightness = parseInt(br.value, 10) || 100; save({ 'qh-brightness': state.brightness }); applyLook(); });
    var nl = $('.qh-night'); if (nl) nl.addEventListener('change', function () { state.night = nl.checked; save({ 'qh-night': nl.checked ? '1' : '' }); applyLook(); });
    var rg = $('.qh-region'); if (rg) { REGIONS.forEach(function (r) { var o = document.createElement('option'); o.value = r[0]; o.textContent = r[1]; rg.appendChild(o); }); rg.addEventListener('change', function () { state.tz = rg.value; save({ 'qh-tz': rg.value }); tick(); }); }

    [].forEach.call($$('.qh-row.click[data-act]'), function (rowEl) {
      var act = rowEl.getAttribute('data-act');
      rowEl.addEventListener('click', function () {
        if (act === 'wifi') helper('/wifi-settings');
        else if (act === 'sleep') helper('/sleep');
        else if (act === 'restart') { if (window.confirm('Restart the laptop?')) helper('/reboot'); }
        else if (act === 'poweroff') { if (window.confirm('Power off the laptop?')) helper('/poweroff'); }
      });
    });

    $('.qh-add-save').addEventListener('click', saveAdd);
    $('.qh-add-url').addEventListener('keydown', function (e) { if (e.key === 'Enter') saveAdd(); });
    $('.qh-update-now').addEventListener('click', applyUpdate);

    document.addEventListener('click', function (e) { if (e.composedPath && e.composedPath().indexOf($('.qh-dock-panel')) < 0 && e.composedPath().indexOf($('.qh-dock-btn')) < 0) closePanel(); }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); }, true);
  }

  // ── Live updates: if any page changes the shared store, reflect it everywhere ──
  function watchStorage() {
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (changes['qh-user-apps']) { state.user = Array.isArray(changes['qh-user-apps'].newValue) ? changes['qh-user-apps'].newValue : []; renderApps(); }
        if (changes['qh-theme'] && THEMES.indexOf(changes['qh-theme'].newValue) >= 0) { state.theme = changes['qh-theme'].newValue; applyLook(); buildThemeDots(); }
        if (changes['qh-brightness']) { state.brightness = parseInt(changes['qh-brightness'].newValue, 10) || 100; applyLook(); }
        if (changes['qh-night']) { state.night = !!changes['qh-night'].newValue; applyLook(); }
        if (changes['qh-tz']) { state.tz = changes['qh-tz'].newValue || ''; tick(); }
        if (changes['qh-home-url']) { state.homeUrl = changes['qh-home-url'].newValue || ''; }
      });
    } catch (e) {}
  }

  function start() {
    document.documentElement.appendChild(host);
    wire();
    loadState(function () {
      // On the home page, remember the way back for the Home button on other pages.
      if (isHome) { try { chrome.storage.local.set({ 'qh-home-url': location.href }); state.homeUrl = location.href; } catch (e) {} }
      applyLook();
      renderApps();
      publishApps();
      tick(); setInterval(tick, 10000);
      initBattery(); syncWifi();
      window.addEventListener('online', syncWifi); window.addEventListener('offline', syncWifi);
      checkUpdate(); setInterval(checkUpdate, 30 * 60 * 1000);
      watchStorage();
    });
  }

  try { start(); } catch (e) { if (host && host.parentNode) host.parentNode.removeChild(host); }
})();
