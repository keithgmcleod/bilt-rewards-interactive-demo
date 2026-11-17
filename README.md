# Bilt Rewards interactive website prototype

A website prototype combining Blender-rendered neighborhood imagery with interactive camera movement and card focus views.

**[View the live website](https://keithgmcleod.github.io/bilt-rewards-interactive-demo/)**

![Card zoom preview](docs/preview.jpg)

## Run locally

Use a Node.js version supported by the `engines` field in `package.json`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Blender is not required to run the website; the current render assets are included.

```sh
npm run build
npm run preview
```

The production website is generated in `dist/` with the GitHub Pages repository prefix. Changes pushed to `main` are built and published automatically by the Pages workflow.

## Version 2

The current version includes responsive hero placement, a subtle randomized background ink reveal on load, and a uniform textured title fade after the background finishes. Buildings remain almost fully visible throughout. Clicking a card immediately clears the introductory mask.

Focused cards use native 1440p / 60 fps camera zooms and nine lossless 4K camera views for mouse parallax. Frame-synchronized handoffs keep the last image visible until the next video frame is presented.

## Interactions

- Move the mouse across the hero for subtle parallax through 21 Blender-rendered camera views.
- Click a card for a camera zoom and slight rotation. The selected card stays brightest; surrounding lighting dims while retaining building detail.
- Click **All cards** or press **Escape** to return.
- Apartment lights complete their startup sequence over five seconds.
- The neon sign flickers subtly, and the two overhead strings retain a gently varying warm glow.
- Use **Pause movement** to pause the ambient movement.

Each card zoom uses 68 actual Blender camera renders encoded at 60 fps. The navigation, headline reveal and call-to-action layout remain part of the HTML/CSS website.

## Project files

- `src/render-sequence.js`: parallax playback and scene integration.
- `src/card-focus-hq.js`: high-resolution card zoom and return controls.
- `src/focus-parallax.js`: focused 4K camera grid.
- `src/scene-ink.js`: background ink reveal and title sequencing.
- `src/native-arrival.js`: full-frame apartment lighting playback.
- `src/neon.js` and `src/string-lights.js`: subtle light effects.
- `public/assets/scene02-*`: the current render set from the corrected Blender scene.

Large Blender authoring files, older render experiments and local dependencies are excluded from this repository. Some non-hero marketing images and links reference the Bilt website and require an internet connection.
