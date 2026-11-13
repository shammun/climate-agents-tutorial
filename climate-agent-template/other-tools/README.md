# The same agent in other AI coding tools

The folder `.claude/agents/` holds the agents in Claude Code format.
This folder shows the `data-qc` agent written for three other tools, so the pattern can be compared.

| Tool | Agent file location | Format | Shared rules file |
|---|---|---|---|
| Claude Code | `.claude/agents/data-qc.md` | Markdown + YAML frontmatter | `CLAUDE.md` (this template imports `AGENTS.md`) |
| OpenAI Codex | `.codex/agents/data-qc.toml` | TOML | `AGENTS.md` |
| Gemini CLI | `.gemini/agents/data-qc.md` | Markdown + YAML frontmatter | `GEMINI.md` or `AGENTS.md` (configurable) |
| GitHub Copilot | `.github/agents/data-qc.agent.md` | Markdown + YAML frontmatter | `AGENTS.md` or `.github/copilot-instructions.md` |

To use one: copy its hidden folder (for example `codex/.codex`) into the project root.

Skills (`.claude/skills/*/SKILL.md`) follow the open Agent Skills standard (agentskills.io),
so the same skill folders can be reused by other tools that support it; only the folder they are read from differs.

These formats change often. Before relying on a field, check the tool's current documentation.
