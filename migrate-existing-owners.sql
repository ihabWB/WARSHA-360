-- ============================================
-- إضافة دور owner للمستخدمين الحاليين
-- Migration: Add owner role for existing users
-- ============================================
-- قم بتشغيل هذا السكريبت في Supabase SQL Editor مرة واحدة فقط

-- إضافة دور owner لكل مستخدم لديه kablan بالفعل
INSERT INTO user_roles (kablan_id, user_id, role, permissions, invited_by, status)
SELECT 
    k.id AS kablan_id,
    k.user_id AS user_id,
    'owner' AS role,
    '{
        "workers": {"create": true, "read": true, "update": true, "delete": true},
        "projects": {"create": true, "read": true, "update": true, "delete": true},
        "foremen": {"create": true, "read": true, "update": true, "delete": true},
        "subcontractors": {"create": true, "read": true, "update": true, "delete": true},
        "daily_records": {"create": true, "read": true, "update": true, "delete": true},
        "payments": {"create": true, "read": true, "update": true, "delete": true},
        "personal_accounts": {"create": true, "read": true, "update": true, "delete": true},
        "cheques": {"create": true, "read": true, "update": true, "delete": true},
        "reports": {"read": true, "export": true},
        "settings": {"manage_users": true, "manage_permissions": true}
    }'::jsonb AS permissions,
    k.user_id AS invited_by,
    'active' AS status
FROM kablans k
LEFT JOIN user_roles ur ON ur.kablan_id = k.id AND ur.user_id = k.user_id
WHERE ur.id IS NULL;  -- فقط للمستخدمين الذين ليس لديهم دور بعد

-- التحقق من النتائج
SELECT 
    ur.id,
    k.name AS kablan_name,
    ur.user_id,
    ur.role,
    ur.status,
    ur.created_at
FROM user_roles ur
JOIN kablans k ON k.id = ur.kablan_id
WHERE ur.role = 'owner'
ORDER BY ur.created_at DESC;
