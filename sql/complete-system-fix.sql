-- ============================================
-- COMPLETE SYSTEM FIX FOR EXISTING OWNERS
-- Run this script ONCE in Supabase SQL Editor
-- ============================================

-- STEP 1: Create allowed_owners table if it doesn't exist
CREATE TABLE IF NOT EXISTS allowed_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  added_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_allowed_owners_email ON allowed_owners(email);
CREATE INDEX IF NOT EXISTS idx_allowed_owners_status ON allowed_owners(status);

-- STEP 2: Migrate existing kablan owners to allowed_owners
INSERT INTO allowed_owners (email, user_id, added_by, status, activated_at, notes, created_at)
SELECT DISTINCT
  k.user_id AS email,
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

-- STEP 3: Fix user_roles for existing owners
INSERT INTO user_roles (kablan_id, user_id, role, permissions, invited_by, status, created_at, updated_at)
SELECT 
  k.id AS kablan_id,
  k.user_id,
  'owner' AS role,
  '{"workers": {"view": true, "create": true, "edit": true, "delete": true}, "projects": {"view": true, "create": true, "edit": true, "delete": true}, "foremen": {"view": true, "create": true, "edit": true, "delete": true}, "subcontractors": {"view": true, "create": true, "edit": true, "delete": true}, "dailyRecords": {"view": true, "create": true, "edit": true, "delete": true}, "payments": {"view": true, "create": true, "edit": true, "delete": true}, "reports": {"view": true, "create": true, "edit": true, "delete": true}, "personalAccounts": {"view": true, "create": true, "edit": true, "delete": true}, "cheques": {"view": true, "create": true, "edit": true, "delete": true}, "userManagement": {"view": true, "create": true, "edit": true, "delete": true}}' AS permissions,
  k.user_id AS invited_by,
  'active' AS status,
  NOW() AS created_at,
  NOW() AS updated_at
FROM kablans k
WHERE NOT EXISTS (
  SELECT 1 
  FROM user_roles ur 
  WHERE ur.kablan_id = k.id 
    AND ur.user_id = k.user_id
    AND ur.role = 'owner'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show all kablans with their owner roles
SELECT 
  k.name AS kablan_name,
  k.user_id,
  ur.role,
  ur.status AS role_status,
  ur.created_at AS role_created,
  ao.status AS allowed_status
FROM kablans k
LEFT JOIN user_roles ur ON ur.kablan_id = k.id AND ur.user_id = k.user_id AND ur.role = 'owner'
LEFT JOIN allowed_owners ao ON ao.user_id = k.user_id OR LOWER(ao.email) = LOWER(k.user_id)
ORDER BY k.created_at DESC;

-- Count summary
SELECT 
  'Total Kablans' AS metric,
  COUNT(*) AS count
FROM kablans
UNION ALL
SELECT 
  'Owners with roles' AS metric,
  COUNT(DISTINCT ur.user_id) AS count
FROM kablans k
LEFT JOIN user_roles ur ON ur.kablan_id = k.id AND ur.user_id = k.user_id AND ur.role = 'owner'
WHERE ur.id IS NOT NULL
UNION ALL
SELECT 
  'Allowed owners' AS metric,
  COUNT(*) AS count
FROM allowed_owners;
