# إعادة تحميل Schema في Supabase

## المشكلة:
```
Could not find the 'dailyRate' column of 'workers' in the schema cache
```

هذا يعني أن Supabase لم يحدث الـ schema cache بعد إنشاء الجداول الجديدة.

## الحل - خياران:

### الخيار 1: إعادة تشغيل PostgREST (موصى به)

1. اذهب إلى: https://supabase.com/dashboard/project/pfrdkinonikdwwcqxibv/settings/api
2. في قسم "API Settings"
3. ابحث عن زر **"Restart API"** أو **"Reload schema cache"**
4. اضغط عليه
5. انتظر 10-20 ثانية
6. جرب التطبيق مرة أخرى

### الخيار 2: نفذ هذا SQL Command

اذهب إلى SQL Editor ونفذ:

```sql
NOTIFY pgrst, 'reload schema';
```

هذا سيجبر PostgREST على إعادة تحميل الـ schema.

### الخيار 3: انتظر دقيقة واحدة

أحياناً Supabase يحدّث الـ cache تلقائياً بعد 30-60 ثانية.

---

## بعد الإصلاح:

جرب إضافة عامل (worker) مرة أخرى - يجب أن يعمل! ✅
