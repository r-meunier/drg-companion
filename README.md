# Mission Control

An unofficial companion web app for the *Deep Rock Galactic* board game. It tracks the round and phase, dwarf and enemy HP, and walks you through the enemy phase one enemy at a time: tap the die face you rolled and it shows what that enemy does.

Fan-made and not affiliated with Mood Publishing or Ghost Ship Games. **The app ships no official game content.** The two "Example" enemies and the phase list are placeholders. Enter real enemy stats and dice effects from your own rulebook in the **Library** tab, or import a library JSON someone shared.

## Features

- Round and phase tracker with configurable phases. Mark which phases are the ones where "enemies act".
- Enemy-phase walkthrough: goes through every living enemy in order, skips any that die mid-phase, and shows the effect for the face you rolled.
- HP +/− for dwarves and enemies; duplicate enemies are numbered (`#1`, `#2`, …).
- Undo for any in-game action (last 50).
- Event log.
- Everything is saved in `localStorage`, so a refresh or closed tab doesn't lose the game.
- Export and import the library as JSON so players can share setups.

## Run it

```sh
npm install
npm run dev
```

## Deploy

It's a static site, so `npm run build` and host `dist/` anywhere (Netlify drop, Vercel, GitHub Pages, Cloudflare Pages).

## Ideas for after the first feedback

- Built-in "starter library" files people can share or link
- Per-enemy status effects (stunned, burning, …)
- Mission objectives / resource counters
- Installable PWA for offline use at the table
