# Quill Haven — the app map (and the one rule)

This is the law of this repo. It exists because we once built the interface twice
and got 17 duplications. Never again. **Read this before adding anything.**

---

## THE ONE RULE

> **Every thing lives in exactly ONE place.**
> One bar. One dock. One settings. One clock. One colour list. One app list.
> If you are about to write something that already exists somewhere else — STOP.
> Move it to its one home and use it from there. Two copies is always a bug.

---

## The tree (what goes where)

```
quill-haven-2/
│
├── home-screen/        ← THE HOME PAGE: just a backdrop. Wallpaper + logo. NOTHING to click.
│   ├── index.html         the page (about 30 lines — that's all it should be)
│   ├── css/home.css        only the wallpaper + logo look
│   ├── fonts/              the fonts
│   └── img/quill.png       the logo
│
├── extension/          ← THE ONE INTERFACE. Lives here. Shows on EVERY page (home AND inside Docs).
│   ├── manifest.json      tells the browser "put the shell on every page"
│   ├── content.js         THE SHELL — the bar, the dock, settings, clock, battery, wi-fi,
│   │                       themes, brightness, version. Everything you see and touch. Built ONCE.
│   ├── shell.css          how the shell looks + ALL the colours. One place.
│   ├── apps.js            the list of apps. One place.
│   └── background.js      talks to the helper (power / wi-fi) + does the site-locking.
│
├── version.json        ← the version number + the emoji (must always agree with content.js)
└── STRUCTURE.md        ← this map
```

That's it. **Two folders.** One is a backdrop. One is the whole interface.

---

## One home for each thing (the no-duplication table)

| The thing | Its ONE home |
|---|---|
| The bar, the dock, the settings popup | `extension/content.js` (built once, shown everywhere) |
| How any of it looks — and every colour | `extension/shell.css` |
| The list of built-in apps (Docs, Dabble…) | `extension/apps.js` |
| The apps *you* add | the browser's own storage (`chrome.storage`) — **never** a second list |
| The clock, battery, wi-fi readout | `extension/content.js` (one of each) |
| Brightness + night-light dimmer | `extension/content.js` — ONE dimmer, on every page |
| Power / restart / wi-fi buttons → the helper | `extension/background.js` (one route) |
| Site-locking (block non-writing sites) | `extension/background.js` |
| The wallpaper + logo (the backdrop only) | `home-screen/` |
| The version number + emoji | `version.json` **and** `content.js` — and they must match |

**The home page has NO bar, NO dock, NO settings of its own.** If you ever find a
button living in `home-screen/`, it's in the wrong place — that's the old mistake.

---

## How big it should be

Small. Roughly **900–1000 lines total**, across the ~7 files above. The shell
(`content.js`) is the biggest at ~500 lines because it holds the whole interface —
but it holds it *once*. No single thing should appear in two files, ever.

## The check that keeps it honest

Before anything ships, run the tick-box list in `../QuillHaven/docs/GHOST_SCAN_2.0.md`
section (h). It greps the code to prove each thing exists only once (e.g. "battery
appears in one file", "the home page has no bar"). If any check finds two, a ghost
came back — fix it before shipping.
