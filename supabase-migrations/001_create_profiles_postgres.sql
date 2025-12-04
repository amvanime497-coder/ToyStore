-- 001_create_profiles_postgres.sql
-- Safe, idempotent Postgres migration for Supabase projects.
-- This file avoids destructive operations where possible and includes
-- checks so you can run it in the Supabase SQL editor with less risk.

-- IMPORTANT: Review before running. Backup your database (export) if unsure.

BEGIN;

-- 1) Create profiles table if missing
CREATE TABLE IF NOT EXISTS public.profiles (
  id BIGSERIAL PRIMARY KEY,
  auth_id UUID,
  username TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Ensure unique constraint on auth_id (1:1 link)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_auth_id_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_id_key UNIQUE (auth_id);
  END IF;
END
$$;

-- 3) Create index on auth_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_profiles_auth_id' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_profiles_auth_id ON public.profiles(auth_id);
  END IF;
END
$$;

-- 4) Optional: Populate profiles from auth.users by matching email
-- This block is safe: it only INSERTs rows where no profile exists for that auth user.
-- NOTE: Running this requires SELECT access to `auth.users` (Supabase internal table)
-- and may not be allowed in the SQL editor depending on your permissions. Review before running.
--
-- INSERT INTO public.profiles (auth_id, username, email, role, created_at)
-- SELECT a.id, a.raw_user_meta_data->>'username' AS username, a.email, 'customer', now()
-- FROM auth.users a
-- LEFT JOIN public.profiles p ON p.auth_id = a.id OR (p.email IS NOT NULL AND p.email = a.email)
-- WHERE p.id IS NULL;

-- 5) Enable Row Level Security (RLS) if you plan to use Supabase auth-based policies.
-- Enabling RLS is not destructive, but it can block reads/writes until policies exist.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6) Create RLS policies (idempotent with DROP IF EXISTS)
DROP POLICY IF EXISTS profiles_allow_select ON public.profiles;
CREATE POLICY profiles_allow_select
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS profiles_allow_insert ON public.profiles;
CREATE POLICY profiles_allow_insert
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

DROP POLICY IF EXISTS profiles_allow_update ON public.profiles;
CREATE POLICY profiles_allow_update
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

DROP POLICY IF EXISTS profiles_allow_delete ON public.profiles;
CREATE POLICY profiles_allow_delete
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = auth_id);

COMMIT;

-- 7) Quick checks you can run separately (non-destructive):
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles';
-- SELECT id, auth_id, username, email, role, created_at FROM public.profiles ORDER BY id DESC LIMIT 50;

-- 8) WARNING: Do NOT run the following UPDATE in production unless you intentionally
-- want to set plaintext passwords for records without `auth_id`. It's left commented
-- to avoid accidental destructive changes.
--
-- UPDATE public.profiles
-- SET password = 'gg123456'
-- WHERE auth_id IS NULL;

-- End of migration
