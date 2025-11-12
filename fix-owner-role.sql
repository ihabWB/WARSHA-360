-- ============================================
-- إصلاح: إضافة دور Owner للمستخدم الحالي
-- ============================================

-- الخطوة 1: عرض جميع المقاولين لمعرفة kablan_id الخاص بك
SELECT id, name, user_id, created_at 
FROM kablans 
ORDER BY created_at DESC;

-- بعد معرفة user_id و kablan_id الخاص بك، نفذ الأمر التالي:
-- استبدل 'YOUR_FIREBASE_UID' بـ Firebase UID الخاص بك
-- استبدل 'YOUR_KABLAN_ID' بـ kablan_id الخاص بك

INSERT INTO user_roles (
    kablan_id,
    user_id,
    role,
    permissions,
    invited_by,
    status
) VALUES (
    'YOUR_KABLAN_ID',  -- ضع kablan_id هنا
    'YOUR_FIREBASE_UID',  -- ضع Firebase UID هنا
    'owner',
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
    }'::jsonb,
    'YOUR_FIREBASE_UID',  -- نفس Firebase UID (دعا نفسه)
    'active'
);

-- للتحقق من النجاح:
SELECT * FROM user_roles WHERE user_id = 'YOUR_FIREBASE_UID';
