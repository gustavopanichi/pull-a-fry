# 🍟 Fries of Fortune

An interactive McDonald's-flavored microsite built with **React, Three.js and React Three Fiber**.
Pull a fry from the carton to reveal a fortune — a portfolio project. Six fries hold regular
fortunes; the **golden fry** unlocks the special case study.

## Run it

```bash
npm install
npm run dev        # http://localhost:5183
npm run build      # production build in dist/
```

## How it works

- **Assets** — the provided OBJ (41 fry meshes + carton) is loaded at runtime from
  `public/models/`. Each fry's geometry is re-pivoted at its own center and renamed
  `fry_00` … `fry_40`; the fry poking highest out of the carton becomes `golden_fry`.
  The golden arches are drawn to a canvas texture and projected onto the front and back
  of the carton with drei `<Decal>`, placed to mimic the real packaging.
- **Type & color** — Speedee and Speedee Condensed (self-hosted woff2 in `public/fonts/`),
  on a radial gradient background from `#fcd852` to `#ffbc0d`.
- **Intro** — the carton rises into frame from the bottom of the screen, then the fries
  fall in under plain gravity (no bounce) with a per-fry seeded stagger and a slight
  airborne lean, settling into a gentle idle sway.
- **Interaction** — 7 fries are clickable (hand cursor on hover). Dragging one upward
  stretches against a rubber-band resistance; pull far enough (or quick-tap) and it
  strains for a beat, then pops free. The camera eases after it and a centered modal
  reveals a placeholder fortune. "Toss the fry" throws it offscreen with a ballistic
  arc and spin — it stays gone.
- **golden_fry** — gold screen flash, sparkles, point light, a double victory spin and
  the gold-trimmed special case study modal.
- **HUD** — "X of 7 fortunes discovered" counter, plus a "Fresh batch" refill that
  replays the intro.
- **States & fallbacks** — branded loading screen with real asset progress,
  reduced-motion support, touch-friendly drag handling, capped DPR on mobile, and a
  flat DOM card grid when WebGL is unavailable.

## Structure

```
src/
  App.jsx         canvas shell, WebGL detection, intro timing
  Scene.jsx       lights, environment, camera rig / composition
  FriesModel.jsx  OBJ processing, clickable-fry picking, carton + logo decals
  Fry.jsx         per-fry state machine (fall / sway / pull / selected / tossed)
  ui.jsx          loader, header, HUD, fortune modal, fallback site
  store.js        zustand store (phase, selection, discovered fortunes)
  projects.js     placeholder fortunes + the golden special
  logoTexture.js  canvas-drawn golden arches texture
```

Swap the placeholder content in `src/projects.js` for real case studies.
Note: the Speedee typeface and McDonald's marks are proprietary — clear the rights
before publishing this anywhere public.
