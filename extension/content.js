/* ===========================================================================
   Quill Haven 2.0 — the floating shell (content script).

   This runs on every page EXCEPT the home screen and draws, on top of whatever
   page you're on (Google Docs, Dabble, a site you added):
     • a small status bar in the top-right corner (Wi-Fi, battery, power,
       settings, the date + time) — tucked in the corner so it never covers a
       page's own top menu;
     • a round apps button in the bottom-right that opens your app list + Home;
     • the SAME one settings popup as the home screen.

   Everything lives inside a shadow root, so the page's styles can't touch the
   shell and the shell's styles can't touch the page.

   It reads the SAME app list and look-settings as the home screen. It doesn't
   keep its own copy: the home screen mirrors them into chrome.storage and the
   shell reads them from there (see syncBridge() in home-screen/js/home.js).
   =========================================================================== */
(function () {
  'use strict';

  if (window.__qhShellLoaded) return;
  window.__qhShellLoaded = true;

  var THEMES = ['purple', 'wood', 'slate', 'dark'];

  // ── On the home screen, don't draw the shell (it already has the real one) —
  //    instead, copy its app list + look settings into the extension's storage
  //    so the floating shell on OTHER pages reads exactly the same thing. ──
  if (document.documentElement.hasAttribute('data-qh-home')) {
    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function mirrorHome() {
      var apps = [];
      try { apps = JSON.parse(lsGet('qh-apps-full') || '[]') || []; } catch (e) { apps = []; }
      try {
        chrome.storage.local.set({
          'qh-apps-full': apps,
          'qh-theme': lsGet('qh-theme') || 'purple',
          'qh-brightness': lsGet('qh-brightness') || '100',
          'qh-night': lsGet('qh-night') || '',
          'qh-tz': lsGet('qh-tz') || '',
          'qh-home-url': location.href
        });
      } catch (e) {}
    }
    mirrorHome();
    window.addEventListener('qh-synced', mirrorHome);
    return;
  }
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // ── State, fed from the home screen via chrome.storage ──
  var state = { theme: 'purple', brightness: 100, night: false, tz: '', apps: [], homeUrl: '' };

  function loadState(cb) {
    try {
      chrome.storage.local.get(
        ['qh-theme', 'qh-brightness', 'qh-night', 'qh-tz', 'qh-apps-full', 'qh-home-url'],
        function (v) {
          if (chrome.runtime.lastError) { cb(); return; }
          v = v || {};
          if (THEMES.indexOf(v['qh-theme']) >= 0) state.theme = v['qh-theme'];
          if (v['qh-brightness']) state.brightness = parseInt(v['qh-brightness'], 10) || 100;
          state.night = !!v['qh-night'];
          state.tz = v['qh-tz'] || '';
          if (Array.isArray(v['qh-apps-full'])) state.apps = v['qh-apps-full'];
          state.homeUrl = v['qh-home-url'] || '';
          cb();
        }
      );
    } catch (e) { cb(); }
  }
  function save(obj) { try { chrome.storage.local.set(obj); } catch (e) {} }
  function helper(path) {
    try { chrome.runtime.sendMessage({ type: 'helper', path: path }, function () { void chrome.runtime.lastError; }); }
    catch (e) {}
  }

  // ── SVG icons (reused from the home screen's top bar) ──
  var I = {
    wifi: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/></svg>',
    power: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>',
    gear: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    battery: '<svg width="22" height="14" viewBox="0 0 28 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="2" width="22" height="10" rx="2.5"/><rect class="qh-batt-fill" x="3.5" y="4.5" width="15" height="5" rx="1" fill="currentColor" stroke="none" opacity="0.65"/><rect x="23" y="5" width="3" height="4" rx="1" fill="currentColor" stroke="none" opacity="0.4"/></svg><svg class="qh-batt-bolt" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="display:none;margin-left:-15px;"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
    apps: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
    home: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/></svg>'
  };

  // ── Build the shell inside a shadow root ──
  var host = document.createElement('div');
  host.id = 'qh-shell-host';
  // Lock the host in place so no page CSS can move/hide it; clicks pass through
  // the empty areas (only the bar/dock/popup catch taps — see shell.css).
  var lock = {
    position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', margin: '0',
    width: '100%', height: '100%', border: '0', 'pointer-events': 'none', 'z-index': '2147483600'
  };
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
      '<span class="qh-time"></span>' +
    '</div>' +
    '<button class="qh-dock-btn" title="Apps">' + I.apps + '</button>' +
    '<div class="qh-dock-panel"></div>' +
    '<div class="qh-settings-overlay">' +
      '<div class="qh-card">' +
        '<div class="qh-head"><div class="qh-title">Settings</div><button class="qh-close" title="Close">&#x2715;</button></div>' +
        '<div class="qh-section">Look</div>' +
        '<div class="qh-group">' +
          '<div class="qh-row col"><div class="qh-label">Theme</div><div class="qh-theme-dots"></div></div>' +
          '<div class="qh-row col"><div class="qh-label">Brightness</div><input type="range" min="35" max="100" class="qh-brightness"></div>' +
          '<div class="qh-row"><div class="qh-label">Night Light</div><label class="qh-switch"><input type="checkbox" class="qh-night"><span class="qh-slider"></span></label></div>' +
        '</div>' +
        '<div class="qh-section">Connection</div>' +
        '<div class="qh-group">' +
          '<button class="qh-row click" data-act="wifi"><div class="qh-label">Wi-Fi</div><div class="qh-sub qh-wifi-sub">Connected</div></button>' +
          '<div class="qh-row"><div class="qh-label">Region</div><select class="qh-region">' +
            '<option value="">Auto (device)</option><option value="Europe/London">London</option><option value="America/New_York">New York</option><option value="America/Los_Angeles">Los Angeles</option><option value="Australia/Sydney">Sydney</option>' +
          '</select></div>' +
        '</div>' +
        '<div class="qh-section">Power</div>' +
        '<div class="qh-group">' +
          '<button class="qh-row click" data-act="sleep"><div class="qh-label">Sleep</div></button>' +
          '<button class="qh-row click" data-act="restart"><div class="qh-label">Restart</div></button>' +
          '<button class="qh-row click danger" data-act="poweroff"><div class="qh-label">Power off</div></button>' +
        '</div>' +
        '<div class="qh-foot">Quill Haven 2.0</div>' +
      '</div>' +
    '</div>';

  root.appendChild(link);
  while (ui.firstChild) root.appendChild(ui.firstChild);

  var $ = function (sel) { return root.querySelector(sel); };
  var $$ = function (sel) { return root.querySelectorAll(sel); };

  // ── Apply look (theme + brightness + night) ──
  function applyLook() {
    THEMES.forEach(function (t) { host.classList.remove('theme-' + t); });
    if (state.theme !== 'purple') host.classList.add('theme-' + state.theme);
    var f = $('.qh-screen-filter');
    var op = (100 - state.brightness) / 100 * 0.6;
    if (state.night) op = Math.max(op, 0.18);
    if (f) { f.classList.toggle('night', state.night); f.style.opacity = String(op); }
  }

  // ── App list (apps button → pop-out panel) ──
  function gradOf(a) { return 'linear-gradient(145deg,' + (a.c1 || '#cdbce6') + ',' + (a.c2 || '#b083e0') + ')'; }
  function goHome() {
    if (state.homeUrl) window.location.href = state.homeUrl;
    else helper('/come-home');
  }
  function renderApps() {
    var panel = $('.qh-dock-panel'); if (!panel) return;
    var html = '<button class="qh-app" data-home="1"><span class="qh-app-icon qh-home-icon">' + I.home + '</span><span class="qh-app-name">Home</span></button>' +
      '<div class="qh-dock-sep"></div>';
    state.apps.forEach(function (a) {
      var inner = (a.builtin && a.icon) ? a.icon : '<span class="qh-app-letter">' + esc((a.name[0] || '?').toUpperCase()) + '</span>';
      html += '<button class="qh-app" data-url="' + esc(a.url) + '">' +
        '<span class="qh-app-icon" style="background:' + gradOf(a) + '">' + inner + '</span>' +
        '<span class="qh-app-name">' + esc(a.name) + '</span></button>';
    });
    panel.innerHTML = html;
    panel.querySelector('[data-home]').addEventListener('click', function () { closePanel(); goHome(); });
    [].forEach.call(panel.querySelectorAll('[data-url]'), function (b) {
      b.addEventListener('click', function () { window.location.href = b.getAttribute('data-url'); });
    });
  }
  function openPanel() { renderApps(); $('.qh-dock-panel').classList.add('open'); }
  function closePanel() { var p = $('.qh-dock-panel'); if (p) p.classList.remove('open'); }
  function togglePanel() { var p = $('.qh-dock-panel'); if (p.classList.contains('open')) closePanel(); else openPanel(); }

  // ── Settings popup ──
  function buildThemeDots() {
    var wrap = $('.qh-theme-dots'); if (!wrap) return;
    wrap.innerHTML = '';
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'qh-dot ' + t + (t === state.theme ? ' active' : '');
      b.title = t; b.innerHTML = '<span></span>';
      b.addEventListener('click', function () {
        state.theme = t; save({ 'qh-theme': t });
        [].forEach.call($$('.qh-dot'), function (d) { d.classList.remove('active'); });
        b.classList.add('active');
        applyLook();
      });
      wrap.appendChild(b);
    });
  }
  function openSettings() { buildThemeDots(); syncSettingsControls(); $('.qh-settings-overlay').classList.add('open'); }
  function closeSettings() { $('.qh-settings-overlay').classList.remove('open'); }
  function syncSettingsControls() {
    var br = $('.qh-brightness'); if (br) br.value = state.brightness;
    var nl = $('.qh-night'); if (nl) nl.checked = state.night;
    var rg = $('.qh-region'); if (rg) rg.value = state.tz;
  }

  // ── Clock ──
  function tick() {
    var tz = state.tz || undefined, now = new Date(), h, m, day, mon, date;
    if (tz) {
      try {
        var p = {};
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', weekday: 'short', month: 'short', day: 'numeric', hour12: false })
          .formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
        var dm = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }, mm = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        h = parseInt(p.hour, 10) % 24; m = +p.minute; day = dm[p.weekday]; mon = mm[p.month]; date = +p.day;
      } catch (e) { tz = null; }
    }
    if (!tz) { h = now.getHours(); m = now.getMinutes(); day = now.getDay(); mon = now.getMonth(); date = now.getDate(); }
    var el = $('.qh-time'); if (el) el.textContent = DAYS[day] + ', ' + MONTHS[mon] + ' ' + date + '  ' + pad(h) + ':' + pad(m);
  }

  // ── Battery (same behaviour as the home screen) ──
  function initBattery() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(function (b) {
      function sync() {
        var fill = $('.qh-batt-fill'), bolt = $('.qh-batt-bolt'), icon = root.querySelector('[data-act="battery"]');
        if (fill) fill.setAttribute('width', String(Math.max(0.5, Math.min(15, 15 * (b.level || 0)))));
        if (bolt) bolt.style.display = b.charging ? '' : 'none';
        if (icon) {
          var pct = Math.round((b.level || 0) * 100);
          var secs = b.charging ? b.chargingTime : b.dischargingTime, extra = '';
          if (secs && secs !== Infinity) { var hh = Math.floor(secs / 3600), mm = Math.round((secs % 3600) / 60); extra = ' · ' + (hh ? hh + 'h ' : '') + pad(mm) + 'm ' + (b.charging ? 'to full' : 'left'); }
          icon.title = pct + '%' + (b.charging ? ' (charging)' : '') + extra;
        }
      }
      b.addEventListener('levelchange', sync); b.addEventListener('chargingchange', sync);
      b.addEventListener('chargingtimechange', sync); b.addEventListener('dischargingtimechange', sync);
      sync();
    }).catch(function () {});
  }

  // ── Wi-Fi indicator (online/offline) ──
  function syncWifi() {
    var on = navigator.onLine !== false;
    var w = root.querySelector('[data-act="wifi"].qh-icon');
    if (w) { w.style.opacity = on ? '' : '0.35'; w.title = on ? 'Wi-Fi — connected' : 'Offline'; }
    var sub = $('.qh-wifi-sub'); if (sub) sub.textContent = on ? 'Connected' : 'Offline';
  }

  // ── Wire it all up ──
  function wire() {
    // top bar
    root.querySelector('.qh-bar [data-act="wifi"]').addEventListener('click', function () { helper('/wifi-settings'); });
    root.querySelector('.qh-bar [data-act="power"]').addEventListener('click', openSettings);
    root.querySelector('.qh-bar [data-act="settings"]').addEventListener('click', openSettings);

    // dock
    $('.qh-dock-btn').addEventListener('click', function (e) { e.stopPropagation(); togglePanel(); });

    // settings popup
    $('.qh-close').addEventListener('click', closeSettings);
    $('.qh-settings-overlay').addEventListener('click', function (e) { if (e.target === $('.qh-settings-overlay')) closeSettings(); });
    var br = $('.qh-brightness');
    if (br) br.addEventListener('input', function () { state.brightness = parseInt(br.value, 10) || 100; save({ 'qh-brightness': state.brightness }); applyLook(); });
    var nl = $('.qh-night');
    if (nl) nl.addEventListener('change', function () { state.night = nl.checked; save({ 'qh-night': nl.checked ? '1' : '' }); applyLook(); });
    var rg = $('.qh-region');
    if (rg) rg.addEventListener('change', function () { state.tz = rg.value; save(rg.value ? { 'qh-tz': rg.value } : { 'qh-tz': '' }); tick(); });
    [].forEach.call($$('.qh-row.click[data-act]'), function (rowEl) {
      var act = rowEl.getAttribute('data-act');
      rowEl.addEventListener('click', function () {
        if (act === 'wifi') helper('/wifi-settings');
        else if (act === 'sleep') helper('/sleep');
        else if (act === 'restart') { if (window.confirm('Restart the laptop?')) helper('/reboot'); }
        else if (act === 'poweroff') { if (window.confirm('Power off the laptop?')) helper('/poweroff'); }
      });
    });

    // close the apps panel / settings on an outside tap or Escape
    document.addEventListener('click', function (e) {
      if (e.composedPath && e.composedPath().indexOf($('.qh-dock-panel')) < 0 && e.composedPath().indexOf($('.qh-dock-btn')) < 0) closePanel();
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closePanel(); closeSettings(); } }, true);
  }

  // ── Live updates: if the home screen changes the apps or look, reflect it ──
  function watchStorage() {
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (changes['qh-apps-full'] && Array.isArray(changes['qh-apps-full'].newValue)) { state.apps = changes['qh-apps-full'].newValue; renderApps(); }
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
    applyLook();
    renderApps();
    tick(); setInterval(tick, 10000);
    initBattery(); syncWifi();
    window.addEventListener('online', syncWifi); window.addEventListener('offline', syncWifi);
    watchStorage();
  }

  try { loadState(start); }
  catch (e) { /* never break the host page */ if (host && host.parentNode) host.parentNode.removeChild(host); }
})();
