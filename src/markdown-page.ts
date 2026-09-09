import { COMMON_CSS, COMMON_MOBILE_CSS, footerHtml, headerHtml, type PageId } from './page-common.ts'

function esc(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

/**
 * Markdown 内の .md ファイルへのリンクを、ビルド後の .html ページへのリンクに書き換える。
 * 例: [text](recipes.md#アンカー) → [text](recipes.html#アンカー)、[text](menu.md) → [text](menu.html)
 * リンク記法（`)` や `#` が直後に来るもの）だけを対象にし、プレーンテキスト中のファイル名は変えない。
 */
export function rewriteMdLinks(md: string): string {
  return md.replaceAll('.md#', '.html#').replaceAll('.md)', '.html)')
}

const MD_CSS = `
  .lead { padding: 32px 0 24px; border-bottom: 1px solid var(--rule); margin-bottom: 24px; }
  .lead h1 { font-size: 26px; line-height: 1.4; margin: 0 0 8px; font-weight: 600; }
  .lead .dek { font-size: 14px; color: var(--ink-soft); margin: 0; }
  .docs-layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 28px; align-items: start; }
  .toc-panel { position: sticky; top: 24px; border: 1px solid var(--rule); border-radius: 8px; background: var(--bg); overflow: hidden; }
  .toc-panel summary { padding: 14px 16px; font-weight: 600; cursor: pointer; background: var(--bg-soft); font-size: 13px; }
  .toc-body { padding: 12px; }
  .search-label { display: block; font-size: 12px; color: var(--ink-soft); margin-bottom: 6px; }
  #toc-search { width: 100%; min-height: 36px; padding: 7px 10px; border: 1px solid var(--rule); border-radius: 6px; background: var(--bg); color: var(--ink); }
  #page-toc { max-height: calc(100vh - 240px); overflow-y: auto; margin: 12px -4px 0; padding: 0 4px; list-style: none; }
  #page-toc li { margin: 2px 0; }
  #page-toc a { display: block; color: var(--ink-soft); text-decoration: none; font-size: 12px; padding: 7px 10px; border-radius: 6px; overflow-wrap: anywhere; }
  #page-toc a:hover { color: var(--ink); background: var(--bg-soft); }
  #page-toc a[aria-current="location"] { color: var(--accent); background: #ddf4ff; font-weight: 600; box-shadow: inset 2px 0 var(--accent); }
  #page-toc .toc-sub a { padding-left: 22px; }
  .toc-status { color: var(--ink-soft); font-size: 12px; margin: 8px 0 0; }
  .md { border: 1px solid var(--rule); border-radius: 8px; padding: 28px 32px; min-width: 0; overflow-wrap: anywhere; }
  .md > h1:first-child { display: none; }
  .md > p:first-of-type { color: var(--ink-soft); }
  .md h2 { font-size: 21px; font-weight: 600; margin: 40px 0 18px; padding-bottom: 10px; border-bottom: 1px solid var(--rule); line-height: 1.5; }
  .md h3 { font-size: 17px; font-weight: 600; margin: 30px 0 12px; line-height: 1.5; }
  .md h4 { font-size: 15px; margin: 24px 0 10px; }
  .md h2:target, .md h3:target { background: var(--accent-soft); border-radius: 4px; }
  .md p { margin: 0 0 16px; }
  .md ul, .md ol { padding-left: 22px; margin: 0 0 18px; }
  .md li { margin-bottom: 6px; }
  .md strong { font-weight: 600; }
  .md a { text-decoration: none; }
  .md a:hover { text-decoration: underline; }
  .md .table-scroll { margin: 0 0 22px; border: 1px solid var(--rule); border-radius: 6px; }
  .md table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .md thead th { text-align: left; font-size: 12px; font-weight: 600; padding: 10px 12px; background: var(--bg-soft); border-bottom: 1px solid var(--rule); white-space: nowrap; }
  .md tbody td { padding: 11px 12px; border-bottom: 1px solid var(--rule); vertical-align: top; }
  .md tbody tr:last-child td { border-bottom: 0; }
  .md tbody tr:nth-child(even) { background: #f6f8fa80; }
  .md code { background: #eff1f3; padding: 2px 5px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 12px; }
  .md pre { background: var(--bg-soft); padding: 16px; border-radius: 6px; overflow-x: auto; }
  .md pre code { padding: 0; background: none; }
  .md blockquote { border-left: 3px solid var(--rule); color: var(--ink-soft); margin: 0 0 18px; padding: 0 16px; }
  .md hr { border: 0; border-top: 1px solid var(--rule); margin: 32px 0; }
`
const MD_MOBILE_CSS = `
  @media (max-width: 960px) {
    .docs-layout { grid-template-columns: 220px minmax(0, 1fr); gap: 20px; }
    .md { padding: 20px; }
  }
  @media (max-width: 760px) {
    .docs-layout { grid-template-columns: minmax(0, 1fr); gap: 16px; }
    .toc-panel { position: static; }
    #page-toc { max-height: 240px; }
    #page-toc a { min-height: 40px; padding-top: 10px; }
    .lead { padding: 24px 0 20px; margin-bottom: 16px; }
    .lead h1 { font-size: 24px; }
    .lead .dek { font-size: 13px; }
    .md { padding: 18px 16px; }
    .md h2 { font-size: 19px; margin-top: 32px; }
    .md h3 { font-size: 16px; }
    .md table { min-width: 480px; }
  }
`

/** ページごとのリード文（初見の読者に、そのページが何かを1行で伝える） */
const LEADS: Record<PageId, { title: string; dek: string }> = {
  dashboard: { title: '記録', dek: '' },
  plan: {
    title: '計画',
    dek: 'カロリーとPFCの設計、運動メニュー、そして実測に合わせて計画をどう修正してきたかの記録です。',
  },
  menu: {
    title: '献立と買い物',
    dek: '週2回の買い物で食材を使い切る前提で組んだ1週間分の献立です。数値はすべて概算です。',
  },
  recipes: {
    title: 'レシピ',
    dek: '献立に出てくる料理の作り方。すべて1人分、調理時間は5〜15分を目安にしています。',
  },
}

/**
 * plan.md / menu.md / recipes.md を表示する静的HTMLページを生成する。
 * Markdownは埋め込み、marked（CDN）で描画。見出しにはGitHub風のアンカーidを付与し、
 * menu.md → recipes.md のようなアンカー付きリンク（.html に書き換え済み）が機能するようにする。
 */
export function buildMarkdownPage(opts: { title: string; md: string; active: PageId; generatedAt: string }): string {
  const embedded = JSON.stringify(rewriteMdLinks(opts.md)).replaceAll('</', '<\\/')
  const lead = LEADS[opts.active]

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)} | 減量・体力増強の記録</title>
<meta name="description" content="${esc(lead.dek)}">
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>${COMMON_CSS}${MD_CSS}${COMMON_MOBILE_CSS}${MD_MOBILE_CSS}</style>
</head>
<body>
${headerHtml(opts.active)}
<main id="main-content" class="wrap" tabindex="-1">
  <div class="lead">
    <h1>${esc(opts.title)}</h1>
    <p class="dek">${esc(lead.dek)}</p>
  </div>
  <div class="docs-layout">
    <details class="toc-panel" open>
      <summary>このページの目次</summary>
      <div class="toc-body">
        <label class="search-label" for="toc-search">見出し・料理名を検索</label>
        <input id="toc-search" type="search" placeholder="キーワードで絞り込み" autocomplete="off" aria-controls="page-toc">
        <nav aria-label="ページ内目次"><ul id="page-toc"></ul></nav>
        <p id="toc-status" class="toc-status" aria-live="polite"></p>
      </div>
    </details>
    <article id="content" class="md"></article>
  </div>
  <noscript><p>本文の表示にはJavaScriptが必要です。<a href="${opts.active}.md">Markdown版を読む</a></p></noscript>
</main>
${footerHtml(esc(opts.generatedAt))}

<script>
const MD = ${embedded};
document.getElementById('content').innerHTML = marked.parse(MD);

// 見出しにGitHub風のアンカーidを付与する（日本語は保持、空白はハイフン、記号は除去）。
// menu.html からの recipes.html#料理名 のようなアンカーリンクを機能させるため。
(function () {
  const seen = new Set();
  document.querySelectorAll('.md h1,.md h2,.md h3,.md h4,.md h5,.md h6').forEach(function (h) {
    const base = h.textContent
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, '-')
      .replace(/[!-/:-@[-\\\`{-~、。・（）［］「」『』：；？！　]/g, '');
    let id = base;
    let n = 1;
    while (document.getElementById(id) || seen.has(id)) {
      id = base + '-' + n;
      n += 1;
    }
    seen.add(id);
    h.id = id;
  });
})();

// 横に長い表はスマホで独立してスクロールさせる
document.querySelectorAll('.md table').forEach(function (t) {
  const box = document.createElement('div');
  box.className = 'table-scroll';
  box.tabIndex = 0;
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', '表（横にスクロールできます）');
  t.parentNode.insertBefore(box, t);
  box.appendChild(t);
});

// 既存の見出しIDを利用し、献立からのリンク先を保ったまま目次を作る。
const tocPanel = document.querySelector('.toc-panel');
function isCompact() { return window.matchMedia && window.matchMedia('(max-width: 760px)').matches; }
if (isCompact()) tocPanel.removeAttribute('open');
const headings = Array.from(document.querySelectorAll('.md h2,.md h3'));
const toc = document.getElementById('page-toc');
const status = document.getElementById('toc-status');
const items = headings.map(function (heading) {
  const li = document.createElement('li');
  if (heading.tagName === 'H3') li.className = 'toc-sub';
  const a = document.createElement('a');
  a.href = '#' + encodeURIComponent(heading.id);
  a.textContent = heading.textContent;
  a.addEventListener('click', function () {
    if (isCompact()) tocPanel.removeAttribute('open');
  });
  li.appendChild(a);
  toc.appendChild(li);
  return { li: li, link: a, heading: heading };
});
function normalizeSearch(value) { return value.normalize('NFKC').toLowerCase().trim(); }
document.getElementById('toc-search').addEventListener('input', function (event) {
  const query = normalizeSearch(event.target.value);
  let count = 0;
  items.forEach(function (item) {
    item.li.hidden = !normalizeSearch(item.heading.textContent).includes(query);
    if (!item.li.hidden) count += 1;
  });
  status.textContent = query ? (count ? count + '件の見出し' : '該当する見出しがありません') : '';
});
function markCurrent(id) {
  items.forEach(function (item) {
    if (item.heading.id === id) item.link.setAttribute('aria-current', 'location');
    else item.link.removeAttribute('aria-current');
  });
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(function (entries) {
    const visible = entries.filter(function (entry) { return entry.isIntersecting; });
    if (visible.length) markCurrent(visible[0].target.id);
  }, { rootMargin: '0px 0px -65% 0px' });
  headings.forEach(function (heading) { observer.observe(heading); });
}
function followHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (target) { target.scrollIntoView(); markCurrent(id); }
}
window.addEventListener('hashchange', followHash);
if (location.hash) requestAnimationFrame(followHash);
</script>
</body>
</html>
`
}
