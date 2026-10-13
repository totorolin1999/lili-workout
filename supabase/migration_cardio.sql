-- ============================================================
-- Migration: Clean schema for workout_sets (Remove redundant columns)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. 移除冗餘欄位 (RPE 與 is_completed)
ALTER TABLE workout_sets DROP COLUMN IF EXISTS rpe;
ALTER TABLE workout_sets DROP COLUMN IF EXISTS is_completed;

-- 2. 讓重量與次數允許 NULL（有氧運動時不填）
ALTER TABLE workout_sets ALTER COLUMN weight_kg DROP NOT NULL;
ALTER TABLE workout_sets ALTER COLUMN weight_kg DROP DEFAULT;
ALTER TABLE workout_sets ALTER COLUMN reps DROP NOT NULL;

-- 3. 將既有舊測試資料中 reps = 0 的資料轉為乾淨的 NULL（避免約束衝突）
UPDATE workout_sets SET reps = NULL WHERE reps = 0;

-- 4. 更新 CHECK 約束條件
ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_reps_check;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_reps_check CHECK (reps IS NULL OR reps > 0);

ALTER TABLE workout_sets DROP CONSTRAINT IF EXISTS workout_sets_weight_kg_check;
ALTER TABLE workout_sets ADD CONSTRAINT workout_sets_weight_kg_check CHECK (weight_kg IS NULL OR weight_kg >= 0);

-- 5. 新增有氧指標欄位
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS distance_km NUMERIC(6,2) CHECK (distance_km IS NULL OR distance_km >= 0);
ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
