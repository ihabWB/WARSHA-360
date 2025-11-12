# 🚀 Warshatkom - Supabase & Firebase Deployment Guide

This guide will help you migrate your Warshatkom app from localStorage to Supabase database and deploy it to Firebase Hosting.

---

## 📋 Prerequisites

- Node.js installed (v18 or higher)
- A Supabase account (free tier available)
- A Firebase account (free tier available)
- Basic command line knowledge

---

## 🗄️ Part 1: Supabase Database Setup

### Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "New Project"
3. Sign in with GitHub or create an account
4. Click "New Project"
5. Fill in the details:
   - **Project Name**: `warshatkom` (or any name you prefer)
   - **Database Password**: Create a strong password (save it securely!)
   - **Region**: Choose the closest region to your users
   - **Pricing Plan**: Free (sufficient for getting started)
6. Click "Create new project"
7. Wait 2-3 minutes for the project to be set up

### Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (⚙️) in the left sidebar
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)
4. Copy both values - you'll need them in the next step

### Step 3: Configure Environment Variables

1. Open your project folder in VS Code
2. Find the `.env.local` file in the root directory
3. Replace the placeholder values with your actual Supabase credentials:

```bash
GEMINI_API_KEY=PLACEHOLDER_API_KEY

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

⚠️ **Important**: Never commit `.env.local` to Git! It's already in `.gitignore`.

### Step 4: Create the Database Schema

1. In your Supabase project dashboard, click on the **SQL Editor** icon in the left sidebar
2. Click **New query**
3. Open the file `supabase-schema.sql` from your project folder
4. Copy ALL the SQL code from this file
5. Paste it into the Supabase SQL Editor
6. Click **Run** button (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned" message
8. Verify the tables were created:
   - Click on **Table Editor** in the left sidebar
   - You should see all tables: `kablans`, `workers`, `projects`, `foremen`, etc.

### Step 5: Enable Email Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Scroll down to **Email Auth** settings:
   - Enable **Confirm email** (recommended for production)
   - For development, you can disable it temporarily
4. Click **Save**

### Step 6: Configure Email Templates (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Customize the confirmation email template if desired
3. Add your app's name and logo

---

## 🔥 Part 2: Firebase Hosting Setup

### Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click "Add project" or "Create a project"
3. Enter project name: `warshatkom` (or your preferred name)
4. Click "Continue"
5. **Google Analytics**: You can disable this for now (toggle off)
6. Click "Create project"
7. Wait for project creation (about 30 seconds)
8. Click "Continue" when done

### Step 2: Get Your Firebase Project ID

1. In the Firebase Console, you'll see your project
2. Click on the ⚙️ (Settings) next to "Project Overview"
3. Scroll down to find your **Project ID**
4. Copy the Project ID (e.g., `warshatkom-12345`)

### Step 3: Configure Firebase in Your Project

1. Open the `.firebaserc` file in your project
2. Replace `your-firebase-project-id` with your actual project ID:

```json
{
  "projects": {
    "default": "warshatkom-12345"
  }
}
```

### Step 4: Login to Firebase

Open your terminal in VS Code and run:

```bash
npm run firebase:login
```

This will:
- Open your browser
- Ask you to log in with your Google account
- Grant Firebase CLI access

### Step 5: Build Your Application

Before deploying, build the production version:

```bash
npm run build
```

This creates an optimized build in the `dist` folder.

### Step 6: Deploy to Firebase

Deploy your app to Firebase Hosting:

```bash
firebase deploy --only hosting
```

Or use the npm script:

```bash
npm run deploy
```

You'll see output like:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/warshatkom-12345/overview
Hosting URL: https://warshatkom-12345.web.app
```

🎉 **Your app is now live!** Visit the Hosting URL to see it.

---

## 🔐 Part 3: Create Your First User Account

Since we've removed the hardcoded `admin/admin` login, you need to create a real user account:

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project
2. Click **Authentication** → **Users**
3. Click **Add user** → **Create new user**
4. Enter:
   - **Email**: your email address
   - **Password**: create a strong password
5. Click **Create user**
6. If email confirmation is enabled, check your email and confirm

### Option 2: Using the App (Self-Registration)

You'll need to implement a registration page in the app. For now, use Option 1.

---

## 🧪 Part 4: Testing Your Setup

### Test Locally with Supabase

1. Make sure your `.env.local` has the correct Supabase credentials
2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173)
4. Try logging in with the credentials you created
5. Create some test data (workers, projects, etc.)
6. Verify data is saved in Supabase:
   - Go to Supabase → **Table Editor**
   - Click on any table (e.g., `workers`)
   - You should see your data

### Test Production Deployment

1. Visit your Firebase Hosting URL (from the deploy output)
2. Log in with your credentials
3. Everything should work exactly like the local version

---

## 📊 Part 5: Migrate Existing Data (Optional)

If you have existing data in localStorage, you'll need to migrate it:

### Step 1: Export Data from Browser

1. Open your app in the browser where you have existing data
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run this code to export your data:

```javascript
// Export all localStorage data
const data = {};
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('warshatk_')) {
        data[key] = JSON.parse(localStorage.getItem(key));
    }
}
console.log(JSON.stringify(data, null, 2));
```

5. Copy the output and save it to a file called `migration-data.json`

### Step 2: Create Migration Script

You'll need to create a custom migration script to import this data into Supabase. This is beyond the scope of this guide, but the general approach is:

1. Read the exported JSON file
2. Use the Supabase service functions to insert data
3. Handle ID relationships carefully

---

## 🔧 Part 6: Environment Variables for Production

For the production deployment, you need to set up environment variables in your build process:

### Option 1: Create .env.production file

```bash
# .env.production
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Then build with:

```bash
npm run build
```

### Option 2: Firebase Environment Configuration

You can also set these in Firebase:

```bash
firebase functions:config:set supabase.url="https://your-project-id.supabase.co"
firebase functions:config:set supabase.key="your-anon-key"
```

---

## 🎯 Part 7: Next Steps

Now that your app is deployed, consider:

1. **Custom Domain**: 
   - In Firebase Console → Hosting → Add custom domain
   - Follow the DNS configuration steps

2. **SSL Certificate**: 
   - Firebase automatically provides free SSL
   - Your site will be https://

3. **Performance Monitoring**:
   - Enable Firebase Performance in your project
   - Track app speed and user experience

4. **Analytics**:
   - Add Google Analytics to track user behavior
   - Firebase Console → Analytics

5. **Continuous Deployment**:
   - Set up GitHub Actions to auto-deploy on push
   - Create `.github/workflows/deploy.yml`

---

## 🆘 Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env.local` exists and has the correct values
- Restart the dev server after changing environment variables
- Make sure variable names start with `VITE_`

### Authentication not working
- Verify email/password in Supabase → Authentication → Users
- Check browser console for error messages
- Ensure RLS policies are enabled (they are in the schema)

### Data not saving
- Check Supabase → Table Editor to verify data
- Open browser DevTools → Network tab to see API calls
- Check for CORS errors in console

### Firebase deploy fails
- Run `firebase login` again
- Verify project ID in `.firebaserc`
- Make sure you ran `npm run build` first

### App shows blank page after deployment
- Check browser console for errors
- Verify environment variables are set correctly
- Make sure `firebase.json` rewrites are configured

---

## 📞 Support

If you encounter issues:

1. Check the browser console for errors
2. Check Supabase logs: Dashboard → Logs
3. Check Firebase logs: Console → Hosting → View logs
4. Review the documentation:
   - [Supabase Docs](https://supabase.com/docs)
   - [Firebase Docs](https://firebase.google.com/docs/hosting)

---

## ✅ Checklist

Before going live, make sure:

- [ ] Supabase project created
- [ ] Database schema executed successfully
- [ ] Environment variables configured
- [ ] First user account created
- [ ] Firebase project created
- [ ] Firebase CLI logged in
- [ ] App deployed successfully
- [ ] Tested login and data persistence
- [ ] Existing data migrated (if applicable)
- [ ] Custom domain configured (optional)
- [ ] Backup strategy in place

---

## 🎉 Congratulations!

Your Warshatkom app is now running on a professional cloud infrastructure with:
- ✅ Secure database (Supabase)
- ✅ Real authentication
- ✅ Global hosting (Firebase)
- ✅ Automatic SSL
- ✅ Scalable architecture

Enjoy managing your construction projects! 🏗️
