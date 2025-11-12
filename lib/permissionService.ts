import { supabase } from './supabase';
import { toSnakeCase, toCamelCase } from './supabaseHelpers';
import type { UserRoleInfo, PendingInvitation, UserPermissions, UserRole } from '../types';

/**
 * Default permissions for each role
 */
const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  owner: {
    workers: { create: true, read: true, update: true, delete: true },
    projects: { create: true, read: true, update: true, delete: true },
    foremen: { create: true, read: true, update: true, delete: true },
    subcontractors: { create: true, read: true, update: true, delete: true },
    daily_records: { create: true, read: true, update: true, delete: true },
    payments: { create: true, read: true, update: true, delete: true },
    personal_accounts: { create: true, read: true, update: true, delete: true },
    cheques: { create: true, read: true, update: true, delete: true },
    reports: { read: true, export: true },
    settings: { manage_users: true, manage_permissions: true },
  },
  admin: {
    workers: { create: true, read: true, update: true, delete: true },
    projects: { create: true, read: true, update: true, delete: true },
    foremen: { create: true, read: true, update: true, delete: true },
    subcontractors: { create: true, read: true, update: true, delete: true },
    daily_records: { create: true, read: true, update: true, delete: true },
    payments: { create: true, read: true, update: true, delete: false },
    personal_accounts: { create: true, read: true, update: true, delete: false },
    cheques: { create: true, read: true, update: true, delete: false },
    reports: { read: true, export: true },
    settings: { manage_users: false, manage_permissions: false },
  },
  accountant: {
    workers: { create: false, read: true, update: false, delete: false },
    projects: { create: false, read: true, update: false, delete: false },
    foremen: { create: false, read: true, update: false, delete: false },
    subcontractors: { create: false, read: true, update: false, delete: false },
    daily_records: { create: false, read: true, update: false, delete: false },
    payments: { create: true, read: true, update: true, delete: false },
    personal_accounts: { create: true, read: true, update: true, delete: false },
    cheques: { create: true, read: true, update: true, delete: false },
    reports: { read: true, export: true },
    settings: { manage_users: false, manage_permissions: false },
  },
  data_entry: {
    workers: { create: true, read: true, update: true, delete: false },
    projects: { create: true, read: true, update: true, delete: false },
    foremen: { create: true, read: true, update: true, delete: false },
    subcontractors: { create: true, read: true, update: true, delete: false },
    daily_records: { create: true, read: true, update: true, delete: false },
    payments: { create: false, read: true, update: false, delete: false },
    personal_accounts: { create: false, read: true, update: false, delete: false },
    cheques: { create: false, read: true, update: false, delete: false },
    reports: { read: true, export: false },
    settings: { manage_users: false, manage_permissions: false },
  },
  viewer: {
    workers: { create: false, read: true, update: false, delete: false },
    projects: { create: false, read: true, update: false, delete: false },
    foremen: { create: false, read: true, update: false, delete: false },
    subcontractors: { create: false, read: true, update: false, delete: false },
    daily_records: { create: false, read: true, update: false, delete: false },
    payments: { create: false, read: true, update: false, delete: false },
    personal_accounts: { create: false, read: true, update: false, delete: false },
    cheques: { create: false, read: true, update: false, delete: false },
    reports: { read: true, export: false },
    settings: { manage_users: false, manage_permissions: false },
  },
};

/**
 * Permission Service
 * Manages user roles and permissions
 */
export const permissionService = {
  /**
   * Get user's role for a specific kablan
   */
  async getUserRole(kablanId: string, userId: string): Promise<UserRoleInfo | null> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('kablan_id', kablanId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return toCamelCase(data) as UserRoleInfo;
  },

  /**
   * Get all users for a kablan (owner only)
   */
  async getKablanUsers(kablanId: string): Promise<UserRoleInfo[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('kablan_id', kablanId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return toCamelCase(data) as UserRoleInfo[];
  },

  /**
   * Create invitation for new user (owner only)
   */
  async createInvitation(
    kablanId: string,
    email: string,
    role: UserRole,
    invitedBy: string,
    customPermissions?: UserPermissions
  ): Promise<PendingInvitation> {
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const invitation = {
      kablan_id: kablanId,
      email,
      role,
      permissions: customPermissions || DEFAULT_PERMISSIONS[role],
      invited_by: invitedBy,
      invitation_token: invitationToken,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('pending_invitations')
      .insert([invitation])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as PendingInvitation;
  },

  /**
   * Accept invitation and create user role
   */
  async acceptInvitation(invitationToken: string, userId: string): Promise<UserRoleInfo> {
    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .single();

    if (invError) throw new Error('دعوة غير صالحة أو منتهية الصلاحية');

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('الدعوة منتهية الصلاحية');
    }

    // Create user role
    const userRole = {
      kablan_id: invitation.kablan_id,
      user_id: userId,
      role: invitation.role,
      permissions: invitation.permissions,
      invited_by: invitation.invited_by,
      status: 'active',
    };

    const { data, error } = await supabase
      .from('user_roles')
      .insert([userRole])
      .select()
      .single();

    if (error) throw error;

    // Mark invitation as accepted
    await supabase
      .from('pending_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    return toCamelCase(data) as UserRoleInfo;
  },

  /**
   * Update user role (owner only)
   */
  async updateUserRole(
    roleId: string,
    updates: { role?: UserRole; permissions?: UserPermissions; status?: string }
  ): Promise<UserRoleInfo> {
    const updateData = toSnakeCase(updates);

    const { data, error } = await supabase
      .from('user_roles')
      .update(updateData)
      .eq('id', roleId)
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as UserRoleInfo;
  },

  /**
   * Remove user access (owner only)
   */
  async revokeUserAccess(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .update({ status: 'revoked' })
      .eq('id', roleId);

    if (error) throw error;
  },

  /**
   * Check if user has permission
   */
  hasPermission(
    userRole: UserRoleInfo,
    resource: keyof UserPermissions,
    action: 'create' | 'read' | 'update' | 'delete' | 'export'
  ): boolean {
    const resourcePermissions = userRole.permissions[resource];
    if (!resourcePermissions) return false;
    
    if (typeof resourcePermissions === 'object' && 'manage_users' in resourcePermissions) {
      // Settings permissions
      return false;
    }
    
    return resourcePermissions[action] === true;
  },

  /**
   * Get default permissions for a role
   */
  getDefaultPermissions(role: UserRole): UserPermissions {
    return DEFAULT_PERMISSIONS[role];
  },

  /**
   * Get all pending invitations for a kablan
   */
  async getPendingInvitations(kablanId: string): Promise<PendingInvitation[]> {
    const { data, error } = await supabase
      .from('pending_invitations')
      .select('*')
      .eq('kablan_id', kablanId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return toCamelCase(data) as PendingInvitation[];
  },

  /**
   * Cancel invitation (owner only)
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('pending_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) throw error;
  },

  /**
   * Create owner role for kablan creator (auto-called on kablan creation)
   */
  async createOwnerRole(kablanId: string, userId: string): Promise<UserRoleInfo> {
    const ownerRole = {
      kablan_id: kablanId,
      user_id: userId,
      role: 'owner',
      permissions: DEFAULT_PERMISSIONS.owner,
      invited_by: userId, // Self-invited
      status: 'active',
    };

    const { data, error } = await supabase
      .from('user_roles')
      .insert([ownerRole])
      .select()
      .single();

    if (error) throw error;
    return toCamelCase(data) as UserRoleInfo;
  },

  /**
   * Create user directly with default password (WARSHA2025)
   * Returns user info for manual account creation
   */
  async createUserDirectly(
    kablanId: string,
    email: string,
    role: UserRole,
    invitedBy: string,
    customPermissions?: UserPermissions
  ): Promise<{ email: string; password: string; role: UserRole }> {
    // Note: We can't create Firebase users from client-side
    // This creates a placeholder that will be activated when user registers
    
    const defaultPassword = 'WARSHA2025';
    
    // Create pending invitation with special status
    const invitation = {
      kablan_id: kablanId,
      email,
      role,
      permissions: customPermissions || DEFAULT_PERMISSIONS[role],
      invited_by: invitedBy,
      invitation_token: crypto.randomUUID(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('pending_invitations')
      .insert([invitation])
      .select()
      .single();

    if (error) throw error;

    return {
      email,
      password: defaultPassword,
      role,
    };
  },

  /**
   * Pre-register a user (before Firebase account creation)
   * المدير يضيف الموظف مسبقاً قبل ما ينشئ حساب Firebase
   */
  async preRegisterUser(
    kablanId: string,
    email: string,
    role: UserRole,
    registeredBy: string,
    customPermissions?: UserPermissions
  ): Promise<void> {
    const preRegistration = {
      kablan_id: kablanId,
      email: email.toLowerCase().trim(), // Normalize email
      role,
      permissions: customPermissions || DEFAULT_PERMISSIONS[role],
      registered_by: registeredBy,
      status: 'pending',
    };

    const { error } = await supabase
      .from('pre_registered_users')
      .insert([preRegistration]);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('هذا البريد الإلكتروني مسجل مسبقاً لهذا المقاول');
      }
      throw error;
    }
  },

  /**
   * Check if email is pre-registered and activate user
   * عند تسجيل دخول جديد، نفحص إذا البريد مسجل مسبقاً ونفعّل الحساب
   */
  async activatePreRegisteredUser(email: string, userId: string): Promise<UserRoleInfo | null> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if this email is pre-registered
    const { data: preReg, error: preRegError } = await supabase
      .from('pre_registered_users')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (preRegError) throw preRegError;
    if (!preReg) return null; // Not pre-registered

    // Create user_role
    const userRole = {
      kablan_id: preReg.kablan_id,
      user_id: userId,
      role: preReg.role,
      permissions: preReg.permissions,
      invited_by: preReg.registered_by,
      status: 'active',
    };

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .insert([userRole])
      .select()
      .single();

    if (roleError) throw roleError;

    // Mark pre-registration as activated
    await supabase
      .from('pre_registered_users')
      .update({ status: 'activated' })
      .eq('id', preReg.id);

    return toCamelCase(roleData) as UserRoleInfo;
  },

  /**
   * Get all pre-registered users for a kablan
   */
  async getPreRegisteredUsers(kablanId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('pre_registered_users')
      .select('*')
      .eq('kablan_id', kablanId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return toCamelCase(data) || [];
  },

  /**
   * Cancel pre-registration
   */
  async cancelPreRegistration(preRegId: string): Promise<void> {
    const { error } = await supabase
      .from('pre_registered_users')
      .update({ status: 'cancelled' })
      .eq('id', preRegId);

    if (error) throw error;
  },
};
