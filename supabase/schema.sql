-- ============================================================
-- Lili Workout App — Supabase PostgreSQL Schema
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- EXERCISES
-- Multi-language exercise library.
-- Global exercises have user_id = NULL.
-- User-created exercises have user_id set.
-- CHECK constraint ensures at least one name is non-null.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_hu     TEXT,
  name_en     TEXT,
  name_zh     TEXT,
  category    TEXT NOT NULL CHECK (category IN (
                  'legs','chest','back','shoulders','arms','core','cardio','other'
                )),
  calculation_type TEXT DEFAULT 'weight_reps' CHECK (calculation_type IN (
                  'weight_reps','reps','duration','distance_duration','reps_duration'
                )),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_name CHECK (
    name_hu IS NOT NULL OR name_en IS NOT NULL OR name_zh IS NOT NULL
  )
);

-- Index for fast user exercise lookup
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises (user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises (category);

-- RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Global exercises (user_id IS NULL) are readable by everyone logged in
CREATE POLICY "Anyone can view global exercises"
  ON exercises FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can create own exercises"
  ON exercises FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own exercises"
  ON exercises FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own exercises"
  ON exercises FOR DELETE
  USING (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- WORKOUTS
-- A single training session.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workouts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  title       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts (user_id, date DESC);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE
  USING (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- WORKOUT_SETS
-- Individual sets logged within a workout.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_sets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id        UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id       UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  set_number        INTEGER NOT NULL CHECK (set_number > 0),
  weight_kg         NUMERIC(6,2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  reps              INTEGER CHECK (reps IS NULL OR reps > 0),
  distance_km       NUMERIC(6,2) CHECK (distance_km IS NULL OR distance_km >= 0),
  duration_seconds  INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  tag               TEXT,
  is_completed      BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON workout_sets (workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets (exercise_id);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Access via workout ownership
CREATE POLICY "Users can view own workout sets"
  ON workout_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_sets.workout_id
        AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own workout sets"
  ON workout_sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_sets.workout_id
        AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own workout sets"
  ON workout_sets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_sets.workout_id
        AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own workout sets"
  ON workout_sets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_sets.workout_id
        AND w.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- SEED: Built-in global exercises (Hungarian-first)
-- ─────────────────────────────────────────────────────────────
INSERT INTO exercises (name_hu, name_en, name_zh, category) VALUES
  -- Mell / Chest
  ('Fekvőtámasz', 'Push-up', '伏地挺身', 'chest'),
  ('Mellnyomás (lappad)', 'Bench Press', '臥推', 'chest'),
  ('Ferdetükönyomás', 'Incline Bench Press', '上斜臥推', 'chest'),
  ('Mellrepülés (kábel)', 'Cable Fly', '夾胸', 'chest'),

  -- Hát / Back
  ('Húzódzkodás', 'Pull-up', '引體向上', 'back'),
  ('Csónakevező', 'Bent-over Row', '俯身划船', 'back'),
  ('Lat-húzás', 'Lat Pulldown', '下拉', 'back'),
  ('Kábelhúzás ülve', 'Seated Cable Row', '坐姿划船', 'back'),

  -- Váll / Shoulders
  ('Katonanyomás', 'Overhead Press', '肩上推舉', 'shoulders'),
  ('Oldalemelés', 'Lateral Raise', '側平舉', 'shoulders'),
  ('Előreemelés', 'Front Raise', '前平舉', 'shoulders'),

  -- Kar / Arms
  ('Bicepsz-hajlítás', 'Bicep Curl', '二頭彎舉', 'arms'),
  ('Tricepsz-tolás (kábel)', 'Tricep Pushdown', '三頭下壓', 'arms'),
  ('Kalapácos hajlítás', 'Hammer Curl', '錘式彎舉', 'arms'),

  -- Láb / Legs
  ('Guggolás', 'Squat', '深蹲', 'legs'),
  ('Kitörés', 'Lunge', '弓步', 'legs'),
  ('Román felemelés', 'Romanian Deadlift', '羅馬尼亞硬舉', 'legs'),
  ('Lábnyomás (gép)', 'Leg Press', '腿部推舉', 'legs'),
  ('Vádli-emelés', 'Calf Raise', '提踵', 'legs'),

  -- Törzs / Core
  ('Hasprés', 'Crunch', '捲腹', 'core'),
  ('Deszka', 'Plank', '平板支撐', 'core'),
  ('Lábemelés', 'Leg Raise', '腿部上舉', 'core'),
  ('Orosz csavar', 'Russian Twist', '俄式轉體', 'core'),

  -- Kardió / Cardio
  ('Futás', 'Running', '跑步', 'cardio'),
  ('Kerékpározás', 'Cycling', '騎自行車', 'cardio'),
  ('Ugrókötél', 'Jump Rope', '跳繩', 'cardio')
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- EXERCISE_TAGS
-- Tag variations/details for exercises (e.g. Bulgarian, Reverse for Lunges).
-- Global default tags have user_id = NULL.
-- User custom tags have user_id = auth.uid().
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercise_tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_exercise_user_tag UNIQUE(exercise_id, user_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_exercise_tags_exercise ON exercise_tags (exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_tags_user ON exercise_tags (user_id);

ALTER TABLE exercise_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global and own exercise tags"
  ON exercise_tags FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own exercise tags"
  ON exercise_tags FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own exercise tags"
  ON exercise_tags FOR DELETE
  USING (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- PERMISSIONS & GRANTS
-- Explicit table grants for Data API (PostgREST, supabase-js).
-- Required for tables created from October 30, 2026 onwards.
-- ─────────────────────────────────────────────────────────────

-- Exercises
GRANT SELECT ON TABLE exercises TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE exercises TO authenticated;
GRANT ALL ON TABLE exercises TO service_role;

-- Workouts
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workouts TO authenticated;
GRANT ALL ON TABLE workouts TO service_role;

-- Workout Sets
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workout_sets TO authenticated;
GRANT ALL ON TABLE workout_sets TO service_role;

-- Exercise Tags
GRANT SELECT ON TABLE exercise_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE exercise_tags TO authenticated;
GRANT ALL ON TABLE exercise_tags TO service_role;

