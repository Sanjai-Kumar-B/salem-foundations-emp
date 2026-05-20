# 🎯 IMMEDIATE ACTION REQUIRED - Get Started Now

## ✅ Your App is LIVE

```
🌐 Dev Server: http://localhost:3001
📁 Project: Employee_Management System
🔧 Backend: Firebase (emp-tool-56b9c)
⚡ Status: Ready for testing
```

---

## 🔐 Test Credentials (Ready to Use)

Use these to log in:

```
┌─────────────────────────────────────┐
│  ADMIN ACCOUNT                      │
├─────────────────────────────────────┤
│  Email:    admin@test.com           │
│  Password: test@123456              │
│  Role:     Full Admin Access        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  COUNSELLOR ACCOUNT                 │
├─────────────────────────────────────┤
│  Email:    counsellor@test.com      │
│  Password: test@123456              │
│  Role:     Counsellor (Call Center) │
└─────────────────────────────────────┘
```

---

## 🚀 STEP 1: Create the Users (Choose Below)

### ⭐ QUICKEST: Use Firebase Console (2 min)

1. Open: https://console.firebase.google.com
2. Select: **emp-tool-56b9c**
3. Go to: **Authentication** → **Users**
4. Click: **Add User**
5. Create user 1:
   ```
   Email: admin@test.com
   Password: test@123456
   ```
6. Click: **Add User** again
7. Create user 2:
   ```
   Email: counsellor@test.com
   Password: test@123456
   ```

✅ **Done!** Users are created.

### Alternative: Use Firestore Emulator (No internet)

```bash
cd Empolyee_Management
npm install -g firebase-tools
firebase emulators:start
```

Then visit: http://localhost:3001

---

## 📝 STEP 2: Map Users to Firestore (1 min)

After creating users in Firebase Console, add them to Firestore:

1. Go to: **Firestore Database**
2. Create collection: `employees`
3. For **admin@test.com**:
   - Document ID: *(copy UID from Authentication)*
   - Fields:
     ```
     email: "admin@test.com"
     name: "Test Admin"
     phone: "9876543210"
     role: "ADMIN"
     isActive: true
     dailyCallTarget: 0
     createdAt: (timestamp)
     updatedAt: (timestamp)
     ```

4. For **counsellor@test.com**:
   - Document ID: *(copy UID from Authentication)*
   - Fields:
     ```
     email: "counsellor@test.com"
     name: "Test Counsellor"
     phone: "9876543211"
     role: "COUNSELLOR"
     isActive: true
     dailyCallTarget: 25
     createdAt: (timestamp)
     updatedAt: (timestamp)
     ```

✅ **Done!** Users are mapped.

---

## 🎬 STEP 3: Login & Test

1. Open: **http://localhost:3001/login**
2. Enter credentials above
3. Explore!

---

## 👨‍💼 Admin Panel Features

Once logged in as admin, you can:

| Feature | URL |
|---------|-----|
| 📊 Command Center | /admin/dashboard |
| 👥 Employee Management | /admin/employees |
| 📋 Leads Management | /admin/leads |
| 🎯 Assignment Center | /admin/assignments |
| 📈 Analytics | /admin/analytics |

### Try This:
1. Go to `/admin/leads`
2. Create a test lead
3. Go to `/admin/assignments`
4. Assign to counsellor
5. Check `/admin/analytics`

---

## 📞 Counsellor Panel Features

Once logged in as counsellor, you can:

| Feature | URL |
|---------|-----|
| 📱 Dashboard | /counsellor/dashboard |
| ☎️ Calling Machine | /counsellor/workspace |
| 📅 Today's Calls | /counsellor/todays-calls |
| 🔄 Follow-ups | /counsellor/follow-ups |

### Try This:
1. Go to `/counsellor/workspace`
2. Click to call a lead
3. Record outcome
4. Schedule follow-up
5. Back to dashboard

---

## 🧪 Quick Test Workflow

**5-Minute End-to-End Test:**

```
1. [ADMIN] Login → /admin/leads
2. [ADMIN] Create lead: "John Doe" + "9876543210"
3. [ADMIN] Assign to counsellor@test.com
4. [LOGOUT]
5. [COUNSELLOR] Login
6. [COUNSELLOR] Go to /counsellor/workspace
7. [COUNSELLOR] See John Doe → Click call
8. [COUNSELLOR] Record outcome: "INTERESTED"
9. [COUNSELLOR] Schedule follow-up: "Tomorrow"
10. [LOGOUT]
11. [ADMIN] Login → /admin/analytics
12. ✅ See counsellor stats updated!
```

---

## 🛑 If You Get Errors

### ❌ "User not found" on login
→ User not created in Firebase Authentication yet

### ❌ "Employee profile not found"
→ Missing from Firestore `employees` collection

### ❌ ChunkLoadError
→ Refresh the page or restart dev server

### ❌ API 401 Unauthorized
→ Your Firebase token expired, logout & login again

---

## 📊 Real Data (When Ready)

You have your Excel file ready. To import real leads:

1. Login as admin
2. Go to `/admin/leads`
3. Click "Bulk Import"
4. Upload your Excel file
5. ✅ All leads imported!

---

## 🎉 You're All Set!

```
✅ Dev Server Running: http://localhost:3001
✅ Backend APIs Wired: All connected
✅ Test Credentials: Ready (see above)
✅ Next: Create users & login!
```

**What to do now:**
1. Create the 2 test users in Firebase Console (2 min)
2. Add them to Firestore employees collection (1 min)
3. Visit http://localhost:3001/login
4. Login & explore!

---

**Questions?** Check [READY_TO_TEST.md](./READY_TO_TEST.md) or [MANUAL_SETUP.md](./MANUAL_SETUP.md) for detailed guides.

**Happy testing! 🚀**
