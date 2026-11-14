"""
05_verify_json.py
-----------------
Sanity-check a winds.json or currents.json file and optionally
save a matplotlib verification plot showing the vector field.

Usage:
    python python/05_verify_json.py data/winds.json
    python python/05_verify_json.py data/currents.json --no-plot
"""

import argparse
import json
import pathlib
import sys

import numpy as np

parser = argparse.ArgumentParser(description="Verify a globe JSON data file")
parser.add_argument("file", help="Path to winds.json or currents.json")
parser.add_argument("--no-plot", action="store_true")
args = parser.parse_args()

json_path = pathlib.Path(args.file)
if not json_path.exists():
    print(f"ERROR: {json_path} not found")
    sys.exit(1)

GREEN  = "\033[92m"; RED = "\033[91m"; YELLOW = "\033[93m"; RESET = "\033[0m"
BOLD   = "\033[1m"
def ok(msg):   print(f"  {GREEN}PASS{RESET}  {msg}")
def fail(msg): print(f"  {RED}FAIL{RESET}  {msg}")
def warn(msg): print(f"  {YELLOW}WARN{RESET}  {msg}")

# ── load ──────────────────────────────────────────────────────────────────────
print(f"\n{BOLD}Verifying {json_path.name}{RESET}")
print(f"  Size: {json_path.stat().st_size / 1024:.1f} KB")

with open(json_path, encoding="utf-8") as f:
    data = json.load(f)

# ── required keys ─────────────────────────────────────────────────────────────
required = ["source", "year", "grid", "uField", "vField",
            "uMin", "uMax", "vMin", "vMax", "speedMax"]
print(f"\n{BOLD}1. Required keys{RESET}")
all_ok = True
for k in required:
    if k in data:
        ok(k)
    else:
        fail(f"Missing key: {k}")
        all_ok = False

if not all_ok:
    print("\nFATAL: JSON is missing required keys. Re-run 04_process_to_json.py.")
    sys.exit(1)

grid = data["grid"]
nlat = grid["nlat"]
nlon = grid["nlon"]
expected_len = nlat * nlon

# ── field lengths ─────────────────────────────────────────────────────────────
print(f"\n{BOLD}2. Field dimensions{RESET}")
print(f"  Grid declared: {nlat} × {nlon} = {expected_len} elements")
for field_name in ("uField", "vField"):
    actual = len(data[field_name])
    if actual == expected_len:
        ok(f"{field_name}: {actual} elements  ✓")
    else:
        fail(f"{field_name}: {actual} elements, expected {expected_len}")

# ── value ranges ─────────────────────────────────────────────────────────────
print(f"\n{BOLD}3. Value ranges{RESET}")
u = np.array(data["uField"], dtype=np.float32).reshape(nlat, nlon)
v = np.array(data["vField"], dtype=np.float32).reshape(nlat, nlon)
speed = np.sqrt(u**2 + v**2)

print(f"  source   : {data['source']}")
print(f"  year     : {data['year']}")
print(f"  uMin/uMax: {data['uMin']:.4f} / {data['uMax']:.4f}")
print(f"  vMin/vMax: {data['vMin']:.4f} / {data['vMax']:.4f}")
print(f"  speedMax : {data['speedMax']:.4f} m/s")
print(f"  actual u : [{u.min():.4f}, {u.max():.4f}]")
print(f"  actual v : [{v.min():.4f}, {v.max():.4f}]")
print(f"  act speed: max={speed.max():.4f}, mean={speed.mean():.4f}")

# NaN check
nan_u = np.isnan(u).sum()
nan_v = np.isnan(v).sum()
if nan_u == 0 and nan_v == 0:
    ok("No NaN values in uField or vField")
else:
    fail(f"NaN values found: {nan_u} in uField, {nan_v} in vField")

# Zero-motion check
zero_pct = (speed == 0).sum() / speed.size * 100
if zero_pct > 80:
    warn(f"{zero_pct:.1f}% of cells have zero speed (land mask expected; > 80% unusual)")
elif zero_pct > 50:
    ok(f"{zero_pct:.1f}% zero-speed cells (land mask)")
else:
    ok(f"{zero_pct:.1f}% zero-speed cells")

# Reasonable speed range
if speed.max() > 100:
    fail(f"Speed max {speed.max():.2f} m/s is unrealistically large; check unit conversion")
elif speed.max() > 20:
    warn(f"Speed max {speed.max():.2f} m/s is high — expected ≤ ~15 m/s for 10 m winds")
else:
    ok(f"Speed max {speed.max():.2f} m/s is physically reasonable")

# Hemispheric symmetry check: mean u east of 0 should be small for annual mean
u_tropics = u[60:120, :]   # roughly 30S–30N
mean_u_tropics = float(np.abs(u_tropics).mean())
if mean_u_tropics > 0.001:
    ok(f"Non-zero u in tropics: mean |u| = {mean_u_tropics:.4f} m/s (data present)")
else:
    warn(f"Mean |u| in tropics is very small ({mean_u_tropics:.6f}) — may be all zeros")

# ── ASCII vector map ──────────────────────────────────────────────────────────
print(f"\n{BOLD}4. ASCII vector map (annual mean, speed){RESET}")
rows, cols = 18, 36
step_lat = max(1, nlat // rows)
step_lon = max(1, nlon // cols)
thumb_speed = speed[::step_lat, ::step_lon]
vmax = np.percentile(thumb_speed, 97)
chars = " ·:-=+*#%@"
print(f"  {'─'*(thumb_speed.shape[1]+2)}")
for row in thumb_speed:
    line = "|"
    for s in row:
        idx = min(len(chars)-1, int(s / vmax * (len(chars)-1))) if vmax > 0 else 0
        line += chars[idx]
    print(f"  {line}|")
print(f"  {'─'*(thumb_speed.shape[1]+2)}")
print(f"  ' ' = 0  '@' = {vmax:.2f} m/s (97th pct)")

# ── optional plot ─────────────────────────────────────────────────────────────
if not args.no_plot:
    try:
        import matplotlib.pyplot as plt

        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        lats = np.linspace(grid["lat0"], -grid["lat0"], nlat)
        lons = np.linspace(grid["lon0"], grid["lon0"] + 359, nlon)

        # Speed map
        ax = axes[0]
        im = ax.imshow(speed, origin="lower", cmap="viridis",
                       extent=[lons[0], lons[-1], lats[0], lats[-1]], aspect="auto")
        plt.colorbar(im, ax=ax, label="speed (m/s)")
        ax.set_title("Speed")
        ax.set_xlabel("lon"); ax.set_ylabel("lat")

        # u component
        ax = axes[1]
        vmax_u = float(np.percentile(np.abs(u), 99))
        im = ax.imshow(u, origin="lower", cmap="RdBu_r",
                       vmin=-vmax_u, vmax=vmax_u,
                       extent=[lons[0], lons[-1], lats[0], lats[-1]], aspect="auto")
        plt.colorbar(im, ax=ax, label="u (m/s)")
        ax.set_title("u (east)")

        # v component
        ax = axes[2]
        vmax_v = float(np.percentile(np.abs(v), 99))
        im = ax.imshow(v, origin="lower", cmap="RdBu_r",
                       vmin=-vmax_v, vmax=vmax_v,
                       extent=[lons[0], lons[-1], lats[0], lats[-1]], aspect="auto")
        plt.colorbar(im, ax=ax, label="v (m/s)")
        ax.set_title("v (north)")

        plt.suptitle(f"{data['source']} {data['year']} — {json_path.name}", fontsize=11)
        plt.tight_layout()
        out_png = json_path.parent / (json_path.stem + "_verify.png")
        plt.savefig(out_png, dpi=100, bbox_inches="tight")
        plt.close()
        ok(f"Plot saved: {out_png}")
    except ImportError:
        warn("matplotlib not installed — skipping plot")

print(f"\n{BOLD}Result:{RESET} {json_path.name} looks good.")
print(f"  Source: {data['source']}  Year: {data['year']}")
print(f"  Grid:   {nlat} × {nlon}")
print(f"  Max speed: {speed.max():.3f} m/s\n")
