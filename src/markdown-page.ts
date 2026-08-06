import { COMMON_CSS, COMMON_MOBILE_CSS, navHtml, type PageId } from './page-common.ts'

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
  .md h1 { font-size: 20px; margin: 8px 0 12px; }
  .md h2 { font-size: 17px; margin: 22px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .md h3 { font-size: 15px; margin: 16px 0 6px; }
  .md p, .md li { font-size: 14px; line-height: 1.7; }
  .md ul, .md ol { padding-left: 22px; }
  .md table { margin: 8px 0 16px; width: 100%; border-collapse: collapse; font-size: 13px; display: block; overflow-x: auto; }
  .md th, .md td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  .md th { color: #64748b; font-weight: 600; }
  .md code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  .md pre { background: #f1f5f9; padding: 12px; border-radius: 8px; overflow-x: auto; }
  .md a { color: #2563eb; }
  .md blockquote { border-left: 3px solid #cbd5e1; margin: 8px 0; padding: 2px 12px; color: #475569; }
`

/**
 * plan.md / menu.md / recipes.md を表示する静的HTMLページを生成する。
 * Markdownは埋め込み、marked（CDN）で描画。見出しにはGitHub風のアンカーidを付与し、
 * menu.md → recipes.md のようなアンカー付きリンク（.html に書き換え済み）が機能するようにする。
 */
export function buildMarkdownPage(opts: { title: string; md: string; active: PageId; generatedAt: string }): string {
  const embedded = JSON.stringify(rewriteMdLinks(opts.md)).replaceAll('</', '<\\/')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)} | 減量ダッシュボード</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>${COMMON_CSS}${MD_CSS}${COMMON_MOBILE_CSS}</style>
</head>
<body>
<header>
  <h1>${esc(opts.title)}</h1>
  <div class="date">生成: ${esc(opts.generatedAt)}</div>
  ${navHtml(opts.active)}
</header>
<main>
  <section><article id="content" class="md"></article></section>
</main>

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
</script>
</body>
</html>
`
}
