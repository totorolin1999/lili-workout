-- Migration: Add calculation_type to exercises table
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS calculation_type TEXT DEFAULT 'weight_reps'
CHECK (calculation_type IN ('weight_reps', 'reps', 'duration', 'distance_duration', 'reps_duration'));

-- Update built-in exercises with accurate default calculation types
UPDATE exercises 
SET calculation_type = 'reps_duration'
WHERE name_en ILIKE '%jump rope%' OR name_zh LIKE '%跳繩%' OR name_hu ILIKE '%ugrókötél%';

UPDATE exercises 
SET calculation_type = 'duration'
WHERE name_en ILIKE '%plank%' OR name_zh LIKE '%平板支撐%' OR name_hu ILIKE '%deszka%';

UPDATE exercises 
SET calculation_type = 'distance_duration'
WHERE category = 'cardio' AND calculation_type IS DISTINCT FROM 'reps_duration';
