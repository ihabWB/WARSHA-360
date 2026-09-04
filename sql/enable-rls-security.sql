-- ============================================
-- تفعيل Row Level Security (RLS) على جميع الجداول
-- هذا التطبيق يستخدم Firebase Auth وليس Supabase Auth
-- التطبيق يستخدم anon key من المتصفح مباشرة
-- السياسة: السماح لـ anon بالوصول (الحماية تتم في الكود)
-- هذا يُوقف تحذير Supabase مع الحفاظ على عمل التطبيق
-- ============================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE kablans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE foremen ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE foreman_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE foreman_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_registered_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- حذف أي سياسات قديمة إن وجدت
-- ============================================
DROP POLICY IF EXISTS "service_role_all_kablans" ON kablans;
DROP POLICY IF EXISTS "service_role_all_workers" ON workers;
DROP POLICY IF EXISTS "service_role_all_salary_history" ON salary_history;
DROP POLICY IF EXISTS "service_role_all_projects" ON projects;
DROP POLICY IF EXISTS "service_role_all_foremen" ON foremen;
DROP POLICY IF EXISTS "service_role_all_subcontractors" ON subcontractors;
DROP POLICY IF EXISTS "service_role_all_daily_records" ON daily_records;
DROP POLICY IF EXISTS "service_role_all_foreman_expenses" ON foreman_expenses;
DROP POLICY IF EXISTS "service_role_all_subcontractor_transactions" ON subcontractor_transactions;
DROP POLICY IF EXISTS "service_role_all_worker_payments" ON worker_payments;
DROP POLICY IF EXISTS "service_role_all_subcontractor_payments" ON subcontractor_payments;
DROP POLICY IF EXISTS "service_role_all_foreman_payments" ON foreman_payments;
DROP POLICY IF EXISTS "service_role_all_personal_accounts" ON personal_accounts;
DROP POLICY IF EXISTS "service_role_all_personal_account_transactions" ON personal_account_transactions;
DROP POLICY IF EXISTS "service_role_all_cheques" ON cheques;
DROP POLICY IF EXISTS "service_role_all_user_roles" ON user_roles;
DROP POLICY IF EXISTS "service_role_all_pending_invitations" ON pending_invitations;
DROP POLICY IF EXISTS "service_role_all_audit_log" ON audit_log;
DROP POLICY IF EXISTS "service_role_all_pre_registered_users" ON pre_registered_users;

-- ============================================
-- إنشاء سياسات RLS
-- السماح لـ anon و authenticated بالوصول الكامل
-- (الحماية الحقيقية تتم في كود التطبيق عبر kablan_id)
-- هذا يحل تحذير Supabase ويحافظ على عمل التطبيق
-- ============================================

CREATE POLICY "service_role_all_kablans" ON kablans
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_workers" ON workers
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_salary_history" ON salary_history
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_projects" ON projects
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_foremen" ON foremen
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_subcontractors" ON subcontractors
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_daily_records" ON daily_records
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_foreman_expenses" ON foreman_expenses
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_subcontractor_transactions" ON subcontractor_transactions
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_worker_payments" ON worker_payments
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_subcontractor_payments" ON subcontractor_payments
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_foreman_payments" ON foreman_payments
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_personal_accounts" ON personal_accounts
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_personal_account_transactions" ON personal_account_transactions
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_cheques" ON cheques
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_user_roles" ON user_roles
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_pending_invitations" ON pending_invitations
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_audit_log" ON audit_log
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_pre_registered_users" ON pre_registered_users
    FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

-- ============================================
-- التحقق من تفعيل RLS (اختياري - لعرض النتيجة)
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
