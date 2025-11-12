-- Add existing kablan owners to allowed_owners table
-- This migrates existing owners so they can continue using the system

-- First, create the allowed_owners table if you haven't already
-- Run create-allowed-owners.sql first!

-- Insert existing kablan owners into allowed_owners
-- Mark them as 'activated' since they already have accounts
INSERT INTO allowed_owners (email, user_id, added_by, status, activated_at, notes, created_at)
SELECT DISTINCT
  k.user_id AS email,  -- Assuming user_id contains the email or Firebase UID
  k.user_id,
  'system_migration' AS added_by,
  'activated' AS status,
  k.created_at AS activated_at,
  'Migrated from existing kablans' AS notes,
  k.created_at
FROM kablans k
WHERE NOT EXISTS (
  SELECT 1 
  FROM allowed_owners ao 
  WHERE ao.user_id = k.user_id OR LOWER(ao.email) = LOWER(k.user_id)
)
ON CONFLICT (email) DO NOTHING;

-- Verify the migration
SELECT 
  ao.email,
  ao.status,
  ao.activated_at,
  ao.notes,
  COUNT(k.id) AS kablan_count
FROM allowed_owners ao
LEFT JOIN kablans k ON k.user_id = ao.user_id OR k.user_id = ao.email
GROUP BY ao.id, ao.email, ao.status, ao.activated_at, ao.notes
ORDER BY ao.activated_at DESC;

-- Summary
SELECT 
  status,
  COUNT(*) AS count
FROM allowed_owners
GROUP BY status;
