# Climate Agent Template

A ready-to-use blueprint for a team of AI agents that analyse climate data.
It is set up for Claude Code, and the shared rules (AGENTS.md) and skills (SKILL.md)
also work with other AI coding tools.

## What is inside

```
climate-agent-template/
├── AGENTS.md                 shared project rules, read by many AI coding tools
├── CLAUDE.md                 Claude Code entry point; imports AGENTS.md
├── .claude/
│   ├── settings.json         permissions: data/raw/ cannot be edited
│   ├── agents/               five subagents, one Markdown file each
│   │   ├── data-fetcher.md       downloads data
│   │   ├── data-qc.md            checks data quality (read-only)
│   │   ├── climate-analyst.md    computes statistics
│   │   ├── figure-maker.md       makes maps and plots
│   │   └── results-reviewer.md   independent check (read-only)
│   └── skills/               reusable knowledge, one folder each
│       ├── netcdf-conventions/   rules for NetCDF files + inspect_nc.py helper
│       ├── era5-download/        how to download ERA5 + download_era5.py helper
│       ├── climate-figure-style/ colours, labels, sizes, file names
│       └── run-climate-pipeline/ /run-climate-pipeline command (runs all five steps)
├── examples/
│   └── minimal_agent.py      an agent and a subagent in plain Python (no AI tool needed)
├── other-tools/              the data-qc agent written for Codex, Gemini CLI and GitHub Copilot
├── data/raw/  data/processed/  scripts/  figures/  reports/  hpc_jobs/
└── environment.yml           conda environment for the example
```

## Quick start (Claude Code)

1. Create the Python environment: `conda env create -f environment.yml` then `conda activate climate`
2. For ERA5 downloads, create a free Copernicus CDS account and save your key in `~/.cdsapirc`
   (see `.claude/skills/era5-download/SKILL.md`).
3. Open a terminal in this folder and start Claude Code: `claude`
4. Type:
   ```
   /run-climate-pipeline Has summer (JJA) 2 m temperature over Virginia warmed between 1991 and 2024?
   ```
   Or call one agent at a time, for example:
   ```
   Use the data-qc agent to check every file in data/raw/era5/
   ```

## Make it your own

1. **AGENTS.md** — rewrite "What this project is", the folder layout and the Always/Never rules.
2. **Agents** — keep the ones you need, delete the rest. In each file, edit:
   - `description` — when the agent should be used (the most important line)
   - `tools` — what it may do (remove Write and Edit for checkers)
   - the body — role, procedure, rules, output format
3. **Skills** — replace the ERA5 skill with your own data source (CMIP6, Landsat, station data ...).
   Keep one skill per topic.
4. Start a new Claude Code session and test each agent on a small task before the full pipeline.

## Other AI coding tools

See `other-tools/README.md` for the same agent in OpenAI Codex, Gemini CLI and GitHub Copilot formats.
