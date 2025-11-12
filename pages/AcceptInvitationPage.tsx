import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { permissionService } from '../lib/permissionService';
import { Mail, CheckCircle, XCircle, Clock } from 'lucide-react';

const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('رابط الدعوة غير صالح');
      return;
    }

    if (isAuthenticated && user) {
      handleAcceptInvitation();
    }
  }, [token, isAuthenticated, user]);

  const handleAcceptInvitation = async () => {
    if (!token || !user) return;

    setLoading(true);
    setError('');

    try {
      await permissionService.acceptInvitation(token, user.id);
      setSuccess(true);
      
      // Redirect to select-kablan after 2 seconds
      setTimeout(() => {
        navigate('/select-kablan');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء قبول الدعوة');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <XCircle size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">رابط غير صالح</h2>
          <p className="text-gray-600 mb-6">رابط الدعوة غير صالح أو منتهي الصلاحية</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <Mail size={64} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">مرحباً!</h2>
          <p className="text-gray-600 mb-6">
            لقبول الدعوة، يجب عليك تسجيل الدخول أو إنشاء حساب أولاً
          </p>
          <button
            onClick={() => navigate('/login', { state: { returnTo: `/accept-invitation?token=${token}` } })}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 w-full"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">تم قبول الدعوة بنجاح!</h2>
          <p className="text-gray-600 mb-6">
            يتم الآن توجيهك إلى صفحة اختيار المقاول...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <XCircle size={64} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">حدث خطأ</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <Clock size={64} className="mx-auto text-blue-500 mb-4 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">جاري قبول الدعوة...</h2>
          <p className="text-gray-600">الرجاء الانتظار</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AcceptInvitationPage;
