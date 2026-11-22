# Salem Foundations Admissions Portal — QA Observations & Known Boundaries

This document records the quality assurance findings, operational constraints, and technical design decisions observed across the platform.

---

## 1. Quality Assurance Findings & Validations

| ID | Module | Observation / Finding | Status / Resolution |
| :--- | :--- | :--- | :--- |
| **QA-01** | Telecalling Workspace | Browser environments cannot initiate direct hardware telephony without WebRTC/SIP VoIP gateway or native dialer protocol (`tel:`). | **Resolved & By Design**: Platform leverages OS-level `tel:` URL protocol scheme, automatically bridging mobile device dialers and VoIP softphones (e.g., Skype, Teams, FaceTime). |
| **QA-02** | WhatsApp Collateral | Browser pop-up blockers can intercept multiple simultaneous tab openings if triggered without user interaction. | **Resolved**: Integrated explicit "Send via WhatsApp" button with direct user click handler, plus pre-opening safety check before saving outcome. |
| **QA-03** | Lead Bulk Import | Excel spreadsheets (.xlsx) with non-standard column headers previously caused empty fields. | **Resolved**: Added multi-alias auto-mapping for candidate fields (e.g., `Student Name`, `Candidate Name`, `Name`, `Full Name` all map correctly to `name`). |
| **QA-04** | Duplicate Detection | Large batch imports could accidentally introduce duplicate students into telecalling queues. | **Resolved**: System scans for matching phone numbers prior to commit; alerts admin with duplicate list and allows 1-click duplicate removal upon approval. |
| **QA-05** | Calling Hours Boundary | Telecallers dialing outside standard business hours could violate compliance standards. | **Resolved**: Calling engine rejects call attempts prior to 09:00 AM or after 06:00 PM (18:00), showing informative warning banner. |
| **QA-06** | Workload Imbalance | Static targets (e.g., 25 calls/day) failed during peak admission days or low student intake periods. | **Resolved**: Converted counsellor targets to workload-adaptive dynamic targets shifting with team average student assignments. |
| **QA-07** | Staff Removal Cascade | Deleting an employee record previously left assigned student leads in an orphaned state. | **Resolved**: Implemented cascading delete on `/api/employees/[id]` which safely resets all assigned leads to `assignedEmployeeId = null` in the unassigned pool. |
| **QA-08** | Legacy Route Aliases | Staff visiting legacy URLs (`/staff`, `/staff-portal`) experienced confusion. | **Resolved**: Built automated redirects on all legacy endpoints redirecting smoothly to `/counsellor/dashboard` and `/employee/login`. |

---

## 2. Platform Architecture Constraints & Notes

1. **Authentication Mode**:
   - The application is configured exclusively for **Production Firebase Authentication & Cloud Firestore**.
   - All mock users and test authentication bypasses have been eradicated. Real credentials and security rules apply.
2. **WhatsApp Web Dependency**:
   - Outbound WhatsApp messages utilize the official WhatsApp universal deep-linking protocol (`https://wa.me/{phone}?text={encoded}`).
   - The user's device must have either WhatsApp Web, WhatsApp Desktop, or WhatsApp Mobile installed and signed in.
3. **Database Rules & Security**:
   - Production Cloud Firestore requires authenticated session tokens for administrative API actions.
   - RBAC rules prevent counsellors from accessing employee records, bulk reassignment engines, and system-wide analytics.
