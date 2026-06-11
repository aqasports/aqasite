# AQA Sports Academy - Member Area Integration Audit

This audit outlines the technical architecture, data structures, user flows, and ERP integration details required to implement a built-in Member Area within the AQA Sports website and its existing Control Center (ERP).

---

## 1. Context & Architectural Overview

The AQA Sports portal is currently built as a static Astro web application deployed on Netlify. 
* The administrative features (schedules, formations, pools, page counters) are managed via a protected page: `src/pages/[adminSlug].astro`.
* Dynamic changes made by administrators are persisted back to the repository as JSON files (`src/data/schedule.json`, `src/data/infrastructure.json`, etc.) using Netlify Serverless Functions (`netlify/functions/save-data.js`) interacting with the GitHub API. This triggers a Netlify build/rebuild cycle.
* Customer registrations are captured using Netlify Forms, which are currently processed externally or manually.

### The Challenge
A Member Area requires real-time data access for user profile updates, booking sessions, tracking progress (XP and badges), and viewing billing details. Storing individual member data inside Git-backed JSON files would trigger Netlify build queues for every single user interaction (such as booking a session or gaining 100 XP), which is not scalable.

### Proposed Solution
We recommend a Hybrid Architecture:
1. **Static/Config Data**: Keep schedules, pools, and site configurations in the Git-backed JSON files (`schedule.json`, `infrastructure.json`).
2. **Dynamic/Member Data**: Store member accounts, session bookings, progress stats (XP/badges), and payment histories in a lightweight serverless database.
3. **Database Selection**: Supabase (PostgreSQL) is the recommended backend choice due to its native JS client, row-level security, and free-tier compatibility. Alternatively, MongoDB Atlas (document-based) can be used. This audit assumes a Supabase/PostgreSQL schema but can be adapted easily.
4. **ERP Integration**: Add a "Gestion Membres" (Member Management) tab to `[adminSlug].astro`. It will pull member statistics and registrations from the serverless database via secure Netlify Functions.

---

## 2. Database Schema (Supabase/PostgreSQL)

To support the AQA Member Area, the following tables must be defined in the serverless database.

### Table: members
Stores user credentials, profile information, membership status, and gamification metrics.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier for the member |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Member login email |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt-hashed password |
| full_name | VARCHAR(255) | NOT NULL | Member's full name |
| phone | VARCHAR(50) | | Contact number (WhatsApp ready) |
| birth_date | DATE | | Used for age group classification |
| gender | VARCHAR(20) | | Male, Female, or Junior |
| membership_tier | VARCHAR(20) | DEFAULT 'Silver' | Silver, Gold, or Diamond |
| xp | INTEGER | DEFAULT 0 | Accumulated experience points |
| badges | JSONB | DEFAULT '[]'::jsonb | Array of unlocked badge IDs |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, active, suspended |
| created_at | TIMESTAMP | DEFAULT NOW() | Account registration timestamp |

### Table: member_subscriptions
Tracks current registrations, active passes, and assigned swimming pools or coaches.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique subscription ID |
| member_id | UUID | REFERENCES members(id) ON DELETE CASCADE | Associated member |
| category | VARCHAR(50) | NOT NULL | category (homme, femme, ados, enfants, apnea) |
| pool_key | VARCHAR(50) | NOT NULL | e.g. reghaia, cheraga |
| coach_name | VARCHAR(100) | NOT NULL | Assigned coach name |
| slot_day | VARCHAR(50) | NOT NULL | Day of slot (e.g. Samedi, Mardi) |
| slot_time | VARCHAR(50) | NOT NULL | Time of slot (e.g. 21h - 23h) |
| start_date | DATE | DEFAULT CURRENT_DATE | Subscription start |
| end_date | DATE | | Subscription expiry |
| status | VARCHAR(20) | DEFAULT 'inactive' | active, expired, pending_approval |

### Table: payments
Tracks transactions, invoices, and subscription renewals.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique payment ID |
| member_id | UUID | REFERENCES members(id) | Associated member |
| amount | NUMERIC(10,2) | NOT NULL | Paid amount |
| currency | VARCHAR(10) | DEFAULT 'DZD' | Currency symbol |
| payment_date | TIMESTAMP | DEFAULT NOW() | Payment timestamp |
| payment_method | VARCHAR(50) | | CCP, BaridiMob, Cash, Card |
| receipt_url | TEXT | | Link to uploaded transaction slip image |
| status | VARCHAR(20) | DEFAULT 'pending' | pending, approved, rejected |

---

## 3. System Architecture & Data Flows

### A. Member Authentication Flow
```
Member Browser              Netlify Function               Database (Supabase)
   │                             │                                 │
   ├────── POST /login ─────────>│                                 │
   │      (email, password)      ├───── Query by email ───────────>│
   │                             │<──── Return user record ────────┤
   │                             │                                 │
   │                             ├─ Verify password hash (Bcrypt)  │
   │                             ├─ Generate JWT (expires in 7d)   │
   │<───── Return JWT & Profile ─┤                                 │
   │                             │                                 │
```

### B. Session Booking & Slot Update Flow
When a member selects or updates their slot:
```
Member Browser              Netlify Function               Database / GitHub
   │                             │                                 │
   ├────── POST /booking ───────>│                                 │
   │      (pool, day, time)      ├───── Check member status ──────>│
   │                             │<──── Active Subscription? ──────┤
   │                             │                                 │
   │                             ├───── Read schedule.json (Git) ──> (Cached local file)
   │                             ├─ Check if slot has capacity     │
   │                             │                                 │
   │                             ├─ Update member_subscriptions ──>│ (Assign slot)
   │                             ├─ Call API: /api/save-schedule  │
   │                             │  (Increments slot 'taken' count)│
   │                             │  (Triggers Netlify rebuild)     │
   │<───── Return Success ───────┤                                 │
```

---

## 4. API Endpoint Designs

The member area will be driven by new Netlify functions (or Astro API routes configured in `src/pages/api/`).

### 1. POST /api/member/auth/register
Registers a new member. It encrypts the password and saves the profile as `pending`.
* **Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "secure_password",
    "fullName": "Sid Ahmed",
    "phone": "0540000000",
    "birthDate": "1998-05-15",
    "gender": "homme"
  }
  ```
* **Response (200)**:
  ```json
  {
    "success": true,
    "message": "Inscription réussie. Compte en attente de validation."
  }
  ```

### 2. POST /api/member/auth/login
Authenticates the user and returns a token.
* **Payload**:
  ```json
  {
    "email": "user@example.com",
    "password": "secure_password"
  }
  ```
* **Response (200)**:
  ```json
  {
    "success": true,
    "token": "jwt_token_here",
    "member": {
      "id": "member_uuid",
      "fullName": "Sid Ahmed",
      "email": "user@example.com",
      "membershipTier": "Silver",
      "xp": 1200,
      "badges": ["badge1", "badge2"]
    }
  }
  ```

### 3. GET /api/member/profile
Retrieves profile data. Requires Bearer Token authorization header.
* **Response (200)**:
  ```json
  {
    "success": true,
    "profile": {
      "fullName": "Sid Ahmed",
      "phone": "0540000000",
      "birthDate": "1998-05-15",
      "xp": 1200,
      "badges": ["badge1", "badge2"]
    },
    "subscription": {
      "category": "homme",
      "poolKey": "reghaia",
      "coachName": "Coach Youcef",
      "slotDay": "Samedi",
      "slotTime": "21h - 23h",
      "status": "active",
      "endDate": "2026-07-10"
    }
  }
  ```

### 4. POST /api/member/booking/change
Allows a member to change their assigned group/slot if vacancies exist.
* **Payload**:
  ```json
  {
    "poolKey": "reghaia",
    "category": "homme",
    "coachName": "Coach Youcef",
    "day": "Mardi",
    "time": "21h - 23h"
  }
  ```
* **Response (200)**:
  ```json
  {
    "success": true,
    "message": "Changement de groupe enregistré avec succès."
  }
  ```

---

## 5. UI/UX Interface Designs

The UI/UX will retain the signature AQA neon-cyberpunk styling (dark background, glowing borders, smooth CSS transitions, modern fonts).

### A. Member Portal Dashboard (`src/pages/[lang]/clients/dashboard.astro`)
The dashboard is split into three main modules:

1. **Card Status Panel (Loyalty widget)**:
   * Displays the virtual card (Silver, Gold, or Diamond) with a dynamic gradient matching the tier.
   * Shows a custom QR code containing the member ID for pool entrance scans.
   * Displays the current XP level, progress bar, and badge count. Unlocked badges glow when hovered.

2. **Session Detail Widget**:
   * Displays the current assigned pool, coach, day, and time.
   * Action button: "Changer de groupe" (opens the interactive schedule selector).
   * Status indicators: Time remaining before the next session.

3. **Billing History & Renewals**:
   * Shows subscription active timeline (e.g. valid until 2026-07-10).
   * Lists past payments and pending approval invoices.
   * "Renouveler" button redirects to a quick payment submission modal.

### B. Interactive Schedule Selector
* A custom slider/grid component where members see schedules matching their category.
* Shows real-time vacancies for each coach slot (e.g. "5 places restantes", "Complet").
* Completed slots are greyed out, preventing booking selection.

---

## 6. Built-in ERP Integration in the Control Center

To manage members, we will add a new tab titled "Gestion Membres" to `src/pages/[adminSlug].astro`.

### 1. UI Structure of "Gestion Membres" Tab
The control panel will consist of:
* **Metrics Cards**:
  * Total registered members.
  * Active vs Pending accounts.
  * Monthly revenue summary (calculated from approved payments).
* **Pending Approvals Table**:
  * Lists members who registered online and uploaded payment receipts.
  * Actions: "Approuver l'inscription" (activates account and sets subscription end date), "Rejeter" (sends notification).
* **Active Members List**:
  * Search input to filter by name, email, or phone.
  * Filter dropdowns by Pool, Coach, Tier, and Account Status.
  * Action buttons to edit profile, manually adjust XP, grant badges, or edit active subscription details.

### 2. Synchronization of Schedule JSON Counts
To prevent double booking when members register or change slots online:
1. The member changes their slot via the dashboard.
2. The serverless function updates the database entry for that member.
3. The serverless function calls `/api/save-schedule` on the server:
   * It loads the current `schedule.json`.
   * It decrements the `taken` count of the member's old slot (if any).
   * It increments the `taken` count of the member's new slot.
   * It writes the updated structure back to `schedule.json`, committing it automatically.

---

## 7. Implementation Roadmap

```
Phase 1: Database Setup & APIs (1-2 days)
├── Configure PostgreSQL database tables (Supabase)
├── Implement JWT auth functions in netlify/functions/
└── Create profile management and booking APIs

Phase 2: Member Frontend Development (2-3 days)
├── Create /clients/login page (with language selector)
├── Create /clients/register page
└── Build /clients/dashboard page (Profile, bookings, payment upload)

Phase 3: ERP Integration (2 days)
├── Add "Gestion Membres" panel inside [adminSlug].astro
├── Connect the panel to retrieve database records
└── Add approval workflows and receipt verification actions

Phase 4: Sync & Polish (1 day)
├── Validate automatic slot adjustment logic in schedule.json
├── Verify and build without warnings
└── Final test run of member booking flows
```

---

## 8. Verification & Security Protocols

1. **JSON Web Token Security**:
   * All requests to member APIs must include the `Authorization: Bearer <JWT>` header.
   * Tokens expire after 7 days, forcing re-authentication.
   * Admin routes inside the ERP remain protected by the admin password hash.

2. **Input Validation**:
   * Validate parameters on the backend before writing to the database or updating JSON files.
   * Prevent slot booking if slot `taken` is greater than or equal to `total`.

3. **Concurrency Control**:
   * When slot changes are requested, the database updates first under transaction isolation to avoid race conditions.

4. **No-Emoji and Typography Constraints**:
   * Code files must be completely devoid of emojis.
   * Standard Western digits (0-9) must be used in all Arabic UI translations.
