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
 * Returns the primary name field key for a given locale.
 * Used in forms to determine which field is "required" vs optional.
 */
export function getPrimaryNameField(locale: Locale): keyof Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh'> {
  return LOCALE_COLUMN_MAP[locale]
}
