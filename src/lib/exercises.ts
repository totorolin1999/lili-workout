export type CalculationType =
  | 'weight_reps'
  | 'reps'
  | 'duration'
  | 'distance_duration'
  | 'reps_duration'

export const CALCULATION_TYPES: readonly CalculationType[] = [
  'weight_reps',
  'reps',
  'duration',
  'distance_duration',
  'reps_duration',
] as const

/**
 * Represents an exercise row from the `exercises` table.
 * All name fields are nullable — at least one must be non-null (enforced by DB CHECK).
 */
export interface Exercise {
  id: string
  name_hu: string | null
  name_en: string | null
  name_zh: string | null
  category: string
  calculation_type?: CalculationType | null
  user_id: string | null
}

/** Supported application locales */
export type Locale = 'hu' | 'en' | 'zh-TW'

/** Locale → column name mapping */
const LOCALE_COLUMN_MAP: Record<Locale, keyof Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh'>> = {
  hu: 'name_hu',
  en: 'name_en',
  'zh-TW': 'name_zh',
}

/**
 * Resolves the best display name for an exercise given the current locale.
 *
 * Fallback chain (Hungarian-First):
 *   currentLocale → hu → en → zh-TW
 *
 * This ensures the UI never shows an empty/blank exercise name.
 *
 * @param exercise - The exercise object from the database
 * @param locale   - The current UI locale
 * @returns        - The resolved display name string
 */
export function getExerciseDisplayName(
  exercise: Pick<Exercise, 'id' | 'name_hu' | 'name_en' | 'name_zh'>,
  locale: Locale,
): string {
  const fallbackOrder: Locale[] = [locale, 'hu', 'en', 'zh-TW']

  for (const fallbackLocale of fallbackOrder) {
    const col = LOCALE_COLUMN_MAP[fallbackLocale]
    const name = exercise[col]
    if (name && name.trim().length > 0) {
      return name.trim()
    }
  }

  // Should never reach here due to DB CHECK constraint
  return `[Exercise #${exercise.id.slice(0, 8)}]`
}

/**
 * Resolves the calculation type for an exercise, falling back to smart defaults
 * if not explicitly stored.
 */
export function getExerciseCalculationType(
  exercise?: Partial<Pick<Exercise, 'category' | 'calculation_type' | 'name_hu' | 'name_en' | 'name_zh'>> | null,
): CalculationType {
  if (exercise?.calculation_type) {
    return exercise.calculation_type
  }

  const nameZh = exercise?.name_zh ?? ''
  const nameEn = (exercise?.name_en ?? '').toLowerCase()
  const nameHu = (exercise?.name_hu ?? '').toLowerCase()

  // Jump rope: reps + time (or reps) instead of distance
  if (nameZh.includes('跳繩') || nameEn.includes('jump rope') || nameHu.includes('ugrókötél')) {
    return 'reps_duration'
  }

  // Plank: duration only
  if (nameZh.includes('平板支撐') || nameEn.includes('plank') || nameHu.includes('deszka')) {
    return 'duration'
  }

  // Cardio default (running, cycling, etc.): distance + duration
  if (exercise?.category === 'cardio') {
    return 'distance_duration'
  }

  // Default for strength exercises: weight + reps
  return 'weight_reps'
}

/**
 * Returns the primary name field key for a given locale.
 * Used in forms to determine which field is "required" vs optional.
 */
export function getPrimaryNameField(locale: Locale): keyof Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh'> {
  return LOCALE_COLUMN_MAP[locale]
}

