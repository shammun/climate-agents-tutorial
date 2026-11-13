---
title: Building AI Agents for Climate Data Analysis
subtitle: What agents and subagents are, how to write them, and a complete climate template to download and adapt
author: Shammunul Islam
updated: November 2026
---

<!-- Source of truth for the tutorial text.
     "include: PATH" markers are replaced by the file at PATH (relative to climate-agent-template/).
     "diagram: NAME" markers are replaced by content/diagrams/NAME.svg.
     "diagram: file-tree" is an interactive file explorer on the website (no SVG). -->

# Introduction

In this tutorial we learn what an AI agent is, what a subagent is, and how to build a small team of agents that analyse climate data. We first look at agents in general, in a way that does not depend on any one product. Then we build a complete working example step by step in Claude Code, and finally we see how the same agents are written for other AI coding tools.

The running example is a simple research question:

**Question: Has summer (June–August) near-surface air temperature over Virginia warmed between 1991 and 2024?**

Five agents answer it together. One downloads ERA5 data, one checks the data, one computes the trend, one draws the figures and one reviews the result.

Every file shown here is part of a template that can be downloaded and changed for other projects.

## What is needed

- An AI coding tool that runs in a terminal. The step-by-step part uses **Claude Code**. Part 3 shows OpenAI Codex, Gemini CLI and GitHub Copilot.
- A text editor, for example VS Code.
- For the climate example only: Python with xarray, and a free Copernicus Climate Data Store (CDS) account to download ERA5 data.

No programming is needed to write agents. Agents are plain text files.

---

# Part 1 — Agents in general

## 1. What an agent is

A **large language model (LLM)** is a program that reads text and writes text. On its own it can only answer. It cannot open a file or run a script.

An **agent** is an LLM that can also take actions. It is built from four parts:

1. **A model** — the LLM that reads the situation and decides what to do next.
2. **Instructions** — text that tells the model its role, its rules and what a good answer looks like. This text is often called the **system prompt**.
3. **Tools** — ordinary functions the model is allowed to ask for, such as "read a file", "run a Python script" or "search the web".
4. **A loop** — a small program that runs the tool the model asked for, gives the result back to the model, and repeats until the model gives a final answer.

<!-- diagram: agent-loop -->

Here is the loop in words, with a climate task:

1. The task arrives: "Check the file `era5_t2m.nc`."
2. The model decides: "I need to see what is in the file. Call the tool `inspect_file`."
3. The loop runs `inspect_file` and sends the result back: "units = K, 2 % missing values …".
4. The model decides: "I have enough information. Final answer: the file is usable, but 2 % of values are missing."

The model never touches the file itself. It only asks, and the loop does the work. This is why the choice of tools is also a choice of what an agent is **allowed** to do.

The text an agent can see at one moment is called its **context**. This is the instructions, the task and every tool result so far. The context has a size limit, and a long, cluttered context makes answers worse. This one fact explains most of the design advice in this tutorial.

## 2. What a subagent is

A **subagent** is an agent that another agent calls, in the same way it calls a tool. The calling agent is the **main agent**, sometimes called the orchestrator.

<!-- diagram: agents-hub -->

A research group is a useful comparison. The main agent is the lead researcher who talks to you. The subagents are specialists: one handles data downloads, one does quality control, one does statistics.

Subagents help for three reasons:

- **A clean context.** A subagent starts with an empty context. It may read fifty files, but only its short summary comes back to the main agent, so the main conversation stays clean.
- **Specialisation.** Each subagent has its own instructions, so it can hold detailed rules for one job.
- **Safety.** Each subagent has its own tool list. A checking agent can be given read-only tools, so it can look at data but never change it.

Subagents also cost something. Each one starts from zero, so the main agent must pass every needed detail (file paths, decisions) in its request. Each one also uses extra time and tokens. A **token** is a small piece of text, about three quarters of a word, and AI usage is counted in tokens. For a small task it is usually better not to delegate.

## 3. An agent in plain Python

To see that nothing here is magic, here is a complete agent and subagent in about 100 lines of Python. It uses no AI product. A small scripted function stands in for the model, so the file runs offline. To use a real model, replace the body of `call_model()` with a call to any provider's chat API that supports tool calling.

<!-- include: examples/minimal_agent.py -->

Running it with `python examples/minimal_agent.py` prints every step:

```
[main-agent] turn 1: calls ask_qc_agent({'task': 'Check the station CSV file in this folder.'})
[qc-subagent] turn 1: calls list_files({'folder': '.'})
[qc-subagent] turn 2: calls summarize_csv({'path': 'sample_station.csv'})
[qc-subagent] final answer: QC of 24 rows: 1 missing (-999), range 1.3..25.2 °C. OVERALL: NEEDS ATTENTION
[main-agent] final answer: The QC helper reported: QC of 24 rows: 1 missing (-999), range 1.3..25.2 °C. OVERALL: NEEDS ATTENTION
```

Three things to notice:

- The subagent is just `run_agent()` wrapped in a function (`ask_qc_agent`) that the main agent can call as a tool.
- The subagent starts with a new, empty message list. It does not see the main agent's conversation.
- Only the subagent's final answer goes back to the main agent. Its intermediate steps stay inside it.

AI coding tools such as Claude Code, Codex and Gemini CLI run this same loop for you. What you write is the part that changes from project to project: the instructions, the tool lists and the reusable knowledge. These are written as text files.

## 4. The building blocks every tool shares

Most AI coding tools now use the same four kinds of files. The names and folders differ, but the ideas are the same.

<!-- diagram: building-blocks -->

| Building block | What it is | Loaded when | Examples |
|---|---|---|---|
| **Project rules file** | A briefing sheet for the whole project: folders, environment, "always" and "never" rules | At the start of every session | `AGENTS.md` (open standard), `CLAUDE.md`, `GEMINI.md` |
| **Agent definition** | One specialist: its role, tools, model and instructions | When the main agent delegates a task to it | `.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`, `.github/agents/*.agent.md` |
| **Skill** | A reusable manual or procedure, with optional helper scripts | Only when a task needs it | A folder with a `SKILL.md` file (open Agent Skills standard) |
| **Permissions** | Hard limits on what any agent may do | Always enforced | `.claude/settings.json`, Codex sandbox settings |

Two of these are open standards, which means many tools read the same file:

- **AGENTS.md** is a plain Markdown file of project instructions. It started at OpenAI and is now managed by the Agentic AI Foundation under the Linux Foundation. Codex, GitHub Copilot, Cursor and many other tools read it.
- **Agent Skills** (`SKILL.md`) is a folder format for reusable knowledge. Anthropic created it and published it as an open standard at agentskills.io, and dozens of tools support it.

The template in this tutorial uses both. The project rules are in `AGENTS.md`, and `CLAUDE.md` simply imports it. The skills follow the open standard, so they can be reused in other tools.

## 5. How to design a team of agents

These rules apply in every tool.

1. **One clear job per agent.** "Checks data quality" is a job. "Helps with climate stuff" is not.
2. **Write the trigger, not just the role.** The main agent picks a subagent by reading its description. Say what it does *and when to use it*: "Use after any new file is downloaded."
3. **Give the fewest tools that work.** A checker or reviewer should be read-only. Then it cannot "fix" data quietly.
4. **Fix the output format.** A table, a PASS/FAIL line, a list of file paths. The main agent reads the answer, so a fixed shape makes the handoff reliable.
5. **Use a fresh agent to review.** An agent that did the work tends to approve its own work. A reviewer that starts from a clean context finds more problems.
6. **Put shared knowledge in one place.** If two agents need the same rule, put it in the project rules file or a skill, not in both agent files.
7. **Start small.** Begin with one or two agents. Add another only when the same instructions keep being typed again.

---

# Part 2 — Building the climate team in Claude Code

## 6. The plan and the folder layout

The five agents form a pipeline. Each step hands files to the next.

<!-- diagram: pipeline -->

| Agent | Job | Tools | Can change files? |
|---|---|---|---|
| data-fetcher | Downloads ERA5 into `data/raw/` | Read, Write, Edit, Bash, Glob | Yes |
| data-qc | Checks units, coordinates, calendar, gaps, missing values | Read, Bash, Grep, Glob | **No** |
| climate-analyst | Computes the JJA mean, anomalies and trend | Read, Write, Edit, Bash, Glob, Grep | Yes |
| figure-maker | Draws a trend map and a time series | Read, Write, Edit, Bash, Glob | Yes |
| results-reviewer | Checks the science and the numbers | Read, Grep, Glob, Bash | **No** |

Here is the full folder. Folder and file names starting with a dot (`.claude`) are hidden by default in file browsers, so turn on "show hidden files" to see them.

<!-- diagram: file-tree -->

```
climate-agent-template/
├── AGENTS.md                 shared project rules (open standard)
├── CLAUDE.md                 Claude Code entry point; imports AGENTS.md
├── .claude/
│   ├── settings.json         permissions
│   ├── agents/               one .md FILE per agent
│   │   ├── data-fetcher.md
│   │   ├── data-qc.md
│   │   ├── climate-analyst.md
│   │   ├── figure-maker.md
│   │   └── results-reviewer.md
│   └── skills/               one FOLDER per skill
│       ├── netcdf-conventions/
│       │   ├── SKILL.md
│       │   └── scripts/inspect_nc.py
│       ├── era5-download/
│       │   ├── SKILL.md
│       │   └── scripts/download_era5.py
│       ├── climate-figure-style/
│       │   └── SKILL.md
│       └── run-climate-pipeline/
│           └── SKILL.md
├── data/raw/   data/processed/   scripts/   figures/   reports/   hpc_jobs/
└── environment.yml
```

Claude Code looks for these files in two places:

| Location | Who can use it |
|---|---|
| `your-project/.claude/agents/` and `your-project/.claude/skills/` | Only this project. These can be shared through git. |
| `~/.claude/agents/` and `~/.claude/skills/` | All your projects on this computer |

Here `~` means your home folder: `C:\Users\<name>\` on Windows, `/Users/<name>/` on macOS and `/home/<name>/` on Linux. If a project agent and a personal agent have the same name, the project one wins.

The names `.claude`, `CLAUDE.md`, `agents`, `skills` and `SKILL.md` are fixed by Claude Code. If they are renamed, Claude Code will not find them.

## 7. Reading and writing YAML frontmatter

Agent files and skill files start with a short settings block called **frontmatter**. It is written in **YAML**, a simple format of labels and values.

<!-- diagram: anatomy -->

The rules, from simplest to less simple:

**The block.** The very first line of the file is exactly three hyphens, `---`. The settings follow, one per line. Another `---` line closes the block. Everything after it is the **body**: normal Markdown text.

**A setting** is a key, a colon, one space, and a value:

```yaml
name: data-qc
model: sonnet
```

The key on the left must be spelled exactly as the tool expects, in lowercase. The value on the right is your choice.

**A long sentence** stays on one line, however long. The editor may wrap it on screen. That is fine, as long as Enter is not pressed in the middle.

```yaml
description: Checks NetCDF climate files for missing values, wrong units and bad coordinates. Use after any download.
```

**A value with a colon inside** goes in quotes:

```yaml
description: "Checks data. Note: read-only."
```

**A list** can be written in two equivalent ways. Comma-separated on one line:

```yaml
tools: Read, Grep, Glob, Bash
```

Or one item per line, each line starting with two spaces, a hyphen and a space:

```yaml
skills:
  - netcdf-conventions
  - era5-download
```

**Yes/no values** are written `true` or `false`.

Common mistakes:

| Mistake | Wrong | Right |
|---|---|---|
| No space after the colon | `model:sonnet` | `model: sonnet` |
| A tab before a list item | `⇥- item` | `  - item` (two spaces) |
| Capital letters in a key | `Tools: Read` | `tools: Read` |
| Blank line before the first `---` | (empty line), then `---` | `---` on line 1 |
| Windows Notepad adds `.txt` | `data-qc.md.txt` | In "Save as type" choose "All files" |

## 8. Step 1 — The project rules: AGENTS.md and CLAUDE.md

The project rules file is the briefing sheet for the whole project. It is read automatically at the start of every session, and every subagent receives it too. It has **no frontmatter**. It is plain Markdown: headings with `#`, bullet points with `-`, and code in backticks.

The template keeps the shared rules in **AGENTS.md**, so any tool that reads the open standard can use them:

<!-- include: AGENTS.md -->

Claude Code reads a file called **CLAUDE.md**. A line containing only `@` and a file name, such as `@AGENTS.md`, **imports** that file, which means its text is pulled in at that point. So CLAUDE.md can stay short and add only the parts that are specific to Claude Code:

<!-- include: CLAUDE.md -->

Where the file can live:

| Location | Applies to |
|---|---|
| `your-project/CLAUDE.md` (top level of the project) | This project. This is the main one. |
| `~/.claude/CLAUDE.md` | All your projects (personal habits) |
| `your-project/some-folder/CLAUDE.md` | Extra rules, loaded when work happens in that folder |

How to write a good one:

- **Keep it short.** Aim for under about 200 lines. It is loaded in every session, and important rules get lost in a long file.
- **Write facts and rules, not essays.** Bullets work better than paragraphs.
- **Be specific.** "Use the conda environment `climate`" is better than "use the right environment."
- **Use "Always" and "Never" lists.**
- **Move long procedures into skills.**
- **Get a first draft for free.** Run `/init` inside Claude Code. It writes a draft by looking at the project, which can then be edited.
- **Grow it over time.** When an agent makes the same mistake twice, add a rule.

## 9. Step 2 — Skills: reusable knowledge

An agent is a **worker** (the "who"). A skill is a **manual** (the "how"). Any agent, including the main one, can use a skill.

A skill is a **folder**, not a single file. Inside it there must be a file named exactly `SKILL.md`. The folder can also hold helper scripts and reference files.

When a session starts, Claude Code reads only the `name` and `description` of each skill, so many skills cost very little. The full text is loaded only when a task needs it. This is called **progressive disclosure**: details are shown only when needed.

A `SKILL.md` has the same layout as an agent file: frontmatter, then body. Only `name` and `description` are required. The `name` should match the folder name.

### Skill 1: netcdf-conventions — knowledge used by several agents

<!-- include: .claude/skills/netcdf-conventions/SKILL.md -->

This skill comes with a helper script, `scripts/inspect_nc.py`, which prints a quick summary of any NetCDF file. The data-qc agent runs it. A skill can carry tested code, so agents do not rewrite it every time.

### Skill 2: era5-download — a procedure with a helper script

<!-- include: .claude/skills/era5-download/SKILL.md -->

### Skill 3: climate-figure-style — a house style

<!-- include: .claude/skills/climate-figure-style/SKILL.md -->

### Skill 4: run-climate-pipeline — a command started by hand

Some skills are workflows that should run only when you ask. The setting `disable-model-invocation: true` stops Claude from starting it on its own. The skill then works like a command: type `/run-climate-pipeline` followed by the question. The text after the command replaces `$ARGUMENTS` in the skill.

<!-- include: .claude/skills/run-climate-pipeline/SKILL.md -->

### Three ways a skill is used

| How | Example | Controlled by |
|---|---|---|
| Automatically, when the description matches the task | "Download ERA5 temperature for Virginia" loads `era5-download` | `description` |
| By typing its name as a command | `/era5-download` | always possible, unless `user-invocable: false` |
| Preloaded into an agent at startup | `skills:` list in an agent file | the agent's frontmatter |

| Setting in SKILL.md | You can type `/name` | Claude can start it by itself |
|---|---|---|
| (default) | Yes | Yes |
| `disable-model-invocation: true` | Yes | No |
| `user-invocable: false` | No | Yes |

**Skill or agent?** If it is a procedure or a piece of knowledge used again and again, make a skill. If it is a separate worker that needs its own tools or a clean context, make an agent. If several agents need the same knowledge, make one skill and list it in each agent's `skills:` field.

## 10. Step 3 — Agents: the specialists

Each agent is one Markdown file in `.claude/agents/`. The file name does not have to match the `name` field, but keeping them the same avoids confusion.

### The frontmatter fields

| Field | Required | What it does |
|---|---|---|
| `name` | Yes | The agent's ID: lowercase letters and hyphens, for example `data-qc` |
| `description` | Yes | When the main agent should use it. **The most important line.** |
| `tools` | No | The tools it may use, for example `Read, Grep, Glob, Bash`. If left out, it gets every tool. |
| `disallowedTools` | No | Tools to take away, for example `Write, Edit` |
| `model` | No | `sonnet`, `opus`, `haiku`, a full model ID, or `inherit` (same as the main session) |
| `skills` | No | Skills whose full text is loaded into the agent at startup |
| `memory` | No | `project`, `user` or `local`: gives the agent a folder of notes that survives between sessions |
| `maxTurns` | No | The most steps the agent may take before it stops |
| `effort` | No | How hard the model thinks: `low`, `medium`, `high`, `xhigh`, `max` |
| `color` | No | Its colour in the task list, for example `blue` |

The tools used most often:

| Tool | What it does |
|---|---|
| `Read` | Read a file (also images, so an agent can look at its own figures) |
| `Write` / `Edit` | Create a file / change part of a file |
| `Bash` | Run a terminal command, for example `python scripts/03_trend.py` |
| `Glob` | Find files by name pattern, for example `data/raw/**/*.nc` |
| `Grep` | Search for text inside files |
| `WebSearch` / `WebFetch` | Search the web / read a web page |

### Writing the description

The main agent compares the task with every agent's description and picks one. So write the description like a rule for choosing: what it does, plus when to use it.

Too vague:

```yaml
description: Helps with climate data.
```

Clear:

```yaml
description: Checks NetCDF or GRIB climate files for quality problems (missing values, units, coordinates, calendars, time gaps) before analysis. Use proactively after any download, regrid or merge. Read-only; it reports problems and never fixes them.
```

The words "use proactively" make the main agent more likely to call the agent without being asked.

### Writing the body

The body is the agent's whole set of instructions. Apart from the project rules file, it knows nothing else. A good order:

```markdown
You are a [ROLE].                      ← 1. who it is, in one line

## Your job                            ← 2. what it does, and what it does NOT do
## Inputs you will receive             ← 3. what the main agent will hand over
## Procedure                           ← 4. numbered steps
## Rules                               ← 5. always / never
## Output format                       ← 6. exactly what to return
```

Write it as a briefing for a new research assistant. Be concrete: "check units" is weak, while "a mean 2 m temperature above 200 means Kelvin" is strong.

### The five agent files

**data-fetcher** — downloads data and records where it came from. It preloads the `era5-download` skill.

<!-- include: .claude/agents/data-fetcher.md -->

**data-qc** — read-only checker. `disallowedTools: Write, Edit` makes sure it cannot change anything.

<!-- include: .claude/agents/data-qc.md -->

**climate-analyst** — does the statistics. `memory: project` gives it a notes folder (`.claude/agent-memory/climate-analyst/`) that survives between sessions, so it can remember dataset quirks.

<!-- include: .claude/agents/climate-analyst.md -->

**figure-maker** — draws figures in the house style and looks at each PNG before reporting back.

<!-- include: .claude/agents/figure-maker.md -->

**results-reviewer** — an independent, read-only check in a fresh context.

<!-- include: .claude/agents/results-reviewer.md -->

## 11. Step 4 — Permissions: hard limits

Rules in text files are guidance. The model follows them well, but they are not a guarantee. For things that must never happen, use **permissions** in `.claude/settings.json`. Claude Code enforces these whatever the instructions say.

<!-- include: .claude/settings.json -->

- `deny` — always blocked. Here: editing anything in `data/raw/`, and reading the file that holds the CDS key.
- `ask` — Claude Code asks you first. Here: any `rm` (delete) command.
- `allow` — runs without asking (not used in this template).

## 12. Step 5 — Running the team

### Create the files

There are three ways to create agent and skill files:

1. **Download the template** and copy its folders into a project.
2. **Ask Claude Code to write one**, for example: *"Create a subagent in .claude/agents/data-qc.md that checks NetCDF files, is read-only and uses sonnet."* Then open the file and check it.
3. **Write it by hand** in any editor. On Linux or macOS:

```bash
mkdir -p .claude/agents
nano .claude/agents/data-qc.md
```

On Windows PowerShell:

```powershell
mkdir .claude\agents -Force
notepad .claude\agents\data-qc.md
```

Claude Code notices new and changed agent files within seconds. One exception: if the `agents` folder did not exist when the session started, restart Claude Code once.

### Call the agents

<!-- diagram: load-timeline -->

| Way | Example |
|---|---|
| Automatically | "Download ERA5 2 m temperature for Virginia, 1991–2024." The main agent picks data-fetcher from its description. |
| By name | "Use the data-qc agent to check every file in data/raw/era5/." |
| With an @-mention | Type `@`, choose the agent, then the task. Or type `@agent-data-qc`. |
| As the main agent for a whole session | `claude --agent data-qc` |
| The whole pipeline | `/run-climate-pipeline Has summer (JJA) 2 m temperature over Virginia warmed between 1991 and 2024?` |

### What happens, step by step

1. **Session start.** Claude Code reads CLAUDE.md (which pulls in AGENTS.md), plus the name and description of every agent and skill.
2. **`/run-climate-pipeline …`** loads that skill's full text. The question replaces `$ARGUMENTS`.
3. **data-fetcher** starts in a fresh context with its instructions, the project rules and the `era5-download` skill. It runs the helper script and writes `data/raw/era5/` plus `SOURCE.md`, then returns a list of files.
4. **data-qc** runs `inspect_nc.py` on every file and returns a PASS/FAIL table. The main agent saves it in `reports/`. If something fails, the pipeline stops and shows the problem.
5. **climate-analyst** writes `scripts/03_jja_trend.py`, runs it and saves the results in `data/processed/` and `reports/`.
6. **figure-maker** writes the plotting script, saves the PNG and PDF files, opens the PNGs and fixes any layout problems.
7. **results-reviewer** checks the scripts and numbers in a clean context and returns READY or NOT READY.
8. **The main agent** gives the answer: the trend in °C per decade, its p-value, and the figure paths.

Things worth knowing:

- Subagents can run in parallel when tasks do not depend on each other, for example checking ten files at once.
- A subagent can start its own subagents, by default up to three levels below the main conversation.
- If the main agent does not pick an agent you expected, make that agent's description more specific, or call it by name.

---

# Part 3 — The same ideas in other tools

## 13. The data-qc agent in Codex, Gemini CLI and GitHub Copilot

The four building blocks from section 4 exist in other AI coding tools too. Only the file names and some field names change.

| Tool | Agent files | Format | Project rules |
|---|---|---|---|
| Claude Code | `.claude/agents/*.md` | Markdown + YAML frontmatter | `CLAUDE.md` (can import `AGENTS.md`) |
| OpenAI Codex | `.codex/agents/*.toml` | TOML | `AGENTS.md` |
| Gemini CLI | `.gemini/agents/*.md` | Markdown + YAML frontmatter | `GEMINI.md`, or `AGENTS.md` if configured |
| GitHub Copilot | `.github/agents/*.agent.md` | Markdown + YAML frontmatter | `AGENTS.md` or `.github/copilot-instructions.md` |

**OpenAI Codex** uses **TOML**, another simple settings format. In TOML, values are written as `key = "value"`, and long text goes between triple quotes. `name`, `description` and `developer_instructions` are required.

<!-- include: other-tools/codex/.codex/agents/data-qc.toml -->

**Gemini CLI** uses Markdown with YAML frontmatter, the same idea as Claude Code. The tool names are different.

<!-- include: other-tools/gemini-cli/.gemini/agents/data-qc.md -->

**GitHub Copilot** uses `.agent.md` files in `.github/agents/`. VS Code can also read Claude-format agent files from `.claude/agents/`.

<!-- include: other-tools/github-copilot/.github/agents/data-qc.agent.md -->

These formats change often. Before relying on a field, check the tool's current documentation (links at the end).

## 14. Building agents in code

AI coding tools are agents for working in a folder of files. To build an agent into your own program, for example a web service that answers questions about climate data, use an **agent framework**. A framework is a code library that provides the loop from section 3, plus tool handling, memory and subagents. Some widely used ones:

- **Claude Agent SDK** (Anthropic) — the same agent loop that powers Claude Code, as a Python or TypeScript library.
- **OpenAI Agents SDK** — agents, tools and "handoffs" between agents, in Python or TypeScript.
- **Google Agent Development Kit (ADK)** — agents built around Gemini models, with multi-agent support.
- **LangGraph** — describes an agent workflow as a graph of steps, and works with many model providers.

The ideas carry over directly. The instructions become a string in code, the tools become Python functions, and a subagent becomes an agent registered as a tool of another agent.

---

# Part 4 — Make it your own

## 15. Adapting the template

1. **Download** the template and unzip it into a new project folder.
2. **Rewrite AGENTS.md:** what the project is, the folders, the environment, and the Always/Never rules.
3. **Keep the agents you need.** Delete the rest. In each one, rewrite the `description` first, then the procedure and the output format.
4. **Replace the data skill.** Swap `era5-download` for the data source in use: CMIP6, Landsat, station records, model output.
5. **Test each agent alone** on a small task before running the full pipeline.
6. **Add rules as problems appear.** When an agent makes the same mistake twice, add one line to AGENTS.md, the skill or the agent file.

Example: switching to CMIP6 precipitation projections.

- AGENTS.md: change the question to "change in summer precipitation by 2050 under SSP2-4.5", and list the models.
- New skill `cmip6-access/`: how to search and download from ESGF or a cloud catalogue, variable names (`pr` in kg m-2 s-1), and the reminder to multiply by 86400 to get mm/day.
- `netcdf-conventions`: already covers calendars, which matter more for CMIP6 (`noleap`, `360_day`).
- data-qc and results-reviewer: no change needed.

## 16. When something does not work

| Problem | Likely cause | Fix |
|---|---|---|
| Agent never gets used | Description too vague | Add what it does and when: "Use after …" |
| "Agent not found" | First file in a new `agents` folder | Restart Claude Code once |
| Frontmatter ignored | Blank line before `---`, or a YAML error | `---` must be on line 1; check colons and spaces |
| Agent forgets earlier decisions | Subagents start with an empty context | Put paths and decisions in the request |
| Agent changed data it should not | Too many tools | Remove `Write, Edit`; add a `deny` rule |
| Skill never loads | Wrong file name or folder | Must be `.claude/skills/<name>/SKILL.md` |
| Main session is slow and confused | Context full of logs and file contents | Delegate long reading jobs to subagents |

## 17. Cheat sheet

| | Project rules | Skill | Agent |
|---|---|---|---|
| Comparison | Briefing sheet on the wall | Manual on the shelf | A specialist worker |
| Is a… | single file | folder with `SKILL.md` | single `.md` file |
| Lives in | project top level | `.claude/skills/<name>/` | `.claude/agents/` |
| Frontmatter? | No | `name`, `description` | `name`, `description`, `tools`, `model`, `skills` … |
| Loaded | every session | when needed | when a task is delegated |
| Holds | facts and rules for everyone | a procedure or knowledge | a role, steps and output format |
| Open standard | `AGENTS.md` | Agent Skills | (format differs by tool) |

## Sources

- Claude Code documentation — subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code documentation — skills: https://code.claude.com/docs/en/skills
- Claude Code documentation — CLAUDE.md and memory: https://code.claude.com/docs/en/memory
- Agent Skills open standard: https://agentskills.io
- AGENTS.md open standard: https://agents.md
- OpenAI Codex — subagents and custom agents: https://developers.openai.com/codex/subagents
- Gemini CLI — subagents: https://geminicli.com/docs/core/subagents/
- GitHub Copilot — custom agents: https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-custom-agents
- VS Code — custom agents: https://code.visualstudio.com/docs/copilot/customization/custom-agents
- ERA5 monthly averaged data on single levels: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels-monthly-means
