# SRA Robotics landing page

A single-page site built with [Vite](https://vite.dev) and [Three.js](https://threejs.org). The hero and the "How it works" story render an interactive 3D bench build (ESP32-S3, mic, amp, speaker, and the Hermes brain) that reacts to the mouse and follows the scroll.

## Run it

Requires Node 20.19+ or 22.12+.

```bash
cd site
npm install
npm run dev       # http://localhost:5173 with hot reload
npm run build     # production build into site/dist
npm run preview   # serve the built site at http://localhost:4173
```

## How the 3D works

- `src/main.js` decides whether to load the scene. `src/scene.js` (Three.js) is a separate lazy chunk, so visitors who get the static page never download it.
- The 3D stage runs only when every one of these is true:
  - the viewport is at least 900px wide,
  - a fine pointer (mouse or trackpad) is present,
  - `prefers-reduced-motion` is not set,
  - Save-Data is off,
  - WebGL is available.
- Otherwise the page shows the static SVG schematic and stacked story cards. The same fallback is used if the scene fails to load or the WebGL context is lost.
- Override for testing: `?3d=1` forces the scene on and `?3d=0` forces it off.
- Performance:
  - Pixel ratio is capped at 1.75 and drops to 1 if frames run slow.
  - Rendering pauses when the tab is hidden or the page is scrolled past the story.

## Deploy

The build is fully static and uses relative asset paths, so `dist/` works at a domain root or under a subpath.

**Vercel**

1. Import the repository and set **Root Directory** to `site`.
2. The Vite preset fills in the rest: build command `npm run build`, output directory `dist`.

**GitHub Pages**

`.github/workflows/deploy-site.yml` builds `site/` and publishes `site/dist` on every push to `main` that touches `site/`. In the repository settings, set **Pages → Source** to **GitHub Actions** once. You can also run the workflow by hand from the Actions tab.

**Anything else (Netlify, Cloudflare Pages, S3, nginx)**

Run `npm run build` and upload the contents of `site/dist`.

## Notes

- The contact form is a placeholder. It validates in the browser and sends nothing. Wire it to a form service before launch.
- Fonts are self-hosted from `src/fonts` under the SIL Open Font License (licenses included).
