/** 全ページ共通のナビゲーションとCSS。各HTMLページは同じヘッダー・タブ見た目で統一する。 */

export const NAV_ITEMS = [
  { id: 'dashboard', href: 'dashboard.html', label: 'ダッシュボード' },
  { id: 'plan', href: 'plan.html', label: '計画書' },
  { id: 'menu', href: 'menu.html', label: 'メニュー・買い物' },
  { id: 'recipes', href: 'recipes.html', label: 'レシピ' },
] as const

export type PageId = (typeof NAV_ITEMS)[number]['id']

export function navHtml(active: PageId): string {
  const links = NAV_ITEMS.map(
    (item) => `<a class="tab${item.id === active ? ' active' : ''}" href="${item.href}">${item.label}</a>`,
  ).join('\n    ')
  return `<nav class="tabs">\n    ${links}\n  </nav>`
}

export const COMMON_CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Hiragino Sans", sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
  header { background: #1e293b; color: #fff; padding: 20px 24px; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header .date { font-size: 12px; opacity: 0.7; }
  main { max-width: 960px; margin: 0 auto; padding: 16px; }
  .tabs { display: flex; gap: 8px; margin-top: 14px; }
  .tab { display: inline-block; background: transparent; color: #cbd5e1; border: 1px solid #475569; border-radius: 999px; padding: 6px 16px; font-size: 13px; cursor: pointer; text-decoration: none; }
  .tab.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }
  .tab:hover { border-color: #93c5fd; }
  section { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
`

export const COMMON_MOBILE_CSS = `
  @media (max-width: 640px) {
    header { padding: 14px 16px; }
    main { padding: 10px; }
    .tabs { flex-wrap: wrap; }
    .tab { flex: 1 1 40%; text-align: center; padding: 8px 4px; font-size: 12px; }
    section { padding: 12px; }
  }
`
