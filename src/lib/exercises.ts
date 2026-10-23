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
  tags?: string[]
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

/**
 * Built-in default tag suggestions by exercise name and locale.
 */
const DEFAULT_TAGS_MAP: Record<Locale, Array<{ keywords: string[]; tags: string[] }>> = {
  'zh-TW': [
    { keywords: ['弓步', 'lunge', 'kitörés'], tags: ['前跨', '後跨', '保加利亞', '行走', '側步'] },
    { keywords: ['深蹲', 'squat', 'guggolás'], tags: ['背槓', '前槓', '高腳杯', '箱上', '窄距'] },
    { keywords: ['臥推', 'bench press', 'mellnyomás'], tags: ['槓鈴', '啞鈴', '上斜', '下斜', '窄握'] },
    { keywords: ['伏地挺身', 'push-up', 'fekvőtámasz'], tags: ['標準', '跪姿', '鑽石', '窄距', '增高'] },
    { keywords: ['引體向上', 'pull-up', 'húzódzkodás'], tags: ['正手', '反手', '對握', '彈力帶輔助'] },
    { keywords: ['俯身划船', 'bent-over row', 'csónakevező'], tags: ['槓鈴', '啞鈴', '反手', '單臂'] },
    { keywords: ['下拉', 'lat pulldown', 'lat-húzás'], tags: ['寬握', '窄握', '反手', 'V把'] },
    { keywords: ['肩上推舉', 'overhead press', 'katonanyomás'], tags: ['槓鈴', '啞鈴', '站姿', '坐姿', '阿諾'] },
    { keywords: ['側平舉', 'lateral raise', 'oldalemelés'], tags: ['啞鈴', '滑輪', '機械'] },
    { keywords: ['二頭彎舉', 'bicep curl', 'bicepsz-hajlítás'], tags: ['槓鈴', '啞鈴', '斜板', '錘式'] },
    { keywords: ['三頭下壓', 'tricep pushdown', 'tricepsz-tolás'], tags: ['繩索', '直槓', 'V槓'] },
    { keywords: ['羅馬尼亞硬舉', 'romanian deadlift', 'román felemelés'], tags: ['槓鈴', '啞鈴', '單腿'] },
    { keywords: ['腿部推舉', 'leg press', 'lábnyomás'], tags: ['雙腿', '單腿', '高位', '寬距'] },
    { keywords: ['提踵', 'calf raise', 'vádli-emelés'], tags: ['站姿', '坐姿', '單腿'] },
    { keywords: ['平板支撐', 'plank', 'deszka'], tags: ['標準', '側平板', '動態'] },
    { keywords: ['捲腹', 'crunch', 'hasprés'], tags: ['標準', '反向', '滑輪'] },
    { keywords: ['跑步', 'running', 'futás'], tags: ['戶外', '跑步機', '間歇', '慢跑'] },
    { keywords: ['騎自行車', 'cycling', 'kerékpározás'], tags: ['戶外', '飛輪'] },
    { keywords: ['跳繩', 'jump rope', 'ugrókötél'], tags: ['雙迴旋', '單腳', '交叉'] },
  ],
  en: [
    { keywords: ['弓步', 'lunge', 'kitörés'], tags: ['Forward', 'Reverse', 'Bulgarian', 'Walking', 'Lateral'] },
    { keywords: ['深蹲', 'squat', 'guggolás'], tags: ['Back', 'Front', 'Goblet', 'Box', 'Narrow'] },
    { keywords: ['臥推', 'bench press', 'mellnyomás'], tags: ['Barbell', 'Dumbbell', 'Incline', 'Decline', 'Close-grip'] },
    { keywords: ['伏地挺身', 'push-up', 'fekvőtámasz'], tags: ['Standard', 'Kneeling', 'Diamond', 'Narrow'] },
    { keywords: ['引體向上', 'pull-up', 'húzódzkodás'], tags: ['Overhand', 'Underhand', 'Neutral', 'Assisted'] },
    { keywords: ['俯身划船', 'bent-over row', 'csónakevező'], tags: ['Barbell', 'Dumbbell', 'Reverse grip', 'Single-arm'] },
    { keywords: ['下拉', 'lat pulldown', 'lat-húzás'], tags: ['Wide grip', 'Close grip', 'Underhand', 'V-bar'] },
    { keywords: ['肩上推舉', 'overhead press', 'katonanyomás'], tags: ['Barbell', 'Dumbbell', 'Standing', 'Seated', 'Arnold'] },
    { keywords: ['側平舉', 'lateral raise', 'oldalemelés'], tags: ['Dumbbell', 'Cable', 'Machine'] },
    { keywords: ['二頭彎舉', 'bicep curl', 'bicepsz-hajlítás'], tags: ['Barbell', 'Dumbbell', 'Preacher', 'Hammer'] },
    { keywords: ['羅馬尼亞硬舉', 'romanian deadlift', 'román felemelés'], tags: ['Barbell', 'Dumbbell', 'Single leg'] },
    { keywords: ['腿部推舉', 'leg press', 'lábnyomás'], tags: ['Standard', 'Single leg', 'High foot', 'Wide'] },
    { keywords: ['提踵', 'calf raise', 'vádli-emelés'], tags: ['Standing', 'Seated', 'Single leg'] },
    { keywords: ['平板支撐', 'plank', 'deszka'], tags: ['Standard', 'Side', 'Dynamic'] },
    { keywords: ['跑步', 'running', 'futás'], tags: ['Outdoor', 'Treadmill', 'Interval', 'Jogging'] },
    { keywords: ['騎自行車', 'cycling', 'kerékpározás'], tags: ['Outdoor', 'Spin bike'] },
    { keywords: ['跳繩', 'jump rope', 'ugrókötél'], tags: ['Double under', 'Single leg', 'Cross'] },
  ],
  hu: [
    { keywords: ['弓步', 'lunge', 'kitörés'], tags: ['Előre lépő', 'Hátra lépő', 'Bolgár', 'Sétáló', 'Oldalsó'] },
    { keywords: ['深蹲', 'squat', 'guggolás'], tags: ['Hátul guggoló', 'Elöl guggoló', 'Kehely', 'Zsámolyra', 'Szűk'] },
    { keywords: ['臥推', 'bench press', 'mellnyomás'], tags: ['Rúddal', 'Kézisúlyzóval', 'Ferde padon', 'Negatív padon'] },
    { keywords: ['伏地挺身', 'push-up', 'fekvőtámasz'], tags: ['Normál', 'Térdelő', 'Gyémánt', 'Szűk'] },
    { keywords: ['引體向上', 'pull-up', 'húzódzkodás'], tags: ['Felső fogás', 'Alsó fogás', 'Párhuzamos', 'Gumiszalaggal'] },
    { keywords: ['羅馬尼亞硬舉', 'romanian deadlift', 'román felemelés'], tags: ['Rúddal', 'Kézisúlyzóval', 'Egy lábon'] },
    { keywords: ['平板支撐', 'plank', 'deszka'], tags: ['Normál', 'Oldalsó', 'Dinamikus'] },
    { keywords: ['跑步', 'running', 'futás'], tags: ['Kültéri', 'Futópad', 'Intervallum', 'Kocogás'] },
  ],
}

/**
 * Returns the default suggested tags for a given exercise based on its names.
 */
export function getDefaultExerciseTags(
  exercise?: Partial<Pick<Exercise, 'name_hu' | 'name_en' | 'name_zh'>> | null,
  locale: Locale = 'zh-TW',
): string[] {
  if (!exercise) return []

  const nameZh = (exercise.name_zh ?? '').toLowerCase()
  const nameEn = (exercise.name_en ?? '').toLowerCase()
  const nameHu = (exercise.name_hu ?? '').toLowerCase()

  const list = DEFAULT_TAGS_MAP[locale] || DEFAULT_TAGS_MAP['zh-TW']
  for (const entry of list) {
    const matched = entry.keywords.some(
      (kw) =>
        nameZh.includes(kw.toLowerCase()) ||
        nameEn.includes(kw.toLowerCase()) ||
        nameHu.includes(kw.toLowerCase()),
    )
    if (matched) {
      return [...entry.tags]
    }
  }

  return []
}

/**
 * Combines built-in default tags with any user-saved/custom tags, removing duplicates.
 */
export function getEffectiveExerciseTags(
  exercise?: Exercise | null,
  locale: Locale = 'zh-TW',
): string[] {
  if (!exercise) return []
  const defaultTags = getDefaultExerciseTags(exercise, locale)
  const customTags = exercise.tags ?? []

  const combined = new Set<string>()
  // Add defaults first
  for (const tag of defaultTags) {
    const trimmed = tag.trim()
    if (trimmed) combined.add(trimmed)
  }
  // Add custom tags
  for (const tag of customTags) {
    const trimmed = tag.trim()
    if (trimmed) combined.add(trimmed)
  }

  return Array.from(combined)
}


