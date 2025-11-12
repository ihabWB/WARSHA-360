-- ============================================
-- تحديث user_roles الموجودة بالبريد الإلكتروني
-- Update existing user_roles with email from Firebase Auth
-- ============================================
-- ملاحظة: هذا السكريبت يتطلب معرفة Firebase UIDs والإيميلات يدوياً
-- لأننا لا نستطيع الوصول لـ Firebase Auth من Supabase مباشرة

-- مثال: إذا كان لديك مستخدمين حاليين، قم بتحديث سجلاتهم يدوياً:
-- UPDATE user_roles 
-- SET email = 'owner@example.com' 
-- WHERE user_id = 'FIREBASE_UID_HERE';

-- للتحقق من السجلات التي ليس لديها email:
SELECT 
    id,
    kablan_id,
    user_id,
    role,
    email,
    status
FROM user_roles
WHERE email IS NULL OR email = ''
ORDER BY created_at DESC;

-- نصيحة: قم بنسخ Firebase UIDs من Firebase Console
-- وقم بتحديث البريد لكل واحد باستخدام:
-- UPDATE user_roles SET email = 'user@example.com' WHERE user_id = 'FIREBASE_UID';
