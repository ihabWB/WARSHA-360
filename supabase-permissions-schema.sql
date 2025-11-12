-- ============================================
-- Multi-User Permissions Extension
-- للسماح لعدة موظفين بالوصول إلى حساب الشركة
-- ============================================

-- ============================================
-- 1. USER ROLES Table
-- تعريف أدوار المستخدمين وصلاحياتهم
-- ============================================
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT NOT NULL, -- Firebase UID للموظف
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'accountant', 'data_entry', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '{}', -- صلاحيات مخصصة
    invited_by TEXT NOT NULL, -- Firebase UID للمستخدم الذي أرسل الدعوة
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(kablan_id, user_id) -- كل مستخدم يمكن أن يكون له دور واحد فقط لكل مقاول
);

-- ============================================
-- 2. PENDING INVITATIONS Table
-- دعوات معلقة للموظفين الجدد
-- ============================================
CREATE TABLE pending_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'data_entry', 'viewer')),
    permissions JSONB NOT NULL DEFAULT '{}',
    invited_by TEXT NOT NULL, -- Firebase UID
    invitation_token TEXT NOT NULL UNIQUE, -- رمز الدعوة
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. AUDIT LOG Table
-- سجل التدقيق لتتبع جميع العمليات
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT NOT NULL, -- Firebase UID
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'view'
    resource_type TEXT NOT NULL, -- 'worker', 'project', 'payment', etc.
    resource_id UUID, -- ID للسجل المعدّل
    details JSONB, -- تفاصيل إضافية
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_user_roles_kablan ON user_roles(kablan_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_status ON user_roles(status);
CREATE INDEX idx_pending_invitations_kablan ON pending_invitations(kablan_id);
CREATE INDEX idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX idx_pending_invitations_token ON pending_invitations(invitation_token);
CREATE INDEX idx_audit_log_kablan ON audit_log(kablan_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_invitations_updated_at BEFORE UPDATE ON pending_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PERMISSION DEFINITIONS (as JSONB examples)
-- ============================================
-- Owner (صاحب الحساب):
-- {
--   "workers": {"create": true, "read": true, "update": true, "delete": true},
--   "projects": {"create": true, "read": true, "update": true, "delete": true},
--   "payments": {"create": true, "read": true, "update": true, "delete": true},
--   "reports": {"read": true, "export": true},
--   "settings": {"manage_users": true, "manage_permissions": true}
-- }

-- Admin (مدير):
-- {
--   "workers": {"create": true, "read": true, "update": true, "delete": true},
--   "projects": {"create": true, "read": true, "update": true, "delete": true},
--   "payments": {"create": true, "read": true, "update": true, "delete": false},
--   "reports": {"read": true, "export": true},
--   "settings": {"manage_users": false, "manage_permissions": false}
-- }

-- Accountant (محاسب):
-- {
--   "workers": {"create": false, "read": true, "update": false, "delete": false},
--   "projects": {"create": false, "read": true, "update": false, "delete": false},
--   "payments": {"create": true, "read": true, "update": true, "delete": false},
--   "reports": {"read": true, "export": true},
--   "settings": {"manage_users": false, "manage_permissions": false}
-- }

-- Data Entry (مدخل بيانات):
-- {
--   "workers": {"create": true, "read": true, "update": true, "delete": false},
--   "projects": {"create": true, "read": true, "update": true, "delete": false},
--   "daily_records": {"create": true, "read": true, "update": true, "delete": false},
--   "payments": {"create": false, "read": true, "update": false, "delete": false},
--   "reports": {"read": true, "export": false},
--   "settings": {"manage_users": false, "manage_permissions": false}
-- }

-- Viewer (مشاهد فقط):
-- {
--   "workers": {"create": false, "read": true, "update": false, "delete": false},
--   "projects": {"create": false, "read": true, "update": false, "delete": false},
--   "payments": {"create": false, "read": true, "update": false, "delete": false},
--   "reports": {"read": true, "export": false},
--   "settings": {"manage_users": false, "manage_permissions": false}
-- }

-- ============================================
-- NOTES
-- ============================================
-- 1. عند إنشاء kablan جديد، يجب إنشاء سجل في user_roles تلقائياً
--    مع role='owner' للمستخدم الذي أنشأ المقاول
--
-- 2. يمكن للـ owner فقط دعوة مستخدمين جدد
--
-- 3. الصلاحيات مخزنة في JSONB للمرونة الكاملة
--
-- 4. audit_log مهم جداً لتتبع من قام بماذا ومتى
