-- ============================================
-- FIX: Change ALL kablan_id columns from UUID to TEXT
-- This migration fixes the Firebase UID compatibility issue
-- ============================================

-- WARNING: This will delete ALL tables and data!
-- Since this is initial setup, this is safe to run.
-- ============================================

-- Drop all tables in correct order (reverse of dependencies)
DROP TABLE IF EXISTS cheques CASCADE;
DROP TABLE IF EXISTS personal_account_transactions CASCADE;
DROP TABLE IF EXISTS personal_accounts CASCADE;
DROP TABLE IF EXISTS foreman_payments CASCADE;
DROP TABLE IF EXISTS subcontractor_payments CASCADE;
DROP TABLE IF EXISTS worker_payments CASCADE;
DROP TABLE IF EXISTS subcontractor_transactions CASCADE;
DROP TABLE IF EXISTS foreman_expenses CASCADE;
DROP TABLE IF EXISTS daily_records CASCADE;
DROP TABLE IF EXISTS salary_history CASCADE;
DROP TABLE IF EXISTS subcontractors CASCADE;
DROP TABLE IF EXISTS foremen CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS kablans CASCADE;

-- ============================================
-- Now run the FULL schema from supabase-schema.sql
-- Copy and paste the entire supabase-schema.sql content
-- after running this DROP script
-- ============================================
