# Quill Haven 2.0 — the switch-over plan (plain English)

This is how 2.0 goes onto the laptop, how we check it, and how we undo it. Nothing
here has been done yet. The old app keeps running as the safety net the whole time.

## What the switch-over actually is
The laptop starts up by (1) loading the writing **screen from the internet** (GitHub)
and (2) loading the **floating bar from a folder** on the machine. So the switch is
small and reversible:
1. Point the laptop at the **2.0 screen** instead of the old one.
2. Drop in the **2.0 bar** (the extension folder).
3. Turn on the **helper lock** (Security) at the same moment.

No full reinstall. No wiping. The old screen stays available to switch back to.

## The order on the day
1. **Put 2.0 online first.** Push the 2.0 repo and turn on its GitHub Pages, so the
   new screen has a real web address. (Until this, the update check just says
   "you're up to date" — which is what the preview shows now.)
2. **Deliver the new bar + new screen address** to the laptop (the helper does this,
   the same way it delivers updates today).
3. **Reboot.** The laptop comes up on the 2.0 screen with the floating bar.

## Security — the helper lock (done as part of this switch, not before)
Right now anything on the laptop could call the helper's buttons (power, restart,
update). The lock fixes that with a **secret password** the helper and the screen
share:
- At switch-over, a random secret is generated and given to **both** the helper and
  the screen.
- The helper then **ignores any request that doesn't carry the secret** — so only
  Quill Haven can press its buttons.
- This is done at switch-over (not now) **on purpose**: the old running app shares the
  same helper, so changing the lock early could break your current machine.

## How we test it on the laptop (the real test)
- **The bar floats** — open Google Docs; the bar sits top-right, the apps button
  bottom-right, Home works.
- **The lock works** — try to reach a non-writing site; it bounces back home.
- **The update emoji** shows, and tapping it offers Update only when there's a new one.
- **Power buttons** (off / restart / Wi-Fi) work from the bar.

## How we undo it (rollback)
If anything's wrong: **point the laptop back at the old screen** and remove the new
bar — one step, and you're back on the old working app. The helper also keeps a backup
of the last good version. You are never stuck.

## Still to wire at switch-over
- The launcher's home address → the 2.0 Pages URL.
- Deliver the `extension/` folder to the laptop's extension dir.
- A 2.0 **release tool** (new emoji every release, keeps version.json + the screen's
  version in sync) — port of the old `release.sh`, built when we set up the push.
- An **end-of-setup self-check** so a half-finished install can't leave a broken laptop.
