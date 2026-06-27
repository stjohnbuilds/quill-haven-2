# Quill Haven — full code audit (section by section · red = not needed)

Paste this into a fresh AI chat. It is a **read-only audit** — the AI must NOT change any
code, only produce a colour-coded report of what every part is for and what isn't needed.

---

You are auditing **Quill Haven**, a writing-only Linux kiosk OS. Go through the app **one
section at a time** and mark every piece of code: 🟢 needed, 🔴 not needed (dead), 🟡 could
be simpler. Do **not** edit anything — produce a report only.

## Where the code is
The whole app is **7 files** in the repo `quill-haven-2`:
1. `home-screen/index.html` — the boot backdrop (wallpaper + logo, no controls)
2. `home-screen/css/home.css` — backdrop styles
3. `extension/apps.js` — the built-in app list (`window.QH_BUILTINS`)
4. `extension/content.js` — **THE SHELL** (bar + dock + settings + update popup — ~90% of the app)
5. `extension/shell.css` — all shell styles
6. `extension/background.js` — the service worker (relay to the local helper, website lockdown, idle screen-off)
7. `extension/manifest.json` — the Chrome-extension manifest

(The helper `helper.py` + launcher live in a second repo, `QuillHaven`. Only mention them if
a reference in content/background points at a helper endpoint that no longer exists.)

## What to do for EACH section
1. **Name the section.**
2. **Trace everything connected to it** — the markup string(s), the CSS classes, the JS
   function(s), the handler(s) in `wire()`, the `chrome.storage` keys it reads/writes, and any
   helper endpoint it calls.
3. **One plain sentence: what it's for.**
4. **Judge every piece, with a colour:**
   - 🟢 **GREEN** = needed, used, wired correctly.
   - 🔴 **RED** = NOT needed (dead). Examples: an unused function / variable / CSS class / icon;
     a selector used in JS with no matching markup (or markup/class with no JS); a handler
     pointing at a removed element; a storage key written but never read (or read but never
     written); leftovers from a removed feature; duplicated logic that should be one function.
     For each RED item give **`file:line`**, what it is, why it's not needed, and the exact cut.
   - 🟡 **YELLOW** = works, but could be merged/simplified (optional).

## Sections to cover — be exhaustive, skip none
**content.js**
- Constants + the icon set `I` (check EVERY icon in `I` is used somewhere; unused icons are RED)
- State object + `loadState` / `save` + every `chrome.storage` key (each key must be read AND written)
- Shadow host + shell build + the `shell.css` link/reveal
- Top bar: Wi-Fi icon, battery, settings gear, version emoji, clock, drag grip
- Dock: apps button + panel (Home + app launchers)
- Settings → **Device** (theme dots + name, tint, Wi-Fi / Terminal buttons, brightness, screen-sleep + region dropdowns)
- Settings → **Apps** (manage list + the Add/Edit pop-up: form, colour picker, icon picker)
- Settings → **Power** (Sleep / Restart / Off)
- Update/version popup (check, update-now, the working pulse, the "Updated" toast, the error
  reasons, wait-for-publish, doApply, the `_updating` lock)
- Look/theme: `applyLook`, `buildThemeDots`, `setThemeName`, the screen-dimmer overlay, tint/hue
- Apps logic: `renderApps`, `renderManage`, `allApps`, `visibleApps`, `isHidden`, `toggleHidden`,
  `removeApp`, `publishApps`, `gradOf`
- Clock: `tick`, time, region/timezone
- Battery: `initBattery`; Wi-Fi: `syncWifi`
- Movable bar: `applyBarPos`, `setupBarDrag`
- `wire()` — EVERY handler: does each selector it binds actually exist in the markup?
- `watchStorage`; `start`

**background.js**
- The helper relay + its `ALLOWED` list (each allowed path: is it ever sent from content.js?)
- The website lockdown — **NOTE: it is intentionally OFF right now** via `LOCKDOWN_ENABLED = false`.
  It is dormant on purpose, **NOT dead** — do not flag it RED.
- The idle screen-off (`chrome.idle`)

**apps.js · manifest.json · home-screen/** — a quick pass for anything unused.

## Rules (so the audit can be trusted)
- **Every finding cites `file:line`.** No vibe-checks — "looks fine" / "a bit messy" without a
  named symbol is not allowed.
- **Verify both directions.** A class is GREEN only if it's in BOTH the markup and a JS/CSS
  reference. A function is GREEN only if it's called. A storage key is GREEN only if read AND written.
- **Confirm with tools, don't guess:** `grep` each symbol across the 7 files; run
  `node --check extension/content.js extension/background.js`.
- **Don't flag the dormant lockdown as dead** — it's off on purpose for now.
- **End with:** a single RED cut-list (every removal, with `file:line` + lines saved) and a
  one-line total of how many lines could be safely removed.

Produce the section-by-section report first, then the final RED cut-list.
