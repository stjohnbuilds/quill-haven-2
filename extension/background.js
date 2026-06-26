/* ===========================================================================
   Quill Haven 2.0 — background worker.

   Two jobs:
   1. Relay the shell's power / Wi-Fi buttons to the local helper (127.0.0.1:8137).
      A web page can't reliably reach the helper itself, so the shell messages
      here and this worker (which has host permission) makes the call.
   2. LOCKDOWN — keep the laptop on your approved writing apps. Any top-level
      navigation to a site that isn't approved is bounced back to the home
      screen, so you can never get stuck on a random or broken page.

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
  var ALLOWED = ['/sleep', '/reboot', '/poweroff', '/wifi-settings', '/come-home', '/apply-update'];
  if (ALLOWED.indexOf(msg.path) < 0) { sendResponse({ ok: false, reason: 'not-allowed' }); return; }
  fetch(HELPER + msg.path, { method: 'POST' })
    .then(function () { sendResponse({ ok: true }); })
    .catch(function () { sendResponse({ ok: false, reason: 'no-helper' }); });
  return true; // async reply
});

/* ── 2. Lockdown ── */

// Cross-domain assets Google's editors pull from (these are NOT under the app's
// own domain, so the per-app rule below wouldn't cover them). Kept tight.
var INFRA_SUFFIXES = ['gstatic.com', 'googleusercontent.com', 'googleapis.com', 'ggpht.com'];

// Live state, restored from chrome.storage (which the home screen fills in and
// which survives reboots). Lockdown stays OFF until we've seen the home screen
// at least once — that way a fresh boot can't bounce itself before it's set up.
var state = { homeHost: '', homeUrl: '', appDomains: [] };

// The registrable-ish base domain of a host, e.g. docs.google.com -> google.com.
// Allowing the base domain lets all of an app's own subdomains through (so Docs'
// many google.com subdomains work). Naive last-two-labels: fine for the .com/.so
// sites in use; would need care for .co.uk-style names (noted for device tuning).
function baseDomain(host) {
  var parts = String(host || '').toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  return parts.slice(-2).join('.');
}
function hostOf(url) { try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; } }

function rebuildState(v) {
  v = v || {};
  state.homeUrl = v['qh-home-url'] || '';
  state.homeHost = hostOf(state.homeUrl);
  // The shell publishes the one app list's URLs as 'qh-app-urls'; we derive the
  // allowed base domains here (so the allow-list has ONE source — the app list).
  var urls = Array.isArray(v['qh-app-urls']) ? v['qh-app-urls'] : [];
  var doms = {};
  urls.forEach(function (u) { var d = baseDomain(hostOf(u)); if (d) doms[d] = true; });
  state.appDomains = Object.keys(doms);
}

function loadState() {
  try { chrome.storage.local.get(['qh-home-url', 'qh-app-urls'], function (v) { if (!chrome.runtime.lastError) rebuildState(v); }); }
  catch (e) {}
}
loadState();
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && (changes['qh-app-urls'] || changes['qh-home-url'])) loadState();
});

// STAGED ROLLOUT SWITCH. The floating bar is safe; the lockdown is the part not
// yet tested on real hardware, and a bug here could strand the user. So we ship it
// OFF for the first on-device test (bar + screen only), then flip this to true and
// re-deliver once the bar is confirmed working. While false, nothing is ever blocked.
var LOCKDOWN_ENABLED = false;

// Lockdown only switches on once the home screen is known (see note above) AND the
// staged switch above is on.
function enforcing() { return LOCKDOWN_ENABLED && !!state.homeHost; }

function isAllowed(host) {
  if (!host) return true;
  if (host === state.homeHost) return true;
  function ends(suffix) { return host === suffix || host.slice(-(suffix.length + 1)) === '.' + suffix; }
  for (var i = 0; i < state.appDomains.length; i++) { if (ends(state.appDomains[i])) return true; }
  for (var j = 0; j < INFRA_SUFFIXES.length; j++) { if (ends(INFRA_SUFFIXES[j])) return true; }
  return false;
}

function sendHome(tabId) {
  if (state.homeUrl) { try { chrome.tabs.update(tabId, { url: state.homeUrl }); return; } catch (e) {} }
  try { fetch(HELPER + '/come-home', { method: 'POST' }).catch(function () {}); } catch (e) {}
}

chrome.webNavigation.onBeforeNavigate.addListener(function (d) {
  if (d.frameId !== 0) return;                 // only whole-page navigations, not embeds
  if (!/^https?:\/\//i.test(d.url || '')) return; // leave chrome://, about:, data: etc. alone
  if (!enforcing()) return;                    // not set up yet → don't block (fail open)
  if (isAllowed(hostOf(d.url))) return;
  sendHome(d.tabId);                           // blocked → back home
});
