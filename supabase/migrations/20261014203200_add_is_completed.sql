-- ============================================================
-- Migration: Add is_completed status to workout_sets
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT true;
