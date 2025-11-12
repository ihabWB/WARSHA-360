import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { firebaseAuthService } from '../lib/firebaseAuth';
import { Lock, Mail, User as UserIcon } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user } = useAppContext();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
