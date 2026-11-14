"""
download_world_atlas.py
========================
Downloads the world-atlas land-110m.json file from the npm registry (via jsDelivr CDN)
and explains the TopoJSON format in detail.

About world-atlas
─────────────────
world-atlas is an npm package maintained by Mike Bostock (creator of D3.js).
It provides pre-built TopoJSON files derived from Natural Earth data
(naturalearthdata.com) at two resolutions:
  land-50m.json  — 1:50m scale (more detail, larger file, ~180 KB)
  land-110m.json — 1:110m scale (less detail, smaller file, ~70 KB)

For a globe rendered at 400–600 px diameter, land-110m.json has more than
enough detail.  The 50m version would add no visible improvement.

About TopoJSON
──────────────
TopoJSON is a compact format for geographic data that:
  1. Stores ARCS (line segments) instead of polygons directly.
     Multiple polygons that share a border reference the same arc.
  2. Uses INTEGER coordinates (quantised) instead of floating-point.
  3. Uses DELTA ENCODING so only the first vertex is absolute;
     subsequent vertices store the difference from the previous one.

This makes TopoJSON files 20–80% smaller than equivalent GeoJSON.

TopoJSON structure
──────────────────
{
  "type": "Topology",
  "transform": {
    "scale":     [sx, sy],     // multiply to get real lon/lat
    "translate": [tx, ty]      // then add this offset
  },
  "objects": {
    "land": { ... }   // references to arc indices (not used by this tutorial)
  },
  "arcs": [           // array of coastline segments
    [[x0,y0], [dx1,dy1], [dx2,dy2], ...],  // first point absolute, rest are DELTAS
    ...
  ]
}

Decoding an arc
───────────────
Input arc:  [[200, 300], [5, -2], [3, 4], [-1, 1]]

Step 1 — cumulative sum:
  (200, 300)  →  200,  300
  (5, -2)     →  205,  298
  (3, 4)      →  208,  302
  (-1, 1)     →  207,  303

Step 2 — apply transform (example: scale=[0.001, 0.0005], translate=[-180, -90]):
  (200 * 0.001 + (-180)) = -179.800 lon,  (300 * 0.0005 + (-90)) = -89.850 lat
  (205 * 0.001 + (-180)) = -179.795 lon,  (298 * 0.0005 + (-90)) = -89.900 lat
  ... and so on
"""

import json
import os
import sys
import urllib.request

# ── Configuration ─────────────────────────────────────────────────────────────
# land-110m.json from the world-atlas npm package, served via jsDelivr CDN.
# jsDelivr mirrors npm packages and is free, fast, and globally distributed.
ATLAS_URL = (
    'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json'
)

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR  = os.path.join(SCRIPT_DIR, '..', 'data')
OUTPUT_PATH = os.path.join(OUTPUT_DIR, 'land-110m.json')
OUTPUT_PATH = os.path.normpath(OUTPUT_PATH)


def download(url, dest_path):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    print(f'Downloading:\n  {url}\n→ {dest_path}')
    tmp = dest_path + '.tmp'
    try:
        urllib.request.urlretrieve(url, tmp)
        os.replace(tmp, dest_path)
        size_kb = os.path.getsize(dest_path) / 1024
        print(f'  Saved {size_kb:.0f} KB')
    except Exception as e:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise e


def explain_format(topo):
    """Print a human-readable explanation of this specific file's format."""
    sc = topo['transform']['scale']
    tr = topo['transform']['translate']
    arcs = topo['arcs']
    total_verts = sum(len(a) for a in arcs)

    print()
    print('TopoJSON format summary')
    print('─' * 40)
    print(f'  Number of arcs:   {len(arcs):,}')
    print(f'  Total vertices:   {total_verts:,}  (before delta-decoding)')
    print()
    print('  transform.scale:')
    print(f'    sx = {sc[0]:.8f}  (multiply x integers by this to get longitude)')
    print(f'    sy = {sc[1]:.8f}  (multiply y integers by this to get latitude)')
    print()
    print('  transform.translate:')
    print(f'    tx = {tr[0]}  (add to longitude after scaling)')
    print(f'    ty = {tr[1]}  (add to latitude after scaling)')
    print()
    print('  Longitude range after transform: approximately −180° to +180°')
    print('  Latitude range  after transform: approximately  −90° to  +90°')


def show_arc_decode_example(topo):
    """Show the delta-decoding process for the first arc."""
    sc = topo['transform']['scale']
    tr = topo['transform']['translate']
    arc = topo['arcs'][0]

    print()
    print('Delta-decoding example (first arc)')
    print('─' * 60)
    print(f'  Raw arc ({len(arc)} vertices, showing first 5):')
    for i, d in enumerate(arc[:5]):
        print(f'    [{d[0]:6d}, {d[1]:6d}]')
    if len(arc) > 5:
        print(f'    … ({len(arc) - 5} more)')

    print()
    print('  After cumulative sum + transform (first 5 decoded points):')
    x, y = 0, 0
    for i, d in enumerate(arc[:5]):
        x += d[0]; y += d[1]
        lon = x * sc[0] + tr[0]
        lat = y * sc[1] + tr[1]
        print(f'    lon = {lon:9.4f}°,  lat = {lat:8.4f}°')


def decode_all_arcs(topo):
    """
    Pure-Python decoder that recovers all arc vertices as (lon, lat) pairs.
    This is the same algorithm used in the HTML tutorials (Steps 4–9).
    Returns a list of lists of (lon, lat) tuples.
    """
    sc = topo['transform']['scale']
    tr = topo['transform']['translate']
    decoded = []
    for arc in topo['arcs']:
        x, y = 0, 0
        pts = []
        for d in arc:
            x += d[0]; y += d[1]
            pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
        decoded.append(pts)
    return decoded


def main():
    print('world-atlas downloader + TopoJSON explainer')
    print('=' * 50)

    # ── Download ──────────────────────────────────────────────────────────────
    if os.path.exists(OUTPUT_PATH):
        size_kb = os.path.getsize(OUTPUT_PATH) / 1024
        print(f'Already downloaded: {OUTPUT_PATH} ({size_kb:.0f} KB)')
    else:
        try:
            download(ATLAS_URL, OUTPUT_PATH)
        except Exception as e:
            print(f'\nDownload failed: {e}', file=sys.stderr)
            print('Make sure you have an internet connection and try again.')
            sys.exit(1)

    # ── Parse and explain ─────────────────────────────────────────────────────
    print(f'\nParsing {OUTPUT_PATH} …')
    with open(OUTPUT_PATH, encoding='utf-8') as f:
        topo = json.load(f)

    explain_format(topo)
    show_arc_decode_example(topo)

    # ── Full decode ───────────────────────────────────────────────────────────
    print()
    print('Decoding all arcs …')
    decoded = decode_all_arcs(topo)
    total_lon_lat_pts = sum(len(a) for a in decoded)
    print(f'  Decoded {len(decoded):,} arcs, {total_lon_lat_pts:,} lon/lat points total')

    # ── Show a small sample ───────────────────────────────────────────────────
    print()
    print('Sample decoded arc (arc index 0, first 4 points):')
    for lon, lat in decoded[0][:4]:
        print(f'  lon = {lon:9.4f}°,  lat = {lat:8.4f}°')

    # ── Stats ─────────────────────────────────────────────────────────────────
    all_lons = [pt[0] for arc in decoded for pt in arc]
    all_lats = [pt[1] for arc in decoded for pt in arc]
    print()
    print('Geographic coverage:')
    print(f'  Longitude: {min(all_lons):.2f}° to {max(all_lons):.2f}°')
    print(f'  Latitude:  {min(all_lats):.2f}° to {max(all_lats):.2f}°')

    print()
    print('The HTML demo files (Steps 4–9) load this file at runtime from:')
    print(f'  {ATLAS_URL}')
    print('so you do not need to run this script to use the tutorial.')
    print()
    print('Run this script if you want to:')
    print('  1. Understand the TopoJSON format')
    print('  2. Inspect the data offline')
    print('  3. Build your own alternative coast/border line sets')
    print()
    print(f'Local copy saved at: {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
