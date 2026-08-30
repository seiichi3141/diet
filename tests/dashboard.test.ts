import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDashboardHtml } from '../src/dashboard.ts'
import type { Profile, WeightRecord, MealRecord } from '../src/types.ts'

const profile: Profile = {
  age: 46,
  sex: 'male',
  heightCm: 178,
  startDate: '2026-08-06',
  startWeight: 77.4,
  goalWeight: 70,
  goalDate: '2026-11-06',
  dailyCalorieTarget: 1700,
  dailyProteinTarget: 115,
}

const weights: WeightRecord[] = [
  { date: '2026-08-06', weight: 77.4, bodyFat: 24.6 },
  { date: '2026-08-07', weight: 77.1, bodyFat: 24.3 },
]

const meals: MealRecord[] = [
  {
    date: '2026-08-06',
    mealType: 'breakfast',
    description: 'おにぎり',
    calories: 550,
    protein: 12,
    fat: 4,
    carbs: 100,
  },
]

function build(): string {
  return buildDashboardHtml({
    profile,
    weights,
    meals,
    exercises: [{ date: '2026-08-06', type: '卓球', minutes: 90 }],
    conditions: [{ date: '2026-08-06', sleepHours: 6.5, note: '良好' }],
    generatedAt: '2026-08-07T09:00:00',
    planMd: '# テスト計画書\n\nこれは計画です',
    menuMd: '# テスト献立\n\nこれは献立です',
    recipesMd: '# テストレシピ集\n\nこれはレシピです',
  })
}

test('Chart.js をCDNから読み込む', () => {
  assert.match(build(), /cdn[^"']*chart\.js|chart\.js[^"']*cdn/i)
})

test('記録データがHTMLに埋め込まれる', () => {
  const html = build()
  assert.ok(html.includes('77.4'), '体重データが含まれる')
  assert.ok(html.includes('2026-08-06'), '日付が含まれる')
  assert.ok(html.includes('卓球'), '運動記録が含まれる')
})

test('目標値が埋め込まれる', () => {
  const html = build()
  assert.ok(html.includes('70'), '目標体重')
  assert.ok(html.includes('1700'), '目標カロリー')
})

test('グラフ用canvasと進捗表示がある', () => {
  const html = build()
  assert.match(html, /id="weight-chart"/)
  assert.match(html, /id="calorie-chart"/)
  assert.match(html, /id="comp-chart"/)
  assert.match(html, /進捗/)
})

test('file:// で開けるよう外部データ参照を持たない（fetch不使用）', () => {
  assert.doesNotMatch(build(), /fetch\s*\(/)
})

test('他ページへのナビゲーションリンクがある（タブボタンではない）', () => {
  const html = build()
  assert.ok(html.includes('href="plan.html"'))
  assert.ok(html.includes('href="menu.html"'))
  assert.ok(html.includes('href="recipes.html"'))
  assert.match(html, /<a class="nav-link is-active" href="dashboard\.html">/)
  assert.doesNotMatch(html, /<button/)
})

test('体組成のグラフと7日移動平均を持つ', () => {
  const html = build()
  assert.match(html, /id="comp-chart"/)
  assert.match(html, /7日移動平均/)
  assert.ok(html.includes('"average"'), '移動平均のデータが埋め込まれる')
  assert.ok(html.includes('"fatMass"'), '脂肪量のデータが埋め込まれる')
  assert.ok(html.includes('"leanMass"'), '除脂肪量のデータが埋め込まれる')
})

test('初見の読者向けにリード文と注記がある', () => {
  const html = build()
  assert.match(html, /name="description"/)
  assert.match(html, /推定値/, '数値が推定であることを明示する')
})

test('Markdown本文はダッシュボードに埋め込まない（各ページに分離）', () => {
  const html = build()
  assert.ok(!html.includes('テスト計画書'), '計画書は含まない')
  assert.ok(!html.includes('テスト献立'), '献立は含まない')
  assert.ok(!html.includes('テストレシピ集'), 'レシピ集は含まない')
  assert.doesNotMatch(html, /marked/)
})

test('スマホ表示に対応している（viewportとモバイル用メディアクエリ）', () => {
  const html = build()
  assert.match(html, /name="viewport"/)
  assert.match(html, /@media\s*\(max-width/)
})
