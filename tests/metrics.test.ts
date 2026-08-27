import { test } from 'node:test'
import assert from 'node:assert/strict'
import { latestWeight, weeklyAverages, progress, projectedGoalDate, dailyCalories } from '../src/metrics.ts'
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

// 達成予測は「直近7日の平均」と「その前7日の平均」の差から週あたりの減少ペースを求める。
// 日々±0.5kg の変動に傾きが支配されるのを防ぐため、単純な線形回帰ではなく週平均どうしを比較する。

/** 指定日から連続する日付の体重レコードを作る */
function series(startDate: string, weights: number[]): WeightRecord[] {
  const base = Date.parse(startDate + 'T00:00:00Z')
  return weights.map((weight, i) => ({
    date: new Date(base + i * 86400000).toISOString().slice(0, 10),
    weight,
  }))
}

test('projectedGoalDate: 直近7日と前7日の週平均差から達成予測日を返す', () => {
  // 前半7日は 78.0kg、後半7日は 77.0kg → 週1.0kg減。直近平均 77.0 から 70 まで残り 7.0kg = 7週
  const records = series('2026-08-14', [...Array(7).fill(78.0), ...Array(7).fill(77.0)])
  // 最終日 2026-08-27 + 49日 = 2026-10-15
  assert.equal(projectedGoalDate(records, 70), '2026-10-15')
})

test('projectedGoalDate: 日々の変動があっても週平均で吸収される', () => {
  // 週平均は上のテストと同じ（78.0 / 77.0）だが、日ごとに ±0.6kg 振れる
  const noise = [0.6, -0.6, 0.3, -0.3, 0.6, -0.6, 0]
  const records = series('2026-08-14', [...noise.map((d) => 78.0 + d), ...noise.map((d) => 77.0 + d)])
  assert.equal(projectedGoalDate(records, 70), '2026-10-15')
})

test('projectedGoalDate: 14日分に満たなければ null（算出不能）', () => {
  assert.equal(projectedGoalDate([], 70), null)
  assert.equal(projectedGoalDate(series('2026-08-15', Array(13).fill(77.0)), 70), null)
})

test('projectedGoalDate: 減っていない・増えている場合は null', () => {
  const flat = series('2026-08-14', Array(14).fill(77.0))
  assert.equal(projectedGoalDate(flat, 70), null)
  const rising = series('2026-08-14', [...Array(7).fill(77.0), ...Array(7).fill(77.5)])
  assert.equal(projectedGoalDate(rising, 70), null)
})

test('projectedGoalDate: 減少が週0.05kg未満なら誤差とみなして null', () => {
  const almostFlat = series('2026-08-14', [...Array(7).fill(77.0), ...Array(7).fill(76.98)])
  assert.equal(projectedGoalDate(almostFlat, 70), null)
})

test('projectedGoalDate: 既に目標を下回っていれば null', () => {
  const reached = series('2026-08-14', [...Array(7).fill(70.5), ...Array(7).fill(69.8)])
  assert.equal(projectedGoalDate(reached, 70), null)
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
