# Hero Globe Tutorial

Step-by-step guide to building the interactive WebGL globe used in the
*Building AI Agents for Climate Data Analysis* tutorial website.

## What you will learn

| Step | File | Topic |
|------|------|-------|
| 1 | `01_basic_sphere.html` | Three.js basics — renderer, scene, camera, animation loop |
| 2 | `02_blue_marble_texture.html` | NASA Blue Marble texture, UV mapping, colorSpace |
| 3 | `03_graticule_atmosphere.html` | Graticule lines, GLSL atmosphere rim and halo |
| 4 | `04_coastlines.html` | TopoJSON coastlines from world-atlas |
| 5 | `05_catmull_rom_paths.html` | Catmull-Rom splines and arc-length resampling |
| 6 | `06_animated_particles.html` | Custom ShaderMaterial, glowing particles, fading tails |
| 7 | `07_arrows_winds_jets.html` | Direction arrows, trade winds, jet streams |
| 8 | `08_drag_tooltips.html` | Pointer events, inertia, hover raycasting, tooltips |
| 9 | `09_full_hero_section.html` | Complete assembled hero section with all 15 currents |

## Prerequisites

- **Modern browser** — Chrome, Firefox, or Safari (supports WebGL 2). The pages open directly from disk: Three.js is loaded from `three.global.min.js` and the Earth texture from `blue_marble.js`, because browsers block ES module files and WebGL image textures on `file://` pages.
  No build step required; open each `.html` file directly.
- **Python 3.9+** (optional) — only needed if you want to run the helper scripts
  in `scripts/` to download the texture and world-atlas data.
- **Node.js** is NOT required for the HTML demos.

## How to use

Open any `.html` file directly in your browser:

```
# macOS / Linux
open hero-globe-tutorial/01_basic_sphere.html

# Windows — double-click the file, or:
start hero-globe-tutorial\01_basic_sphere.html
```

Each file is self-contained and builds on the previous step.
Read the comments in the source; they explain the *why*, not just the what.

## Helper scripts

```
scripts/download_blue_marble.py   — downloads the NASA Blue Marble texture
scripts/download_world_atlas.py   — downloads and explains the TopoJSON coastline data
scripts/make_docx.py              — converts the guide to a Word document
```

## Full guide

`guide/HERO_GLOBE_GUIDE.md` — comprehensive written guide covering every technique.
`guide/HERO_GLOBE_GUIDE.docx` — same guide as a Word document.

## Texture note

Steps 2–9 reference `../site/assets/blue_marble.jpg`.
If you are running these demos outside the repository, run `scripts/download_blue_marble.py`
to download the texture, then update the `TEXTURE_URL` constant near the top of each file.

## Data note

The ocean current paths are hand-drawn `[lat, lon]` waypoint arrays — they are
climatological approximations, not downloaded from a real dataset.
See the guide's "How to adapt this" section for how to substitute real data
(ERA5 winds, OSCAR/HYCOM ocean currents).
