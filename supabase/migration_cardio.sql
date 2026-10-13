-- ============================================================
-- Migration: Add Cardio Metrics to workout_sets
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Allow reps and weight to be optional for cardio/timed exercises
ALTER TABLE workout_sets ALTER COLUMN reps DROP NOT NULL;

ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_reps_check;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_reps_check CHECK (reps IS NULL OR reps >= 0);

-- 2. Add distance and duration columns
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2) CHECK (distance_km IS NULL OR distance_km >= 0);
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
