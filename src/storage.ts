import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Profile } from './types.ts'

/** data/<name>.jsonl を読む。ファイルが無ければ空配列。空行はスキップ。 */
export function readJsonl<T>(dir: string, name: string): T[] {
  const path = join(dir, `${name}.jsonl`)
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as T)
}

/** data/<name>.jsonl に1レコード追記する。 */
export function appendJsonl(dir: string, name: string, record: unknown): void {
  mkdirSync(dir, { recursive: true })
  appendFileSync(join(dir, `${name}.jsonl`), JSON.stringify(record) + '\n')
}

export function readProfile(dir: string): Profile {
  return JSON.parse(readFileSync(join(dir, 'profile.json'), 'utf8')) as Profile
}

function assertRange(value: number, min: number, max: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label}は ${min}〜${max} の範囲で指定してください（指定値: ${value}）`)
  }
}

export function validateWeight(input: { weight: number; bodyFat?: number }): void {
  assertRange(input.weight, 30, 200, '体重(kg)')
  if (input.bodyFat !== undefined) assertRange(input.bodyFat, 3, 60, '体脂肪率(%)')
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

export function validateMeal(input: {
  mealType: string
  description: string
  calories: number
  protein: number
  fat: number
  carbs: number
}): void {
  if (!(MEAL_TYPES as readonly string[]).includes(input.mealType)) {
    throw new Error(`meal type は ${MEAL_TYPES.join('/')} のいずれかで指定してください（指定値: ${input.mealType}）`)
  }
  if (typeof input.description !== 'string' || input.description.trim() === '') {
    throw new Error('食事の内容（description）を指定してください')
  }
  assertRange(input.calories, 0, 5000, 'カロリー(kcal)')
  assertRange(input.protein, 0, 500, 'タンパク質(g)')
  assertRange(input.fat, 0, 500, '脂質(g)')
  assertRange(input.carbs, 0, 1000, '炭水化物(g)')
}

export function validateExercise(input: { type?: string; minutes: number }): void {
  assertRange(input.minutes, 1, 1440, '運動時間(分)')
  if (typeof input.type !== 'string' || input.type.trim() === '') {
    throw new Error('運動の種類（type）を指定してください')
  }
}

export function validateCondition(input: { sleepHours?: number; note?: string }): void {
  if (input.sleepHours !== undefined) assertRange(input.sleepHours, 0, 24, '睡眠時間(h)')
  if (input.sleepHours === undefined && (input.note === undefined || input.note.trim() === '')) {
    throw new Error('睡眠時間かメモのどちらかは指定してください')
  }
}
