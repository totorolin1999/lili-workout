-- ============================================================
-- Lili Workout App — Profiles & Admin Member Management Migration
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. PROFILES TABLE
-- Stores public profile and role information for each authenticated user.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. HELPER FUNCTION: is_admin
-- Security definer function avoids infinite recursion during RLS evaluation.
CREATE OR REPLACE FUNCTION public.is_admin(user_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_uid AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. RLS POLICIES FOR PROFILES
DROP POLICY IF EXISTS "Users can read own profile or admins read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admins read all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own display_name" ON public.profiles;
CREATE POLICY "Users can update own display_name"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    -- Normal users cannot promote themselves to admin
    (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 5. ADMIN POLICIES FOR WORKOUTS & SETS
-- Allows administrators to view and manage workouts across all members.
DROP POLICY IF EXISTS "Admins can view all workouts" ON public.workouts;
CREATE POLICY "Admins can view all workouts"
  ON public.workouts FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any workout" ON public.workouts;
CREATE POLICY "Admins can delete any workout"
  ON public.workouts FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all workout sets" ON public.workout_sets;
CREATE POLICY "Admins can view all workout sets"
  ON public.workout_sets FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any workout set" ON public.workout_sets;
CREATE POLICY "Admins can delete any workout set"
  ON public.workout_sets FOR DELETE
  USING (public.is_admin());

-- 6. PERMISSIONS & DATA API GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO service_role;

-- 7. TRIGGER: Automatic profile creation when a new user registers in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'Member'
    ),
    'member'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. BACKFILL EXISTING USERS
-- A. From auth.users if available
DO $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  SELECT
    u.id,
    u.email,
    COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      split_part(u.email, '@', 1),
      'Member ' || substr(u.id::text, 1, 6)
    ),
    'member'
  FROM auth.users u
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

-- B. From workouts if any exist without profile
INSERT INTO public.profiles (id, email, display_name, role)
SELECT DISTINCT
  w.user_id,
  'user_' || substr(w.user_id::text, 1, 8) || '@workout.app',
  'Member ' || substr(w.user_id::text, 1, 6),
  'member'
FROM public.workouts w
ON CONFLICT (id) DO NOTHING;

-- C. (Optional) Manually promote a specific email to admin in the database:
-- UPDATE public.profiles SET role = 'admin' WHERE lower(email) = 'admin@example.com';



-- 9. ADMIN SUMMARY RPC FUNCTION
-- Aggregates member statistics in one fast call for the dashboard.
CREATE OR REPLACE FUNCTION public.get_admin_member_stats()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  workouts_count BIGINT,
  sets_count BIGINT,
  last_workout_date DATE,
  active_days_30d BIGINT
) AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.display_name,
    p.role,
    p.created_at,
    COUNT(DISTINCT w.id) AS workouts_count,
    COUNT(ws.id) AS sets_count,
    MAX(w.date) AS last_workout_date,
    COUNT(DISTINCT CASE WHEN w.date >= (CURRENT_DATE - INTERVAL '30 days') THEN w.date END) AS active_days_30d
  FROM public.profiles p
  LEFT JOIN public.workouts w ON w.user_id = p.id
  LEFT JOIN public.workout_sets ws ON ws.workout_id = w.id
  GROUP BY p.id, p.email, p.display_name, p.role, p.created_at
  ORDER BY MAX(w.date) DESC NULLS LAST, p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_admin_member_stats() TO authenticated;

-- Ensure any legacy unauthenticated promotion functions are dropped
DROP FUNCTION IF EXISTS public.set_admin_role_by_email(TEXT);

