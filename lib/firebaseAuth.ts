import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  id: string;
  email: string | null;
}

/**
 * Firebase Authentication Service
 * Handles user authentication using Firebase Auth
 */
export const firebaseAuthService = {
  /**
   * Get current authenticated user
   */
  getCurrentUser: (): AuthUser | null => {
    const user = auth.currentUser;
    if (!user) return null;
    
    return {
      id: user.uid,
      email: user.email,
    };
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string): Promise<AuthUser> => {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      return {
        id: userCredential.user.uid,
        email: userCredential.user.email,
      };
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  },

  /**
   * Sign up with email and password
   */
  signUp: async (email: string, password: string): Promise<AuthUser> => {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      return {
        id: userCredential.user.uid,
        email: userCredential.user.email,
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  },

  /**
   * Sign out current user
   */
  signOut: async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  },

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange: (callback: (user: AuthUser | null) => void): (() => void) => {
    return onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        callback({
          id: firebaseUser.uid,
          email: firebaseUser.email,
        });
      } else {
        callback(null);
      }
    });
  },

  /**
   * Get Firebase ID token for current user
   * This can be used for custom authentication with other services
   */
  getIdToken: async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  },

  /**
   * Change password for current user
   * Requires re-authentication for security
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('لا يوجد مستخدم مسجل دخول');
    }

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error('Change password error:', error);
      
      // Provide user-friendly error messages in Arabic
      if (error.code === 'auth/wrong-password') {
        throw new Error('كلمة السر الحالية غير صحيحة');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('كلمة السر الجديدة ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل)');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('يجب تسجيل الدخول مرة أخرى لتغيير كلمة السر');
      }
      
      throw new Error(error.message || 'فشل تغيير كلمة السر');
    }
  },

  /**
   * Send password reset email
   * User will receive an email with a link to reset their password
   */
  sendPasswordResetEmail: async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset email error:', error);
      
      // Provide user-friendly error messages in Arabic
      if (error.code === 'auth/user-not-found') {
        throw new Error('لا يوجد حساب مسجل بهذا البريد الإلكتروني');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('البريد الإلكتروني غير صالح');
      }
      
      throw new Error(error.message || 'فشل إرسال رابط إعادة تعيين كلمة السر');
    }
  },
};

