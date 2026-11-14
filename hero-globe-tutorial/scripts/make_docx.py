"""
make_docx.py
=============
Converts HERO_GLOBE_GUIDE.md to a formatted Word document.

Requirements:  pip install python-docx

Usage:
  python hero-globe-tutorial/scripts/make_docx.py

Output:
  hero-globe-tutorial/guide/HERO_GLOBE_GUIDE.docx
"""

import os
import re

SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
GUIDE_DIR   = os.path.join(SCRIPT_DIR, '..', 'guide')
INPUT_PATH  = os.path.normpath(os.path.join(GUIDE_DIR, 'HERO_GLOBE_GUIDE.md'))
OUTPUT_PATH = os.path.normpath(os.path.join(GUIDE_DIR, 'HERO_GLOBE_GUIDE.docx'))

# ── Import python-docx ────────────────────────────────────────────────────────
try:
    from docx import Document
    from docx.shared import Pt, RGBColor, Cm
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
except ImportError:
    print('python-docx is not installed.')
    print('Install it with:  pip install python-docx')
    raise


# ── Helpers ────────────────────────────────────────────────────────────────────

def set_cell_shading(cell, fill_hex):
    """Set background shading on a table cell."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)


def add_paragraph_shading(para, fill_hex):
    """Set background shading on a paragraph (for code blocks)."""
    pPr = para._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    pPr.append(shd)


def set_font(run, name, size_pt, bold=False, italic=False, color=None):
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    if color:
        run.font.color.rgb = RGBColor(*color)


def add_cover_page(doc):
    """Add a simple cover page as the first section."""
    # Title
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Building an Interactive Hero Globe')
    set_font(run, 'Calibri', 28, bold=True, color=(14, 107, 139))
    p.paragraph_format.space_before = Pt(144)  # ~5 cm from top

    # Subtitle
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Step-by-step guide')
    set_font(run, 'Calibri', 16, italic=True, color=(80, 100, 120))

    # Author and date
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Shammunul Islam · November 2026')
    set_font(run, 'Calibri', 12, color=(100, 120, 140))

    # URL
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('https://shammun.github.io/climate-agents-tutorial/')
    set_font(run, 'Calibri', 11, color=(14, 107, 139))

    # Page break
    doc.add_page_break()


def add_heading(doc, text, level):
    """Add a heading with appropriate style."""
    if level == 1:
        p = doc.add_heading(text, level=1)
        for run in p.runs:
            run.font.color.rgb = RGBColor(14, 107, 139)
            run.font.size = Pt(20)
    elif level == 2:
        p = doc.add_heading(text, level=2)
        for run in p.runs:
            run.font.color.rgb = RGBColor(8, 145, 178)
            run.font.size = Pt(15)
    elif level == 3:
        p = doc.add_heading(text, level=3)
        for run in p.runs:
            run.font.color.rgb = RGBColor(14, 116, 144)
            run.font.size = Pt(13)


def add_body_paragraph(doc, text):
    """Add a body text paragraph with Calibri 11pt, 1.15 line spacing."""
    from docx.shared import Pt
    from docx.oxml.ns import qn
    p = doc.add_paragraph()
    # Apply inline formatting: **bold** and `code`
    parts = re.split(r'(`[^`]+`|\*\*[^*]+\*\*)', text)
    for part in parts:
        if part.startswith('`') and part.endswith('`'):
            run = p.add_run(part[1:-1])
            set_font(run, 'Courier New', 9.5, color=(150, 60, 30))
        elif part.startswith('**') and part.endswith('**'):
            run = p.add_run(part[2:-2])
            set_font(run, 'Calibri', 11, bold=True)
        else:
            run = p.add_run(part)
            set_font(run, 'Calibri', 11)
    # 1.15 line spacing
    p.paragraph_format.line_spacing = Pt(11 * 1.15)
    p.paragraph_format.space_after = Pt(6)
    return p


def add_code_block(doc, code, lang=''):
    """Add a code block with Courier New, light grey background."""
    # Add a note showing the language
    if lang:
        p = doc.add_paragraph()
        run = p.add_run(lang)
        set_font(run, 'Calibri', 9, italic=True, color=(120, 120, 140))
        p.paragraph_format.space_after = Pt(1)

    for line in code.split('\n'):
        p = doc.add_paragraph()
        run = p.add_run(line if line else ' ')  # space keeps paragraph height
        set_font(run, 'Courier New', 9)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.left_indent = Cm(0.5)
        add_paragraph_shading(p, 'F4F4F8')  # very light grey

    # Breathing space after the block
    doc.add_paragraph().paragraph_format.space_before = Pt(0)


def add_table(doc, header_row, data_rows):
    """Add a simple table."""
    all_rows = [header_row] + data_rows
    tbl = doc.add_table(rows=len(all_rows), cols=len(header_row))
    tbl.style = 'Table Grid'
    for r_idx, row_data in enumerate(all_rows):
        row = tbl.rows[r_idx]
        for c_idx, cell_text in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.text = cell_text
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.name = 'Calibri'
                    run.font.size = Pt(10)
                    if r_idx == 0:
                        run.font.bold = True
            if r_idx == 0:
                set_cell_shading(cell, 'DDE8F0')
    doc.add_paragraph()  # space after table


def process_markdown(doc, md_text):
    """Parse markdown and add content to the document."""
    lines = md_text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]

        # Horizontal rule
        if re.match(r'^-{3,}$', line.strip()):
            i += 1
            continue

        # Code block (```...```)
        m = re.match(r'^```(\w*)', line)
        if m:
            lang = m.group(1)
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code_lines.append(lines[i])
                i += 1
            add_code_block(doc, '\n'.join(code_lines), lang)
            i += 1
            continue

        # Headings
        m = re.match(r'^(#{1,3})\s+(.*)', line)
        if m:
            level = len(m.group(1))
            text = m.group(2).strip()
            # Strip markdown formatting from heading text
            text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
            text = re.sub(r'`([^`]+)`', r'\1', text)
            add_heading(doc, text, level)
            i += 1
            continue

        # Table (detect by | characters)
        if '|' in line and line.strip().startswith('|'):
            table_lines = []
            while i < len(lines) and '|' in lines[i]:
                table_lines.append(lines[i])
                i += 1
            if len(table_lines) >= 2:
                # First line = header, second line = separator (skip), rest = data
                header = [c.strip() for c in table_lines[0].split('|') if c.strip()]
                data = []
                for tl in table_lines[2:]:
                    row = [c.strip() for c in tl.split('|') if c.strip()]
                    if row:
                        # Pad or trim to header length
                        while len(row) < len(header):
                            row.append('')
                        data.append(row[:len(header)])
                if header:
                    add_table(doc, header, data)
            continue

        # Blank line
        if not line.strip():
            i += 1
            continue

        # List item
        m = re.match(r'^(\s*)[-*]\s+(.*)', line)
        if m:
            indent = len(m.group(1)) // 2
            text = m.group(2)
            p = doc.add_paragraph(style='List Bullet')
            # Apply inline formatting
            parts = re.split(r'(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)', text)
            for part in parts:
                if part.startswith('`') and part.endswith('`'):
                    run = p.add_run(part[1:-1])
                    set_font(run, 'Courier New', 9.5, color=(150, 60, 30))
                elif part.startswith('**') and part.endswith('**'):
                    run = p.add_run(part[2:-2])
                    set_font(run, 'Calibri', 11, bold=True)
                elif part.startswith('*') and part.endswith('*'):
                    run = p.add_run(part[1:-1])
                    set_font(run, 'Calibri', 11, italic=True)
                else:
                    run = p.add_run(part)
                    set_font(run, 'Calibri', 11)
            p.paragraph_format.left_indent = Cm(0.5 * (indent + 1))
            i += 1
            continue

        # Numbered list item
        m = re.match(r'^(\s*)\d+\.\s+(.*)', line)
        if m:
            text = m.group(2)
            p = doc.add_paragraph(style='List Number')
            run = p.add_run(text)
            set_font(run, 'Calibri', 11)
            i += 1
            continue

        # Regular paragraph
        # Collect consecutive non-empty, non-special lines
        para_lines = []
        while i < len(lines) and lines[i].strip() and not lines[i].startswith('#') and not lines[i].startswith('```') and not lines[i].startswith('|') and not re.match(r'^[-*]\s', lines[i]):
            para_lines.append(lines[i].rstrip())
            i += 1
        if para_lines:
            text = ' '.join(para_lines)
            # Skip the italicised footer line (starts with *)
            if re.match(r'^\*[^*]', text):
                i += 0  # already incremented
                continue
            add_body_paragraph(doc, text)
        else:
            i += 1

    return doc


def main():
    print('Converting HERO_GLOBE_GUIDE.md → HERO_GLOBE_GUIDE.docx')
    print('=' * 56)

    if not os.path.exists(INPUT_PATH):
        print(f'Input file not found: {INPUT_PATH}')
        raise FileNotFoundError(INPUT_PATH)

    with open(INPUT_PATH, encoding='utf-8') as f:
        md_text = f.read()

    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin    = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin   = Cm(3.0)
        section.right_margin  = Cm(2.5)

    # Cover page
    add_cover_page(doc)

    # Process the markdown body, skipping the H1 title (already on cover)
    lines = md_text.split('\n')
    # Find and skip the first H1 and the first ---
    start = 0
    for idx, line in enumerate(lines):
        if line.startswith('# ') and start == 0:
            start = idx + 1
            continue
        if line.strip() == '---' and start > 0:
            start = idx + 1
            break
    body_md = '\n'.join(lines[start:])

    process_markdown(doc, body_md)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    doc.save(OUTPUT_PATH)
    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f'  Saved {OUTPUT_PATH}  ({size_kb:.0f} KB)')
    print('Done.')


if __name__ == '__main__':
    main()
