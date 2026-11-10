-- ============================================================
-- Migration: Add exercise_tags table and tag column to workout_sets
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create exercise_tags table for custom & shared exercise tags
CREATE TABLE IF NOT EXISTS exercise_tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_exercise_user_tag UNIQUE(exercise_id, user_id, tag)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exercise_tags_exercise ON exercise_tags (exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_tags_user ON exercise_tags (user_id);

-- Enable RLS
ALTER TABLE exercise_tags ENABLE ROW LEVEL SECURITY;

-- Policies for exercise_tags
CREATE POLICY "Anyone can view global and own exercise tags"
  ON exercise_tags FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert own exercise tags"
  ON exercise_tags FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own exercise tags"
  ON exercise_tags FOR DELETE
  USING (user_id = auth.uid());

-- Data API permissions for exercise_tags
GRANT SELECT ON TABLE exercise_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE exercise_tags TO authenticated;
GRANT ALL ON TABLE exercise_tags TO service_role;

-- 2. Add tag column to workout_sets table
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS tag TEXT;

-- Index for searching workouts by tag
CREATE INDEX IF NOT EXISTS idx_workout_sets_tag ON workout_sets (tag);
