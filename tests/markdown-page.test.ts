import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMarkdownPage, rewriteMdLinks } from '../src/markdown-page.ts'

test('rewriteMdLinks: .md へのリンクを .html に書き換える', () => {
  assert.equal(rewriteMdLinks('[メニュー](menu.md)'), '[メニュー](menu.html)')
  assert.equal(rewriteMdLinks('[計画](plan.md)'), '[計画](plan.html)')
})

test('rewriteMdLinks: アンカー付きリンクはアンカーを保持して .html に書き換える', () => {
  assert.equal(
    rewriteMdLinks('[鶏むね照り焼き](recipes.md#鶏むね照り焼き)'),
    '[鶏むね照り焼き](recipes.html#鶏むね照り焼き)',
  )
})

test('rewriteMdLinks: リンクでないプレーンテキストの .md は変えない', () => {
  assert.equal(rewriteMdLinks('1日の目標（plan.md 参照）'), '1日の目標（plan.md 参照）')
})

function buildPage(): string {
  return buildMarkdownPage({
    title: 'レシピ集',
    md: '# レシピ集\n\n[鶏むね照り焼き](recipes.md#鶏むね照り焼き)\n\n### 鶏むね照り焼き\n\n作り方',
    active: 'recipes',
    generatedAt: '2026-08-07T09:00:00',
  })
}

test('Markdownレンダラ（marked）をCDNから読み込む', () => {
  assert.match(buildPage(), /cdn[^"']*marked/i)
})

test('MarkdownがHTMLに埋め込まれ、リンクは .html に書き換え済み', () => {
  const html = buildPage()
  assert.ok(html.includes('レシピ集'), '本文が含まれる')
  assert.ok(html.includes('recipes.html#鶏むね照り焼き'), 'リンクが .html に書き換えられている')
  assert.ok(!html.includes('recipes.md#'), '.md へのリンクが残っていない')
})

test('見出しにアンカーidを付与するスクリプトを含む', () => {
  const html = buildPage()
  assert.match(html, /\.md h1,\.md h2/)
  assert.match(html, /textContent/)
})

test('他ページへのナビゲーションリンクがあり、現在ページがactive', () => {
  const html = buildPage()
  assert.ok(html.includes('href="dashboard.html"'))
  assert.ok(html.includes('href="plan.html"'))
  assert.ok(html.includes('href="menu.html"'))
  assert.match(html, /<a class="tab active" href="recipes\.html">/)
})

test('スマホ表示に対応している（viewportとモバイル用メディアクエリ）', () => {
  const html = buildPage()
  assert.match(html, /name="viewport"/)
  assert.match(html, /@media\s*\(max-width/)
})

test('file:// で開けるよう外部データ参照を持たない（fetch不使用）', () => {
  assert.doesNotMatch(buildPage(), /fetch\s*\(/)
})
