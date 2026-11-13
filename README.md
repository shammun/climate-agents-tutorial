# Building AI Agents for Climate Data Analysis

A tutorial website explaining what agents and subagents are, how to write them, and providing a complete climate-analysis template to download and adapt.

**Live site:** https://shammun.github.io/climate-agents-tutorial/

## What is here

| Path | What it is |
|---|---|
| `content/tutorial.md` | Tutorial text (edit this to update the site) |
| `content/diagrams/` | Six SVG diagrams |
| `climate-agent-template/` | Downloadable agent template |
| `site/` | Build scripts and templates |
| `reference/` | Draft HTML and Word version |

## Build locally

Requires Node.js 20 or newer.

```
npm install
npm run build
npm run preview
```

Then open http://localhost:4000.

## Update the site

1. Edit `content/tutorial.md`.
2. Commit and push to `main`.
3. GitHub Actions builds and deploys automatically.

## Licences

Tutorial text: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
Template code: [MIT](LICENSE-MIT)

Author: [Shammunul Islam](https://github.com/shammun)
