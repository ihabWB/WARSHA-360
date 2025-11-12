-- ============================================
-- Warshatkom Database Schema for Supabase
-- Construction Workshop Management System
-- FIREBASE AUTH + SUPABASE DATABASE VERSION
-- ============================================

-- Note: This schema uses Firebase for authentication
-- RLS is DISABLED - security is handled at application level
-- All queries must filter by user_id (Firebase UID)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. KABLANS (Contractors) Table
-- ============================================
CREATE TABLE kablans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL, -- Firebase UID
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. WORKERS Table
-- ============================================
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    surname TEXT,
    operating_number TEXT,
    role TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended')),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('daily', 'monthly', 'hourly')),
    daily_rate NUMERIC(10, 2) DEFAULT 0,
    monthly_salary NUMERIC(10, 2) DEFAULT 0,
    hourly_rate NUMERIC(10, 2) DEFAULT 0,
    overtime_system TEXT NOT NULL CHECK (overtime_system IN ('automatic', 'manual')),
    division_factor NUMERIC(10, 2) DEFAULT 0,
    overtime_rate NUMERIC(10, 2) DEFAULT 0,
    default_project_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. SALARY HISTORY Table
-- ============================================
CREATE TABLE salary_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    effective_date DATE NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('daily', 'monthly', 'hourly')),
    daily_rate NUMERIC(10, 2) DEFAULT 0,
    monthly_salary NUMERIC(10, 2) DEFAULT 0,
    hourly_rate NUMERIC(10, 2) DEFAULT 0,
    overtime_system TEXT NOT NULL CHECK (overtime_system IN ('automatic', 'manual')),
    division_factor NUMERIC(10, 2) DEFAULT 0,
    overtime_rate NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. PROJECTS Table
-- ============================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    location TEXT,
    start_date DATE,
    type TEXT,
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. FOREMEN Table
-- ============================================
CREATE TABLE foremen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. SUBCONTRACTORS Table
-- ============================================
CREATE TABLE subcontractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 7. DAILY RECORDS Table
-- ============================================
CREATE TABLE daily_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'paid-leave')),
    work_day NUMERIC(10, 2) DEFAULT 0,
    overtime_hours NUMERIC(10, 2) DEFAULT 0,
    advance NUMERIC(10, 2) DEFAULT 0,
    smoking NUMERIC(10, 2) DEFAULT 0,
    expense NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(worker_id, date)
);

-- ============================================
-- 8. FOREMAN EXPENSES Table
-- ============================================
CREATE TABLE foreman_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    foreman_id UUID REFERENCES foremen(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'advance', 'other', 'statement')),
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    source_subcontractor_transaction_id UUID,
    source_payment_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 9. SUBCONTRACTOR TRANSACTIONS Table
-- ============================================
CREATE TABLE subcontractor_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('invoice', 'payment', 'statement')),
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    foreman_id UUID REFERENCES foremen(id) ON DELETE SET NULL,
    source_payment_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 10. WORKER PAYMENTS Table
-- ============================================
CREATE TABLE worker_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
    paid_month TEXT NOT NULL, -- Format: YYYY-MM
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 11. SUBCONTRACTOR PAYMENTS Table
-- ============================================
CREATE TABLE subcontractor_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE CASCADE NOT NULL,
    paid_month TEXT NOT NULL, -- Format: YYYY-MM
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 12. FOREMAN PAYMENTS Table
-- ============================================
CREATE TABLE foreman_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    foreman_id UUID REFERENCES foremen(id) ON DELETE CASCADE NOT NULL,
    paid_month TEXT NOT NULL, -- Format: YYYY-MM
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 13. PERSONAL ACCOUNTS Table
-- ============================================
CREATE TABLE personal_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    parties TEXT[] NOT NULL,
    description TEXT,
    creation_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 14. PERSONAL ACCOUNT TRANSACTIONS Table
-- ============================================
CREATE TABLE personal_account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES personal_accounts(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('ILS', 'JOD')),
    payer TEXT NOT NULL,
    payee TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'cheque')),
    cheque_number TEXT,
    cheque_due_date DATE,
    cheque_status TEXT CHECK (cheque_status IN ('pending', 'cashed')),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('standard', 'reconciliation')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 15. CHEQUES Table
-- ============================================
CREATE TABLE cheques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kablan_id UUID REFERENCES kablans(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('outgoing', 'incoming')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    cheque_number TEXT NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('ILS', 'JOD', 'other')),
    custom_currency TEXT,
    bank TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'cashed', 'returned', 'archived')),
    payee TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_kablans_user_id ON kablans(user_id);
CREATE INDEX idx_workers_kablan ON workers(kablan_id);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_projects_kablan ON projects(kablan_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_daily_records_kablan ON daily_records(kablan_id);
CREATE INDEX idx_daily_records_worker ON daily_records(worker_id);
CREATE INDEX idx_daily_records_date ON daily_records(date);
CREATE INDEX idx_daily_records_project ON daily_records(project_id);
CREATE INDEX idx_foreman_expenses_kablan ON foreman_expenses(kablan_id);
CREATE INDEX idx_foreman_expenses_foreman ON foreman_expenses(foreman_id);
CREATE INDEX idx_foreman_expenses_date ON foreman_expenses(date);
CREATE INDEX idx_subcontractor_trans_kablan ON subcontractor_transactions(kablan_id);
CREATE INDEX idx_subcontractor_trans_sub ON subcontractor_transactions(subcontractor_id);
CREATE INDEX idx_subcontractor_trans_date ON subcontractor_transactions(date);
CREATE INDEX idx_worker_payments_kablan ON worker_payments(kablan_id);
CREATE INDEX idx_worker_payments_worker ON worker_payments(worker_id);
CREATE INDEX idx_cheques_kablan ON cheques(kablan_id);
CREATE INDEX idx_cheques_status ON cheques(status);
CREATE INDEX idx_cheques_due_date ON cheques(due_date);

-- ============================================
-- FUNCTIONS & TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_kablans_updated_at BEFORE UPDATE ON kablans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foremen_updated_at BEFORE UPDATE ON foremen
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcontractors_updated_at BEFORE UPDATE ON subcontractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_records_updated_at BEFORE UPDATE ON daily_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foreman_expenses_updated_at BEFORE UPDATE ON foreman_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcontractor_transactions_updated_at BEFORE UPDATE ON subcontractor_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_payments_updated_at BEFORE UPDATE ON worker_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcontractor_payments_updated_at BEFORE UPDATE ON subcontractor_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foreman_payments_updated_at BEFORE UPDATE ON foreman_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_accounts_updated_at BEFORE UPDATE ON personal_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_account_transactions_updated_at BEFORE UPDATE ON personal_account_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cheques_updated_at BEFORE UPDATE ON cheques
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- IMPORTANT SECURITY NOTE
-- ============================================
-- RLS is NOT enabled on these tables
-- All security must be handled at the application level
-- Every query MUST filter by the appropriate user_id or kablan_id
-- to prevent unauthorized access to data
