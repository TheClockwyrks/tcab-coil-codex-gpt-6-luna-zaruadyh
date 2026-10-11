# Coil

Coil is a neon grid serpent. Steer through the open board, collect pellets, and keep a combo alive by reaching the next one before the timer empties.

## Play

Use **Arrow keys** or **WASD** to steer. The snake moves every tick and turns on the next tick; turns must be perpendicular. **Enter** or **Space** selects menus. **P** or **Escape** pauses. **M** toggles sound. Touch controls are available on touch screens.

## Run locally

```sh
npm ci
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

The static site is written to `dist/`. The committed `assets/` directory contains the generated pixel art and audio used by the game.
