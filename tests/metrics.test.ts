import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  latestWeight,
  weeklyAverages,
  progress,
  projectedGoalDate,
  dailyCalories,
} from '../src/metrics.ts'
import type { WeightRecord, MealRecord, Profile } from '../src/types.ts'

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

test('latestWeight: 日付順で最新を返す（挿入順に依存しない）', () => {
  assert.equal(latestWeight([]), null)
  const records: WeightRecord[] = [
    { date: '2026-08-06', weight: 77.4, bodyFat: 24.6 },
    { date: '2026-08-04', weight: 76.9 },
    { date: '2026-08-05', weight: 77.2 },
  ]
  assert.equal(latestWeight(records)?.weight, 77.4)
})

test('weeklyAverages: ISO週（月曜始まり）ごとの平均を返す', () => {
  const records: WeightRecord[] = [
    { date: '2026-08-03', weight: 77.0 }, // 月曜
    { date: '2026-08-05', weight: 76.6 }, // 同じ週の水曜
    { date: '2026-08-10', weight: 76.0 }, // 翌週の月曜
  ]
  const result = weeklyAverages(records)
  assert.deepEqual(result, [
    { weekStart: '2026-08-03', avgWeight: 76.8 },
    { weekStart: '2026-08-10', avgWeight: 76.0 },
  ])
})

test('progress: 開始体重からの減量・残り・達成率を返す', () => {
  const p = progress(profile, 74.0)
  assert.ok(Math.abs(p.lost - 3.4) < 0.001)
  assert.ok(Math.abs(p.remaining - 4.0) < 0.001)
  assert.equal(p.percent, 45.9) // 3.4 / 7.4 * 100 → 小数1位
})

test('progress: 目標達成時は100を超えない', () => {
  const p = progress(profile, 69.5)
  assert.equal(p.percent, 100)
  assert.equal(p.remaining, 0)
})

test('projectedGoalDate: 直線トレンドから達成予測日を返す', () => {
  // 2026-08-06 から 1日 0.1kg ずつ減る完全な直線データ
  const records: WeightRecord[] = Array.from({ length: 7 }, (_, i) => ({
    date: `2026-08-0${6 + i}`,
    weight: 77.4 - 0.1 * i,
  }))
  // 77.4 - 0.1*d = 70 → d = 74 → 2026-08-06 + 74日 = 2026-10-19
  assert.equal(projectedGoalDate(records, 70), '2026-10-19')
})

test('projectedGoalDate: 減っていなければ null', () => {
  const flat: WeightRecord[] = [
    { date: '2026-08-06', weight: 77.4 },
    { date: '2026-08-07', weight: 77.4 },
  ]
  assert.equal(projectedGoalDate(flat, 70), null)
  const rising: WeightRecord[] = [
    { date: '2026-08-06', weight: 77.0 },
    { date: '2026-08-07', weight: 77.5 },
  ]
  assert.equal(projectedGoalDate(rising, 70), null)
  assert.equal(projectedGoalDate([], 70), null)
  assert.equal(projectedGoalDate([{ date: '2026-08-06', weight: 77.4 }], 70), null)
})

test('dailyCalories: 日付ごとに合算し日付昇順で返す', () => {
  const meals: MealRecord[] = [
    { date: '2026-08-06', mealType: 'breakfast', description: 'a', calories: 500, protein: 20, fat: 10, carbs: 60 },
    { date: '2026-08-05', mealType: 'dinner', description: 'b', calories: 600, protein: 30, fat: 15, carbs: 70 },
    { date: '2026-08-06', mealType: 'lunch', description: 'c', calories: 300, protein: 15, fat: 5, carbs: 40 },
  ]
  assert.deepEqual(dailyCalories(meals), [
    { date: '2026-08-05', calories: 600, protein: 30 },
    { date: '2026-08-06', calories: 800, protein: 35 },
  ])
})
