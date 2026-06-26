# Quill Haven 2.1 — punch list (from Marie's on-device test, 2026-06-25)

The one-shell rebuild is LIVE on the laptop and working (tree 🌳, one bar, buttons
work, settings opens). These are the polish items found while using it.

## To fix
- [ ] **Power = instant off, no "are you sure".** Hitting the laptop's power button
      shuts off instantly. Want a confirm first (or a graceful "saving…" then off).
      → Likely a Linux power-key setting (logind HandlePowerKey) routed to a confirm.
- [ ] **Ugly boot flash.** On power-on, before the wallpaper loads, there's a plain
      white screen with the app name + "a quiet place to write" in a basic font,
      jammed top-left. Should fade in styled, or show nothing, until it's ready.
      → Inline the critical backdrop CSS / fix the unstyled flash + font load.
- [ ] **Settings is missing a lot.** The cog opens but the panel is thin. Add the
      rest: Google account / Drive sign-in, Open terminal (support), the in-overlay
      Wi-Fi picker (not the ugly native window), storage space. (Spec §3.)
- [ ] **Battery life looks poor** (showed 45% → 1h46m ≈ ~4h total). Two parts:
      (a) the just-booted estimate is often wrong — re-check after it settles;
      (b) real power saving — turn on screen-off-when-idle (the helper has it),
      and the install-time battery tuning (TLP etc.). Needs the real laptop.

## Minor
- [ ] **Night light defaulted ON** (carried over your old setting) and the warm tint
      reads as a dull pink over the light wallpaper. Default it OFF on a fresh start,
      and consider a less-pink warm tone.
- [ ] **Battery icon** in the bar looks tappable but does nothing (it's a readout;
      the % shows on hover only — no good on a touchscreen). Make the % visible.

## Already on the bigger list (not new)
- Turn the website-locking ON (built, shipped OFF for this test).
- Lock the helper so only Quill Haven can press its buttons (Security step).
- The proper installer / all-in-one boot drive.
