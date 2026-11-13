---
name: climate-figure-style
description: House style for climate figures — colormaps, labels, map projection, sizes, fonts and file names. Use whenever a plot or map is made.
---

# Climate figure style

## Colormaps
| What is shown                       | Colormap | Notes |
|-------------------------------------|----------|-------|
| Anomalies, trends (can be + or −)   | RdBu_r   | Centre on zero: `TwoSlopeNorm(vcenter=0)` |
| Absolute temperature                | viridis or magma | |
| Precipitation amount                | YlGnBu   | |
| Precipitation anomaly               | BrBG     | Centre on zero |

Never use rainbow or jet.

## Maps
- Projection: `ccrs.PlateCarree()` for small regions; `ccrs.Robinson()` for global maps.
- Always add coastlines and state or country borders (`cfeature.STATES` for the US).
- Mark grid cells with a significant trend (p < 0.05) with small dots (stippling).

## Labels
- Every axis and colorbar label has units in brackets, for example `Trend [°C per decade]`.
- Title format: `<variable>, <season> <period>`, for example `2 m temperature trend, JJA 1991–2024`.
- Source line in the bottom-left corner, font size 7: `Data: ERA5 (Copernicus C3S)`.

## Size and files
- Single-column figure: 3.5 in wide; full-width figure: 7 in wide. Font size 9.
- Save both `figures/<topic>_<variable>_<type>.png` (dpi=300) and the same name as `.pdf`.
- Use `bbox_inches="tight"` so nothing is cut off.
