/** 全ページ共通のナビゲーションとCSS。数字を主役にした記事風のトーンで統一する。 */

export const NAV_ITEMS = [
  { id: 'dashboard', href: 'dashboard.html', label: '記録' },
  { id: 'plan', href: 'plan.html', label: '計画' },
  { id: 'menu', href: 'menu.html', label: '献立' },
  { id: 'recipes', href: 'recipes.html', label: 'レシピ' },
] as const

export type PageId = (typeof NAV_ITEMS)[number]['id']

export function navHtml(active: PageId): string {
  const links = NAV_ITEMS.map(
    (item) => `<a class="nav-link${item.id === active ? ' is-active' : ''}" href="${item.href}">${item.label}</a>`,
  ).join('\n    ')
  return `<nav class="nav">\n    ${links}\n  </nav>`
}

export const COMMON_CSS = `
  :root {
    color-scheme: light;
    --ink: #16181d;
    --ink-soft: #5b6270;
    --ink-faint: #9aa1af;
    --rule: #e6e8ec;
    --bg: #ffffff;
    --bg-soft: #f7f8fa;
    --accent: #c2410c;
    --accent-soft: #fdf1e9;
    --serif: "Hiragino Mincho ProN", "Yu Mincho", serif;
    --sans: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif;
    --num: "SF Mono", "Roboto Mono", Menlo, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: var(--sans);
    line-height: 1.75;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 760px; margin: 0 auto; padding: 0 24px; }

  /* ヘッダー: サイト名とナビだけ。中身は本文が主役 */
  .site-head { border-bottom: 1px solid var(--rule); }
  .site-head .wrap {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; padding-top: 20px; padding-bottom: 20px;
  }
  .site-title {
    font-family: var(--serif); font-size: 17px; font-weight: 600;
    letter-spacing: 0.02em; margin: 0;
  }
  .site-title a { color: inherit; text-decoration: none; }
  .nav { display: flex; gap: 20px; }
  .nav-link {
    font-size: 14px; color: var(--ink-soft); text-decoration: none;
    padding-bottom: 2px; border-bottom: 1.5px solid transparent;
  }
  .nav-link:hover { color: var(--ink); }
  .nav-link.is-active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }

  .site-foot {
    border-top: 1px solid var(--rule); margin-top: 64px;
    padding: 24px 0 48px; font-size: 12px; color: var(--ink-faint);
  }
  .site-foot .wrap { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .site-foot a { color: var(--ink-faint); }
`

export const COMMON_MOBILE_CSS = `
  @media (max-width: 640px) {
    .wrap { padding: 0 18px; }
    .site-head .wrap { padding-top: 14px; padding-bottom: 14px; }
    .nav { gap: 14px; }
    .nav-link { font-size: 13px; }
  }
`

export function headerHtml(active: PageId): string {
  return `<header class="site-head">
  <div class="wrap">
    <p class="site-title"><a href="dashboard.html">減量・体力増強の記録</a></p>
    ${navHtml(active)}
  </div>
</header>`
}

export function footerHtml(generatedAt: string): string {
  return `<footer class="site-foot">
  <div class="wrap">
    <span>最終更新 ${generatedAt}</span>
    <span>数値は自己申告・自宅の体組成計にもとづく推定値です</span>
  </div>
</footer>`
}
