import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useConditionalRender } from '../context/PermissionContext';
import { firebaseAuthService } from '../lib/firebaseAuth';
import {
  buildBackup,
  countBackupRows,
  downloadBackupFile,
  importBackup,
  validateBackup,
  ENTITY_LABELS,
} from '../lib/backupService';
import { Database, Download, Lock, Mail, Upload, User as UserIcon } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user, kablans, selectedKablanId, refreshKablanData } = useAppContext();
  const { isOwner } = useConditionalRender();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupStep, setBackupStep] = useState('');
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedKablan = kablans.find(k => k.id === selectedKablanId) || null;

  // Workshops created before the roles feature existed have no 'owner' row in
  // user_roles, so fall back to the creator recorded on the workshop itself.
  const isKablanCreator = !!user && !!selectedKablan && (selectedKablan as any).user_id === user.id;
  const canUseBackup = isOwner() || isKablanCreator;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'الرجاء ملء جميع الحقول' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'كلمة السر الجديدة وتأكيدها غير متطابقتين' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'كلمة السر يجب أن تكون 6 أحرف على الأقل' });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'كلمة السر الجديدة يجب أن تكون مختلفة عن القديمة' });
      return;
    }

    setLoading(true);

    try {
      await firebaseAuthService.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: '✅ تم تغيير كلمة السر بنجاح' });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'حدث خطأ أثناء تغيير كلمة السر' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    if (!selectedKablanId || !selectedKablan) {
      setBackupMessage({ type: 'error', text: 'الرجاء اختيار ورشة أولاً' });
      return;
    }

    setBackupMessage(null);
    setBackupBusy(true);
    setBackupStep('جاري تجهيز البيانات...');

    try {
      const backup = await buildBackup(selectedKablanId, selectedKablan);
      const counts = countBackupRows(backup);
      const date = new Date().toISOString().slice(0, 10);
      const safeName = selectedKablan.name.replace(/[\\/:*?"<>|]/g, '-');

      downloadBackupFile(backup, `warshatkom-backup-${safeName}-${date}.json`);

      const summary = Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => `${ENTITY_LABELS[key] || key}: ${count}`)
        .join(' • ');

      setBackupMessage({
        type: 'success',
        text: `✅ تم تنزيل النسخة الاحتياطية بنجاح\n${summary || 'لا توجد بيانات في هذه الورشة'}`,
      });
    } catch (error: any) {
      setBackupMessage({ type: 'error', text: error.message || 'فشل تصدير النسخة الاحتياطية' });
    } finally {
      setBackupBusy(false);
      setBackupStep('');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!selectedKablanId) {
      setBackupMessage({ type: 'error', text: 'الرجاء اختيار ورشة أولاً' });
      return;
    }

    setBackupMessage(null);
    setBackupBusy(true);
    setBackupStep('جاري قراءة الملف والتحقق منه...');

    try {
      const text = await file.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('الملف غير صالح: تعذّرت قراءته كملف JSON');
      }

      const backup = validateBackup(parsed);
      const counts = countBackupRows(backup);
      const summary = Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => `${ENTITY_LABELS[key] || key}: ${count}`)
        .join('\n');

      const confirmed = window.confirm(
        `سيتم إضافة البيانات التالية إلى ورشة "${selectedKablan?.name || ''}":\n\n${summary || 'لا توجد بيانات'}\n\n` +
          'ملاحظات:\n' +
          '• الاستيراد يُضيف البيانات ولا يمسح الموجود حالياً.\n' +
          '• لا يشمل الاستيراد المستخدمين المشاركين، يمكنك إضافتهم من صفحة إدارة المستخدمين.\n\n' +
          'هل تريد المتابعة؟'
      );

      if (!confirmed) {
        setBackupBusy(false);
        setBackupStep('');
        return;
      }

      const result = await importBackup(selectedKablanId, backup, setBackupStep);

      setBackupStep('جاري تحديث البيانات...');
      await refreshKablanData();

      const importedSummary = Object.entries(result.counts)
        .filter(([, count]) => count > 0)
        .map(([key, count]) => `${ENTITY_LABELS[key] || key}: ${count}`)
        .join(' • ');

      setBackupMessage({
        type: 'success',
        text: `✅ تم استيراد النسخة الاحتياطية بنجاح\n${importedSummary || 'لم تحتوِ النسخة على أي بيانات'}`,
      });
    } catch (error: any) {
      setBackupMessage({ type: 'error', text: error.message || 'فشل استيراد النسخة الاحتياطية' });
    } finally {
      setBackupBusy(false);
      setBackupStep('');
    }
  };

  const inputClass = "w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">إعدادات الحساب</h1>

        {/* User Info Card */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <UserIcon size={24} />
            معلومات المستخدم
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
              <Mail size={20} className="text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">البريد الإلكتروني</p>
                <p className="font-medium text-gray-800">{user?.email || 'غير متوفر'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Card - owner only */}
        {canUseBackup && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <Database size={24} />
              النسخ الاحتياطي
            </h2>

            {backupMessage && (
              <div className={`mb-4 p-4 rounded-md whitespace-pre-line ${backupMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {backupMessage.text}
              </div>
            )}

            {backupBusy && backupStep && (
              <div className="mb-4 p-4 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                {backupStep}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={backupBusy || !selectedKablanId}
                className={`flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-6 rounded-md font-semibold transition ${backupBusy || !selectedKablanId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              >
                <Download size={20} />
                تصدير نسخة احتياطية
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={backupBusy || !selectedKablanId}
                className={`flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 px-6 rounded-md font-semibold transition ${backupBusy || !selectedKablanId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-700'}`}
              >
                <Upload size={20} />
                استيراد نسخة احتياطية
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">ملاحظات هامة:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>التصدير يُنزّل كل بيانات الورشة الحالية في ملف JSON واحد على جهازك</li>
                <li>الاستيراد يُضيف بيانات الملف إلى الورشة المختارة حالياً ولا يمسح الموجود</li>
                <li>لا يشمل الاستيراد المستخدمين المشاركين، يمكنك إضافتهم من صفحة إدارة المستخدمين</li>
                <li>عند حدوث أي خطأ أثناء الاستيراد، يتم التراجع تلقائياً عن كل ما تم إدخاله</li>
              </ul>
            </div>
          </div>
        )}

        {/* Change Password Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <Lock size={24} />
            تغيير كلمة السر
          </h2>

          {message && (
            <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className={labelClass}>كلمة السر الحالية</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
                placeholder="أدخل كلمة السر الحالية"
                disabled={loading}
              />
            </div>

            <div>
              <label className={labelClass}>كلمة السر الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="أدخل كلمة السر الجديدة (6 أحرف على الأقل)"
                disabled={loading}
              />
            </div>

            <div>
              <label className={labelClass}>تأكيد كلمة السر الجديدة</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="أعد إدخال كلمة السر الجديدة"
                disabled={loading}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-blue-600 text-white py-3 px-6 rounded-md font-semibold transition ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              >
                {loading ? 'جاري التغيير...' : 'تغيير كلمة السر'}
              </button>
            </div>
          </form>

          <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">ملاحظات هامة:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>كلمة السر يجب أن تكون 6 أحرف على الأقل</li>
              <li>يجب إدخال كلمة السر الحالية للتحقق من هويتك</li>
              <li>بعد تغيير كلمة السر، ستبقى مسجلاً دخولك في الجلسة الحالية</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
