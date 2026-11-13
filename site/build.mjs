/**
 * Build script for climate-agents-tutorial.
 * Reads content/tutorial.md → expands markers → converts to HTML → writes dist/
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { createHighlighter } from 'shiki';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'content');
const TEMPLATE_DIR = join(ROOT, 'climate-agent-template');
const DIST = join(ROOT, 'dist');
const SITE = join(ROOT, 'site');

const REPO_URL = 'https://github.com/shammun/climate-agents-tutorial';
const BASE_URL = '/climate-agents-tutorial/';

const LANG_MAP = {
  '.md': 'markdown', '.py': 'python', '.json': 'json',
  '.toml': 'toml', '.yml': 'yaml', '.yaml': 'yaml', '.csv': 'text', '.txt': 'text',
};

/* ── helpers ───────────────────────────────────────────────────── */

function readText(p) { return readFileSync(p, 'utf-8'); }
function ensureDir(p) { mkdirSync(p, { recursive: true }); }

function walk(dir, base) {
  const results = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = relative(base, full).replace(/\\/g, '/');
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push({ rel, type: 'dir', children: walk(full, base) });
    } else if (!name.endsWith('.gitkeep')) {
      results.push({ rel, type: 'file', name });
    }
  }
  return results;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/* ── expand <!-- include: PATH --> ─────────────────────────────── */

function expandIncludes(text) {
  return text.replace(/^[ \t]*<!--\s*include:\s*(\S+)\s*-->[ \t]*$/gm, (_, rel) => {
    const full = join(TEMPLATE_DIR, rel);
    if (!existsSync(full)) { console.warn('  include not found:', rel); return ''; }
    const body = readText(full).replace(/\n+$/, '');
    const lang = LANG_MAP[extname(rel)] || 'text';
    return `\`\`\`\`${lang} title="${rel}"\n${body}\n\`\`\`\``;
  });
}

/* ── build interactive file-tree HTML ──────────────────────────── */

function buildTree(nodes, depth) {
  if (!nodes.length) return '';
  let out = '<ul>';
  for (const node of nodes) {
    if (node.type === 'dir') {
      out += `<li class="dir" data-name="${escapeHtml(node.rel)}">`;
      out += `<button type="button">${escapeHtml(node.rel.split('/').pop())}/</button>`;
      out += buildTree(node.children, depth + 1);
      out += '</li>';
    } else {
      const content = (() => {
        try { return readText(join(TEMPLATE_DIR, node.rel)); } catch { return ''; }
      })();
      out += `<li class="file">`;
      out += `<button type="button" data-path="${escapeHtml(node.rel)}" data-content="${escapeHtml(content)}">${escapeHtml(node.name)}</button>`;
      out += '</li>';
    }
  }
  out += '</ul>';
  return out;
}

function buildExplorer() {
  const nodes = walk(TEMPLATE_DIR, TEMPLATE_DIR);
  const treeHtml = buildTree(nodes, 0);
  return `<div class="explorer" id="explorer">
  <div class="ex-tree">${treeHtml}</div>
  <div class="ex-view">
    <div class="ex-head">
      <span class="ex-path"></span>
      <div class="ex-actions">
        <button class="ex-copy" type="button">Copy</button>
        <button class="ex-dl btn-dl" type="button">Download</button>
      </div>
    </div>
    <pre><code></code></pre>
  </div>
</div>`;
}

/* ── build TOC HTML ─────────────────────────────────────────────── */

function buildToc(html) {
  const groups = [];
  let current = null;
  const re = /<h([12]) id="([^"]+)"[^>]*>(.*?)<\/h[12]>/gs;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, level, id, raw] = m;
    const text = raw.replace(/<[^>]+>/g, '');
    if (level === '1') {
      current = { id, text, children: [] };
      groups.push(current);
    } else if (current) {
      current.children.push({ id, text });
    }
  }
  let out = '<ul>';
  for (const g of groups) {
    out += `<li class="grp"><a href="#${g.id}">${escapeHtml(g.text)}</a>`;
    if (g.children.length) {
      out += '<ul>';
      for (const c of g.children) {
        out += `<li><a href="#${c.id}">${escapeHtml(c.text)}</a></li>`;
      }
      out += '</ul>';
    }
    out += '</li>';
  }
  out += '</ul>';
  return out;
}

/* ── code highlighting with shiki ─────────────────────────────── */

async function buildHighlighter() {
  return createHighlighter({
    themes: ['github-light', 'github-dark-dimmed'],
    langs: ['python', 'markdown', 'json', 'toml', 'yaml', 'bash', 'powershell', 'text'],
  });
}

function highlightCode(highlighter, code, lang) {
  const safeLang = (['python','markdown','json','toml','yaml','bash','powershell'].includes(lang)) ? lang : 'text';
  try {
    return highlighter.codeToHtml(code, {
      lang: safeLang,
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
    });
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

/* ── process markdown to HTML ──────────────────────────────────── */

async function processMarkdown(text, highlighter) {
  const diagramNames = {
    'agent-loop': 'The agent loop. The model only decides; the loop runs the tools.',
    'agents-hub': 'A main agent hands tasks to subagents. Each has its own context and tools.',
    'anatomy': 'The anatomy of an agent file: frontmatter settings and body instructions.',
    'building-blocks': 'The four building blocks every AI coding tool shares.',
    'load-timeline': 'What is loaded at session start, on delegation, and when a skill is needed.',
    'pipeline': 'The five-agent pipeline: each step hands files to the next.',
  };

  /* replace diagram markers with safe short placeholders before markdown parsing */
  const explorerPlaceholder = 'ANTFILEEXPLORER';
  const diagramMap = {};
  let diagramIdx = 0;
  text = text.replace(/^[ \t]*<!--\s*diagram:\s*file-tree\s*-->[ \t]*$/gm, explorerPlaceholder);
  text = text.replace(/^[ \t]*<!--\s*diagram:\s*(\S+)\s*-->[ \t]*$/gm, (_, name) => {
    const key = `ANTDIAGRAM${diagramIdx++}`;
    const svgPath = join(CONTENT, 'diagrams', name + '.svg');
    if (!existsSync(svgPath)) { console.warn('  diagram not found:', name); return ''; }
    let svg = readText(svgPath);
    svg = svg.replace(/id="(ar|aa)"/g, `id="$1-${name}"`);
    svg = svg.replace(/url\(#(ar|aa)\)/g, `url(#$1-${name})`);
    svg = svg.replace(/ width="\d+"/, '').replace(/ height="\d+"/, '');
    const caption = diagramNames[name] || name;
    diagramMap[key] = { svg, caption };
    return key;
  });

  /* configure marked via marked.use() — required in marked v12 */
  const headingCounts = {};

  /* marked v12 calls renderer methods with old-style args, not token objects:
     heading(text, depth, raw), code(text, lang, escaped) */
  marked.use({
    gfm: true,
    renderer: {
      heading(text, depth) {
        const rawText = (text || '').replace(/<[^>]+>/g, '');
        let id = slugify(rawText);
        headingCounts[id] = (headingCounts[id] || 0) + 1;
        if (headingCounts[id] > 1) id += '-' + headingCounts[id];
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${depth}>\n`;
      },
      /* table is post-processed after marked runs — no override needed here */
      code(rawText, rawLang) {
        const code = rawText || '';
        /* parse optional title from lang string: ```python title="foo.py" */
        let lang = (rawLang || 'text').trim();
        let title = null;
        const titleMatch = lang.match(/^(\S+)\s+title="([^"]+)"/);
        if (titleMatch) { lang = titleMatch[1]; title = titleMatch[2]; }

        const hl = highlightCode(highlighter, code, lang);
        /* extract inner content from shiki output — use greedy match for robustness */
        const inner = hl.replace(/^[\s\S]*?<code[^>]*>/, '').replace(/<\/code>[\s\S]*$/, '');

        if (title) {
          const dlBtn = `<button class="btn-dl" type="button" data-path="${escapeHtml(title)}">Download</button>`;
          return `<div class="code file">
<div class="code-head"><span class="fname">${escapeHtml(title)}</span>
<div class="code-actions"><button class="btn-copy" type="button">Copy</button>${dlBtn}</div></div>
<pre><code class="language-${escapeHtml(lang)} shiki">${inner}</code></pre></div>\n`;
        }
        return `<div class="code">
<div class="code-head plain"><span class="lang">${escapeHtml(lang)}</span>
<div class="code-actions"><button class="btn-copy" type="button">Copy</button></div></div>
<pre><code class="language-${escapeHtml(lang)} shiki">${inner}</code></pre></div>\n`;
      },
    },
  });

  let html = await marked.parse(text);

  /* wrap tables for horizontal scrolling on mobile */
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');

  /* restore diagrams */
  for (const [key, { svg, caption }] of Object.entries(diagramMap)) {
    /* marked may wrap the placeholder in <p> tags */
    html = html.replace(new RegExp(`<p>\\s*${key}\\s*</p>`),
      `<figure class="diagram" role="img">${svg}<figcaption>${escapeHtml(caption)}</figcaption></figure>`);
  }

  /* restore file explorer */
  html = html.replace(/<p>\s*ANTFILEEXPLORER\s*<\/p>/, buildExplorer());

  /* add downloads section before sources heading */
  const downloadsHtml = `<div class="downloads" id="downloads">
<h3>Downloads</h3>
<ul class="dl-list">
<li><a class="btn" href="downloads/climate-agent-template.zip">climate-agent-template.zip</a></li>
<li><a class="btn" href="downloads/tutorial.docx">tutorial.docx</a></li>
<li><a class="btn" href="downloads/tutorial.md">tutorial.md</a></li>
</ul>
</div>`;
  html = html.replace(/<h2 id="sources"/, downloadsHtml + '\n<h2 id="sources"');

  return html;
}

/* ── main ───────────────────────────────────────────────────────── */

async function main() {
  console.log('Building climate-agents-tutorial…');

  ensureDir(join(DIST, 'assets'));
  ensureDir(join(DIST, 'downloads'));

  const highlighter = await buildHighlighter();

  /* read and expand tutorial */
  let tutorial = readText(join(CONTENT, 'tutorial.md'));
  /* strip YAML frontmatter */
  tutorial = tutorial.replace(/^---[\s\S]*?---\n/, '').trimStart();
  /* strip leading HTML comment block (the "source of truth" notice) */
  tutorial = tutorial.replace(/^<!--[\s\S]*?-->\s*\n/, '');
  /* expand includes */
  tutorial = expandIncludes(tutorial);

  /* convert to HTML */
  const contentHtml = await processMarkdown(tutorial, highlighter);

  /* build TOC */
  const tocHtml = buildToc(contentHtml);

  /* load shell */
  let shell = readText(join(SITE, 'template', 'shell.html'));
  shell = shell
    .replace(/__CONTENT__/g, contentHtml)
    .replace(/__TOC__/g, tocHtml)
    .replace(/__REPO__/g, REPO_URL)
    .replace(/__BASE__/g, BASE_URL);

  /* write index.html */
  writeFileSync(join(DIST, 'index.html'), shell, 'utf-8');
  console.log('  wrote dist/index.html');

  /* copy assets */
  copyFileSync(join(SITE, 'styles.css'), join(DIST, 'assets', 'styles.css'));
  copyFileSync(join(SITE, 'app.js'), join(DIST, 'assets', 'app.js'));
  console.log('  copied assets');

  /* verify no unresolved markers */
  const remaining = shell.match(/<!--\s*(include|diagram):/g);
  if (remaining) console.warn('  WARNING: unresolved markers remaining:', remaining.length);
  else console.log('  all markers resolved');

  console.log('Done. Run: npm run preview');
}

main().catch(err => { console.error(err); process.exit(1); });
