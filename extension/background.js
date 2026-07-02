/* ===========================================================================
   Quill Haven 2.0 — background worker.

   Three jobs:
   1. Relay the shell's power / Wi-Fi / support buttons to the local helper (127.0.0.1:8137).
      A web page can't reliably reach the helper itself, so the shell messages
      here and this worker (which has host permission) makes the call.
   2. LOCKDOWN — keep the laptop on your approved writing apps. Any top-level
      navigation to a site that isn't approved is bounced back to the home
      screen, so you can never get stuck on a random or broken page.
   3. SCREEN-OFF — power the display down after a few quiet minutes to save
      battery, using Chrome's own idle detector (real keyboard/mouse, so it
      never blanks while you're typing into an app's inner editing frame).

   The approved list is the SAME shared app list (kept in chrome.storage by the
   home screen) plus the Google sign-in / Drive infrastructure that Google Docs
   genuinely needs to work. The exact infra list will need a little tuning on the
   real laptop — it can't be tested from the dev machine.
   =========================================================================== */
'use strict';

var HELPER = 'http://127.0.0.1:8137';

/* ── 1. Relay helper actions ── */
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== 'helper' || typeof msg.path !== 'string') return;
  var ALLOWED = ['/sleep', '/reboot', '/poweroff', '/wifi-settings', '/go-home', '/terminal', '/apply-update', '/screen-off', '/wifi-list', '/wifi-connect', '/wifi-toggle', '/wifi-disconnect'];
  if (ALLOWED.indexOf(msg.path) < 0) { sendResponse({ ok: false, reason: 'not-allowed' }); return; }
  var opts = { method: msg.method === 'GET' ? 'GET' : 'POST', cache: 'no-store', credentials: 'omit' };
  if (msg.body != null) { opts.body = JSON.stringify(msg.body); opts.headers = { 'Content-Type': 'application/json' }; }
  fetch(HELPER + msg.path, opts)
    .then(function (r) { return r.text().then(function (t) { sendResponse({ ok: r.ok, reason: r.ok ? 'ok' : 'http-' + r.status, body: t }); }); })
    .catch(function (e) { sendResponse({ ok: false, reason: String((e && e.message) || e) }); });
  return true; // async reply
});

/* ── 2. Lockdown ── */

// Cross-domain assets Google's editors pull from (these are NOT under the app's
// own domain, so the per-app rule below wouldn't cover them). Kept tight.
var INFRA_SUFFIXES = ['gstatic.com', 'googleusercontent.com', 'googleapis.com', 'ggpht.com'];

// SHARED-GIANT domains where allowing the whole base domain would fling open a
// distraction portal. google.com hosts Docs (allowed) AND Search / Gmail / News /
// the Web Store (all distractions). So for these, we allow ONLY the exact hosts the
// writing app truly needs — never the rest of the domain. Everything else uses the
// normal "allow the whole registrable domain" rule (so a plain site's www + sign-in
// keep working). PLATFORM_ALLOW maps a giant's base domain to its allowed hosts.
var PLATFORM_ALLOW = {
  'google.com': ['docs.google.com', 'accounts.google.com', 'drive.google.com']
};

// Public app-hosting platforms: one base domain, millions of UNRELATED sites
// (Typing & Tomes lives on vercel.app; the old home screen on github.io). Allowing
// the whole base here would open every stranger's app on the same platform, so for
// these we allow ONLY the exact app host that was added — nothing else on it.
var HOST_ONLY_PLATFORMS = ['vercel.app', 'github.io', 'netlify.app', 'pages.dev',
  'web.app', 'firebaseapp.com', 'herokuapp.com', 'glitch.me', 'replit.app',
  'onrender.com', 'surge.sh', 'workers.dev', 'appspot.com', 'render.com'];

// The deliberate DENY-LIST: common distraction sites ALWAYS bounced home — even if
// added as an app, and even before the rest of the lockdown is set up.
var BLOCKED = [
  // social + forums
  'facebook.com', 'instagram.com', 'tiktok.com', 'twitter.com', 'x.com', 'threads.net',
  'bsky.app', 'snapchat.com', 'pinterest.com', 'tumblr.com', 'linkedin.com',
  'mastodon.social', 'mastodon.online', 'reddit.com', 'quora.com', '9gag.com', 'imgur.com',
  // video + streaming
  'youtube.com', 'youtu.be', 'netflix.com', 'twitch.tv', 'hulu.com', 'disneyplus.com',
  'primevideo.com', 'vimeo.com', 'dailymotion.com',
  // chat
  'discord.com', 'whatsapp.com', 'telegram.org', 'messenger.com',
  // shopping
  'amazon.com', 'amazon.co.uk', 'amazon.com.au', 'ebay.com', 'ebay.co.uk', 'ebay.com.au',
  'etsy.com', 'aliexpress.com', 'temu.com', 'shein.com',
  // games
  'steampowered.com', 'steamcommunity.com', 'roblox.com', 'epicgames.com', 'coolmathgames.com', 'miniclip.com',
  // music
  'spotify.com', 'soundcloud.com', 'music.apple.com', 'pandora.com', 'deezer.com', 'tidal.com',
  // news (endless-scroll; not exhaustive)
  'bbc.com', 'bbc.co.uk', 'cnn.com', 'theguardian.com', 'nytimes.com', 'news.com.au',
  'abc.net.au', 'dailymail.co.uk', 'foxnews.com', 'reuters.com',
  // adult
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'xhamster.com', 'onlyfans.com', 'redtube.com'
];
function isBlocked(host) {
  if (!host) return false;
  for (var i = 0; i < BLOCKED.length; i++) {
    var s = BLOCKED[i];
    if (host === s || host.slice(-(s.length + 1)) === '.' + s) return true;
  }
  return false;
}

// Live state, restored from chrome.storage (which the home screen fills in and
// which survives reboots). Lockdown stays OFF until we've seen the home screen
// at least once — that way a fresh boot can't bounce itself before it's set up.
var state = { homeHost: '', homeUrl: '', appHosts: [] };

// Two-part country suffixes, so bbc.co.uk -> bbc.co.uk (NOT the whole of co.uk).
var TWO_PART_TLDS = ['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au',
  'co.nz', 'co.za', 'com.br', 'co.jp', 'co.in', 'co.kr'];
// The registrable base domain of a host, e.g. docs.google.com -> google.com,
// bbc.co.uk -> bbc.co.uk. Used to spot shared-giant domains and, for normal sites,
// to allow the whole brand (so www + sign-in on the same brand keep working).
function baseDomain(host) {
  var parts = String(host || '').toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  var lastTwo = parts.slice(-2).join('.');
  if (TWO_PART_TLDS.indexOf(lastTwo) >= 0 && parts.length >= 3) return parts.slice(-3).join('.');
  return lastTwo;
}
function hostOf(url) { try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; } }
function endsWithDomain(host, suffix) { return host === suffix || host.slice(-(suffix.length + 1)) === '.' + suffix; }

function rebuildState(v) {
  v = v || {};
  state.homeUrl = v['qh-home-url'] || '';
  state.homeHost = hostOf(state.homeUrl);
  // The shell publishes the one app list's URLs as 'qh-app-urls'; we keep the exact
  // app hosts here (ONE source — the app list). isAllowed() turns each host into the
  // right rule: shared giants (google.com) get a tight per-host allow, everything
  // else gets its whole brand domain.
  var urls = Array.isArray(v['qh-app-urls']) ? v['qh-app-urls'] : [];
  var hosts = {};
  urls.forEach(function (u) { var h = hostOf(u); if (h) hosts[h] = true; });
  state.appHosts = Object.keys(hosts);
}

function loadState() {
  try { chrome.storage.local.get(['qh-home-url', 'qh-app-urls'], function (v) { if (!chrome.runtime.lastError) rebuildState(v); }); }
  catch (e) {}
}
loadState();
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && (changes['qh-app-urls'] || changes['qh-home-url'])) loadState();
});

// Master lockdown switch (ON). Set false to turn all website-blocking off.
var LOCKDOWN_ENABLED = true;

// Only enforce once the home URL is known, so a fresh boot can't bounce itself.
function enforcing() { return LOCKDOWN_ENABLED && !!state.homeHost; }

function isAllowed(host) {
  if (!host) return true;
  if (host === state.homeHost) return true;
  // Asset CDNs the editors pull from (fonts, images, api) — never browsable pages.
  for (var j = 0; j < INFRA_SUFFIXES.length; j++) { if (endsWithDomain(host, INFRA_SUFFIXES[j])) return true; }
  for (var i = 0; i < state.appHosts.length; i++) {
    var appHost = state.appHosts[i];
    var base = baseDomain(appHost);
    var allowList = PLATFORM_ALLOW[base];
    if (allowList) {
      // Shared giant (e.g. google.com): only the exact app host + its named siblings
      // (Docs sign-in + Drive). This is what keeps Search / Gmail / News OUT.
      if (host === appHost) return true;
      for (var k = 0; k < allowList.length; k++) { if (host === allowList[k]) return true; }
    } else if (HOST_ONLY_PLATFORMS.indexOf(base) >= 0) {
      // Public app platform (vercel.app, github.io, ...): only THIS exact app.
      if (host === appHost) return true;
    } else {
      // Normal site: allow the whole brand domain, so www + same-brand sign-in work.
      if (endsWithDomain(host, base)) return true;
    }
  }
  return false;
}

function sendHome(tabId, host) {
  try { chrome.storage.local.set({ 'qh-blocked-at': host || '1' }); } catch (e) {}  // shell shows a "blocked" notice on the home page
  if (state.homeUrl) { try { chrome.tabs.update(tabId, { url: state.homeUrl }); return; } catch (e) {} }
  try { fetch(HELPER + '/go-home', { method: 'POST' }).catch(function () {}); } catch (e) {}
}

// The allow/deny decision, shared by the normal path and the cold-start path below.
function guardHost(tabId, host) {
  if (isBlocked(host)) { sendHome(tabId, host); return; }   // hard deny — always on
  if (!enforcing()) return;                                  // not set up yet → allow (fail open)
  if (isAllowed(host)) return;
  sendHome(tabId, host);                                     // not on the list → back home
}

chrome.webNavigation.onBeforeNavigate.addListener(function (d) {
  if (d.frameId !== 0) return;                 // only whole-page navigations, not embeds
  if (!/^https?:\/\//i.test(d.url || '')) return; // leave chrome://, about:, data: etc. alone
  var host = hostOf(d.url);
  // COLD-START RACE FIX: the background worker loses its memory whenever it sleeps,
  // and reloading the allow-list from storage is asynchronous — so the FIRST click
  // after a wake could otherwise slip through with an empty list (fail open). If the
  // list isn't loaded yet, load it first, THEN judge, so even that first click is
  // guarded. (A genuinely-unset device still fails open, which is intended pre-setup.)
  if (!state.homeHost) {
    chrome.storage.local.get(['qh-home-url', 'qh-app-urls'], function (v) {
      if (!chrome.runtime.lastError) rebuildState(v);
      guardHost(d.tabId, host);
    });
    return;
  }
  guardHost(d.tabId, host);
});

// RECOVERY: if a page navigation FAILS (a typo'd app URL, a link to a dead page),
// the tab lands on Chrome's bare error screen with no bar and no way back. Send it
// home instead. Guards: ignore our own redirects (aborted) and don't bounce the home
// page onto itself (so a Wi-Fi drop, where home also can't load, can't loop).
chrome.webNavigation.onErrorOccurred.addListener(function (d) {
  if (d.frameId !== 0) return;
  if (!/^https?:\/\//i.test(d.url || '')) return;
  if (/ABORTED/i.test(d.error || '')) return;  // this is us redirecting, or a cancelled load
  var host = hostOf(d.url);
  if (!state.homeHost || host === state.homeHost) return;
  sendHome(d.tabId, host);
});

/* ── 3. Screen-off when idle (battery) ── */
// Chrome's idle detector watches the REAL keyboard/mouse, so it never trips
// while she's typing into an app's inner editing frame. After ~5 quiet minutes
// the helper powers the display down (xset dpms); any key/touch wakes it.
if (chrome.idle && chrome.idle.setDetectionInterval) {
  var idleSecs = 300;                                  // matches the slider default (5 min)
  function applyIdle() { chrome.idle.setDetectionInterval(idleSecs > 0 ? Math.max(15, idleSecs) : 86400); }
  chrome.storage.local.get(['qh-screen-idle'], function (v) {
    if (v && typeof v['qh-screen-idle'] === 'number') idleSecs = v['qh-screen-idle'];
    applyIdle();
  });
  chrome.storage.onChanged.addListener(function (ch, area) {
    if (area === 'local' && ch['qh-screen-idle']) { idleSecs = ch['qh-screen-idle'].newValue || 0; applyIdle(); }
  });
  chrome.idle.onStateChanged.addListener(function (s) {
    if (s === 'idle' && idleSecs > 0) fetch(HELPER + '/screen-off', { method: 'POST' }).catch(function () {});
  });
}
