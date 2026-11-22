# About Salem Foundations Admissions & Telecalling Portal

---

## 1. Overview & Purpose

The **Salem Foundations Admissions & Telecalling Portal** is an enterprise-grade higher education admissions Customer Relationship Management (CRM) and telecalling platform. Engineered specifically for higher education institutions, trusts, and academic foundations, the platform bridges the gap between raw student inquiries and successful campus admissions.

It provides educational administrators with end-to-end command over the student acquisition lifecycle — from bulk spreadsheet imports and intelligent lead distribution to automated follow-up scheduling, standardized call disposition recording, and instant WhatsApp collateral delivery.

### Core Objectives
- **Accelerate Admissions Velocity**: Reduce response time from inquiry to first counsellor contact.
- **Ensure Accountability**: Standardize post-call dispositions and enforce mandatory follow-up callbacks.
- **Eliminate Workload Disparities**: Dynamically balance lead allocation across admissions staff using institutional workload averages.
- **Provide Actionable Intelligence**: Generate institutional-grade PDF MIS reports with conversion funnel metrics and counsellor efficiency leaderboards.

---

## 2. Key Features

- **Executive Admissions Dashboard**: Real-time snapshot of the admissions pipeline, conversion velocities, and daily call totals.
- **Bulk Lead Importer & Parser**: Drag-and-drop CSV and Excel (.xlsx) ingestion with automatic phone number duplicate detection and resolution.
- **Intelligent Leads Assignment Center**: Split-pane batch student allocation to individual counsellors with live workload balancing tags (`Available`, `Balanced`, `Overloaded`).
- **Comprehensive Employee Management**: Centralized staff roster tracking employee DOB, joining dates, calling history durations, dynamic workloads, and activation states.
- **Next-Best-Action Telecalling Console**: Prioritizes calls mathematically (overdue follow-ups first, today's callbacks second, high-priority fresh leads third).
- **In-Call Stopwatch & Dialing State Machine**: Tracks talk duration, candidate course preference, and transitions smoothly through `READY` → `CALLING` → `IN_CALL` → `OUTCOME`.
- **Integrated WhatsApp Messaging**: Author message templates with dynamic tags (`{name}`, `{course}`, `{counsellorName}`) and send personalized collateral directly during call disposition.
- **Institutional PDF MIS Report Generator**: One-click generation of branded, multi-page PDF analytics reports featuring Salem Foundations and Oddmachine logos, confidentiality notices, and watermark protection.
- **Schedule & Follow-Up Tracker**: Categorized view of overdue callbacks, due today reminders, and upcoming tasks.
- **Dedicated Profile Management**: Streamlined profile views with secured session termination (sign out) for both administrators and counsellors.

---

## 3. Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router & Turbopack) | High-performance full-stack web framework with server actions and optimized client rendering |
| **Language** | TypeScript 5 | Strict end-to-end type safety across domain models, API routes, and UI components |
| **Frontend UI** | React 18, Tailwind CSS 3.4 | Modern, mobile-responsive styling with high touch targets optimized for telecallers |
| **Icons & Assets** | Lucide React | Consistent, accessible iconography |
| **Backend & Database** | Google Cloud Firestore | Real-time NoSQL database providing document collections for leads, employees, calls, and templates |
| **Authentication** | Google Firebase Authentication & Admin SDK | Enterprise session authentication, custom claims, and secure role-based access control (RBAC) |
| **File Parsing** | PapaParse 5 & SheetJS (XLSX) 0.18 | Robust client-side parsing of bulk student inquiry spreadsheets in CSV and Excel formats |
| **Document Generation** | jsPDF 4.2 & jspdf-autotable 5.0 | Client-side generation of institutional vector PDF reports with custom headers, watermarks, and data tables |
| **Automated Testing** | Node.js Test Runner (`node:test`) | Native, zero-dependency unit and regression testing for core calling rules and decision algorithms |

---

## 4. User Roles & Permission Matrix

The platform strictly enforces Role-Based Access Control (RBAC) across two distinct user roles:

```
┌─────────────────────────────────────────────────────────────┐
│                    SALEM FOUNDATIONS CRM                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   ┌─────────────────┐                   ┌─────────────────┐
   │  ADMINISTRATOR  │                   │   COUNSELLOR    │
   │ (Admin Portal)  │                   │(Counsellor Desk)│
   └────────┬────────┘                   └────────┬────────┘
            │                                     │
            ├─► Executive Dashboard               ├─► Counsellor Dashboard
            ├─► Lead Import & Duplicates          ├─► Live Workspace & Dialer
            ├─► Leads Assignment Center           ├─► Post-Call Disposition
            ├─► Employee List & Workload          ├─► WhatsApp Collateral
            ├─► Analytics & PDF Reports           ├─► Schedule & Overdue Tasks
            ├─► WhatsApp Templates CRUD           ├─► Follow-ups Pipeline
            └─► Admin Profile & Sign Out          └─► Counsellor Profile & Sign Out
```

### Detailed Permission Breakdown

| Capability / Route | System Administrator (`ADMIN`) | Educational Counsellor (`COUNSELLOR`) |
| :--- | :---: | :---: |
| Access Admin Dashboard (`/admin/dashboard`) | ✅ Yes | ❌ Blocked (Redirected) |
| Import Raw Inquiries (CSV / Excel) | ✅ Yes | ❌ Blocked |
| Assign / Reassign Student Leads | ✅ Yes | ❌ Blocked |
| Add / Activate / Deactivate / Remove Staff | ✅ Yes | ❌ Blocked |
| Author & Manage WhatsApp Templates | ✅ Yes | ❌ Blocked |
| Download Branded Institutional PDF Reports | ✅ Yes | ❌ Blocked |
| Launch Telecalling Console & Dialer | ✅ Yes (Testing) | ✅ Primary Workflow |
| Log Call Outcomes & Schedule Follow-ups | ✅ Yes | ✅ Primary Workflow |
| Select & Send Pre-filled WhatsApp Collateral | ✅ Yes | ✅ Primary Workflow |
| Access Personal Call Queue & Schedule | ✅ Yes | ✅ Primary Workflow |
| View Individual Profile & Sign Out | ✅ `/admin/profile` | ✅ `/counsellor/profile` |
