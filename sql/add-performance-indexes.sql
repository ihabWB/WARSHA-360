-- ============================================
-- فهارس تحسين الأداء
-- ============================================
--
-- هذا الملف يضيف فهارس (indexes) فقط.
-- لا يعدّل أي عمود، ولا يحذف أو يغيّر أي صف من البيانات.
-- الفهرس بنية قراءة مساعدة: يسرّع البحث ولا يغيّر النتائج.
-- كل الأوامر IF NOT EXISTS، فتشغيل الملف أكثر من مرة آمن.
--
-- للتراجع عن أي فهرس:  DROP INDEX IF EXISTS <اسم_الفهرس>;
--
-- طريقة التشغيل: Supabase Dashboard → SQL Editor → الصق ونفّذ.
-- ============================================


-- --------------------------------------------
-- 1) daily_records — الجدول الأكبر والأكثر استخداماً
-- --------------------------------------------
-- يوجد حالياً فهرس على kablan_id وآخر منفصل على date. الاستعلامات تجمع
-- الشرطين معاً (kablan_id + نافذة زمنية + ترتيب تنازلي بالتاريخ)، والفهرس
-- المركّب يخدمها كاملة بما فيها الترتيب.
CREATE INDEX IF NOT EXISTS idx_daily_records_kablan_date
  ON daily_records(kablan_id, date DESC);


-- --------------------------------------------
-- 2) جداول تُستعلم دائماً بـ kablan_id وليس عليها أي فهرس
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_foremen_kablan
  ON foremen(kablan_id);

CREATE INDEX IF NOT EXISTS idx_subcontractors_kablan
  ON subcontractors(kablan_id);

CREATE INDEX IF NOT EXISTS idx_subcontractor_payments_kablan
  ON subcontractor_payments(kablan_id);

CREATE INDEX IF NOT EXISTS idx_foreman_payments_kablan
  ON foreman_payments(kablan_id);

CREATE INDEX IF NOT EXISTS idx_personal_accounts_kablan
  ON personal_accounts(kablan_id);

CREATE INDEX IF NOT EXISTS idx_personal_account_transactions_kablan
  ON personal_account_transactions(kablan_id);


-- --------------------------------------------
-- 3) salary_history — تُقرأ مع كل جلب للعمال (join)، وتُحذف بـ worker_id
--    عند تعديل أي عامل
-- --------------------------------------------
CREATE INDEX IF NOT EXISTS idx_salary_history_worker
  ON salary_history(worker_id);


-- ============================================
-- للتحقق من أن الفهارس أُنشئت:
--
--   SELECT tablename, indexname
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND indexname LIKE 'idx_%'
--   ORDER BY tablename, indexname;
-- ============================================
