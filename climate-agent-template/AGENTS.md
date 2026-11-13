# Climate Analysis Project

Shared instructions for any AI coding agent working in this folder
(Claude Code, Codex, Gemini CLI, GitHub Copilot, Cursor and others).

## What this project is
A climate data analysis project. The worked example asks one question:
has summer (June–August) near-surface air temperature over Virginia warmed since 1991?
Data source: ERA5 monthly means (2 m temperature), 1991–2024.

Change this section to describe your own project.

## Folder layout
- data/raw/        — downloaded files. NEVER modify, move or delete anything here.
- data/processed/  — derived NetCDF files written by analysis scripts
- scripts/         — all code, numbered in run order: 01_download.py, 02_qc.py, 03_jja_mean.py, ...
- figures/         — figures as PNG (300 dpi) and PDF
- reports/         — QC reports and short Markdown summaries of results
- hpc_jobs/        — SLURM job scripts for long runs on a cluster

## Environment
- Python environment: `conda activate climate` (see environment.yml)
- Core libraries: xarray, netCDF4, dask, numpy, scipy, statsmodels, matplotlib, cartopy, cdsapi
- Run a script from the project root: `python scripts/03_jja_mean.py`

## Workflow
1. Download data          (data-fetcher)
2. Check data quality     (data-qc) — save each QC report to reports/qc_<file-name>.md
3. Compute statistics     (climate-analyst)
4. Make figures           (figure-maker)
5. Independent review     (results-reviewer)
When handing a step to a helper agent, pass full file paths: helpers do not see the main conversation.

## Always
- Write every step as a script in scripts/, never as a one-off command, so it can be re-run.
- Area-weight spatial means with cos(latitude).
- Convert longitude to -180..180 before selecting a region.
- State units for every number, axis and colorbar.
- State the baseline period for every anomaly (default 1991–2020).

## Never
- Never edit, overwrite or delete files in data/raw/.
- Never put API keys or passwords in scripts or in this file.
- Never run a job longer than about 30 minutes locally; write a SLURM script in hpc_jobs/ instead.
