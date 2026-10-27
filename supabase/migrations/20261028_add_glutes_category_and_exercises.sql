-- ============================================================
-- Migration: Add 'glutes' category and seed glutes exercises with home variation tags
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Update category check constraint on exercises table
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_category_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_category_check CHECK (category IN (
  'legs', 'glutes', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'other'
));

-- 2. Insert built-in glutes exercises (with home-friendly options)
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

-- 3. Seed default home option tags for glute exercises into exercise_tags (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exercise_tags') THEN
    -- Farhíd / Glute Bridge
    INSERT INTO exercise_tags (exercise_id, user_id, tag)
    SELECT id, NULL, unnest(ARRAY['自重', '彈力帶', '單腿', '啞鈴', '墊高', 'Bodyweight', 'Resistance band', 'Single leg', 'Dumbbell', 'Elevated', 'Saját testsúly', 'Gumiszalaggal', 'Egy lábon', 'Kézisúlyzóval', 'Megemelt'])
    FROM exercises WHERE name_en = 'Glute Bridge' AND user_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Csípőtolás / Hip Thrust
    INSERT INTO exercise_tags (exercise_id, user_id, tag)
    SELECT id, NULL, unnest(ARRAY['沙發/椅子', '彈力帶', '啞鈴', '單腿', '槓鈴', 'Couch/Chair', 'Resistance band', 'Dumbbell', 'Single leg', 'Barbell', 'Kanapén/Széken', 'Gumiszalaggal', 'Kézisúlyzóval', 'Egy lábon', 'Rúddal'])
    FROM exercises WHERE name_en = 'Hip Thrust' AND user_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Bolgár guggolás / Bulgarian Split Squat
    INSERT INTO exercise_tags (exercise_id, user_id, tag)
    SELECT id, NULL, unnest(ARRAY['沙發/椅子', '自重', '啞鈴', '臀部主導', 'Couch/Chair', 'Bodyweight', 'Dumbbell', 'Glute-focused', 'Kanapén/Széken', 'Saját testsúly', 'Kézisúlyzóval', 'Farizom fókusz'])
    FROM exercises WHERE name_en = 'Bulgarian Split Squat' AND user_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Szamárrúgás / Donkey Kick
    INSERT INTO exercise_tags (exercise_id, user_id, tag)
    SELECT id, NULL, unnest(ARRAY['自重', '彈力帶', '負重啞鈴', '直腿', 'Bodyweight', 'Resistance band', 'Dumbbell', 'Straight leg', 'Saját testsúly', 'Gumiszalaggal', 'Kézisúlyzóval', 'Nyújtott lábbal'])
    FROM exercises WHERE name_en = 'Donkey Kick' AND user_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Kagyló-gyakorlat / Clamshell
    INSERT INTO exercise_tags (exercise_id, user_id, tag)
    SELECT id, NULL, unnest(ARRAY['自重', '彈力帶', '抬腿蚌式', 'Bodyweight', 'Resistance band', 'Elevated', 'Saját testsúly', 'Gumiszalaggal', 'Emelt lábbal'])
    FROM exercises WHERE name_en = 'Clamshell' AND user_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Fire Hydrant
    INSERT INTO exercise_tags (exercise_id, user_id, tag)
    SELECT id, NULL, unnest(ARRAY['自重', '彈力帶', '負重', 'Bodyweight', 'Resistance band', 'Weighted', 'Saját testsúly', 'Gumiszalaggal', 'Súllyal'])
    FROM exercises WHERE name_en = 'Fire Hydrant' AND user_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Frog Pump
    INSERT INTO exercise_tags (exercise_id, user_id, tag)
    SELECT id, NULL, unnest(ARRAY['自重', '啞鈴', '彈力帶', 'Bodyweight', 'Dumbbell', 'Resistance band', 'Saját testsúly', 'Kézisúlyzóval', 'Gumiszalaggal'])
    FROM exercises WHERE name_en = 'Frog Pump' AND user_id IS NULL
    ON CONFLICT DO NOTHING;

    -- Side-Lying Leg Raise
    INSERT INTO exercise_tags (exercise_id, user_id, tag)
    SELECT id, NULL, unnest(ARRAY['自重', '彈力帶', '腳踝負重', 'Bodyweight', 'Resistance band', 'Ankle weight', 'Saját testsúly', 'Gumiszalaggal', 'Bokasúllyal'])
    FROM exercises WHERE name_en = 'Side-Lying Leg Raise' AND user_id IS NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
