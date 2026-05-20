# 🔐 Employee Management System - Test Setup Guide

## Current Status

✅ **App Backend:** Now wired to real Firebase (emp-tool-56b9c)  
✅ **Build:** Passing with no errors  
✅ **Dev Server:** Running on http://localhost:3001  
⚠️  **Admin Credentials:** Need to be set up

## Chunk Load Error Fix

The chunk load error you encountered was a temporary dev server issue. The dev server is now running on **port 3001** — if you get timeouts on port 3000, use 3001 instead.

If you still see chunk errors:
1. Stop the dev server (Ctrl+C)
2. Delete `.next/` folder
3. Run `npm run dev` again

---

## Quick Start - Create Test Users

### Step 1: Get Firebase Admin Credentials

You need the Firebase Admin SDK credentials for the `emp-tool-56b9c` project:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: **emp-tool-56b9c**
3. Navigate to: **⚙️ Project Settings** → **Service Accounts** tab
4. Click **Generate New Private Key**
5. A JSON file will download

### Step 2: Update .env.local

Open `Empolyee_Management/.env.local` and update the admin credentials section:

```env
# Firebase ADMIN SDK (SERVER-SIDE ONLY)
FIREBASE_ADMIN_PROJECT_ID="emp-tool-56b9c"
FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@emp-tool-56b9c.iam.gserviceaccount.com"
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...[LONG KEY]...\n-----END PRIVATE KEY-----\n"
```

Extract these values from the downloaded JSON file:
- `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
- `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
- `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (make sure to escape newlines as `\n`)

### Step 3: Create Test Users

From the `Empolyee_Management` folder, run:

```bash
node scripts/create-test-users.mjs
```

This will create:

| User Type | Email | Password | Role |
|-----------|-------|----------|------|
| **Admin** | `admin@test.com` | `test@123456` | ADMIN |
| **Counsellor** | `counsellor@test.com` | `test@123456` | COUNSELLOR |

---

## Login & Test the App

### 1. **Admin Portal**
- URL: http://localhost:3001/login
- Email: `admin@test.com`
- Password: `test@123456`
- Access: Command Center, Employees, Leads Workspace, Assignment Center, Analytics

### 2. **Counsellor Portal**
- URL: http://localhost:3001/login
- Email: `counsellor@test.com`
- Password: `test@123456`
- Access: Dashboard, Lead Workspace (Calling Machine), Today's Calls, Follow-ups

---

## Feature Verification Checklist

After login, test these flows:

### ✅ Admin Functions
- [ ] **Command Center**: View dashboard stats
- [ ] **Employees Page**: 
  - View existing employees
  - Add new employee (create account)
  - Deactivate employee
- [ ] **Leads Workspace**:
  - Create single lead
  - Bulk import from Excel (use your Excel file)
  - Search & filter leads
- [ ] **Assignment Center**:
  - Select unassigned leads
  - Assign to counsellor
- [ ] **Analytics Center**:
  - View team performance
  - View pipeline conversion funnel
  - Download analytics reports

### ✅ Counsellor Functions
- [ ] **Dashboard**: View assigned leads & stats
- [ ] **Lead Workspace (Calling Machine)**:
  - View next best lead to call
  - Record call outcomes
  - Schedule follow-ups
  - Send WhatsApp templates
- [ ] **Today's Calls**: Prioritized queue
- [ ] **Follow-ups**: View overdue & upcoming

---

## Backend Endpoints (Auto-wired)

All these are now connected to real Firebase:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/employees` | GET/POST | List/create employees |
| `/api/leads` | GET/POST | List/create leads |
| `/api/leads/import` | POST | Bulk import |
| `/api/call-outcomes` | GET/POST | Record call data |
| `/api/tasks` | GET/POST | Task management |

All API calls are authenticated with Firebase ID tokens automatically.

---

## If You Get Errors

### ❌ "Firebase credentials not found"
→ Check .env.local has correct FIREBASE_ADMIN_* values

### ❌ "Authorization failed"
→ Make sure you're logged in; Firebase tokens expire after 1 hour

### ❌ "Lead not found" during import
→ Check Excel format matches lead schema (name, mobile, email, course, location, notes)

### ❌ "Chunk load error"
→ Clear `.next/` folder and restart dev server on port 3001

---

## Next Steps

1. ✅ Get emp-tool-56b9c Firebase Admin credentials
2. ✅ Update .env.local
3. ✅ Run test user creation script
4. ✅ Log in and test workflows
5. 📊 Import your real leads (Excel file ready)
6. 🎯 Full end-to-end testing of call outcomes & conversions

---

**Questions or issues?** Check the app logs at http://localhost:3001 for real-time debugging.
