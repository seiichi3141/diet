/** 全ページ共通のナビゲーションとデザイントークン。 */
export const NAV_ITEMS = [
  { id: 'dashboard', href: 'dashboard.html', label: '記録', icon: 'chart' },
  { id: 'plan', href: 'plan.html', label: '計画', icon: 'target' },
  { id: 'menu', href: 'menu.html', label: '献立', icon: 'calendar' },
  { id: 'recipes', href: 'recipes.html', label: 'レシピ', icon: 'book' },
] as const
export type PageId = (typeof NAV_ITEMS)[number]['id']

export function icon(name: string): string {
  const paths: Record<string, string> = {
    chart: '<path d="M3 3v14h14M7 13V9m4 4V5m4 8v-3"/>',
    target: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="3"/>',
    calendar: '<rect x="3" y="4" width="14" height="13" rx="2"/><path d="M6 2v4m8-4v4M3 8h14m-10 4h2m2 0h2"/>',
    book: '<path d="M10 5v12M10 5C7 3 4 3 2 4v12c3-1 5-1 8 1 3-2 5-2 8-1V4c-2-1-5-1-8 1Z"/>',
  }
  return `<svg class="icon" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.chart}</svg>`
}

export function navHtml(active: PageId): string {
  return `<nav class="nav" aria-label="メインナビゲーション">${NAV_ITEMS.map(
    (item) =>
      `<a class="nav-link${item.id === active ? ' is-active' : ''}" href="${item.href}"${item.id === active ? ' aria-current="page"' : ''}>${icon(item.icon)}${item.label}</a>`,
  ).join('')}</nav>`
}

export const COMMON_CSS = `
  :root {
    color-scheme: light;
    --ink: #1f2328; --ink-soft: #59636e; --ink-faint: #656d76;
    --rule: #d1d9e0; --bg: #ffffff; --bg-soft: #f6f8fa;
    --accent: #0969da; --accent-soft: #ddf4ff; --green: #1a7f37;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
    --serif: var(--sans); --num: var(--sans);
  }
  * { box-sizing: border-box; }
  html { scroll-padding-top: 24px; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.65 var(--sans); -webkit-font-smoothing: antialiased; }
  a { color: var(--accent); }
  button, input, summary { font: inherit; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 0 32px; }
  .icon { flex-shrink: 0; vertical-align: middle; }
  .skip-link { position: absolute; top: -80px; left: 20px; z-index: 10; padding: 10px 18px; background: white; border: 1px solid var(--accent); border-radius: 6px; }
  .skip-link:focus { top: 10px; }
  .site-head { background: var(--bg-soft); border-bottom: 1px solid var(--rule); }
  .head-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 76px; }
  .site-title { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 16px; font-weight: 600; }
  .site-title a { color: inherit; text-decoration: none; }
  .brand-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 9px; color: white; background: var(--ink); }
  .site-subtitle { color: var(--ink-soft); font-size: 12px; font-weight: 400; display: block; }
  .badge { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--rule); border-radius: 20px; padding: 2px 9px; font-size: 12px; color: var(--ink-soft); white-space: nowrap; }
  .badge-green { background: #dafbe1; border-color: #aceebb; color: #116329; }
  .nav { display: flex; gap: 8px; overflow-x: auto; }
  .nav-link { position: relative; display: flex; align-items: center; gap: 8px; padding: 12px 17px 16px; color: var(--ink); text-decoration: none; white-space: nowrap; min-height: 48px; }
  .nav-link .icon { width: 17px; height: 17px; color: var(--ink-soft); }
  .nav-link:hover { background: #eaeef2; border-radius: 6px 6px 0 0; }
  .nav-link.is-active { font-weight: 600; }
  .nav-link.is-active:after { content: ''; height: 3px; background: #fd8c73; position: absolute; bottom: 0; left: 8px; right: 8px; border-radius: 4px; }
  .page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .eyebrow { font-size: 12px; color: var(--ink-soft); margin: 0 0 6px; letter-spacing: .05em; }
  .panel { border: 1px solid var(--rule); border-radius: 8px; background: var(--bg); min-width: 0; }
  .button-link { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 12px; min-height: 36px; background: var(--bg-soft); border: 1px solid var(--rule); border-radius: 6px; color: var(--ink); text-decoration: none; font-size: 13px; font-weight: 500; }
  .button-link:hover { background: #eaeef2; }
  .table-scroll { overflow-x: auto; max-width: 100%; }
  .site-foot { border-top: 1px solid var(--rule); margin-top: 48px; padding: 24px 0 36px; font-size: 12px; color: var(--ink-soft); }
  .site-foot .wrap { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  [hidden] { display: none !important; }
`
export const COMMON_MOBILE_CSS = `
  @media (max-width: 640px) {
    .wrap { padding: 0 16px; }
    .head-row { min-height: 72px; }
    .site-title { font-size: 14px; gap: 9px; }
    .site-subtitle { font-size: 11px; }
    .head-row > .badge { display: none; }
    .nav { gap: 0; }
    .nav-link { padding: 12px 14px; gap: 6px; font-size: 13px; }
    .page-heading { align-items: flex-start; }
    .site-foot { margin-top: 32px; }
  }
`
export function headerHtml(active: PageId): string {
  return `<a class="skip-link" href="#main-content">本文へスキップ</a>
<header class="site-head"><div class="wrap">
  <div class="head-row">
    <p class="site-title"><span class="brand-icon">${icon('chart')}</span><a href="dashboard.html">減量・体力増強の記録<span class="site-subtitle">日々の積み重ねを、見える形に。</span></a></p>
    <span class="badge">Personal health log</span>
  </div>${navHtml(active)}
</div></header>`
}
export function footerHtml(generatedAt: string): string {
  return `<footer class="site-foot"><div class="wrap"><span>最終更新 ${generatedAt}</span><span>数値は自己申告・自宅の体組成計にもとづく推定値です</span></div></footer>`
}
