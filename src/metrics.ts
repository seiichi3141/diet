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
export function projectedGoalDate(records: WeightRecord[], goalWeight: number): string | null {
  if (records.length < 2) return null
  const sorted = sortByDate(records)
  const xs = sorted.map((r) => toEpochDay(r.date))
  const ys = sorted.map((r) => r.weight)
  const n = xs.length
  const xMean = xs.reduce((s, x) => s + x, 0) / n
  const yMean = ys.reduce((s, y) => s + y, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - xMean) * (ys[i] - yMean)
    den += (xs[i] - xMean) ** 2
  }
  if (den === 0) return null
  const slope = num / den
  if (slope >= 0) return null
  const intercept = yMean - slope * xMean
  const targetDay = Math.round((goalWeight - intercept) / slope)
  return toDateString(targetDay)
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
