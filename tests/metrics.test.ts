import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  latestWeight,
  weeklyAverages,
  progress,
  projectedGoalDate,
  dailyCalories,
  weightMovingAverage,
  bodyComposition,
  exerciseWeeklyTotals,
} from '../src/metrics.ts'
import type { WeightRecord, MealRecord, ExerciseRecord, Profile } from '../src/types.ts'

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

// --- 公開ダッシュボード向けの集計 ---

test('weightMovingAverage: 7日移動平均を日付ごとに返す（窓が埋まるまでは null）', () => {
  const records = series('2026-08-01', [78, 78, 78, 78, 78, 78, 78, 77, 77, 77])
  const ma = weightMovingAverage(records, 7)
  assert.equal(ma.length, 10)
  // 最初の6日は窓が埋まらない
  assert.deepEqual(
    ma.slice(0, 6).map((p) => p.average),
    [null, null, null, null, null, null],
  )
  assert.equal(ma[6].date, '2026-08-07')
  assert.equal(ma[6].average, 78)
  // 8日目は 78×6 + 77 = 545 / 7 = 77.86
  assert.equal(ma[7].average, 77.86)
  // 10日目は 78×4 + 77×3 = 543 / 7 = 77.57
  assert.equal(ma[9].average, 77.57)
})

test('weightMovingAverage: 日付順に整列してから計算する', () => {
  const shuffled: WeightRecord[] = [
    { date: '2026-08-03', weight: 76 },
    { date: '2026-08-01', weight: 78 },
    { date: '2026-08-02', weight: 77 },
  ]
  const ma = weightMovingAverage(shuffled, 3)
  assert.deepEqual(
    ma.map((p) => p.date),
    ['2026-08-01', '2026-08-02', '2026-08-03'],
  )
  assert.equal(ma[2].average, 77)
})

test('bodyComposition: 体脂肪率から脂肪量と除脂肪量を算出する', () => {
  const records: WeightRecord[] = [
    { date: '2026-08-06', weight: 77.4, bodyFat: 24.6 },
    { date: '2026-08-30', weight: 75.2, bodyFat: 22.6 },
  ]
  const comp = bodyComposition(records)
  assert.equal(comp.length, 2)
  // 77.4 × 0.246 = 19.04 / 除脂肪 77.4 - 19.04 = 58.36
  assert.deepEqual(comp[0], { date: '2026-08-06', fatMass: 19.04, leanMass: 58.36 })
  // 75.2 × 0.226 = 16.9952 → 17.0 / 58.2
  assert.deepEqual(comp[1], { date: '2026-08-30', fatMass: 17, leanMass: 58.2 })
})

test('bodyComposition: 体脂肪率のない記録は除外する', () => {
  const records: WeightRecord[] = [
    { date: '2026-08-06', weight: 77.4, bodyFat: 24.6 },
    { date: '2026-08-07', weight: 77.2 },
  ]
  assert.equal(bodyComposition(records).length, 1)
})

test('exerciseWeeklyTotals: 週ごとの回数と分数を返す（日付昇順）', () => {
  const exercises: ExerciseRecord[] = [
    { date: '2026-08-06', type: '自重トレ', minutes: 25 },
    { date: '2026-08-07', type: '卓球', minutes: 120 },
    { date: '2026-08-13', type: '自重トレ', minutes: 30 },
  ]
  const totals = exerciseWeeklyTotals(exercises)
  assert.deepEqual(totals, [
    { weekStart: '2026-08-03', count: 2, minutes: 145 },
    { weekStart: '2026-08-10', count: 1, minutes: 30 },
  ])
})
