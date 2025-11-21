

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { firebaseAuthService } from '../lib/firebaseAuth';
import { ArrowRight } from 'lucide-react';
import Modal from '../components/Modal';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const navigate = useNavigate();
  const { login, signUp } = useAppContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/select-kablan');
    } catch (err: any) {
      setError(err.message || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    
    if (!resetEmail) {
      setResetMessage({ type: 'error', text: 'الرجاء إدخال البريد الإلكتروني' });
      return;
    }

    setResetLoading(true);
    
    try {
      await firebaseAuthService.sendPasswordResetEmail(resetEmail);
      setResetMessage({ 
        type: 'success', 
        text: '✅ تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني. تحقق من بريدك الوارد.' 
      });
      setResetEmail('');
    } catch (error: any) {
      setResetMessage({ type: 'error', text: error.message || 'حدث خطأ أثناء إرسال البريد' });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    
    if (!signupEmail || !signupPassword || !signupConfirmPassword) {
      setSignupError('الرجاء ملء جميع الحقول');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('كلمات المرور غير متطابقة');
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setSignupLoading(true);
    
    try {
      const { supabase } = await import('../lib/supabase');
      const normalizedEmail = signupEmail.toLowerCase().trim();
      
      // Check if email is pre-registered as employee
      const { data: preReg } = await supabase
        .from('pre_registered_users')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .maybeSingle();
      
      // Check if email is in allowed_owners list
      const { data: allowedOwner, error: allowedError } = await supabase
        .from('allowed_owners')
        .select('*')
        .eq('email', normalizedEmail)
        .eq('status', 'pending')
        .maybeSingle();
      
      if (allowedError && allowedError.code !== 'PGRST116') {
        throw new Error('حدث خطأ أثناء التحقق من البريد الإلكتروني');
      }
      
      // Only allow signup if email is either:
      // 1. Pre-registered employee, OR
      // 2. Allowed owner
      if (!preReg && !allowedOwner) {
        setSignupError('⛔ هذا البريد الإلكتروني غير مصرح له. يجب أن يقوم مدير النظام بإضافتك أولاً.');
        setSignupLoading(false);
        return;
      }
      
      // Proceed with Firebase signup
      await signUp(signupEmail, signupPassword);
      
      // Get the new user ID to update allowed_owners
      const currentUser = await firebaseAuthService.getCurrentUser();
      
      // Update allowed_owners if this was an owner signup
      if (allowedOwner && currentUser) {
        await supabase
          .from('allowed_owners')
          .update({ 
            status: 'activated', 
            activated_at: new Date().toISOString(),
            user_id: currentUser.id 
          })
          .eq('id', allowedOwner.id);
      }
      
      if (preReg) {
        // Pre-registered employee: redirect to dashboard
        navigate('/dashboard');
      } else {
        // Allowed owner: redirect to create their kablan
        navigate('/select-kablan');
      }
    } catch (error: any) {
      if (error.message.includes('email-already-in-use')) {
        setSignupError('⚠️ هذا البريد مستخدم بالفعل. حاول تسجيل الدخول بدلاً من ذلك.');
      } else if (error.message.includes('invalid-email')) {
        setSignupError('⚠️ البريد الإلكتروني غير صالح');
      } else {
        setSignupError(error.message || 'حدث خطأ أثناء تفعيل الحساب');
      }
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
          <span>العودة للصفحة الرئيسية</span>
        </button>
        
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">تسجيل الدخول إلى ورشاتك</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-6">استخدم حسابك في Firebase للدخول</p>
        
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-center">{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="your-email@example.com"
              required
              disabled={loading}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <button
            onClick={() => setShowResetModal(true)}
            className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
          >
            نسيت كلمة السر؟
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-3">
            تم إضافتك من قبل مدير النظام؟
          </p>
          <button
            onClick={() => setShowSignupModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            تفعيل الحساب
          </button>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Modal isOpen={showResetModal} onClose={() => { setShowResetModal(false); setResetMessage(null); }} title="إعادة تعيين كلمة السر">
        <form onSubmit={handleResetPassword}>
          <p className="text-gray-600 mb-4">
            أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة السر
          </p>
          
          {resetMessage && (
            <div className={`mb-4 p-4 rounded-md ${resetMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {resetMessage.text}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="your-email@example.com"
              disabled={resetLoading}
              required
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setShowResetModal(false); setResetMessage(null); }}
              className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
              disabled={resetLoading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              disabled={resetLoading}
            >
              {resetLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Signup Modal */}
      <Modal isOpen={showSignupModal} onClose={() => { setShowSignupModal(false); setSignupError(''); }} title="تفعيل الحساب">
        <form onSubmit={handleSignup}>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            قم بتفعيل حسابك الذي تم إنشاؤه من قبل مدير النظام
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
            ⚠️ يجب أن يكون البريد الإلكتروني مسجل مسبقاً من قبل مدير النظام
          </p>
          
          {signupError && (
            <div className="mb-4 p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
              {signupError}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              placeholder="your-email@example.com"
              disabled={signupLoading}
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <input
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              placeholder="••••••••"
              disabled={signupLoading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">يجب أن تكون 6 أحرف على الأقل</p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تأكيد كلمة المرور
            </label>
            <input
              type="password"
              value={signupConfirmPassword}
              onChange={(e) => setSignupConfirmPassword(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              placeholder="••••••••"
              disabled={signupLoading}
              required
            />
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <p className="text-sm text-blue-800">
              ⚠️ <strong>مهم جداً:</strong> يجب أن يكون بريدك الإلكتروني مسجلاً مسبقاً من قبل المدير. إذا لم يضفك المدير بعد، اطلب منه إضافتك من صفحة "إدارة المستخدمين" أولاً.
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { setShowSignupModal(false); setSignupError(''); }}
              className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
              disabled={signupLoading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
              disabled={signupLoading}
            >
              {signupLoading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoginPage;

