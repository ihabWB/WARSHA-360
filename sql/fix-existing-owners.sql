-- Fix for existing owners who don't have user_roles records
-- This script creates owner roles for all kablan owners who are missing them

-- Insert owner roles for all kablans where the owner doesn't have a role yet
INSERT INTO user_roles (kablan_id, user_id, role, permissions, invited_by, status, created_at, updated_at)
SELECT 
  k.id AS kablan_id,
  k.user_id,
  'owner' AS role,
  '{"workers": {"view": true, "create": true, "edit": true, "delete": true}, "projects": {"view": true, "create": true, "edit": true, "delete": true}, "foremen": {"view": true, "create": true, "edit": true, "delete": true}, "subcontractors": {"view": true, "create": true, "edit": true, "delete": true}, "dailyRecords": {"view": true, "create": true, "edit": true, "delete": true}, "payments": {"view": true, "create": true, "edit": true, "delete": true}, "reports": {"view": true, "create": true, "edit": true, "delete": true}, "personalAccounts": {"view": true, "create": true, "edit": true, "delete": true}, "cheques": {"view": true, "create": true, "edit": true, "delete": true}, "userManagement": {"view": true, "create": true, "edit": true, "delete": true}}' AS permissions,
  k.user_id AS invited_by,  -- Owner invited themselves (system migration)
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

-- Verify the results
SELECT 
  k.name AS kablan_name,
  k.user_id,
  ur.role,
  ur.status,
  ur.created_at
FROM kablans k
LEFT JOIN user_roles ur ON ur.kablan_id = k.id AND ur.user_id = k.user_id
ORDER BY k.created_at DESC;

-- Count summary
SELECT 
  COUNT(*) AS total_kablans,
  COUNT(DISTINCT k.user_id) AS total_owners,
  COUNT(DISTINCT ur.user_id) AS owners_with_roles
FROM kablans k
LEFT JOIN user_roles ur ON ur.kablan_id = k.id AND ur.user_id = k.user_id AND ur.role = 'owner';
