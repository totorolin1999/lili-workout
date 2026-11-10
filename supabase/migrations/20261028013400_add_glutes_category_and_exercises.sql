-- ============================================================
-- Migration: Add 'glutes' category and seed built-in glutes exercises
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Update category check constraint on exercises table
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_category_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_category_check CHECK (category IN (
  'legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other'
));

-- 2. Insert built-in glutes exercises
INSERT INTO exercises (name_hu, name_en, name_zh, category, calculation_type) VALUES
  ('Farhíd', 'Glute Bridge', '臀橋', 'glutes', 'weight_reps'),
  ('Csípőtolás', 'Hip Thrust', '臀推', 'glutes', 'weight_reps'),
  ('Bolgár guggolás', 'Bulgarian Split Squat', '保加利亞分腿蹲', 'glutes', 'weight_reps'),
  ('Szamárrúgás', 'Donkey Kick', '跪姿後踢', 'glutes', 'reps'),
  ('Kagyló-gyakorlat', 'Clamshell', '蚌式開合', 'glutes', 'reps'),
  ('Oldalsó térdemelés (tűzcsap)', 'Fire Hydrant', '消防栓式', 'glutes', 'reps'),
  ('Békapumpa', 'Frog Pump', '蛙式推臀', 'glutes', 'reps'),
  ('Oldalsó lábemelés', 'Side-Lying Leg Raise', '側臥抬腿', 'glutes', 'reps')
ON CONFLICT DO NOTHING;

-- 3. Cleanup: default variation tags are dynamically resolved by UI locale in client code (exercises.ts).
-- Exercise_tags table should only contain user-created custom tags, not mixed multilingual global seed tags.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exercise_tags') THEN
    DELETE FROM exercise_tags 
    WHERE user_id IS NULL 
      AND exercise_id IN (
        SELECT id FROM exercises WHERE category = 'glutes'
      );
  END IF;
END $$;
