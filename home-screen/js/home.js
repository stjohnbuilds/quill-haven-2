/* Quill Haven 2.0 — home screen + shell + apps.
   The app list is the ONE shared source (built-ins + the user's added sites). The
   dock renders from it and re-renders live on any change. Later, the lockdown reads
   the same list to decide what's allowed. */
(function () {
  'use strict';

  var HELPER = 'http://127.0.0.1:8137';

  // ── Version + updates ──
  // LOCAL is THIS running copy's identity. The emoji in the top bar shows it, so a
  // changed emoji is proof a new version actually landed. We check the version.json
  // on GitHub; if it's newer, we flag it — but nothing installs until Marie taps
  // "Update now", which POSTs /apply-update to the helper (the approval gate).
  var LOCAL = { version: '2.0.0', emoji: '🌱' };
  var REMOTE_VERSION_URL = 'https://raw.githubusercontent.com/stjohnbuilds/quill-haven-2/main/version.json';
  var pendingUpdate = null;

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); }

  // ── App icons ── (built-ins come from the single source: data/apps.js) ──
  var ADD_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="12" y1="6" x2="12" y2="18"/><line x1="6" y1="12" x2="18" y2="12"/></svg>';

  var BUILTINS = (window.QH_BUILTINS || []).map(function (a) {
    return { id: a.id, name: a.name, url: a.url, c1: a.c1, c2: a.c2, icon: a.icon, builtin: true };
  });

  var SWATCHES = [
    ['#f7cfe6','#eeb1cf'], ['#d9c2f5','#b083e0'], ['#dfeede','#bcd9bc'],
    ['#c4d4f7','#a0bcee'], ['#f7ddc6','#eebfa0'], ['#c2e8e0','#8fd6c9']
  ];
  var pickedColor = SWATCHES[3];

  // ── The one shared app list ──
  function userApps() { try { return JSON.parse(localStorage.getItem('qh-apps') || '[]') || []; } catch (e) { return []; } }
  function saveUserApps(list) { try { localStorage.setItem('qh-apps', JSON.stringify(list)); } catch (e) {} }
  function allApps() { return BUILTINS.concat(userApps()); }

  // ── Bridge to the floating-shell extension ──
  // The shell that floats over Google Docs etc. has no app list of its own — it
  // reads the SAME one from here. A web page can't touch the extension's storage
  // directly, so we publish the combined list to localStorage and ping the
  // extension; the extension's content script (which DOES run on this page) reads
  // localStorage and copies it across. The look settings (qh-theme/brightness/
  // night/tz) already live in localStorage, so the list is all we add here.
  // In a plain browser (no extension) the ping just goes unheard — a harmless
  // no-op, so the preview is unaffected.
  function syncBridge() {
    try { localStorage.setItem('qh-apps-full', JSON.stringify(allApps())); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('qh-synced')); } catch (e) {}
  }

  function normalizeUrl(raw) {
    var s = (raw || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try { new URL(s); return s; } catch (e) { return ''; }
  }

  // ── Render the dock from the shared list (live) ──
  function gradOf(a) { return 'linear-gradient(145deg,' + a.c1 + ',' + a.c2 + ')'; }
  function renderDock() {
    var dock = $('dock'); if (!dock) return;
    dock.innerHTML = '';
    allApps().forEach(function (a) {
      var btn = document.createElement('button');
      btn.className = 'app' + (a.builtin ? '' : ' removable');
      btn.title = a.name;
      var inner = a.icon ? a.icon : '<span class="app-letter">' + esc((a.name[0] || '?').toUpperCase()) + '</span>';
      btn.innerHTML =
        '<span class="app-icon" style="background:' + gradOf(a) + '">' + inner + '</span>' +
        '<span class="app-name">' + esc(a.name) + '</span>' +
        (a.builtin ? '' : '<button class="app-remove" title="Remove" data-remove="' + esc(a.id) + '">&#x2715;</button>');
      btn.addEventListener('click', function (e) {
        if (e.target.closest('.app-remove')) { e.stopPropagation(); removeApp(a.id); return; }
        window.location.href = a.url;
      });
      dock.appendChild(btn);
    });
    // The Add button always sits at the end.
    var add = document.createElement('button');
    add.className = 'app'; add.title = 'Add a website';
    add.innerHTML = '<span class="app-icon i-add">' + ADD_SVG + '</span><span class="app-name">Add</span>';
    add.addEventListener('click', openAdd);
    dock.appendChild(add);
    syncBridge();
  }

  function removeApp(id) {
    saveUserApps(userApps().filter(function (a) { return a.id !== id; }));
    renderDock(); renderManage();
  }

  // ── Add-a-website flow ──
  function buildSwatches() {
    var wrap = $('colorSwatches'); if (!wrap || wrap.childNodes.length) return;
    SWATCHES.forEach(function (c, i) {
      var b = document.createElement('button');
      b.className = 'swatch' + (i === 3 ? ' active' : '');
      b.innerHTML = '<span style="background:linear-gradient(145deg,' + c[0] + ',' + c[1] + ')"></span>';
      b.addEventListener('click', function () {
        pickedColor = c;
        [].forEach.call(wrap.querySelectorAll('.swatch'), function (s) { s.classList.remove('active'); });
        b.classList.add('active');
      });
      wrap.appendChild(b);
    });
  }
  function renderManage() {
    var list = $('manageList'), label = $('manageLabel'); if (!list) return;
    var apps = userApps();
    label.style.display = apps.length ? '' : 'none';
    list.innerHTML = apps.map(function (a) {
      return '<div class="manage-row"><span class="manage-dot" style="background:' + gradOf(a) + '"></span><span class="manage-name">' + esc(a.name) + '</span><button class="manage-x" data-x="' + esc(a.id) + '">Remove</button></div>';
    }).join('');
    [].forEach.call(list.querySelectorAll('.manage-x'), function (x) {
      x.addEventListener('click', function () { removeApp(x.dataset.x); });
    });
  }
  function openAdd() {
    $('addName').value = ''; $('addUrl').value = '';
    pickedColor = SWATCHES[3];
    buildSwatches();
    [].forEach.call($('colorSwatches').querySelectorAll('.swatch'), function (s, i) { s.classList.toggle('active', i === 3); });
    renderManage();
    $('addOverlay').classList.add('open');
    setTimeout(function () { $('addName').focus(); }, 30);
  }
  function closeAdd() { $('addOverlay').classList.remove('open'); }
  function saveAdd() {
    var name = $('addName').value.trim();
    var url = normalizeUrl($('addUrl').value);
    if (!name) { $('addName').focus(); return; }
    if (!url) { $('addUrl').focus(); return; }
    var apps = userApps();
    apps.push({ id: 'u' + Date.now().toString(36), name: name, url: url, c1: pickedColor[0], c2: pickedColor[1] });
    saveUserApps(apps);
    renderDock();
    closeAdd();
  }

  // ── Clock ──
  var DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function tick() {
    var tz = localStorage.getItem('qh-tz') || undefined;
    var now = new Date(), h, m, day, mon, date;
    if (tz) {
      try {
        var p = {};
        new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', weekday: 'short', month: 'short', day: 'numeric', hour12: false })
          .formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
        var dm = {Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}, mm = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
        h = parseInt(p.hour,10) % 24; m = +p.minute; day = dm[p.weekday]; mon = mm[p.month]; date = +p.day;
      } catch (e) { tz = null; }
    }
    if (!tz) { h = now.getHours(); m = now.getMinutes(); day = now.getDay(); mon = now.getMonth(); date = now.getDate(); }
    var el = $('tbTime'); if (el) el.textContent = DAYS[day] + ', ' + MONTHS[mon] + ' ' + date + '  ' + pad(h) + ':' + pad(m);
  }

  // ── Battery ──
  function initBattery() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then(function (b) {
      function sync() {
        var fill = $('battFill'), bolt = $('battBolt'), icon = $('tbBattery');
        if (fill) fill.setAttribute('width', String(Math.max(0.5, Math.min(15, 15 * (b.level || 0)))));
        if (bolt) bolt.style.display = b.charging ? '' : 'none';
        if (icon) {
          var pct = Math.round((b.level || 0) * 100);
          var secs = b.charging ? b.chargingTime : b.dischargingTime, extra = '';
          if (secs && secs !== Infinity) { var hh = Math.floor(secs/3600), mm = Math.round((secs%3600)/60); extra = ' · ' + (hh ? hh+'h ' : '') + pad(mm) + 'm ' + (b.charging ? 'to full' : 'left'); }
          icon.title = pct + '%' + (b.charging ? ' (charging)' : '') + extra;
        }
      }
      b.addEventListener('levelchange', sync); b.addEventListener('chargingchange', sync);
      b.addEventListener('chargingtimechange', sync); b.addEventListener('dischargingtimechange', sync);
      sync();
    }).catch(function () {});
  }

  // ── Wi-Fi ──
  function syncWifi() {
    var on = navigator.onLine !== false;
    var w = $('tbWifi'); if (w) { w.style.opacity = on ? '' : '0.35'; w.title = on ? 'Wi-Fi — connected' : 'Offline'; }
    var sub = $('wifiSub'); if (sub) sub.textContent = on ? 'Connected' : 'Offline';
  }

  // ── Themes ──
  var THEMES = ['purple','wood','slate','dark'];
  function applyTheme(name) {
    if (THEMES.indexOf(name) < 0) name = 'purple';
    var root = document.documentElement;
    THEMES.forEach(function (t) { root.classList.remove('theme-' + t); });
    if (name !== 'purple') root.classList.add('theme-' + name);
    try { localStorage.setItem('qh-theme', name); } catch (e) {}
    [].forEach.call(document.querySelectorAll('.theme-dot'), function (d) { d.classList.toggle('active', d.dataset.theme === name); });
    syncBridge();
  }
  function buildThemeDots() {
    var wrap = $('themeDots'); if (!wrap) return;
    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'theme-dot td-' + t; b.dataset.theme = t; b.title = t; b.innerHTML = '<span></span>';
      b.addEventListener('click', function () { applyTheme(t); });
      wrap.appendChild(b);
    });
  }

  // ── Brightness + Night Light ──
  function setBrightness(v) { var f = $('screen-filter'); if (f) f.style.opacity = String((100 - v) / 100 * 0.6); try { localStorage.setItem('qh-brightness', v); } catch (e) {} syncBridge(); }
  function setNight(on) {
    document.body.classList.toggle('night', on);
    var f = $('screen-filter');
    if (f && on) f.style.opacity = Math.max(parseFloat(f.style.opacity || 0), 0.18);
    else setBrightness($('brightness') ? $('brightness').value : 100);
    try { localStorage.setItem('qh-night', on ? '1' : ''); } catch (e) {}
    syncBridge();
  }

  // ── Settings + helper actions ──
  function openSettings() { $('settingsOverlay').classList.add('open'); }
  function closeSettings() { $('settingsOverlay').classList.remove('open'); }
  function helperPost(path) {
    var done = false, t = setTimeout(function () { if (!done) notOnDevice(); }, 1500);
    fetch(HELPER + path, { method: 'POST', mode: 'cors' }).then(function () { done = true; clearTimeout(t); }).catch(function () { clearTimeout(t); notOnDevice(); });
  }
  function notOnDevice() { alert('Power, restart, sleep and Wi-Fi work on the installed Quill Haven laptop — not in this preview.'); }

  // ── Version + update gate ──
  function setVersionUI() {
    var e = $('verEmoji'); if (e) e.textContent = LOCAL.emoji;
    var v = $('updateVersion'); if (v) v.textContent = 'Version ' + LOCAL.version;
    var em = $('updateEmoji'); if (em) em.textContent = LOCAL.emoji;
  }
  function markUpdate(on) { var b = $('tbVersion'); if (b) b.classList.toggle('has-update', on); }
  function checkUpdate() {
    fetch(REMOTE_VERSION_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.version && String(j.version) !== LOCAL.version) { pendingUpdate = j; markUpdate(true); }
        else { pendingUpdate = null; markUpdate(false); }
      })
      .catch(function () { /* offline or not published yet — just show no flag */ });
  }
  function openUpdate() {
    setVersionUI();
    var status = $('updateStatus'), notes = $('updateNotes'), now = $('updateNow'), em = $('updateEmoji');
    if (pendingUpdate) {
      if (em) em.textContent = pendingUpdate.emoji || LOCAL.emoji;
      if (status) status.textContent = 'A new version is ready' + (pendingUpdate.emoji ? ' ' + pendingUpdate.emoji : '') + '.';
      if (notes) notes.textContent = pendingUpdate.notes || '';
      if (now) now.style.display = '';
    } else {
      if (status) status.textContent = "You're up to date.";
      if (notes) notes.textContent = '';
      if (now) now.style.display = 'none';
    }
    $('updateOverlay').classList.add('open');
  }
  function closeUpdate() { $('updateOverlay').classList.remove('open'); }
  function applyUpdate() {
    if (!confirm('Update Quill Haven now? The screen will restart to apply it.')) return;
    helperPost('/apply-update');
  }

  function init() {
    renderDock();
    setVersionUI(); checkUpdate(); setInterval(checkUpdate, 30 * 60 * 1000);
    tick(); setInterval(tick, 10000);
    initBattery(); syncWifi();
    window.addEventListener('online', syncWifi); window.addEventListener('offline', syncWifi);
    buildThemeDots(); applyTheme(localStorage.getItem('qh-theme') || 'purple');

    var br = $('brightness'); if (br) { br.value = localStorage.getItem('qh-brightness') || 100; br.addEventListener('input', function () { var n = $('nightLight'); if (n) setNight(n.checked); else setBrightness(br.value); }); }
    var nl = $('nightLight'); if (nl) { nl.checked = !!localStorage.getItem('qh-night'); nl.addEventListener('change', function () { setNight(nl.checked); }); }
    setNight(nl && nl.checked);
    var rg = $('region'); if (rg) { rg.value = localStorage.getItem('qh-tz') || ''; rg.addEventListener('change', function () { if (rg.value) localStorage.setItem('qh-tz', rg.value); else localStorage.removeItem('qh-tz'); tick(); syncBridge(); }); }

    $('tbGear').addEventListener('click', openSettings);
    $('tbPower').addEventListener('click', openSettings);
    $('tbWifi').addEventListener('click', function () { helperPost('/wifi-settings'); });
    $('settingsClose').addEventListener('click', closeSettings);
    $('settingsOverlay').addEventListener('click', function (e) { if (e.target === $('settingsOverlay')) closeSettings(); });

    $('tbVersion').addEventListener('click', openUpdate);
    $('updateClose').addEventListener('click', closeUpdate);
    $('updateNow').addEventListener('click', applyUpdate);
    $('updateOverlay').addEventListener('click', function (e) { if (e.target === $('updateOverlay')) closeUpdate(); });

    $('addClose').addEventListener('click', closeAdd);
    $('addCancel').addEventListener('click', closeAdd);
    $('addSave').addEventListener('click', saveAdd);
    $('addOverlay').addEventListener('click', function (e) { if (e.target === $('addOverlay')) closeAdd(); });
    $('addUrl').addEventListener('keydown', function (e) { if (e.key === 'Enter') saveAdd(); });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSettings(); closeAdd(); closeUpdate(); } });

    [].forEach.call(document.querySelectorAll('.settings-row.click'), function (row) {
      var act = row.dataset.act;
      row.addEventListener('click', function () {
        if (act === 'wifi') helperPost('/wifi-settings');
        else if (act === 'sleep') helperPost('/sleep');
        else if (act === 'restart') { if (confirm('Restart the laptop?')) helperPost('/reboot'); }
        else if (act === 'poweroff') { if (confirm('Power off the laptop?')) helperPost('/poweroff'); }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
