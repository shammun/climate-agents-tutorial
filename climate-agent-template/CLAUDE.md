# Claude Code instructions

The shared project rules live in AGENTS.md (read by many AI coding tools).
The next line imports them so Claude Code reads them too:

@AGENTS.md

## Claude Code only
- Subagents for each workflow step are in .claude/agents/:
  data-fetcher, data-qc, climate-analyst, figure-maker, results-reviewer.
- Skills are in .claude/skills/. Run the whole workflow with: /run-climate-pipeline <question>
- data-qc and results-reviewer are read-only. When data-qc returns a report, save it to
  reports/qc_<file-name>.md before starting the analysis step.
