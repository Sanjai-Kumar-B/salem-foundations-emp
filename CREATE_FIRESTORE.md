# 📂 Create Firestore Database - Employee Documents

You've created the auth users. Now add them to Firestore so the app can load their profiles.

---

## ⚡ Option A: Auto-Setup Script (Recommended)

### Step 1: Get Your UIDs

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select: **emp-tool-56b9c**
3. Go to: **Authentication** → **Users**
4. Copy the **UID** for `admin@test.com`
5. Copy the **UID** for `counsellor@test.com`

### Step 2: Run the Script

From the `Empolyee_Management` folder:

```bash
node scripts/create-firestore-docs.mjs
```

The script will ask:
```
📧 Admin user UID (admin@test.com): [paste UID here]
📞 Counsellor user UID (counsellor@test.com): [paste UID here]
```

Paste each UID when prompted.

### Step 3: Done! 

The script will create both employee documents in Firestore. ✅

---

## 🖱️ Option B: Manual Setup (Firebase Console)

If you prefer to do it manually through the web interface:

### Step 1: Open Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select: **emp-tool-56b9c**
3. Click: **Firestore Database** (left sidebar)
4. Click: **+ Start Collection**

### Step 2: Create Admin Employee Document

1. **Collection ID:** `employees` (if it's first, or select if exists)
2. **Document ID:** Paste the **UID from Authentication** for `admin@test.com`
3. Click: **Add Field** and enter:

| Field | Type | Value |
|-------|------|-------|
| `email` | String | `admin@test.com` |
| `name` | String | `Test Admin` |
| `phone` | String | `9876543210` |
| `role` | String | `ADMIN` |
| `isActive` | Boolean | `true` |
| `dailyCallTarget` | Number | `0` |
| `createdAt` | Timestamp | (Current time) |
| `updatedAt` | Timestamp | (Current time) |

4. Click: **Save**

### Step 3: Create Counsellor Employee Document

1. Go back to **employees** collection
2. Click: **Add Document**
3. **Document ID:** Paste the **UID from Authentication** for `counsellor@test.com`
4. Add these fields:

| Field | Type | Value |
|-------|------|-------|
| `email` | String | `counsellor@test.com` |
| `name` | String | `Test Counsellor` |
| `phone` | String | `9876543211` |
| `role` | String | `COUNSELLOR` |
| `isActive` | Boolean | `true` |
| `dailyCallTarget` | Number | `25` |
| `createdAt` | Timestamp | (Current time) |
| `updatedAt` | Timestamp | (Current time) |

5. Click: **Save**

### Done! ✅

---

## 🧪 Verify It Worked

After creating the documents:

1. Visit: **http://localhost:3001/login**
2. Try logging in as:
   ```
   Email: admin@test.com
   Password: test@123456
   ```

If login succeeds, Firestore is set up correctly! 🎉

---

## ❌ If Login Still Fails

### "Employee profile not found"
→ Employee document doesn't exist in `employees` collection
→ Check that **Document ID = UID from Authentication**

### "User not found"
→ User doesn't exist in Firebase Authentication
→ Go back and create the auth users first

### "Invalid credentials"
→ Password is wrong
→ Check you're using: `test@123456`

---

## 📊 Database Structure

After setup, your Firestore will look like:

```
firestore
└── employees (collection)
    ├── [admin-uid] (document)
    │   ├── email: "admin@test.com"
    │   ├── name: "Test Admin"
    │   ├── role: "ADMIN"
    │   └── ...
    │
    └── [counsellor-uid] (document)
        ├── email: "counsellor@test.com"
        ├── name: "Test Counsellor"
        ├── role: "COUNSELLOR"
        └── ...
```

---

## ✅ What's Next

Once Firestore is set up:

1. ✅ Login as admin
2. ✅ Create/import leads
3. ✅ Assign to counsellors
4. ✅ Record call outcomes
5. ✅ View analytics

---

**Ready to go!** Choose Option A (script) or Option B (manual) above. 🚀
