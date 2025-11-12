-- ============================================
-- إضافة جدول التسجيل المسبق للموظفين
-- Add Pre-registration Table for Employees
-- ============================================
-- قم بتشغيل هذا السكريبت في Supabase SQL Editor مرة واحدة فقط

-- ============================================
-- PRE-REGISTERED USERS Table
-- التسجيل المسبق للموظفين قبل إنشاء حساب Firebase
-- ============================================
CREATE TABLE IF NOT EXISTS pre_registered_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'data_entry', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '{}',
    registered_by TEXT NOT NULL, -- Firebase UID للمدير الذي سجّل الموظف
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'activated', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(kablan_id, email) -- كل بريد لكل kablan مرة واحدة فقط
);

-- ============================================
-- INDEXES for Pre-registered Users
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pre_registered_users_email ON pre_registered_users(email);
CREATE INDEX IF NOT EXISTS idx_pre_registered_users_kablan ON pre_registered_users(kablan_id);
CREATE INDEX IF NOT EXISTS idx_pre_registered_users_status ON pre_registered_users(status);

-- ============================================
-- TRIGGER for Pre-registered Users
-- ============================================
CREATE TRIGGER update_pre_registered_users_updated_at BEFORE UPDATE ON pre_registered_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- التحقق من النتائج
-- Verify Results
-- ============================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pre_registered_users'
ORDER BY ordinal_position;

-- عرض جميع الجداول في قاعدة البيانات
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
