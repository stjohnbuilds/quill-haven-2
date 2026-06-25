# Quill Haven 2.0 — the floating shell (browser add-on)

This is the part that makes your Quill Haven bar appear **on top of** Google Docs,
Dabble, and any website you add — because those sites can't be wrapped in a box of
our own. It's a small Chromium extension.

## What it shows on every page (except the home screen)
- **Top-right status bar** — Wi-Fi, battery, power, settings cog, date + time. It
  tucks into the corner so it never covers a page's own top menu (e.g. Google Docs').
- **Bottom-right apps button** — tap it for your app list + a **Home** button, so
  you're never stuck on a page.
- **The same one settings popup** as the home screen (theme, brightness, Night
  Light, Wi-Fi, region, power).

## How it stays in sync (no second copy of anything)
The shell keeps **no app list of its own**. The home screen mirrors the one shared
list (built-ins from `home-screen/data/apps.js` + your added sites) and the look
settings into `chrome.storage`; the shell reads them from there. Change a theme or
add a site on the home screen and the floating shell matches.

## Lockdown (built)
Any whole-page navigation to a site that isn't approved is bounced back to the
home screen, so you can't get stuck on a random or broken page. Approved =
your apps' own domains (from the shared list) + the Google sign-in / Drive
infrastructure Docs needs. Lockdown stays **off until the home screen has loaded
once**, so a fresh boot can never bounce itself before it's set up.

> Note: to keep Google Docs/Drive reliable, the whole `google.com` family is
> allowed — so Gmail/Search would technically open too. In the kiosk there's no
> address bar to type them, so this is low-risk; we can tighten it on the device.

## Files
- `manifest.json` — declares the add-on (runs on every page, talks to the helper).
- `content.js` — draws the shell inside a shadow root so page styles can't touch it.
- `shell.css` — the shell's look (same palette as the home screen).
- `background.js` — relays the power / Wi-Fi buttons AND runs the lockdown.

## Loading it on the laptop
Chromium loads it unpacked at boot: `--load-extension=<path-to-this-folder>`
(wired up in the installer/launch step later). **It can't be fully tested in the
web preview** — it only does its job inside the real Chromium on the laptop.
