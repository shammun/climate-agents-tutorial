"""A minimal agent and subagent, written without any AI tool or framework.

An agent is four things:
  1. a model         - something that reads messages and decides what to do next
  2. instructions    - the system prompt (the "rules")
  3. tools           - ordinary functions the model may ask to run
  4. a loop          - run the tool the model asked for, give it the result, repeat

A subagent is simply an agent that another agent calls as if it were a tool.

This file runs offline with Python only:  python examples/minimal_agent.py
The "model" here is a small scripted stand-in so the loop can be seen working.
To use a real model, replace the body of call_model() with a call to any
provider's chat API that supports tool calling, and keep everything else.
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).parent


# ---------------------------------------------------------------- tools
def list_files(folder):
    """Return the names of files in a folder."""
    return sorted(p.name for p in (HERE / folder).iterdir() if p.is_file())


def summarize_csv(path):
    """Return count, min, mean, max of the 'tas_C' column and how many values are -999 (missing)."""
    values = [float(row["tas_C"]) for row in csv.DictReader(open(HERE / path))]
    good = [v for v in values if v != -999]
    return {"rows": len(values), "missing": len(values) - len(good),
            "min": min(good), "mean": round(sum(good) / len(good), 2), "max": max(good)}


# ---------------------------------------------------------------- the model (replace this)
def call_model(system_prompt, messages, tool_names):
    """Decide the next action. Returns {"tool": name, "args": {...}} or {"final": text}.

    A real version sends system_prompt, messages and the tool descriptions to an LLM
    and converts its reply into this same dictionary. This stand-in follows a fixed script.
    """
    results = [m for m in messages if m["role"] == "tool"]
    if "summarize_csv" in tool_names:                      # behaving as the QC subagent
        if not results:
            return {"tool": "list_files", "args": {"folder": "."}}
        if len(results) == 1:
            csv_name = next(n for n in json.loads(results[0]["content"]) if n.endswith(".csv"))
            return {"tool": "summarize_csv", "args": {"path": csv_name}}
        s = json.loads(results[1]["content"])
        status = "PASS" if s["missing"] == 0 and -60 < s["min"] and s["max"] < 60 else "NEEDS ATTENTION"
        return {"final": f"QC of {s['rows']} rows: {s['missing']} missing (-999), "
                         f"range {s['min']}..{s['max']} °C. OVERALL: {status}"}
    else:                                                  # behaving as the main agent
        if not results:
            return {"tool": "ask_qc_agent", "args": {"task": "Check the station CSV file in this folder."}}
        return {"final": "The QC helper reported: " + results[0]["content"]}


# ---------------------------------------------------------------- the loop
def run_agent(name, system_prompt, tools, task, max_turns=8):
    messages = [{"role": "user", "content": task}]
    for turn in range(1, max_turns + 1):
        action = call_model(system_prompt, messages, list(tools))
        if "final" in action:
            print(f"[{name}] final answer: {action['final']}")
            return action["final"]
        print(f"[{name}] turn {turn}: calls {action['tool']}({action['args']})")
        result = tools[action["tool"]](**action["args"])
        messages.append({"role": "tool", "content": json.dumps(result) if not isinstance(result, str) else result})
    return "Stopped: turn limit reached."


# ---------------------------------------------------------------- a subagent = an agent used as a tool
QC_PROMPT = "You are a data quality checker. Inspect files and report problems. Never change files."
QC_TOOLS = {"list_files": list_files, "summarize_csv": summarize_csv}


def ask_qc_agent(task):
    """Tool for the main agent: starts the QC subagent with a fresh, empty conversation."""
    return run_agent("qc-subagent", QC_PROMPT, QC_TOOLS, task)


MAIN_PROMPT = "You are the lead analyst. Delegate quality checks to the QC helper."
MAIN_TOOLS = {"ask_qc_agent": ask_qc_agent}

if __name__ == "__main__":
    run_agent("main-agent", MAIN_PROMPT, MAIN_TOOLS, "Is the station data ready for analysis?")
