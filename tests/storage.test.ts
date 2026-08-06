import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  appendJsonl,
  readJsonl,
  readProfile,
  validateWeight,
  validateMeal,
  validateExercise,
  validateCondition,
} from '../src/storage.ts'

function withTmpDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'diet-test-'))
  try {
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('readJsonl: ファイルが無ければ空配列を返す', () => {
  withTmpDir((dir) => {
    assert.deepEqual(readJsonl(dir, 'weights'), [])
  })
})

test('appendJsonl → readJsonl: 追記して読み戻せる', () => {
  withTmpDir((dir) => {
    appendJsonl(dir, 'weights', { date: '2026-08-06', weight: 77.4, bodyFat: 24.6 })
    appendJsonl(dir, 'weights', { date: '2026-08-07', weight: 77.1, bodyFat: 24.4 })
    const records = readJsonl<{ date: string; weight: number }>(dir, 'weights')
    assert.equal(records.length, 2)
    assert.equal(records[0].weight, 77.4)
    assert.equal(records[1].date, '2026-08-07')
  })
})

test('appendJsonl: 既存内容を保持したまま追記する', () => {
  withTmpDir((dir) => {
    appendJsonl(dir, 'meals', { date: '2026-08-06', calories: 500 })
    appendJsonl(dir, 'meals', { date: '2026-08-06', calories: 300 })
    const records = readJsonl<{ calories: number }>(dir, 'meals')
    assert.equal(
      records.reduce((sum, r) => sum + r.calories, 0),
      800,
    )
  })
})

test('readProfile: profile.json を読める', () => {
  withTmpDir((dir) => {
    writeFileSync(
      join(dir, 'profile.json'),
      JSON.stringify({ age: 46, heightCm: 178, startWeight: 77.4, goalWeight: 70 }),
    )
    const profile = readProfile(dir)
    assert.equal(profile.startWeight, 77.4)
    assert.equal(profile.goalWeight, 70)
  })
})

test('validateWeight: 正常値を受け入れる', () => {
  assert.doesNotThrow(() => validateWeight({ weight: 77.4, bodyFat: 24.6 }))
  assert.doesNotThrow(() => validateWeight({ weight: 77.4 })) // bodyFat は任意
})

test('validateWeight: 異常値を拒否する', () => {
  assert.throws(() => validateWeight({ weight: 10 }), /体重/)
  assert.throws(() => validateWeight({ weight: 250 }), /体重/)
  assert.throws(() => validateWeight({ weight: 77.4, bodyFat: 70 }), /体脂肪/)
  assert.throws(() => validateWeight({ weight: Number.NaN }), /体重/)
})

test('validateMeal: 正常値を受け入れ、異常値を拒否する', () => {
  const ok = {
    mealType: 'breakfast',
    description: 'おにぎり',
    calories: 550,
    protein: 12,
    fat: 4,
    carbs: 100,
  }
  assert.doesNotThrow(() => validateMeal(ok))
  assert.throws(() => validateMeal({ ...ok, mealType: 'brunch' }), /meal/)
  assert.throws(() => validateMeal({ ...ok, calories: 6000 }), /カロリー/)
  assert.throws(() => validateMeal({ ...ok, protein: -1 }), /タンパク質/)
})

test('validateExercise: 分数は1以上1440以下', () => {
  assert.doesNotThrow(() => validateExercise({ type: '卓球', minutes: 90 }))
  assert.throws(() => validateExercise({ minutes: 0 }), /運動時間|minutes/)
  assert.throws(() => validateExercise({ minutes: 2000 }), /運動時間|minutes/)
})

test('validateCondition: 睡眠時間は0以上24以下', () => {
  assert.doesNotThrow(() => validateCondition({ sleepHours: 6.5 }))
  assert.doesNotThrow(() => validateCondition({ note: 'メモのみ' }))
  assert.throws(() => validateCondition({ sleepHours: 25 }), /睡眠/)
})
