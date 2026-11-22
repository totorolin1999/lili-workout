-- ============================================================
-- Migration: Add built-in 'Dancing' (跳舞 / Tánc) exercise under 'cardio'
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

INSERT INTO exercises (name_hu, name_en, name_zh, category, calculation_type)
SELECT 'Tánc', 'Dancing', '跳舞', 'cardio', 'duration'
WHERE NOT EXISTS (
  SELECT 1 FROM exercises
  WHERE user_id IS NULL
    AND (name_en = 'Dancing' OR name_zh = '跳舞' OR name_hu = 'Tánc')
);
