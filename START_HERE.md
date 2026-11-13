# Start here

This kit builds and publishes the tutorial website "Building AI Agents for Climate Data Analysis"
on GitHub Pages, using a Claude Code session.

## What is in the kit
```
agents-tutorial-kit/
├── START_HERE.md              this file
├── CLAUDE.md                  build instructions for the Claude Code session (read automatically)
├── content/
│   ├── tutorial.md            the tutorial text (edit this to change the website)
│   └── diagrams/              six SVG diagrams
├── climate-agent-template/    the downloadable template readers will get
├── reference/
│   ├── tutorial-draft.html    a finished single-page draft (open it in a browser)
│   └── tutorial.docx          Word version
└── tools/
    └── expand_includes.py     puts the template files into the tutorial text
```

## One-time setup (about 10 minutes)
Install these if they are not installed yet. Check each with the command in brackets.

| Tool | Check | Install on Windows (PowerShell) | Install on macOS |
|---|---|---|---|
| Git | `git --version` | `winget install Git.Git` | `brew install git` |
| Node.js 20 or newer | `node --version` | `winget install OpenJS.NodeJS.LTS` | `brew install node` |
| GitHub CLI | `gh --version` | `winget install GitHub.cli` | `brew install gh` |
| Claude Code | `claude --version` | see code.claude.com/docs | see code.claude.com/docs |

Then log in to GitHub once:
```
gh auth login
```
Choose: GitHub.com → HTTPS → Yes (authenticate Git) → Login with a web browser.

## Build and publish the site
1. Unzip `agents-tutorial-kit.zip`, for example to `C:\Users\<you>\Projects\agents-tutorial-kit`.
2. Open a terminal in that folder and start Claude Code:
   ```
   cd C:\Users\<you>\Projects\agents-tutorial-kit
   claude
   ```
3. Paste this as the first message:
   ```
   Read CLAUDE.md and START_HERE.md. Then build the tutorial website and publish it to GitHub Pages by following the phases in CLAUDE.md. Start with Phase 0: check the tools and ask me the Phase 0 questions before doing anything else.
   ```
4. Answer the questions (repository name, public, author, licences). Approve when it asks to create the repository and push.
5. At the end it gives the site address, usually `https://<your-github-name>.github.io/climate-agents-tutorial/`.
   The first deployment can take a few minutes to appear.

Tip: to review the plan before any files are written, press Shift+Tab until "plan mode" shows,
then paste the message in step 3. Leave plan mode when the plan looks right.

## Updating the site later
1. Edit `content/tutorial.md` (or a template file).
2. In Claude Code, from the same folder: `Rebuild the site, check it on phone and laptop sizes, then commit and push.`
3. GitHub Actions publishes the new version automatically.
