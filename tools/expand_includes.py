"""Expand include markers in the tutorial text.

Replaces each line  <!-- include: PATH -->  with a fenced code block holding the file at
climate-agent-template/PATH, labelled with its path. Diagram markers are left in place.

Usage (from the kit root):
    python tools/expand_includes.py content/tutorial.md > tutorial.expanded.md
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "climate-agent-template"
LANG = {".md": "markdown", ".py": "python", ".json": "json", ".toml": "toml", ".yml": "yaml", ".csv": "csv"}
MARKER = re.compile(r"^<!--\s*include:\s*(\S+)\s*-->\s*$")


def expand(text):
    out = []
    for line in text.splitlines():
        m = MARKER.match(line.strip())
        if not m:
            out.append(line)
            continue
        rel = m.group(1)
        body = (TEMPLATE / rel).read_text(encoding="utf-8").rstrip("\n")
        lang = LANG.get(Path(rel).suffix, "text")
        # four backticks so files that contain ``` blocks stay intact
        out.append(f"````{lang} title=\"{rel}\"")
        out.append(body)
        out.append("````")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "content" / "tutorial.md"
    sys.stdout.write(expand(src.read_text(encoding="utf-8")))
