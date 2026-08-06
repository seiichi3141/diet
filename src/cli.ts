import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import type { ConditionRecord, ExerciseRecord, MealRecord, MealType, WeightRecord } from './types.ts'
import {
  appendJsonl,
  readJsonl,
  readProfile,
  validateCondition,
  validateExercise,
  validateMeal,
  validateWeight,
} from './storage.ts'
import { dailyCalories, latestWeight, progress, projectedGoalDate } from './metrics.ts'
import { buildDashboardHtml } from './dashboard.ts'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DATA_DIR = join(ROOT, 'data')
const DASHBOARD_PATH = join(ROOT, 'dashboard.html')

function today(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fail(message: string): never {
  console.error(`エラー: ${message}`)
  process.exit(1)
}

function num(value: string | undefined, label: string): number {
  if (value === undefined) fail(`${label} を指定してください`)
  const n = Number(value)
  if (!Number.isFinite(n)) fail(`${label} は数値で指定してください（指定値: ${value}）`)
  return n
}

function parseLogArgs(args: string[], options: Record<string, { type: 'string' }>) {
  const { values, positionals } = parseArgs({ args, options, allowPositionals: true })
  return { values, positionals }
}

function logWeight(args: string[]): void {
  const { values, positionals } = parseLogArgs(args, {
    'body-fat': { type: 'string' },
    date: { type: 'string' },
  })
  const weight = num(positionals[0], '体重')
  const bodyFat = values['body-fat'] !== undefined ? num(values['body-fat'], '体脂肪率') : undefined
  try {
    validateWeight({ weight, bodyFat })
  } catch (e) {
    fail((e as Error).message)
  }
  const record: WeightRecord = { date: values.date ?? today(), weight, ...(bodyFat !== undefined ? { bodyFat } : {}) }
  appendJsonl(DATA_DIR, 'weights', record)
  console.log(`記録しました: ${record.date} 体重 ${weight}kg${bodyFat !== undefined ? ` / 体脂肪率 ${bodyFat}%` : ''}`)
}

function logMeal(args: string[]): void {
  const { values } = parseLogArgs(args, {
    type: { type: 'string' },
    desc: { type: 'string' },
    calories: { type: 'string' },
    protein: { type: 'string' },
    fat: { type: 'string' },
    carbs: { type: 'string' },
    date: { type: 'string' },
  })
  const input = {
    mealType: values.type ?? '',
    description: values.desc ?? '',
    calories: num(values.calories, 'カロリー'),
    protein: num(values.protein, 'タンパク質'),
    fat: num(values.fat, '脂質'),
    carbs: num(values.carbs, '炭水化物'),
  }
  try {
    validateMeal(input)
  } catch (e) {
    fail((e as Error).message)
  }
  const record: MealRecord = {
    date: values.date ?? today(),
    mealType: input.mealType as MealType,
    description: input.description,
    calories: input.calories,
    protein: input.protein,
    fat: input.fat,
    carbs: input.carbs,
  }
  appendJsonl(DATA_DIR, 'meals', record)
  console.log(
    `記録しました: ${record.date} [${record.mealType}] ${record.description}（${record.calories}kcal / P${record.protein}g）`,
  )
}

function logExercise(args: string[]): void {
  const { values } = parseLogArgs(args, {
    type: { type: 'string' },
    minutes: { type: 'string' },
    note: { type: 'string' },
    date: { type: 'string' },
  })
  const type = values.type ?? ''
  const minutes = num(values.minutes, '運動時間')
  try {
    validateExercise({ type, minutes })
  } catch (e) {
    fail((e as Error).message)
  }
  const record: ExerciseRecord = {
    date: values.date ?? today(),
    type,
    minutes,
    ...(values.note !== undefined ? { note: values.note } : {}),
  }
  appendJsonl(DATA_DIR, 'exercises', record)
  console.log(`記録しました: ${record.date} ${type} ${minutes}分`)
}

function logCondition(args: string[]): void {
  const { values } = parseLogArgs(args, {
    sleep: { type: 'string' },
    note: { type: 'string' },
    date: { type: 'string' },
  })
  const sleepHours = values.sleep !== undefined ? num(values.sleep, '睡眠時間') : undefined
  try {
    validateCondition({ sleepHours, note: values.note })
  } catch (e) {
    fail((e as Error).message)
  }
  const record: ConditionRecord = {
    date: values.date ?? today(),
    ...(sleepHours !== undefined ? { sleepHours } : {}),
    ...(values.note !== undefined ? { note: values.note } : {}),
  }
  appendJsonl(DATA_DIR, 'conditions', record)
  console.log(`記録しました: ${record.date} 睡眠 ${sleepHours ?? '-'}h${values.note ? ` / ${values.note}` : ''}`)
}

function build(): void {
  const data = {
    profile: readProfile(DATA_DIR),
    weights: readJsonl<WeightRecord>(DATA_DIR, 'weights'),
    meals: readJsonl<MealRecord>(DATA_DIR, 'meals'),
    exercises: readJsonl<ExerciseRecord>(DATA_DIR, 'exercises'),
    conditions: readJsonl<ConditionRecord>(DATA_DIR, 'conditions'),
    generatedAt: new Date().toLocaleString('ja-JP'),
    planMd: readTextIfExists(join(ROOT, 'plan.md')),
    menuMd: readTextIfExists(join(ROOT, 'menu.md')),
    recipesMd: readTextIfExists(join(ROOT, 'recipes.md')),
  }
  writeFileSync(DASHBOARD_PATH, buildDashboardHtml(data))
  console.log(`dashboard.html を更新しました（${DASHBOARD_PATH}）`)
}

function readTextIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function summary(): void {
  const profile = readProfile(DATA_DIR)
  const weights = readJsonl<WeightRecord>(DATA_DIR, 'weights')
  const meals = readJsonl<MealRecord>(DATA_DIR, 'meals')
  const exercises = readJsonl<ExerciseRecord>(DATA_DIR, 'exercises')

  const latest = latestWeight(weights)
  if (!latest) fail('体重の記録がありません')
  const prog = progress(profile, latest.weight)
  const projection = projectedGoalDate(weights, profile.goalWeight)

  console.log(
    `最新: ${latest.weight}kg${latest.bodyFat !== undefined ? `（体脂肪率 ${latest.bodyFat}%）` : ''} — ${latest.date}`,
  )
  console.log(
    `開始から: -${prog.lost}kg ／ 目標 ${profile.goalWeight}kg まで残り ${prog.remaining}kg（進捗 ${prog.percent}%）`,
  )
  console.log(`達成予測: ${projection ?? '—（データ不足または減少トレンドなし）'} ／ 計画目標日: ${profile.goalDate}`)

  const todayStr = today()
  const todayMeals = dailyCalories(meals).find((d) => d.date === todayStr)
  console.log(
    `今日の食事: ${todayMeals ? `${todayMeals.calories}kcal / P ${todayMeals.protein}g` : '未記録'}（目標 ${profile.dailyCalorieTarget}kcal / P ${profile.dailyProteinTarget}g）`,
  )

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const weekExercises = exercises.filter((e) => e.date >= weekAgo)
  const totalMinutes = weekExercises.reduce((s, e) => s + e.minutes, 0)
  console.log(`直近7日の運動: ${weekExercises.length}回・${totalMinutes}分`)
}

function main(): void {
  const [command, sub, ...rest] = process.argv.slice(2)
  if (command === 'log') {
    if (sub === 'weight') return logWeight(rest)
    if (sub === 'meal') return logMeal(rest)
    if (sub === 'exercise') return logExercise(rest)
    if (sub === 'condition') return logCondition(rest)
    fail('log の対象は weight / meal / exercise / condition のいずれかです')
  }
  if (command === 'build') return build()
  if (command === 'summary') return summary()
  fail('使い方: cli.ts <log weight|log meal|log exercise|log condition|build|summary> ...')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
