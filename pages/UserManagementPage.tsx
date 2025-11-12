import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { permissionService } from '../lib/permissionService';
import type { UserRoleInfo, PendingInvitation, UserRole } from '../types';
import Modal from '../components/Modal';
import { Users, UserPlus, Mail, Shield, Trash2, XCircle, CheckCircle, Clock } from 'lucide-react';

const UserManagementPage: React.FC = () => {
  const { selectedKablanId, user } = useAppContext();
  const [users, setUsers] = useState<UserRoleInfo[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [preRegistered, setPreRegistered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRoleInfo | null>(null);

  useEffect(() => {
    if (selectedKablanId && user) {
      loadData();
    }
  }, [selectedKablanId, user]);

  const loadData = async () => {
    if (!selectedKablanId || !user) return;
    
    setLoading(true);
    try {
      // Get current user's role
      const myRole = await permissionService.getUserRole(selectedKablanId, user.id);
      setCurrentUserRole(myRole);

      // Only owners can see all users
      if (myRole?.role === 'owner') {
        const [usersData, invitationsData, preRegData] = await Promise.all([
          permissionService.getKablanUsers(selectedKablanId),
          permissionService.getPendingInvitations(selectedKablanId),
          permissionService.getPreRegisteredUsers(selectedKablanId)
        ]);
        setUsers(usersData);
        setInvitations(invitationsData);
        setPreRegistered(preRegData);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (roleId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء صلاحية هذا المستخدم؟')) return;

    try {
      await permissionService.revokeUserAccess(roleId);
      await loadData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذه الدعوة؟')) return;

    try {
      await permissionService.cancelInvitation(invitationId);
      await loadData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const handleCancelPreRegistration = async (preRegId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا التسجيل المسبق؟')) return;

    try {
      await permissionService.cancelPreRegistration(preRegId);
      await loadData();
    } catch (error: any) {
      alert('حدث خطأ: ' + error.message);
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      owner: 'مالك',
      admin: 'مدير',
      accountant: 'محاسب',
      data_entry: 'مدخل بيانات',
      viewer: 'مشاهد',
    };
    return labels[role];
  };

  const getRoleBadgeColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      accountant: 'bg-green-100 text-green-800',
      data_entry: 'bg-yellow-100 text-yellow-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    return colors[role];
  };

  if (loading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!currentUserRole || currentUserRole.role !== 'owner') {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg text-center">
          <Shield size={48} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
          <p>هذه الصفحة متاحة فقط لمالك الحساب</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Users size={32} />
            إدارة المستخدمين
          </h1>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <UserPlus size={20} />
            دعوة مستخدم جديد
          </button>
        </div>

        {/* Active Users */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle size={24} className="text-green-600" />
            المستخدمون النشطون ({users.filter(u => u.status === 'active').length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">البريد الإلكتروني</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الدور</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">تاريخ الإضافة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.filter(u => u.status === 'active').map(userRole => (
                  <tr key={userRole.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {userRole.userId === user?.id ? (
                        <span className="font-semibold text-blue-600">{user.email} (أنت)</span>
                      ) : (
                        <span>{userRole.email || userRole.userId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(userRole.role)}`}>
                        {getRoleLabel(userRole.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(userRole.invitedAt).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        نشط
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {userRole.role !== 'owner' && (
                        <button
                          onClick={() => handleRevokeAccess(userRole.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="إلغاء الصلاحية"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pre-registered Users (Waiting for Firebase signup) */}
        {preRegistered.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock size={24} className="text-orange-600" />
              في انتظار التسجيل ({preRegistered.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الدور</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">تاريخ الإضافة</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {preRegistered.map(preReg => (
                    <tr key={preReg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        {preReg.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(preReg.role)}`}>
                          {getRoleLabel(preReg.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(preReg.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCancelPreRegistration(preReg.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="إلغاء"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock size={24} className="text-yellow-600" />
              الدعوات المعلقة ({invitations.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">البريد الإلكتروني</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الدور</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">تاريخ الدعوة</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">تنتهي في</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invitations.map(invitation => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm flex items-center gap-2">
                        <Mail size={16} className="text-gray-400" />
                        {invitation.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(invitation.role)}`}>
                          {getRoleLabel(invitation.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(invitation.createdAt!).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(invitation.expiresAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="إلغاء الدعوة"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={() => {
          setShowInviteModal(false);
          loadData();
        }}
      />
    </div>
  );
};

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, onInviteSent }) => {
  const { selectedKablanId, user } = useAppContext();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('data_entry');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKablanId || !user) return;

    setMessage(null);
    setShowInstructions(false);
    setLoading(true);

    try {
      // Pre-register user
      await permissionService.preRegisterUser(
        selectedKablanId,
        email,
        role,
        user.id
      );

      setShowInstructions(true);
      setMessage({
        type: 'success',
        text: 'تم التسجيل المسبق بنجاح!'
      });

      setTimeout(() => {
        setEmail('');
        setRole('data_entry');
        setShowInstructions(false);
        onInviteSent();
      }, 15000); // Give user time to read instructions

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'حدث خطأ أثناء التسجيل المسبق' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDescription = (role: UserRole): string => {
    const descriptions: Record<UserRole, string> = {
      owner: 'صلاحيات كاملة - لا يمكن دعوة مالك آخر',
      admin: 'مدير عام - كل الصلاحيات ما عدا حذف البيانات المالية وإدارة المستخدمين',
      accountant: 'محاسب - إدارة المدفوعات والشيكات والتقارير المالية',
      data_entry: 'مدخل بيانات - إضافة وتعديل العمال والمشاريع واليوميات',
      viewer: 'مشاهد فقط - قراءة البيانات والتقارير فقط',
    };
    return descriptions[role];
  };

  const getRoleLabel = (role: UserRole): string => {
    const labels: Record<UserRole, string> = {
      owner: 'مالك',
      admin: 'مدير',
      accountant: 'محاسب',
      data_entry: 'مدخل بيانات',
      viewer: 'مشاهد',
    };
    return labels[role];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم النسخ!');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إضافة موظف جديد">
      <form onSubmit={handleSubmit}>
        {message && (
          <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {showInstructions && (
          <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-3 text-lg">📧 أرسل للموظف المعلومات التالية:</h3>
            
            <div className="space-y-3 mb-4">
              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">البريد الإلكتروني:</p>
                <div className="flex justify-between items-center">
                  <p className="font-mono font-bold text-blue-900">{email}</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(email)}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    نسخ
                  </button>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-sm text-gray-600 mb-1">رابط النظام:</p>
                <div className="flex justify-between items-center">
                  <p className="font-mono text-blue-900 text-sm">https://warsha-360.web.app</p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://warsha-360.web.app')}
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    نسخ
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-300 rounded p-3">
              <p className="text-sm text-yellow-900 font-semibold mb-2">📝 التعليمات للموظف:</p>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>افتح الرابط أعلاه</li>
                <li>اضغط "إنشاء حساب جديد"</li>
                <li>سجّل بالبريد الإلكتروني: <strong>{email}</strong></li>
                <li>اختر أي كلمة مرور تريدها</li>
                <li>✨ سيتم ربطك تلقائياً بصلاحيات {getRoleLabel(role)}!</li>
              </ol>
            </div>
          </div>
        )}

        {!showInstructions && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
                required
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الدور والصلاحيات
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="admin">مدير</option>
                <option value="accountant">محاسب</option>
                <option value="data_entry">مدخل بيانات</option>
                <option value="viewer">مشاهد</option>
              </select>
              <p className="mt-2 text-sm text-gray-600">{getRoleDescription(role)}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2">كيف يعمل؟</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>ستسجّل الموظف مسبقاً في قاعدة البيانات</li>
                <li>عند تسجيل الموظف لأول مرة في Firebase، سيتم ربطه تلقائياً</li>
                <li>الموظف يختار كلمة مروره بنفسه (أكثر أماناً)</li>
                <li>لا حاجة لدعوات أو روابط معقدة!</li>
              </ul>
            </div>
          </>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setShowInstructions(false);
              setMessage(null);
              onClose();
            }}
            className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300"
            disabled={loading}
          >
            {showInstructions ? 'إغلاق' : 'إلغاء'}
          </button>
          {!showInstructions && (
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              disabled={loading}
            >
              <UserPlus size={18} />
              {loading ? 'جاري التسجيل...' : 'تسجيل مسبق'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default UserManagementPage;
