-- ============================================================
-- Migration: Add explicit Data API grants for public tables
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- Required for Supabase October 30 Data API permission changes.
-- ============================================================

-- Exercises table grants
GRANT SELECT ON TABLE exercises TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE exercises TO authenticated;
GRANT ALL ON TABLE exercises TO service_role;

-- Workouts table grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workouts TO authenticated;
GRANT ALL ON TABLE workouts TO service_role;

-- Workout Sets table grants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE workout_sets TO authenticated;
GRANT ALL ON TABLE workout_sets TO service_role;
