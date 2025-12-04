-- 001_create_profiles.sql (MySQL-compatible)
-- Creates `profiles` table. This version replaces Postgres types and RLS with
-- MySQL-compatible types and notes. If you are actually using Postgres/Supabase,
-- keep the original Postgres migration instead.

-- 1) Create profiles table (MySQL equivalents)
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `auth_id` CHAR(36) DEFAULT NULL,
  `username` TEXT,
  `email` VARCHAR(255) UNIQUE,
  `password` TEXT,
  `role` VARCHAR(50) DEFAULT 'customer',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Add unique constraint on auth_id if it doesn't already exist
-- MySQL doesn't have a simple "IF NOT EXISTS" for constraints; use a small
-- procedure wrapper to add it safely when running as a script.
DELIMITER $$
CREATE PROCEDURE add_profiles_auth_id_key_if_not_exists()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'profiles'
      AND CONSTRAINT_NAME = 'profiles_auth_id_key'
      AND CONSTRAINT_TYPE = 'UNIQUE'
  ) THEN
    ALTER TABLE `profiles` ADD CONSTRAINT `profiles_auth_id_key` UNIQUE (`auth_id`);
  END IF;
END$$
CALL add_profiles_auth_id_key_if_not_exists();
DROP PROCEDURE add_profiles_auth_id_key_if_not_exists();
DELIMITER ;

-- 3) Index on auth_id (if you prefer a separate non-unique index)
-- CREATE INDEX `idx_profiles_auth_id` ON `profiles` (`auth_id`);

-- 4) (Optional) Populate profiles for existing auth users by matching email
-- NOTE: The original script targeted Postgres `auth.users` (Supabase). If you
-- have an `auth.users` table in this MySQL database, adapt the query below.
-- If you DON'T want this, skip the INSERT block.
--
-- Example (uncomment and adapt if you have an `auth_users` table):
-- INSERT INTO `profiles` (auth_id, username, email, role, created_at)
-- SELECT u.id, u.username, u.email, 'customer', NOW()
-- FROM auth_users u
-- LEFT JOIN profiles p ON p.auth_id = u.id OR (p.email IS NOT NULL AND p.email = u.email)
-- WHERE p.id IS NULL;

-- 5) Row Level Security (RLS) and Supabase `auth.uid()` are Postgres-specific.
-- MySQL does not support Postgres RLS or the `auth.uid()` helper. Enforce row
-- ownership checks in your application code or via stored procedures/ views.
-- If you are using Supabase (Postgres), use the original Postgres migration.

-- 6) Quick checks (optional)
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profiles';

SELECT id, auth_id, username, email, role, created_at
FROM `profiles`
ORDER BY id DESC
LIMIT 50;

-- 7) (Optional, development only) Set plaintext password 'gg123456' for
-- profiles without an `auth_id`. WARNING: This writes plaintext passwords.
-- DO NOT run in production. Uncomment only for local/dev testing.
-- UPDATE `profiles` SET password = 'gg123456' WHERE auth_id IS NULL;
