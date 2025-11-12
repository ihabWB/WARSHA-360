# Firebase Authentication Setup Guide

## Overview
Your app now uses **Firebase Authentication** for user management and **Supabase** for data storage. This hybrid approach gives you:
- Firebase's robust authentication system
- Supabase's powerful PostgreSQL database
- Firebase Hosting for deployment

---

## Step 1: Get Firebase Configuration

### 1.1 Go to Firebase Console
1. Visit https://console.firebase.google.com
2. Select your project: **warsha-360**

### 1.2 Get Your Web App Configuration
1. Click the **gear icon** ⚙️ > **Project settings**
2. Scroll down to **Your apps**
3. If you don't have a web app yet:
   - Click **Add app** > **Web** (</> icon)
   - Give it a nickname: "Warshatkom Web"
   - Click **Register app**
4. Copy the Firebase configuration object

You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "warsha-360.firebaseapp.com",
  projectId: "warsha-360",
  storageBucket: "warsha-360.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
}
```

---

## Step 2: Update Environment Variables

Open `.env.local` and fill in your Firebase configuration:

```env
# Firebase Configuration (Authentication)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=warsha-360.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=warsha-360
VITE_FIREBASE_STORAGE_BUCKET=warsha-360.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
```

**Important:** Replace the placeholder values with your actual Firebase config values!

---

## Step 3: Enable Email/Password Authentication

### 3.1 Enable Authentication Method
1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **Get started** (if first time)
3. Go to **Sign-in method** tab
4. Click **Email/Password**
5. **Enable** the first toggle (Email/Password)
6. Click **Save**

### 3.2 Create Your First User
1. Go to **Authentication** > **Users** tab
2. Click **Add user**
3. Enter:
   - Email: `admin@warsha-360.com` (or your preferred email)
   - Password: `YourSecurePassword123!`
4. Click **Add user**

---

## Step 4: Set Up Supabase Database

### 4.1 Run the Database Schema
1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New query**
5. Copy the contents of `supabase-schema-firebase.sql`
6. Paste and click **Run**

**Important:** Use `supabase-schema-firebase.sql` (NOT `supabase-schema.sql`)

This schema:
- ✅ Uses TEXT for user_id (stores Firebase UID)
- ✅ No RLS policies (security handled by app)
- ✅ Proper indexes for performance

### 4.2 Verify Tables Created
In the **Table Editor**, you should see 15 tables:
- kablans
- workers
- salary_history
- projects
- foremen
- subcontractors
- daily_records
- foreman_expenses
- subcontractor_transactions
- worker_payments
- subcontractor_payments
- foreman_payments
- personal_accounts
- personal_account_transactions
- cheques

---

## Step 5: Test Locally

### 5.1 Install Dependencies (if not done)
```powershell
npm install
```

### 5.2 Start Development Server
```powershell
npm run dev
```

### 5.3 Test Login
1. Open http://localhost:5173
2. Login with the email/password you created in Firebase
3. You should be redirected to the kablan selection page

---

## Step 6: Create Your First Kablan

After logging in:
1. You'll see "لا يوجد كبلان" (No Kablan)
2. Click **إضافة كبلان** (Add Kablan)
3. Enter:
   - Name: Your company/contractor name
   - Description: Optional description
4. Click **Save**

The kablan will be linked to your Firebase user ID automatically!

---

## How It Works

### Authentication Flow
```
User Login (Firebase)
    ↓
Firebase returns User (with UID)
    ↓
App stores Firebase UID
    ↓
All Supabase queries filter by Firebase UID
```

### Data Access Flow
```
User authenticated with Firebase UID: "abc123xyz"
    ↓
Creates Kablan → stored with user_id = "abc123xyz"
    ↓
Creates Worker → stored with kablan_id (linked to user's kablan)
    ↓
All queries filter: WHERE user_id = "abc123xyz"
```

### Security Model
- **Firebase:** Handles authentication, user sessions, password resets
- **Supabase:** Stores all data with user_id/kablan_id filters
- **Application:** Ensures every query filters by authenticated user's ID

---

## Important Security Notes

⚠️ **RLS is DISABLED** on Supabase tables
- All security is handled at the application level
- Every query MUST filter by `user_id` or `kablan_id`
- Never expose the Supabase anon key in public repositories

✅ **What's protected:**
- Users can only see their own kablans
- Users can only access data linked to their kablans
- Firebase handles authentication security
- Supabase stores data with proper user associations

---

## Deployment

### Deploy to Firebase Hosting
```powershell
npm run build
firebase login
firebase deploy
```

Your app will be live at: `https://warsha-360.web.app`

---

## Adding More Users

### Method 1: Firebase Console (Manual)
1. Firebase Console > Authentication > Users
2. Click **Add user**
3. Enter email and password

### Method 2: User Self-Registration (Future Enhancement)
- Implement a registration page
- Use `firebaseAuthService.signUp(email, password)`
- Redirect to kablan creation

---

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Check `.env.local` has all Firebase variables
- Verify `VITE_` prefix on all variables
- Restart dev server after changing `.env.local`

### "Network request failed" on login
- Verify Email/Password is enabled in Firebase Console
- Check Firebase API key is correct
- Ensure you created a test user

### "User not found" or "Wrong password"
- Double-check email/password
- Verify user exists in Firebase Console > Authentication > Users

### Database tables not showing
- Re-run `supabase-schema-firebase.sql` in Supabase SQL Editor
- Check for SQL errors in the output

### Data not loading
- Open browser console (F12)
- Check for errors
- Verify Supabase credentials in `.env.local`

---

## Next Steps

✅ **Completed:**
- Firebase Authentication integration
- Supabase database schema
- Login page
- User-specific data filtering

🎯 **Recommended Enhancements:**
1. Add password reset functionality
2. Add email verification
3. Create user registration page
4. Add profile management
5. Implement Firebase security rules
6. Add error logging (Sentry)
7. Add analytics (Firebase Analytics)

---

## Support Resources

- **Firebase Docs:** https://firebase.google.com/docs/auth
- **Supabase Docs:** https://supabase.com/docs
- **Your Firebase Console:** https://console.firebase.google.com/project/warsha-360
- **Your Supabase Dashboard:** https://app.supabase.com

---

## Files Modified for Firebase Auth

- ✅ `lib/firebase.ts` - Firebase configuration
- ✅ `lib/firebaseAuth.ts` - Firebase auth service
- ✅ `lib/supabaseService.ts` - Updated for Firebase user IDs
- ✅ `context/AppContext.tsx` - Uses Firebase Auth
- ✅ `pages/LoginPage.tsx` - Firebase login
- ✅ `supabase-schema-firebase.sql` - Firebase-compatible schema
- ✅ `.env.local` - Added Firebase variables
- ✅ `vite-env.d.ts` - TypeScript types

**Backup created:** `context/AppContext.old.tsx` (Supabase Auth version)
