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
  assert.match(html, /進捗|progress/i)
})

test('file:// で開けるよう外部データ参照を持たない（fetch不使用）', () => {
  assert.doesNotMatch(build(), /fetch\s*\(/)
})
