# Salem Foundations Admissions & Telecalling Portal — Feature List

This document provides a comprehensive inventory of all user-facing features, user roles, security boundaries, and technical subsystems implemented in the Salem Foundations codebase.

---

## 1. User Roles & Access Control

| Role | Description | Accessible Routes | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **System Administrator (`ADMIN`)** | Executive admission directors and operational administrators | `/admin/*`<br>`/api/*` | Lead import, lead allocation, staff management, analytics report generation, WhatsApp template authoring, system configuration |
| **Educational Counsellor (`COUNSELLOR`)** | Academic telecallers, student advisors, and field admission counselors | `/counsellor/*`<br>`/employee/*` | Candidate calling, outcome logging, follow-up scheduling, WhatsApp collateral delivery, self-performance tracking |

---

## 2. Authentication & Authorization Features

1. **Universal Dual-Role Authentication (`/login`)**
   - Single unified entrance with automatic role-based dispatching (`ADMIN` → `/admin/dashboard`, `COUNSELLOR` → `/counsellor/dashboard`).
   - 2-second branded splash transition featuring Oddmachine branding.
   - Password reveal/hide toggle.
   - Persistent Firebase Auth session state with JWT Bearer token propagation.
2. **Dedicated Role Portals**
   - Admin Login Portal (`/admin/login`): Specialized login interface for administrative accounts.
   - Employee Login Portal (`/employee/login`): Dedicated telecalling staff login entry.
   - Legacy Route Aliases (`/staff`, `/staff/login`, `/staff-portal`, `/staff-portal/login`) with automated 301 redirects to `/counsellor/dashboard`.
3. **Role-Based Access Control (RBAC) Guards**
   - Server-side and client-side route middleware guarding `/admin/*` routes from counsellor access.
   - Counsellor-only route protection guarding `/counsellor/*` against unauthenticated visitors.
   - Centralized profile sign-out mechanism strictly housed inside profile management pages.

---

## 3. Administrator Portal Features

### 3.1. Executive Dashboard (`/admin/dashboard`)
- **Key Performance Indicators (KPIs)**: Total Leads in System, Assigned Leads, Unassigned Leads, High Priority Leads, Today's Calls Logged, and Total Conversions.
- **Real-Time Pipeline Funnel**: Stage-wise breakdown (`NEW` → `CONTACTED` → `INTERESTED` → `ADMISSION_CONFIRMED`).
- **Staff Performance Snapshot**: Roster of active counsellors with live call counts, targets, and efficiency ratios.
- **Quick Action Bar**: One-click navigation to Lead Import, Staff Assignment, Employee Roster, and Analytics.

### 3.2. Lead Import & Management (`/admin/leads`)
- **Bulk Spreadsheet Import (CSV & XLSX)**:
  - Drag-and-drop file uploader supporting `.csv`, `.xlsx`, and `.xls`.
  - Client-side parser with field mapping for Student Name, Mobile, Alternate Phone, Email, Target Course, District/Location, Source, and Notes.
  - Automatic duplicate phone number detection with prompt modal for admin verification and removal.
- **Manual Lead Entry**: Add individual candidate records with full academic preferences and priority flags.
- **Search & Multi-Filter Bar**: Real-time searching by student name, phone number, location, course, status, and lead source (`BULK`, `APPLICATION`, `WALK_IN`).
- **Lead Detail Drawer**: View full candidate profile, interaction history, assigned counselor, and notes.
- **Lead Deletion & Export**: Safe removal of records and bulk tabular CSV export.

### 3.3. Leads Assignment Center (`/admin/assignments`)
- **Dual-Pane Assignment Console**:
  - Left Pane: Multi-student lead selection with status filters (`Unassigned`, `High Priority`, `All`).
  - Right Pane: Single counsellor selector with live workload metric indicator.
- **Team Average Workload Engine**: Computes institutional average workload ($\text{Total Assigned Leads} / \text{Active Counsellors}$) and tags counsellors as `Available`, `Balanced`, or `Overloaded`.
- **Assignment History & Reassign Tab**: Comprehensive log of current assignments with counsellor filter and one-click lead reassignment capability.
- **Metric Header**: Displays `(Assigned / Unassigned)` format for clear pipeline visibility.

### 3.4. Employee Roster & Staff Management (`/admin/employees`)
- **Staff Directory**: Tabular and grid views of counselors with active/inactive indicators.
- **Detailed Employee Data Capture**: Full employee metadata including Date of Birth (DOB), Joining Date, Phone, Role, and Email.
- **Workload-Adaptive Calling Targets**: Dynamic call target shifting based on assigned student volume rather than rigid daily quotas.
- **Staff Status Controls**: Dynamic **Activate** / **Deactivate** toggle button with visual state changes.
- **Safe Staff Deletion**: Permanent employee removal with automatic cascading lead unassignment (leads safely returned to unassigned pool).
- **Counsellor Detailed Drawer**: Comprehensive view showing call history duration, calls completed vs workload, assigned students count, and recent activity.

### 3.5. Analytics & Institutional MIS Reporting (`/admin/analytics`)
- **Multi-Period Date Filtering**: Instant switching between `Today`, `Yesterday`, `Last 7 Days`, and `Last 30 Days`.
- **Pipeline Conversion Funnel**: Graphical tracking of drop-offs and conversion velocities.
- **Source Attribution Matrix**: Comparison of bulk uploads, direct applications, and campus walk-ins.
- **Staff Productivity Rankings**: Leaderboard ranking counsellors by total calls, talk time, and admissions secured.
- **Automated Branded PDF MIS Report Generator**:
  - Generates downloadable high-resolution PDF report using `jspdf` and `jspdf-autotable`.
  - Employs Salem Foundations institutional header logo on the top-left and Oddmachine tech badge on top-right.
  - Implements diagonal `SALEM FOUNDATIONS` watermark with 0.05 opacity across all document pages.
  - Formats KPI summary, lead distribution tables, counsellor rankings, and confidential disclaimer footer.

### 3.6. WhatsApp Template Management (`/admin/whatsapp`)
- **Template Library**: Roster of pre-approved message templates displayed in clean cards.
- **Template Authoring Modal**: Create and edit message templates with custom titles and body text.
- **Dynamic Variable Tags**: Support for auto-populated variables: `{name}`, `{course}`, `{location}`, `{district}`, `{counsellorName}`, `{counsellorPhone}`, and `{applicationNumber}`.
- **Active Sync Toggle**: Instantly enable or disable templates; active templates sync immediately to the counsellor workspace.

### 3.7. Administrator Profile (`/admin/profile`)
- **Account Overview**: Displays administrator name, email, official phone, role designation, and UID.
- **Session Management**: Dedicated, secure **Sign Out** button relocated from navigation sidebars.

---

## 4. Counsellor Portal Features

### 4.1. Counsellor Dashboard (`/counsellor/dashboard`)
- **Daily Performance Card**: Progress bar tracking daily calls completed vs workload-adaptive calling target.
- **Follow-up Counters**: Instant counter badges for Overdue Follow-ups, Due Today callbacks, and New Leads.
- **One-Click Telecalling Launch**: "Start Telecalling Queue" button dispatching counsellor directly into the next prioritized lead.

### 4.2. Telecalling Workspace & Calling Console (`/counsellor/workspace`)
- **Next-Best-Action Decision Engine**: Intelligently serves candidate queue prioritized by:
  1. Overdue callbacks from previous days.
  2. Callbacks scheduled for today.
  3. High-priority fresh leads.
  4. Standard lead pool.
- **Live Dialing State Machine**:
  - `READY`: Student academic profile, priority badge, location, previous notes, and dial button.
  - `CALLING`: Initiates system dialer (`tel:`) and prepares live stopwatch.
  - `IN_CALL`: Live elapsed call timer (mm:ss), key course queries, and "End Call & Record Outcome" button.
  - `OUTCOME`: Post-call disposition screen.
- **Lead Interaction Timeline Modal**: View complete historical timeline of prior calls, outcomes, durations, and notes for the active candidate.
- **Skip Lead Action**: Allows skipping current candidate and rotating them to the queue end.

### 4.3. Post-Call Disposition & Questions Screen
- **Strict Outcome Classification**: Six standardized disposition categories:
  - `INTERESTED` (Requires callback scheduling)
  - `CALL_LATER` (Requires callback scheduling)
  - `NO_RESPONSE` (Triggers retry backoff algorithm)
  - `NOT_INTERESTED` (Marks lead closed)
  - `WRONG_NUMBER` (Marks lead invalidated)
  - `CONVERTED` (Records successful admission)
- **Mandatory Follow-up Scheduler**: Preset quick buttons (`Later Today +3h`, `Tomorrow 10 AM`, `In 2 Days`, `Next Week`) or custom datetime picker.
- **Mandatory Discussion Notes**: Structured textarea ensuring counsellors log conversation details before proceeding.
- **Optional WhatsApp Collateral Selection**:
  - Embedded directly inside the post-call question screen.
  - Defaults to `None (Skip)` to keep disposition frictionless.
  - Selecting an admin template generates an instant personalized preview with candidate's actual name and course.
  - Direct `Send via WhatsApp` button opens `https://wa.me/...` in a new tab.
  - Auto-open trigger: When clicking "Save Outcome & Load Next", automatically launches WhatsApp in the background if a template was selected.

### 4.4. Schedule & Today's Calls (`/counsellor/todays-calls`)
- **Categorized Call Queues**: Dedicated tabs for `All`, `Overdue` (highlighted in red), `Upcoming Today` (yellow/blue), and `Completed`.
- **Search & Quick-Dial**: Search by student name or mobile with direct 1-click dial action opening the workspace.

### 4.5. Follow-ups Management (`/counsellor/follow-ups`)
- **Pipeline Grouping**: Filter by priority, date range, or course preference.
- **Callback Reminders**: Visual indicators calculating overdue minutes/hours.

### 4.6. New Leads Discovery Pool (`/counsellor/new-leads`)
- **Uncontacted Candidates**: Dedicated view for uncalled student records assigned to the counsellor.
- **Quick Start Calling**: Jump straight into the telecalling workflow.

### 4.7. Counsellor Profile (`/counsellor/profile` & `/employee/profile`)
- **Staff Identity Card**: Profile name, counselor ID, mobile number, assigned department, and daily target.
- **Sign Out Action**: Exclusive authenticated logout trigger for counsellors.

---

## 5. Background Engines & Business Logic

1. **Auto-Dialer Calling Rules & Boundary Enforcement**:
   - Strictly enforces regulatory calling hours: **09:00 to 18:00**.
   - Out-of-hours dialing attempts are rejected with warning banners.
2. **Disposition Retry Backoff Algorithm**:
   - `NO_RESPONSE`: Automatically reschedules retry using exponential backoff (attempt 1: +2h, attempt 2: +6h, attempt 3: +24h).
   - Exhausts lead after 3 failed call attempts.
   - `WRONG_NUMBER` & `NOT_INTERESTED`: Closes lead immediately without scheduling useless callbacks.
3. **Dynamic Workload Balancer**:
   - Replaces fixed quotas with team average workload ratio to ensure fair lead distribution across counsellors.
4. **WhatsApp URL Encoding & Sanitizer**:
   - Strips non-digit characters from student phone numbers and automatically prepends country code `91` for 10-digit Indian numbers.
   - Safely URI-encodes customized message templates for cross-platform compatibility (`wa.me`).
