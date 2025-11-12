import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAppContext } from '../context/AppContext';
import { permissionService } from '../lib/permissionService';
import type { UserRoleInfo, UserPermissions } from '../types';
import { Shield } from 'lucide-react';

interface PermissionContextType {
  userRole: UserRoleInfo | null;
  loading: boolean;
  hasPermission: (resource: keyof UserPermissions, action: 'create' | 'read' | 'update' | 'delete' | 'export') => boolean;
  canManageUsers: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { selectedKablanId, user } = useAppContext();
  const [userRole, setUserRole] = useState<UserRoleInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    if (!selectedKablanId || !user) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const role = await permissionService.getUserRole(selectedKablanId, user.id);
      setUserRole(role);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [selectedKablanId, user]);

  const hasPermission = (
    resource: keyof UserPermissions,
    action: 'create' | 'read' | 'update' | 'delete' | 'export'
  ): boolean => {
    if (!userRole) return false;
    return permissionService.hasPermission(userRole, resource, action);
  };

  const canManageUsers = (): boolean => {
    if (!userRole) return false;
    return userRole.role === 'owner' || userRole.permissions.settings?.manage_users === true;
  };

  const value: PermissionContextType = {
    userRole,
    loading,
    hasPermission,
    canManageUsers: canManageUsers(),
    refreshPermissions: loadPermissions,
  };

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

// Component to protect routes
interface ProtectedRouteProps {
  children: ReactNode;
  resource?: keyof UserPermissions;
  action?: 'create' | 'read' | 'update' | 'delete' | 'export';
  requireOwner?: boolean;
}

export const ProtectedContent: React.FC<ProtectedRouteProps> = ({
  children,
  resource,
  action = 'read',
  requireOwner = false,
}) => {
  const { userRole, loading, hasPermission } = usePermissions();

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">جاري التحقق من الصلاحيات...</p>
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-lg text-center max-w-md mx-auto">
          <Shield size={48} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
          <p>ليس لديك صلاحية للوصول إلى هذا المحتوى</p>
        </div>
      </div>
    );
  }

  if (requireOwner && userRole.role !== 'owner') {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-lg text-center max-w-md mx-auto">
          <Shield size={48} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">صلاحية المالك مطلوبة</h2>
          <p>هذه الصفحة متاحة فقط لمالك الحساب</p>
        </div>
      </div>
    );
  }

  if (resource && !hasPermission(resource, action)) {
    return (
      <div className="p-8">
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-6 rounded-lg text-center max-w-md mx-auto">
          <Shield size={48} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">صلاحية غير كافية</h2>
          <p>ليس لديك صلاحية للوصول إلى هذا المحتوى</p>
          <p className="text-sm mt-2">الدور الحالي: {userRole.role}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Hook to conditionally render based on permissions
export const useConditionalRender = () => {
  const { hasPermission, userRole } = usePermissions();

  const canCreate = (resource: keyof UserPermissions) => hasPermission(resource, 'create');
  const canRead = (resource: keyof UserPermissions) => hasPermission(resource, 'read');
  const canUpdate = (resource: keyof UserPermissions) => hasPermission(resource, 'update');
  const canDelete = (resource: keyof UserPermissions) => hasPermission(resource, 'delete');
  const canExport = (resource: keyof UserPermissions) => hasPermission(resource, 'export');
  const isOwner = () => userRole?.role === 'owner';

  return {
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canExport,
    isOwner,
  };
};
