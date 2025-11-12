# 🚀 Quick Setup Guide - Warshatkom

## ⚡ Quick Start (5 Minutes)

### 1️⃣ Supabase Setup

```bash
# 1. Create account at https://supabase.com
# 2. Create new project
# 3. Copy Project URL and anon key from Settings → API
# 4. Update .env.local file
```

### 2️⃣ Create Database

1. Go to Supabase → SQL Editor
2. Copy all content from `supabase-schema.sql`
3. Paste and Run
4. ✅ Done! Tables created

### 3️⃣ Create First User

1. Supabase → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email & password
4. Save credentials!

### 4️⃣ Firebase Setup

```bash
# 1. Create project at https://console.firebase.google.com
# 2. Copy Project ID
# 3. Update .firebaserc with your project ID
# 4. Run these commands:

npm run firebase:login
npm run deploy
```

### 5️⃣ Test

Visit your Firebase URL and login!

---

## 📝 Key Files Created

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | Supabase client configuration |
| `lib/supabaseService.ts` | All database API functions |
| `supabase-schema.sql` | Complete database schema |
| `firebase.json` | Firebase hosting config |
| `.firebaserc` | Firebase project ID |
| `DEPLOYMENT_GUIDE.md` | Complete step-by-step guide |

---

## 🔑 Important Files to Update

1. **`.env.local`** - Add your Supabase credentials
2. **`.firebaserc`** - Add your Firebase project ID

---

## 📦 NPM Scripts Available

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run deploy           # Build + Deploy to Firebase
npm run firebase:login   # Login to Firebase CLI
```

---

## ⚠️ Before Deployment

- [ ] Update `.env.local` with Supabase URL and key
- [ ] Run SQL schema in Supabase
- [ ] Create at least one user account
- [ ] Update `.firebaserc` with Firebase project ID
- [ ] Run `firebase login`
- [ ] Test locally with `npm run dev`

---

## 🆘 Common Issues

**"Missing Supabase environment variables"**
→ Check `.env.local` file and restart dev server

**Can't login**
→ Create user in Supabase → Authentication → Users

**Deploy fails**
→ Run `firebase login` and verify project ID in `.firebaserc`

**Blank page after deploy**
→ Check browser console, verify environment variables

---

## 📚 Full Documentation

See `DEPLOYMENT_GUIDE.md` for complete instructions.

---

## 🎯 Next Steps (NOT YET IMPLEMENTED)

The following features need to be implemented to complete the migration:

### ⏳ TODO: Update AppContext
- Modify `context/AppContext.tsx` to use Supabase instead of localStorage
- Make all operations async
- Add loading states
- Add error handling

### ⏳ TODO: Update Authentication
- Replace hardcoded login with Supabase Auth
- Update `LoginPage.tsx` to use real authentication
- Add registration page
- Add password reset functionality

### ⏳ TODO: Update All Pages
- Add loading indicators
- Handle async data fetching
- Add error boundaries
- Improve UX for slow connections

These will be implemented in the next phase. For now, you have:
- ✅ Supabase database ready
- ✅ Firebase hosting configured  
- ✅ All API services created
- ✅ Database schema deployed

---

Need help? Check the full `DEPLOYMENT_GUIDE.md` file!
