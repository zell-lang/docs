#!/usr/bin/env node
// Pulls the language repository (zell-lang/zell) and turns its Markdown into
// Docusaurus pages under docs/. Nothing here is committed: the build runs it.
//
//   --fetch-only  only clone/update the source (CI builds the API from it)
//
//   ZELL_REF   branch, tag or commit to build from (default: master)
//   ZELL_SRC   use this checkout instead of cloning (local development)
//   ZELL_DOCS_JSON  path to std/docs.json from `zell doc --site <dir>`
//              (default: ./generated-api/std/docs.json; the API is skipped,
//              with a notice, when the file is absent)
//
// No dependencies beyond Node and git.

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'https://github.com/zell-lang/zell';
const REF = process.env.ZELL_REF || 'master';
const warnings = [];
const warn = (m) => {
  warnings.push(m);
  console.warn(`warning: ${m}`);
};

// ---------------------------------------------------------------- source --

function git(args, cwd) {
  return execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit']}).trim();
}

function obtainSource() {
  if (process.env.ZELL_SRC) return path.resolve(process.env.ZELL_SRC);
  const dir = path.join(ROOT, '.cache', 'zell');
  if (!fs.existsSync(path.join(dir, '.git'))) {
    fs.mkdirSync(dir, {recursive: true});
    git(['init', '-q'], dir);
    git(['remote', 'add', 'origin', `${REPO}.git`], dir);
  }
  git(['fetch', '-q', '--depth', '1', 'origin', REF], dir);
  git(['checkout', '-q', '--force', 'FETCH_HEAD'], dir);
  return dir;
}

const SRC = obtainSource();
const SHA = git(['rev-parse', 'HEAD'], SRC);
if (process.argv.includes('--fetch-only')) {
  console.log(`fetched zell@${SHA.slice(0, 8)} into ${SRC}`);
  process.exit(0);
}
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(SRC, rel));

// ------------------------------------------------------------- utilities --

const gh = (kind, rel) => `${REPO}/${kind}/${SHA}/${rel}`;
const editUrl = (rel) => `${REPO}/edit/${REF === SHA ? 'master' : REF}/${rel}`;

/** GitHub-style heading slug, the one Docusaurus uses for heading ids. */
function slugger() {
  const seen = new Map();
  return (text) => {
    let s = text
      .toLowerCase()
      .replace(/[`*_~]/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '')
      .replace(/ /g, '-');
    const n = seen.get(s) ?? 0;
    seen.set(s, n + 1);
    return n ? `${s}-${n}` : s;
  };
}

const CYR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
const translit = (s) =>
  [...s.toLowerCase()]
    .map((c) => CYR[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const yaml = (s) => JSON.stringify(s);
const frontMatter = (o) =>
  '---\n' +
  Object.entries(o)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? yaml(v) : v}`)
    .join('\n') +
  '\n---\n\n';

function write(rel, text) {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, text);
}

function clean() {
  for (const d of ['docs/guide', 'docs/spec', 'docs/design', 'docs/std', 'docs/examples']) fs.rmSync(path.join(ROOT, d), {recursive: true, force: true});
  for (const f of ['docs/examples.md', 'docs/editors/vscode.md', 'docs/editors/other.md']) fs.rmSync(path.join(ROOT, f), {force: true});
  fs.rmSync(path.join(ROOT, 'generated'), {recursive: true, force: true});
  fs.mkdirSync(path.join(ROOT, 'generated'), {recursive: true});
}

// ------------------------------------------------------------- Markdown ---

/** Splits Markdown into lines tagged as fenced code or prose. */
function scan(md) {
  const out = [];
  let fence = null;
  for (const line of md.split('\n')) {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      out.push({line, code: true});
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && /^\s*(`{3,}|~{3,})\s*$/.test(line)) fence = null;
    } else if (m) {
      fence = m[1];
      out.push({line, code: true});
    } else out.push({line, code: false});
  }
  return out;
}

/** Applies fn to the prose parts of a line (outside inline code spans). */
function mapProse(line, fn) {
  let res = '';
  let last = 0;
  const re = /(`+)(?:(?!\1)[\s\S])*?\1(?!`)/g;
  let m;
  while ((m = re.exec(line))) {
    res += fn(line.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return res + fn(line.slice(last));
}

/**
 * Makes GitHub Markdown safe for the site: drops HTML comments (build
 * markers), turns `<url>` autolinks into links, escapes any other `<` that
 * is not in code (`<T>`, `<archive>`, `<pid>` would be taken for HTML), and
 * rewrites links through `linkFn`.
 */
function transform(md, linkFn) {
  let inComment = false;
  const out = [];
  for (const {line, code} of scan(md)) {
    if (code) {
      out.push(line);
      continue;
    }
    let l = line;
    if (inComment) {
      const e = l.indexOf('-->');
      if (e < 0) continue;
      inComment = false;
      l = l.slice(e + 3);
    }
    for (;;) {
      const s = l.indexOf('<!--');
      if (s < 0) break;
      const e = l.indexOf('-->', s + 4);
      if (e < 0) {
        l = l.slice(0, s);
        inComment = true;
        break;
      }
      l = l.slice(0, s) + l.slice(e + 3);
    }
    if (l.trim() === '' && line.trim() !== '' ) continue; // a line that was only a comment
    l = mapProse(l, (t) =>
      t
        .replace(/<((?:https?|mailto):[^>\s]+)>/g, '[$1]($1)')
        .replace(/<(?!\/?(?:br|kbd|sub|sup)\b)/g, '&lt;'),
    );
    l = l.replace(/(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (_, a, href, c) => a + linkFn(href) + c);
    l = l.replace(/^(\s{0,3}\[[^\]]+\]:\s*)(\S+)/, (_, a, href) => a + linkFn(href));
    out.push(l);
  }
  return out.join('\n');
}

function headings(md) {
  const slug = slugger();
  const res = [];
  for (const {line, code} of scan(md)) {
    if (code) continue;
    const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (m) res.push({level: m[1].length, text: m[2], id: slug(m[2])});
  }
  return res;
}

// ------------------------------------------------------------ page plan ---

const GUIDE_ORDER = ['getting-started', 'tour', 'errors', 'async', 'memory', 'packages', 'testing', 'debugging', 'faq'];
const DESIGN_ORDER = ['TOOLING', 'PACKAGES', 'FRAMEWORK', 'STDLIB', 'PLATFORMS', 'SECURITY', 'DEBUGGER', 'PATTERNS', 'GUI', 'LSP_CONFORMANCE', 'REFLECTION_PLAN'];
const DESIGN_SKIP = new Set(['LANGUAGE_FEEDBACK', 'EXAMPLES']);

/** repo path -> site route, for every page the sync emits. */
const routes = new Map();
const guideFiles = fs
  .readdirSync(path.join(SRC, 'docs/guide'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.slice(0, -3))
  .sort((a, b) => {
    const ra = GUIDE_ORDER.indexOf(a);
    const rb = GUIDE_ORDER.indexOf(b);
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.localeCompare(b);
  });
for (const g of guideFiles) routes.set(`docs/guide/${g}.md`, `/guide/${g}`);

const designFiles = fs
  .readdirSync(path.join(SRC, 'docs'))
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.slice(0, -3))
  .filter((n) => !DESIGN_SKIP.has(n))
  .sort((a, b) => {
    const ra = DESIGN_ORDER.indexOf(a);
    const rb = DESIGN_ORDER.indexOf(b);
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.localeCompare(b);
  });
for (const d of designFiles) routes.set(`docs/${d}.md`, `/design/${d.toLowerCase().replace(/_/g, '-')}`);
routes.set('docs/EXAMPLES.md', '/examples');
// docs/examples/<name>/README.md: one page per example project, in the
// order the index (docs/EXAMPLES.md) links them, then by name.
const exampleProjects = (() => {
  const dir = path.join(SRC, 'docs/examples');
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'README.md')));
  const index = read('docs/EXAMPLES.md');
  const at = (n) => {
    const i = index.indexOf(`examples/${n}/README.md`);
    return i < 0 ? Infinity : i;
  };
  return names.sort((a, b) => at(a) - at(b) || a.localeCompare(b));
})();
for (const n of exampleProjects) routes.set(`docs/examples/${n}/README.md`, `/examples/${n}`);
routes.set('editors/vscode/README.md', '/editors/vscode');

// DESIGN.md: split by `##`, outside fences.
const design = read('DESIGN.md');
const specSections = []; // {title, slug, lines[]}
let specIntro = [];
{
  let cur = null;
  for (const {line, code} of scan(design)) {
    const m = !code && /^##\s+(.*?)\s*$/.exec(line);
    if (m) {
      cur = {title: m[1], slug: translit(m[1]), lines: [line]};
      specSections.push(cur);
    } else (cur ? cur.lines : specIntro).push(line);
  }
}
const specRoute = (s) => `/spec/${s.slug}`;
/** DESIGN.md heading id -> route of the page that holds it. */
const specAnchor = new Map();
for (const s of specSections) {
  for (const h of headings(s.lines.join('\n'))) if (!specAnchor.has(h.id)) specAnchor.set(h.id, specRoute(s));
}
routes.set('DESIGN.md', '/spec');

// README anchors that moved to hand-written or extracted pages.
const readmeAnchors = {
  install: '/download#install',
  'prebuilt-toolchain': '/download#prebuilt-toolchain',
  'your-first-program': '/guide/getting-started',
  editors: '/editors',
  examples: '/examples',
  'the-language-server-and-other-editors': '/editors/other',
};

function makeLinkFn(fromRel, localIds = new Set()) {
  return (href) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return href;
    if (href.startsWith('#')) {
      const id = href.slice(1);
      if (!id || localIds.has(id)) return href;
      if (specAnchor.has(id) && fromRel === 'DESIGN.md') return `${specAnchor.get(id)}#${id}`;
      return fromRel === 'README.md' || fromRel === 'editors/vscode/README.md' ? `${REPO}#${id}` : href;
    }
    const [p, hash = ''] = href.split('#');
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), p));
    const frag = hash ? `#${hash}` : '';
    if (target === 'README.md') return readmeAnchors[hash] ?? (hash ? `${REPO}#${hash}` : '/');
    if (target === 'DESIGN.md') return hash && specAnchor.has(hash) ? `${specAnchor.get(hash)}#${hash}` : '/spec';
    if (routes.has(target)) return routes.get(target) + frag;
    const clean = target.replace(/\/$/, '');
    if (exists(clean)) return gh(fs.statSync(path.join(SRC, clean)).isDirectory() ? 'tree' : 'blob', clean) + frag;
    warn(`${fromRel}: link to missing ${href}`);
    return gh('blob', clean) + frag;
  };
}

function emitDoc(outRel, fromRel, body, extra = {}) {
  const hs = headings(body);
  const h1 = /^#\s+(.*)$/m.exec(scan(body).filter((x) => !x.code).map((x) => x.line).join('\n'));
  let content = body;
  let title = extra.title;
  if (h1 && !title) {
    title = h1[1].replace(/[`*]/g, '');
    content = body.replace(/^#\s+.*\n+/m, '');
  }
  const ids = new Set(hs.map((h) => h.id));
  const fm = {title, ...extra, custom_edit_url: editUrl(extra.edit ?? fromRel)};
  delete fm.edit;
  write(outRel, frontMatter(fm) + transform(content, makeLinkFn(fromRel, ids)).replace(/\n{3,}/g, '\n\n') + '\n');
}

// ---------------------------------------------------------------- emit ----

clean();
let pageCount = 0;

// Guide
guideFiles.forEach((g, i) => {
  emitDoc(`docs/guide/${g}.md`, `docs/guide/${g}.md`, read(`docs/guide/${g}.md`), {sidebar_position: i + 1, slug: `/guide/${g}`});
  pageCount++;
});

// Specification
{
  const note =
    ':::note Язык спецификации / Language of the specification\n' +
    'The specification (`DESIGN.md`) is written in Russian. The guides, the design documents and the standard-library reference are in English.\n' +
    ':::\n\n';
  const introBody = specIntro.join('\n').replace(/^#\s+.*\n+/, '');
  const toc = specSections.map((s) => `- [${s.title}](${specRoute(s)})`).join('\n');
  write(
    'docs/spec/index.md',
    frontMatter({title: 'Спецификация языка', sidebar_label: 'Overview', sidebar_position: 0, slug: '/spec', custom_edit_url: editUrl('DESIGN.md')}) +
      note +
      transform(introBody, makeLinkFn('DESIGN.md')).trim() +
      '\n\n## Разделы\n\n' +
      toc +
      '\n',
  );
  specSections.forEach((s, i) => {
    const body = s.lines.join('\n').replace(/^##\s+.*\n+/, '');
    const ids = new Set(headings(s.lines.join('\n')).map((h) => h.id));
    write(
      `docs/spec/${String(i + 1).padStart(2, '0')}-${s.slug}.md`,
      frontMatter({title: s.title, sidebar_label: s.title, sidebar_position: i + 1, slug: specRoute(s), custom_edit_url: editUrl('DESIGN.md')}) +
        note +
        transform(body, makeLinkFn('DESIGN.md', ids)).replace(/\n{3,}/g, '\n\n').trim() +
        '\n',
    );
  });
  pageCount += specSections.length + 1;
}

// Design docs
{
  const items = [];
  designFiles.forEach((d, i) => {
    const slug = routes.get(`docs/${d}.md`);
    emitDoc(`docs/design/${slug.split('/').pop()}.md`, `docs/${d}.md`, read(`docs/${d}.md`), {sidebar_position: i + 1, slug});
    items.push(`design/${slug.split('/').pop()}`);
    pageCount++;
  });
  write('generated/design.json', JSON.stringify(items));
}

// Examples, VS Code
emitDoc('docs/examples.md', 'docs/EXAMPLES.md', read('docs/EXAMPLES.md'), {slug: '/examples', title: 'Examples'});
// Example projects: the README of each is the page (its H1 is the title);
// the sidebar lists them under the index, in exampleProjects order.
exampleProjects.forEach((n, i) => {
  const rel = `docs/examples/${n}/README.md`;
  emitDoc(`docs/examples/${n}.md`, rel, read(rel), {sidebar_label: n, sidebar_position: i + 1, slug: `/examples/${n}`});
  pageCount++;
});
write('generated/examples.json', JSON.stringify(exampleProjects.map((n) => `examples/${n}`)));
emitDoc('docs/editors/vscode.md', 'editors/vscode/README.md', read('editors/vscode/README.md'), {
  title: 'VS Code',
  sidebar_position: 2,
  slug: '/editors/vscode',
});
pageCount += 2;

// README: the "other editors" section, the landing-page data.
const readme = read('README.md');
{
  const lines = readme.split('\n');
  const start = lines.findIndex((l) => /^###\s+The language server and other editors/.test(l));
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (start < 0) warn('README: "The language server and other editors" section not found');
  else {
    if (end < 0) end = lines.length;
    const body = lines.slice(start + 1, end).join('\n').trim();
    emitDoc('docs/editors/other.md', 'README.md', body, {title: 'Other editors and the language server', sidebar_label: 'Other editors', sidebar_position: 3, slug: '/editors/other'});
    pageCount++;
  }
  const fenceAt = lines.findIndex((l) => l.startsWith('```zell'));
  const fenceEnd = lines.findIndex((l, i) => i > fenceAt && l.startsWith('```'));
  const intro = lines.slice(1, fenceAt).join('\n').trim();
  const [lead, ...rest] = intro.split(/\n\n/);
  const bullets = [];
  for (const l of rest.join('\n\n').split('\n')) {
    if (/^- /.test(l)) bullets.push(l.slice(2));
    else if (/^\s+\S/.test(l) && bullets.length) bullets[bullets.length - 1] += ' ' + l.trim();
  }
  const clean = (s) => s.replace(/\n/g, ' ');
  write(
    'generated/landing.json',
    JSON.stringify({lead: clean(lead), bullets: bullets.map(clean), code: lines.slice(fenceAt + 1, fenceEnd).join('\n')}, null, 2),
  );
}

// ------------------------------------------------------------ API pages ---

const KIND_ORDER = [
  ['const', 'Constants'],
  ['enum', 'Enums'],
  ['interface', 'Interfaces'],
  ['struct', 'Types'],
  ['func', 'Functions'],
];

/** Escapes plain doc-comment text for CommonMark prose. */
function prose(text) {
  const out = [];
  let para = [];
  const flush = () => {
    if (!para.length) return;
    if (para.every((l) => /^(\t|\s{2,})/.test(l))) {
      const min = Math.min(...para.map((l) => l.match(/^\s*/)[0].length));
      out.push('```zell\n' + para.map((l) => l.slice(min)).join('\n') + '\n```');
    } else {
      out.push(
        para
          .map((l) =>
            mapProse(l.trim(), (t) =>
              t
                .split(/(https?:\/\/\S+)/)
                .map((x, i) =>
                  i % 2
                    ? '`' + x.replace(/[.,;:]+$/, '') + '`' + (x.match(/[.,;:]+$/)?.[0] ?? '')
                    : x.replace(/\\/g, '\\\\').replace(/[*<\[\]]/g, (c) => (c === '<' ? '&lt;' : '\\' + c)).replace(/^([#>])/, '\\$1'),
                )
                .join(''),
            ),
          )
          .join('\n'),
      );
    }
    para = [];
  };
  for (const l of text.split('\n')) {
    if (l.trim() === '') flush();
    else para.push(l);
  }
  flush();
  return out.join('\n\n');
}

const fence = (code, lang = 'zell') => {
  const f = code.includes('```') ? '````' : '```';
  return `${f}${lang}\n${code}\n${f}`;
};
const cell = (s) => (s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function renderItem(it, kind) {
  const id = `${kind === 'struct' ? 'type' : kind}-${it.name}`.toLowerCase();
  let s = `### ${it.name} {#${id}}\n\n${fence(it.signature)}\n\n`;
  if (it.doc) s += prose(it.doc) + '\n\n';
  const members = it.members ?? [];
  const groups = [
    ['field', 'Fields'],
    ['variant', 'Variants'],
    ['method', 'Methods'],
  ];
  for (const [mk, label] of groups) {
    const ms = members.filter((m) => m.kind === mk);
    if (!ms.length) continue;
    s += `**${label}**\n\n`;
    for (const m of ms) {
      s += `- ${'`'}${m.signature.replace(/`/g, "'").replace(/\s+/g, ' ')}${'`'}${m.doc ? ' — ' + prose(m.doc).replace(/\n\n/g, '\n  \n  ').replace(/\n/g, ' ') : ''}\n`;
    }
    s += '\n';
  }
  for (const ex of it.examples ?? []) {
    s += `**Example**\n\n${fence(ex.code)}\n\n`;
    if (ex.output) s += `Output:\n\n${fence(ex.output, 'text')}\n\n`;
  }
  return s;
}

function buildApi() {
  const jsonPath = process.env.ZELL_DOCS_JSON || path.join(ROOT, 'generated-api', 'std', 'docs.json');
  if (!fs.existsSync(jsonPath)) {
    console.warn(`notice: ${jsonPath} not found, the standard-library reference is skipped (build it with \`zell doc --site <dir>\`)`);
    write(
      'docs/std/index.md',
      frontMatter({title: 'Standard library', sidebar_label: 'Overview', slug: '/std'}) +
        'The API reference is generated from the toolchain\'s `zell doc --site` output, which was not available in this build. See the [source of the standard library](' +
        `${REPO}/tree/master/std).\n`,
    );
    write('generated/std.json', JSON.stringify(['std/index']));
    return;
  }
  const {namespaces} = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  namespaces.sort((a, b) => a.name.localeCompare(b.name));
  const docId = (n) => n.replace(/\./g, '-');

  for (const ns of namespaces) {
    const items = ns.items.filter((i) => i.exported !== false);
    let body = `${'`'}import ${ns.name}${'`'}\n\n`;
    if (ns.doc) body += prose(ns.doc.replace(/^[A-Za-z0-9_.]+: /, '')) + '\n\n';
    const sections = [];
    for (const [k, label] of KIND_ORDER) {
      const its = items.filter((i) => i.kind === k).sort((a, b) => a.name.localeCompare(b.name));
      if (its.length) sections.push([k, label, its]);
    }
    if (sections.length) {
      body += '## Index\n\n| Name | Kind | Description |\n|---|---|---|\n';
      for (const [k, label, its] of sections)
        for (const i of its) body += `| [${i.name}](#${`${k === 'struct' ? 'type' : k}-${i.name}`.toLowerCase()}) | ${label.replace(/s$/, '').toLowerCase()} | ${cell(prose(i.summary || ''))} |\n`;
      body += '\n';
    }
    for (const [k, label, its] of sections) {
      body += `## ${label}\n\n` + its.map((i) => renderItem(i, k)).join('');
    }
    const file = ns.files?.[0];
    write(
      `docs/std/${docId(ns.name)}.md`,
      frontMatter({
        title: ns.name,
        sidebar_label: ns.name,
        slug: `/std/${docId(ns.name)}`,
        description: (ns.summary || '').slice(0, 250),
        custom_edit_url: file ? editUrl(file) : undefined,
      }) + body.replace(/\n{3,}/g, '\n\n'),
    );
    pageCount++;
  }

  // Overview page and sidebar, grouped by the first dotted component.
  const groups = new Map();
  for (const ns of namespaces) {
    const top = ns.name.split('.')[0];
    if (!groups.has(top)) groups.set(top, []);
    groups.get(top).push(ns);
  }
  let overview = `The standard library has ${namespaces.length} namespaces. The reference below is generated from the doc comments of \`std/\` in [zell@${SHA.slice(0, 8)}](${REPO}/tree/${SHA}/std) by \`zell doc --site\`; import a namespace with \`import name\`.\n\n`;
  const side = ['std/index'];
  for (const [top, list] of [...groups].sort((a, b) => a[0].localeCompare(b[0]))) {
    overview += `## ${top}\n\n` + list.map((n) => `- [${n.name}](/std/${docId(n.name)}) — ${prose(n.summary || '')}`).join('\n') + '\n\n';
    if (list.length === 1) side.push(`std/${docId(list[0].name)}`);
    else side.push({type: 'category', label: top, collapsed: true, items: list.map((n) => `std/${docId(n.name)}`)});
  }
  write('docs/std/index.md', frontMatter({title: 'Standard library', sidebar_label: 'Overview', slug: '/std'}) + overview);
  write('generated/std.json', JSON.stringify(side));
  pageCount++;
}
buildApi();

// -------------------------------------------------------------- version ---

const date = git(['log', '-1', '--format=%cI'], SRC);
write('generated/version.json', JSON.stringify({sha: SHA, short: SHA.slice(0, 8), ref: REF, date}, null, 2));

console.log(`synced zell@${SHA.slice(0, 8)} (${REF}): ${pageCount} generated pages, ${warnings.length} warning(s)`);
