# 🎯 Quick Manual Setup - Create Test Users

If the automated script didn't work, you can create test users manually via Firebase Console:

## Method 1: Firebase Console (Easiest)

### Create Admin User

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **emp-tool-56b9c**
3. Navigate to: **Authentication** → **Users** tab
4. Click **Add User**
5. Fill in:
   - **Email:** `admin@test.com`
   - **Password:** `test@123456`
6. Click **Add User**

### Create Employee Record in Firestore

1. Navigate to: **Firestore Database**
2. Create collection: `employees` (if it doesn't exist)
3. Click **Add Document**
4. Set Document ID to the **UID** from the user you just created (copy from Authentication tab)
5. Add fields:
   ```
   email: "admin@test.com"
   name: "Test Admin"
   phone: "9876543210"
   role: "ADMIN"
   isActive: true
   dailyCallTarget: 0
   createdAt: {current timestamp}
   updatedAt: {current timestamp}
   ```
6. Click **Save**

### Repeat for Counsellor User

Create another user in Authentication:
- **Email:** `counsellor@test.com`
- **Password:** `test@123456`

Then add to Firestore `employees` collection:
```
email: "counsellor@test.com"
name: "Test Counsellor"
phone: "9876543211"
role: "COUNSELLOR"
isActive: true
dailyCallTarget: 25
createdAt: {current timestamp}
updatedAt: {current timestamp}
```

---

## Method 2: Using Firestore Emulator (Local Testing)

If you want to test completely locally without hitting Firebase:

### Step 1: Install Firebase Emulator

```bash
npm install -g firebase-tools
```

### Step 2: Start Emulator

```bash
firebase emulators:start --project demo
```

### Step 3: Update .env.local

Add these lines to enable emulator:

```env
# Use local emulator instead of Firebase
NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=localhost:9099
```

### Step 4: Run App

```bash
npm run dev
```

The app will now use local emulated Firestore & Auth - perfect for testing!

---

## Test Credentials (Both Methods)

| User | Email | Password |
|------|-------|----------|
| **Admin** | `admin@test.com` | `test@123456` |
| **Counsellor** | `counsellor@test.com` | `test@123456` |

---

## Quick Navigation

After login at http://localhost:3001/login:

### 👨‍💼 Admin Features
- `/admin/dashboard` - Command Center
- `/admin/employees` - Manage staff
- `/admin/leads` - Import & manage leads
- `/admin/assignments` - Assign leads to counsellors
- `/admin/analytics` - View team performance

### 📞 Counsellor Features
- `/counsellor/dashboard` - View assigned leads
- `/counsellor/workspace` - Calling machine / next best action
- `/counsellor/todays-calls` - Prioritized call queue
- `/counsellor/follow-ups` - Follow-up schedule

---

## Troubleshooting

### ❌ "User does not exist" when logging in
→ User hasn't been created in Authentication yet

### ❌ "Employee profile not found"
→ User exists in Auth but missing from Firestore `employees` collection

### ❌ "Invalid email format"
→ Make sure email format is correct: `user@example.com`

### ❌ Can't access admin features
→ Check that `role` field in Firestore is set to `"ADMIN"`

---

**Next:** Log in with the test credentials and explore the features!
