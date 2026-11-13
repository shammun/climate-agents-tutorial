---
name: run-climate-pipeline
description: Runs the full five-step climate workflow (download, QC, analysis, figures, review) for one research question. Started only by the user with /run-climate-pipeline.
disable-model-invocation: true
argument-hint: "[research question]"
---

# Run the climate pipeline

Research question: $ARGUMENTS

Work through these steps in order. Hand each step to the named subagent and pass it full file paths.
After each step, show a two-line summary to the user before continuing.

1. **Download** — ask the data-fetcher subagent for the data the question needs.
2. **Quality check** — ask the data-qc subagent to check every new file.
   Save each report to reports/qc_<file-name>.md.
   If any report says NEEDS ATTENTION, stop and show the problem to the user.
3. **Analysis** — ask the climate-analyst subagent to answer the question.
4. **Figures** — ask the figure-maker subagent for one map and one time series.
5. **Review** — ask the results-reviewer subagent to check steps 3 and 4.
   If the verdict is NOT READY, show the findings to the user and stop.

Finish with a short summary: the answer to the question in one or two sentences,
the key numbers with units, and the paths of the figures.
