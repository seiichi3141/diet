import type { MealRecord, Profile, WeightRecord } from './types.ts'

const DAY_MS = 24 * 60 * 60 * 1000

function toEpochDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / DAY_MS
}

function toDateString(epochDay: number): string {
  return new Date(epochDay * DAY_MS).toISOString().slice(0, 10)
}

function round1(x: number): number {
  return Math.round(x * 10) / 10
}

function round2(x: number): number {
  return Math.round(x * 100) / 100
}

export function sortByDate<T extends { date: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date))
}

export function latestWeight(records: WeightRecord[]): WeightRecord | null {
  if (records.length === 0) return null
  const sorted = sortByDate(records)
  return sorted[sorted.length - 1]
}

/** ISO週（月曜始まり）ごとの平均体重。週の開始日昇順で返す。 */
export function weeklyAverages(records: WeightRecord[]): { weekStart: string; avgWeight: number }[] {
  const byWeek = new Map<string, number[]>()
  for (const r of records) {
    const day = toEpochDay(r.date)
    // getUTCDay: 日=0..土=6 → 月曜からのオフセットに変換
    const dow = new Date(day * DAY_MS).getUTCDay()
    const weekStart = toDateString(day - ((dow + 6) % 7))
    const list = byWeek.get(weekStart) ?? []
    list.push(r.weight)
    byWeek.set(weekStart, list)
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weights]) => ({
      weekStart,
      avgWeight: round2(weights.reduce((s, w) => s + w, 0) / weights.length),
    }))
}

export function progress(profile: Profile, current: number): { lost: number; remaining: number; percent: number } {
  const total = profile.startWeight - profile.goalWeight
  const lost = Math.max(0, profile.startWeight - current)
  const remaining = Math.max(0, current - profile.goalWeight)
  const percent = total <= 0 ? 0 : Math.min(100, round1((lost / total) * 100))
  return { lost: round1(lost), remaining: round1(remaining), percent }
}

/**
 * 全レコードの線形回帰トレンドから goalWeight に到達する予測日を返す。
 * 減少トレンドでない・データ不足の場合は null。
 */
/** 週あたりの減少がこれ未満なら測定誤差とみなし、予測を出さない */
const MIN_WEEKLY_LOSS_KG = 0.05
/** 予測に必要な最小日数（直近7日 + その前7日） */
const MIN_DAYS_FOR_PROJECTION = 14

/**
 * 目標体重への到達予測日を返す。データ不足・減少なしの場合は null。
 *
 * 日々の体重は水分・グリコーゲン・食事内容で ±0.5kg 程度振れるため、
 * 全記録に線形回帰をかけると傾きがその変動に支配され、対象期間を変えるだけで
 * 予測が大きく振れてしまう。そこで **直近7日の平均と、その前7日の平均の差**を
 * 週あたりのペースとして使い、直近7日の平均を現在地とみなして外挿する。
 */
export function projectedGoalDate(records: WeightRecord[], goalWeight: number): string | null {
  const sorted = sortByDate(records)
  if (sorted.length < MIN_DAYS_FOR_PROJECTION) return null

  const recent = sorted.slice(-7)
  const previous = sorted.slice(-14, -7)
  const mean = (rs: WeightRecord[]): number => rs.reduce((s, r) => s + r.weight, 0) / rs.length

  const current = mean(recent)
  const weeklyLoss = mean(previous) - current
  if (weeklyLoss < MIN_WEEKLY_LOSS_KG) return null

  const remaining = current - goalWeight
  if (remaining <= 0) return null

  const lastDay = toEpochDay(sorted[sorted.length - 1].date)
  return toDateString(lastDay + Math.round((remaining / weeklyLoss) * 7))
}

/** 計画ペース線用: startDate/startWeight から goalDate/goalWeight への直線上の体重。 */
export function plannedWeightAt(profile: Profile, date: string): number | null {
  const start = toEpochDay(profile.startDate)
  const goal = toEpochDay(profile.goalDate)
  const d = toEpochDay(date)
  if (goal <= start || d < start) return null
  const t = Math.min(1, (d - start) / (goal - start))
  return round1(profile.startWeight + t * (profile.goalWeight - profile.startWeight))
}

export function dailyCalories(meals: MealRecord[]): { date: string; calories: number; protein: number }[] {
  const byDate = new Map<string, { calories: number; protein: number }>()
  for (const m of meals) {
    const entry = byDate.get(m.date) ?? { calories: 0, protein: 0 }
    entry.calories += m.calories
    entry.protein += m.protein
    byDate.set(m.date, entry)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, calories: v.calories, protein: v.protein }))
}
