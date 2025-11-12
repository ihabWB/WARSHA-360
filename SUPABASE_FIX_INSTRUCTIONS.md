# تعليمات إصلاح قاعدة البيانات في Supabase

## الخطوة 1: افتح Supabase Dashboard
اذهب إلى: https://supabase.com/dashboard/project/pfrdkinonikdwwcqxibv

## الخطوة 2: افتح SQL Editor
- اضغط على "SQL Editor" من القائمة اليسرى
- اضغط "New query"

## الخطوة 3: نفذ السكريبت التالي

انسخ والصق هذا الكود بالكامل ثم اضغط "Run":

```sql
-- ============================================
-- حذف جميع الجداول الحالية
-- ============================================
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
```

## الخطوة 4: أنشئ query جديدة

بعد نجاح الخطوة 3:
- اضغط "New query" مرة أخرى
- انسخ والصق **محتوى ملف `supabase-schema.sql` بالكامل**
- اضغط "Run"

## الخطوة 5: تحقق من النتيجة

يجب أن ترى رسالة "Success. No rows returned"

## الخطوة 6: اختبر التطبيق

1. افتح https://warsha-360.web.app
2. سجل الدخول
3. جرب إضافة مقاول (contractor) - يجب أن يعمل! ✅
4. جرب إضافة عامل (worker) - يجب أن يعمل! ✅

---

## ملاحظة مهمة

هذا السكريبت سيحذف جميع البيانات الحالية. نظراً لأن التطبيق في مرحلة الاختبار، هذا آمن.
