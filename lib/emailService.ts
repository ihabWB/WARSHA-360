/**
 * Email Service
 * Send invitation emails to new users
 * 
 * Using EmailJS (free service) - https://www.emailjs.com/
 * 
 * Setup:
 * 1. Create account at emailjs.com
 * 2. Create email service (Gmail, Outlook, etc.)
 * 3. Create email template
 * 4. Get your Service ID, Template ID, and Public Key
 * 5. Add to .env.local:
 *    VITE_EMAILJS_SERVICE_ID=your_service_id
 *    VITE_EMAILJS_TEMPLATE_ID=your_template_id
 *    VITE_EMAILJS_PUBLIC_KEY=your_public_key
 */

import emailjs from '@emailjs/browser';

interface InvitationEmailParams {
  toEmail: string;
  toName?: string;
  fromName: string;
  kablanName: string;
  role: string;
  invitationLink: string;
  expiryDays: number;
}

export const emailService = {
  /**
   * Initialize EmailJS
   */
  init: () => {
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
    if (publicKey) {
      emailjs.init(publicKey);
    }
  },

  /**
   * Send invitation email
   */
  sendInvitation: async (params: InvitationEmailParams): Promise<void> => {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

    if (!serviceId || !templateId) {
      console.warn('EmailJS not configured. Invitation link:', params.invitationLink);
      // In development, just log the link
      return;
    }

    const templateParams = {
      to_email: params.toEmail,
      to_name: params.toName || params.toEmail,
      from_name: params.fromName,
      kablan_name: params.kablanName,
      role: getRoleLabel(params.role),
      invitation_link: params.invitationLink,
      expiry_days: params.expiryDays,
    };

    try {
      await emailjs.send(serviceId, templateId, templateParams);
      console.log('✅ Invitation email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send invitation email:', error);
      throw new Error('فشل إرسال البريد الإلكتروني. الرجاء المحاولة مرة أخرى.');
    }
  },

  /**
   * Send welcome email after accepting invitation
   */
  sendWelcome: async (toEmail: string, kablanName: string, role: string): Promise<void> => {
    // TODO: Implement welcome email
    console.log(`Welcome email to ${toEmail} for ${kablanName} as ${role}`);
  },

  /**
   * Send notification when user's role is changed
   */
  sendRoleChanged: async (toEmail: string, oldRole: string, newRole: string): Promise<void> => {
    // TODO: Implement role change notification
    console.log(`Role changed email to ${toEmail}: ${oldRole} → ${newRole}`);
  },

  /**
   * Send notification when user's access is revoked
   */
  sendAccessRevoked: async (toEmail: string, kablanName: string): Promise<void> => {
    // TODO: Implement access revoked notification
    console.log(`Access revoked email to ${toEmail} for ${kablanName}`);
  },
};

/**
 * Get Arabic role label
 */
function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    owner: 'مالك',
    admin: 'مدير',
    accountant: 'محاسب',
    data_entry: 'مدخل بيانات',
    viewer: 'مشاهد',
  };
  return labels[role] || role;
}

/**
 * Email Template Example for EmailJS:
 * 
 * Subject: دعوة للانضمام إلى {{kablan_name}} في ورشاتك
 * 
 * Body:
 * مرحباً {{to_name}},
 * 
 * لقد تمت دعوتك من قبل {{from_name}} للانضمام إلى {{kablan_name}} في نظام ورشاتك.
 * 
 * دورك: {{role}}
 * 
 * للقبول الدعوة، يرجى النقر على الرابط التالي:
 * {{invitation_link}}
 * 
 * ملاحظة: هذا الرابط صالح لمدة {{expiry_days}} أيام.
 * 
 * إذا لم يكن لديك حساب، ستحتاج إلى إنشاء حساب جديد في Firebase أولاً.
 * 
 * مع أطيب التحيات,
 * فريق ورشاتك
 */
