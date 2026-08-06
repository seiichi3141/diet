export interface Profile {
  age: number
  sex: string
  heightCm: number
  startDate: string
  startWeight: number
  goalWeight: number
  goalDate: string
  dailyCalorieTarget: number
  dailyProteinTarget: number
}

export interface WeightRecord {
  date: string // YYYY-MM-DD
  weight: number
  bodyFat?: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealRecord {
  date: string
  mealType: MealType
  description: string
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface ExerciseRecord {
  date: string
  type: string
  minutes: number
  note?: string
}

export interface ConditionRecord {
  date: string
  sleepHours?: number
  note?: string
}

export interface DashboardData {
  profile: Profile
  weights: WeightRecord[]
  meals: MealRecord[]
  exercises: ExerciseRecord[]
  conditions: ConditionRecord[]
  generatedAt: string
}
