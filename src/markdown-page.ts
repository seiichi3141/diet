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
  .lead { padding: 56px 0 8px; }
  .lead h1 {
    font-family: var(--serif); font-size: 30px; line-height: 1.5;
    margin: 0 0 10px; letter-spacing: 0.01em; font-weight: 600;
  }
  .lead .dek { font-size: 15px; color: var(--ink-soft); margin: 0; }

  .md { padding-bottom: 8px; }
  .md > h1:first-child { display: none; }
  .md h2 {
    font-family: var(--serif); font-size: 21px; font-weight: 600;
    margin: 52px 0 14px; padding-top: 18px; border-top: 2px solid var(--ink);
    letter-spacing: 0.01em;
  }
  .md h3 { font-size: 16px; font-weight: 600; margin: 32px 0 8px; }
  .md h4 { font-size: 14px; font-weight: 600; margin: 24px 0 6px; color: var(--ink-soft); }
  .md p { font-size: 15px; margin: 0 0 16px; }
  .md ul, .md ol { padding-left: 20px; margin: 0 0 16px; }
  .md li { font-size: 15px; margin-bottom: 6px; }
  .md li::marker { color: var(--ink-faint); }
  .md strong { font-weight: 600; }
  .md a { color: var(--accent); text-decoration: none; border-bottom: 1px solid rgba(194,65,12,0.3); }
  .md a:hover { border-bottom-color: var(--accent); }

  .md table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 0 0 22px; }
  .md thead th {
    text-align: left; font-size: 11px; letter-spacing: 0.06em; font-weight: 600;
    color: var(--ink-faint); padding: 0 12px 8px 0; border-bottom: 1px solid var(--ink);
    white-space: nowrap;
  }
  .md tbody td { padding: 10px 12px 10px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }

  .md code {
    background: var(--bg-soft); padding: 2px 6px; border-radius: 3px;
    font-family: var(--num); font-size: 12.5px;
  }
  .md pre {
    background: var(--bg-soft); padding: 14px 16px; border-radius: 4px;
    overflow-x: auto; border: 1px solid var(--rule);
  }
  .md pre code { background: none; padding: 0; font-size: 12.5px; line-height: 1.7; }
  .md blockquote {
    border-left: 2px solid var(--accent); background: var(--accent-soft);
    margin: 0 0 18px; padding: 12px 16px; border-radius: 0 4px 4px 0;
  }
  .md blockquote p:last-child { margin-bottom: 0; }
  .md hr { border: 0; border-top: 1px solid var(--rule); margin: 36px 0; }
`

const MD_MOBILE_CSS = `
  @media (max-width: 640px) {
    .lead { padding: 32px 0 4px; }
    .lead h1 { font-size: 23px; }
    .md h2 { font-size: 18px; margin-top: 40px; }
    .md p, .md li { font-size: 14.5px; }
    .md .table-scroll { overflow-x: auto; }
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
<main class="wrap">
  <div class="lead">
    <h1>${esc(opts.title)}</h1>
    <p class="dek">${esc(lead.dek)}</p>
  </div>
  <article id="content" class="md"></article>
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
  t.parentNode.insertBefore(box, t);
  box.appendChild(t);
});
</script>
</body>
</html>
`
}
