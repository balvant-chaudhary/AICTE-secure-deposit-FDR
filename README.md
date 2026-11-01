# AICTE FDR Management Portal

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%20v8-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express-v4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-v8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade, role-based governance platform designed for the **All India Council for Technical Education (AICTE)** to digitize, verify, track, and manage institutional Fixed Deposit Receipts (FDRs) submitted as security deposits for statutory affiliation and regulatory compliance.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Objectives](#objectives)
- [Key Features](#key-features)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Project Folder Structure](#project-folder-structure)
- [Application Workflow](#application-workflow)
- [FDR Lifecycle Management](#fdr-lifecycle-management)
- [Bank CBS Verification Engine (Simulated)](#bank-cbs-verification-engine-simulated)
- [Renewal and Release Approval Hierarchy](#renewal-and-release-approval-hierarchy)
- [Maturity Tracking and Notification System](#maturity-tracking-and-notification-system)
- [Security and Compliance Features](#security-and-compliance-features)
- [API Overview](#api-overview)
- [Database Models](#database-models)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Demo Credentials](#demo-credentials)
- [Automated Testing](#automated-testing)
- [UI Overview](#ui-overview)
- [Future Scope](#future-scope)
- [License](#license)

---

## Project Overview

The **AICTE FDR Management Portal** is a centralized compliance management system built to oversee the lifecycle of security deposits furnished by technical and management institutions across India. Affiliated colleges and polytechnics submit FDRs jointly endorsed to the **Member Secretary, AICTE** to secure approval for new courses, capacity expansion, or institutional setup.

The portal replaces manual paper tracking and uncoordinated postal bank verification with an end-to-end digital lifecycle: from multipart certificate upload, deterministic Core Banking System (CBS) cross-verification simulation, discrepancy flagging and resolution, to tiered maturity alerting, and a multi-level approval hierarchy for renewal or refund release.

---

## Problem Statement

Historically, managing institutional FDR security deposits presented several operational challenges:

1. **Manual Record-Keeping & Paper Receipt Risks:** Handling physical FDR certificates across thousands of technical institutions carries risks of document misplacement, physical wear, and difficult tracking.
2. **Delayed Bank Verification:** Verifying joint liens with commercial bank branches often took months via postal correspondence, delaying approval cycles.
3. **Maturity Blind Spots & Premature Encashment:** Without automated schedule tracking, FDRs could mature or roll over into unfavorable terms without AICTE awareness, leaving statutory funds unmonitored.
4. **Lack of Auditable Clearance for Releases:** FDR releases require rigorous multi-tier clearance to ensure an institution has satisfied all statutory obligations before funds are discharged.
5. **Cross-Tenant Data Exposure Risks:** Managing confidential banking records for hundreds of competing institutions demands ironclad tenant data isolation and strict access boundaries.

---

## Objectives

- **Digitize Institutional Submissions:** Enable technical institutions to register online, submit deposit particulars, and securely attach scanned bank receipts.
- **Automate Core Banking Cross-Verification:** Provide verification desks with simulated Core Banking System (CBS) lookups to cross-match deposit amounts, maturity dates, branch IFSC codes, and joint AICTE lien endorsements.
- **Implement Transparent Discrepancy Workflows:** Automatically flag mismatches, provide granular comparative breakdown reports to institutions, and allow controlled resubmission.
- **Proactive Tiered Maturity Monitoring:** Scan active deposits daily at 60-day, 30-day, 7-day, and maturity milestones using background cron workers with distributed database locks.
- **Enforce Statutory Custody on Maturity:** Ensure that maturing FDRs enter a dedicated `MATURED` hold status and are **never** released automatically without authorized approval orders.
- **Enforce Separation of Duties:** Strict role hierarchy where institutional users propose requests, AICTE officers review and recommend, and only designated administrators authorize final release orders.

---

## Key Features

- **Multi-Tenant Institutional Isolation:** Institutions view and manage exclusively their own deposit records, lifecycle requests, and notifications.
- **Multipart Document Upload & Secure Storage:** Support for certificate scans (PDF, PNG, JPG up to 5 MB) stored outside public web roots with server-generated filenames and anti-traversal download protection.
- **7-Scenario CBS Verification Engine:** Deterministic simulation engine testing real-world banking edge cases (full match, amount variance, maturity discrepancies, IFSC mismatch, missing lien, record not found, and multi-field discrepancies).
- **Two-Tier Request Governance:** Two-step approval workflow for FDR renewal and security deposit release (Officer review & clearance recommendation followed by Administrator decision and official order number generation).
- **Idempotent Background Maturity Scanner:** Daily scheduled cron job backed by distributed MongoDB lease locks (`cron_locks`) with UUID owner tokens, heartbeat renewals, and granular delivery receipts.
- **Interactive Notification Center:** Real-time in-app notification center with dynamic unread badge count, granular read/unread tracking, link redirection, and bulk mark-all-as-read.
- **Comprehensive Audit Trail:** Immutable event logging recording actor ID, persona, IP address, before-and-after state snapshots, and operation timestamps.
- **Role-Scoped Analytics & KPIs:** Dynamic executive dashboards featuring total locked capital, maturity projection timelines, bank exposure distribution, and status breakdowns.

---

## User Roles and Permissions

| Feature / Operation | Institution (`institution`) | AICTE Officer (`officer`) | Administrator (`admin`) |
|---|:---:|:---:|:---:|
| Self-Registration & Profile Update | Yes | No | No |
| Submit New FDR (`POST /api/fdrs`) | Yes | No | No |
| View FDR Records | Own Institution Only | All Institutions | All Institutions |
| Rectify & Resubmit Discrepancy | Yes (when flagged) | No | No |
| Download Attached FDR Scans | Own Institution Only | Yes (All) | Yes (All) |
| Execute Bank CBS Verification | No | Yes | Yes |
| Submit Renewal / Release Petition | Yes | No | No |
| Recommend Request to Admin | No | Yes | Yes |
| Authorize / Reject Release Order | No | No (Blocked with `403`) | Yes |
| View System Audit Logs | Own FDR Logs Only | Yes (System-wide) | Yes (System-wide) |
| Trigger Manual Maturity Scan | No | Yes | Yes |
| Institution Directory Management | No | Yes (Read-Only) | Yes (Full) |
| Executive Analytics Dashboard | Scoped to Own Data | Regional / Global View | Full System Overview |

---

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | Modern component-based declarative user interface |
| **Vite 8** | High-performance build tool and local development server |
| **TailwindCSS 3.4** | Utility-first responsive design system tailored to Indian National / AICTE branding |
| **React Router DOM 7** | Client-side routing with role-based `ProtectedRoute` wrappers |
| **Axios 1.21** | HTTP client with automatic Bearer token interceptors and 401 response handling |
| **Lucide React** | Consistent, modern iconography |
| **Recharts 3.10** | Responsive interactive charts for analytics and exposure timelines |

### Backend

| Technology | Purpose |
|---|---|
| **Node.js 20+** | JavaScript runtime environment |
| **Express.js 4.21** | RESTful API framework with modular route controllers and error handling |
| **MongoDB & Mongoose 8** | Document database with schema enforcement, compound indexing, and validation |
| **JSON Web Tokens (JWT)** | Stateless authentication with signed tokens and configurable expiry |
| **bcryptjs 3.0** | Secure password hashing with salt rounds |
| **Multer 1.4** | Multi-part form data handler with file type validation and size limits |
| **node-cron 3.0** | Automated scheduler for midnight maturity scanning |
| **Nodemailer 6.10** | SMTP email notification integration with simulated fallback mode |

---

## System Architecture

```
                      +---------------------------------------+
                      |       Web Browser (Vite + React)      |
                      +---------------------------------------+
                                          |
                                    HTTPS / REST
                                          |
                                          v
                      +---------------------------------------+
                      |         Express.js API Server         |
                      |  (Auth, Upload, CORS, Error Handlers) |
                      +---------------------------------------+
                         |           |           |          |
            +------------+     +-----+           +----+     +------------+
            v                  v                      v                  v
     +--------------+  +---------------+      +---------------+  +---------------+
     | Auth & RBAC  |  | FDR & Request |      | CBS Simulator |  | Cron Scanner  |
     |  Middleware  |  |  Controllers  |      | Verification  |  | & Lease Lock  |
     +--------------+  +---------------+      +---------------+  +---------------+
            |                  |                      |                  |
            +------------------+----------+-----------+------------------+
                                          |
                                    Mongoose ODM
                                          |
                                          v
                      +---------------------------------------+
                      |           MongoDB Database            |
                      |  - Users          - FDRs              |
                      |  - Institutions   - BankVerifications |
                      |  - Notifications  - LifecycleRequests |
                      |  - AuditLogs      - cron_locks        |
                      +---------------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |         Protected Local Disk          |
                      |        storage/fdr-documents/         |
                      +---------------------------------------+
```

---

## Project Folder Structure

```
AICTE-SecureDeposit/
├── client/                               # React 19 + Vite Frontend
│   ├── public/                           # Static assets
│   ├── src/
│   │   ├── assets/                       # Branding graphics and logos
│   │   ├── components/
│   │   │   ├── common/                   # Reusable UI (Modal, Card, Table, Badge, NotificationCenter)
│   │   │   ├── fdr/                      # FDR modals (BankVerificationModal, VerificationResultModal)
│   │   │   └── layout/                   # Navbar, Sidebar, DashboardLayout, ProtectedRoute
│   │   ├── context/                      # React contexts (AuthContext, NotificationContext)
│   │   ├── pages/
│   │   │   ├── admin/                    # Admin Dashboard, ReleaseAuthorization, AllFDRs, Analytics
│   │   │   ├── auth/                     # LoginPage, RegisterInstitutionPage
│   │   │   ├── common/                   # UnauthorizedPage, NotFoundPage
│   │   │   ├── institution/              # InstitutionDashboard, SubmitFDR, MyFDRs, FDRDetails, Requests
│   │   │   └── officer/                  # OfficerDashboard, PendingVerifications, DiscrepancyQueue, ReleaseReview
│   │   ├── services/                     # Axios API clients (api.js, fdrService.js)
│   │   ├── utils/                        # Formatting utilities for INR currency and dates
│   │   ├── App.jsx                       # Route registry and layout hierarchy
│   │   ├── index.css                     # Custom design tokens, glassmorphism, and color themes
│   │   └── main.jsx                      # App entry point with ErrorBoundary
│   ├── package.json
│   └── vite.config.js
│
├── server/                               # Node.js + Express Backend
│   ├── src/
│   │   ├── config/                       # Database connection configuration (db.js)
│   │   ├── constants/                    # Constants (roles.js, fdrStatus.js, actionTypes.js)
│   │   ├── controllers/                  # Route handlers (auth, fdr, verification, request, analytics, audit)
│   │   ├── middlewares/                  # Express middleware (authMiddleware, roleMiddleware, uploadMiddleware)
│   │   ├── models/                       # Mongoose schemas (User, Institution, FDR, BankVerification, etc.)
│   │   ├── routes/                       # Express router definitions
│   │   ├── services/                     # Business services (cronService, bankVerificationService, auditService)
│   │   └── utils/                        # Seed data and standardized API response wrappers
│   ├── storage/                          # Secure upload target for FDR documents
│   ├── .env.example                      # Template for environment variables
│   ├── package.json
│   ├── server.js                         # Server entry point with pre-flight database connection check
│   ├── testAuth.js                       # Authentication test suite
│   ├── testDistributedLock.js            # Lease lock ownership and heartbeat renewal test suite
│   ├── testE2EIntegration.js             # Comprehensive 10-workflow end-to-end integration test suite
│   ├── testNotificationReliability.js     # Partial failure recovery & idempotency test suite
│   ├── testNotificationSecurity.js        # Cross-tenant notification isolation test suite
│   ├── testPersistence.js                 # Database persistence test suite
│   └── testPhase5.js                     # Tiered maturity alert milestone test suite
│
└── README.md                             # Project documentation
```

---

## Application Workflow

1. **Registration & Onboarding:** An institution registers using its official AICTE Permanent ID and nodal officer credentials. Duplicate AICTE IDs are rejected.
2. **Deposit Submission:** The institution submits fixed deposit particulars (bank, branch, IFSC, amount, term, joint endorsement) along with a scanned deposit receipt.
3. **Desk Verification:** The submission enters the AICTE Officer verification desk in `SUBMITTED` status.
4. **Simulated CBS Check:** The officer executes simulated Core Banking System verification against one of 7 test scenarios:
   - If records match 100%, the FDR transitions to `VERIFIED_ACTIVE`.
   - If deviations exist (amount mismatch, IFSC mismatch, missing joint lien, etc.), the FDR transitions to `DISCREPANCY_FLAGGED`.
5. **Rectification & Resubmission:** The institution receives an in-app discrepancy notification, inspects the field comparison report, updates the particulars or replaces the document, and resubmits (returning the deposit to `SUBMITTED`).
6. **Maturity Alerts:** The background cron scheduler evaluates days remaining daily:
   - At 60 days, 30 days, and 7 days, alerts are delivered to both the institution and the reviewing officer; status changes to `EXPIRING_SOON`.
   - On the maturity date ($\text{days} \le 0$), status transitions to `MATURED`.
7. **Statutory Custody Hold:** A `MATURED` deposit remains in AICTE custody and is **never automatically released**.
8. **Renewal or Release Petition:**
   - **Renewal:** Institution submits a renewal petition with an extended maturity date; officer verifies and recommends; administrator approves and updates maturity to start a new cycle.
   - **Release:** Institution submits refund bank particulars and an AICTE NOC; officer conducts document verification and records recommendation comments; administrator authorizes the final clearance order, officially discharging the AICTE joint lien and transitioning the deposit to `RELEASED`.

---

## FDR Lifecycle Management

```
   [ Institution Submits ]
              |
              v
       +--------------+
       |  SUBMITTED   | <-------------------------+
       +--------------+                           |
              |                                   |
    [ Officer CBS Check ]                         |
              |                                   |
      +-------+-------+                           |
      |               |                           |
 (All Match)     (Discrepancy)                    |
      |               |                           |
      v               v                           |
+-----------------+ +---------------------+       |
| VERIFIED_ACTIVE | | DISCREPANCY_FLAGGED |       |
+-----------------+ +---------------------+       |
      |                       |                   |
      |              [ Institution Rectifies ] ---+
      v
+-----------------+  (60d, 30d, 7d alerts)
|  EXPIRING_SOON  |
+-----------------+
      |
      | (Days Remaining <= 0)
      v
+-----------------+  <-- Statutory Hold: Never Auto-Released
|     MATURED     |
+-----------------+
      |
      +-----------------------------+
      |                             |
 [ Request Renewal ]           [ Request Release ]
      |                             |
      v                             v
+------------------+         +------------------+
| RENEWAL_PENDING  |         | RELEASE_PENDING  |
+------------------+         +------------------+
      |                             |
 [ Officer Recommends ]        [ Officer Recommends ]
      |                             |
      v                             v
 [ Admin Authorizes ]          [ Admin Authorizes ]
      |                             |
      v                             v
+-----------------+          +------------------+
| VERIFIED_ACTIVE |          |     RELEASED     |
+-----------------+          +------------------+
(Tenure Extended)            (Lien Discharged)
```

---

## Bank CBS Verification Engine (Simulated)

> [!NOTE]
> **Simulated Integration Notice:** In regulatory production, bank verification connects via secure SFTP or API gateways to scheduled commercial banks. For demonstration, evaluation, and offline audit purposes, this portal incorporates a **deterministic CBS simulation engine** that mirrors real-world core banking responses.

The engine evaluates 7 deterministic simulation scenarios:

| Scenario Code | Simulated Bank Response | System Outcome |
|---|---|---|
| `ALL_MATCH` | Core banking record confirms 100% match on deposit amount, maturity date, IFSC, and active AICTE joint lien endorsement. | FDR marked `VERIFIED_ACTIVE`. AICTE lien activated. |
| `AMOUNT_MISMATCH` | Core banking shows deposit balance is 20% lower than the figure claimed by the institution. | FDR marked `DISCREPANCY_FLAGGED`. Discrepancy report highlights amount difference. |
| `MATURITY_DATE_MISMATCH` | Bank records show the deposit matures 180 days earlier than submitted by the institution. | FDR marked `DISCREPANCY_FLAGGED`. Mismatch flagged in audit report. |
| `IFSC_MISMATCH` | Deposit exists at a different branch than declared in the affiliation paperwork. | FDR marked `DISCREPANCY_FLAGGED`. Branch IFSC discrepancy highlighted. |
| `FDR_NOT_FOUND` | No matching deposit receipt exists under that reference number in the issuing bank. | FDR marked `DISCREPANCY_FLAGGED`. Critical flag for invalid/missing receipt. |
| `LIEN_NOT_MARKED` | Deposit exists for the correct amount, but the issuing branch failed to mark joint lien to AICTE. | FDR marked `DISCREPANCY_FLAGGED`. Lien endorsement violation flagged. |
| `MULTIPLE_DISCREPANCIES` | Compound failure: amount discrepancy, maturity mismatch, and missing AICTE joint lien endorsement. | FDR marked `DISCREPANCY_FLAGGED`. Full comparative breakdown of all failed fields. |

Every verification generates an immutable `BankVerification` record with timestamp, officer signature, submitted snapshot, bank confirmation, and field comparison breakdown.

---

## Renewal and Release Approval Hierarchy

To prevent unauthorized release of statutory funds, the portal enforces a strict two-tier approval hierarchy:

```
[ Tier 1: Recommendation ]
  Institution files petition
             |
             v
   AICTE Officer Desk
  - Reviews clearance justification
  - Inspects refund account or extended tenure
  - Records recommendation comments
  - Status becomes: OFFICER_RECOMMENDED

             |
             v
[ Tier 2: Final Authorization ]
   AICTE Administrator Desk
  - Final authority for statutory discharge
  - Issues official numbered approval order
  - Status becomes: APPROVED
  - FDR transitions to RELEASED or VERIFIED_ACTIVE
```

- **Strict Privilege Barrier:** AICTE Officers attempting to call the final decision API (`PATCH /api/requests/:id/admin-decision`) are blocked with `403 Forbidden`.
- **Audit Logging:** Every recommendation and decision logs the actor's user ID, IP address, approval order number, and timestamp.

---

## Maturity Tracking and Notifications

### Background Cron Architecture

The maturity tracking service runs an automated midnight worker (`cronService.js`) with the following guarantees:

1. **Distributed Lease-Lock (`cron_locks`):** Overlapping executions across multi-node or clustered deployments are blocked using atomic MongoDB locks with unique UUID owner tokens and auto-expiring TTLs.
2. **Safe Lease Heartbeat Renewal:** Long-running scans periodically renew their lease at 1/3 TTL intervals. If a lease is lost, the scanner halts immediately to prevent split-brain processing.
3. **Milestone Intervals:**
   - **60-Day Milestone:** $30 < \text{days} \le 60 \rightarrow$ Sends alert; status becomes `EXPIRING_SOON`.
   - **30-Day Milestone:** $7 < \text{days} \le 30 \rightarrow$ Sends alert; status remains `EXPIRING_SOON`.
   - **7-Day Milestone:** $0 < \text{days} \le 7 \rightarrow$ Critical final warning alert.
   - **Matured Milestone:** $\text{days} \le 0 \rightarrow$ Status transitions to `MATURED`.
4. **Statutory Custody Hold:** Matured deposits transition to `MATURED` and are **never automatically released**. Ineligible states (`RELEASED`, `REJECTED`, `DISCREPANCY_FLAGGED`, `SUBMITTED`) are strictly excluded from scans.
5. **Database-Backed Deduplication:** Alerts utilize unique `idempotencyKey` values (`MATURITY:<fdrId>:<milestone>:<recipientRole>`) and granular receipts in `maturityAlertReceipts` to prevent duplicate alerts even after partial delivery retries.

---

## Security and Compliance Features

- **Strict Multi-Tenant Isolation:** Institutional queries automatically filter on `institutionId`. Cross-tenant requests (`GET /api/fdrs/:id`, `PUT /api/fdrs/:id`, document downloads) return `403 Forbidden`.
- **Role-Based Access Control (RBAC):** Middleware checks verify authenticated user roles (`institution`, `officer`, `admin`) before granting access to route handlers.
- **Protected File Storage:** Documents are stored in `storage/fdr-documents/` outside public web directories. File downloads go through an authenticated endpoint enforcing ownership validation, MIME verification, and path traversal protection (`path.basename`).
- **Data Immutability:** Once bank verification snapshots are saved in `BankVerification`, they cannot be modified. Resubmitting an FDR creates a new verification history entry.
- **Fail-Closed Persistence Guard:** The API returns `503 Service Unavailable` if MongoDB is disconnected, preventing accidental data loss or silent fallback to volatile in-memory stores.

---

## API Overview

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register-institution` | Public | Register new institution and nodal officer account |
| `POST` | `/api/auth/login` | Public | Authenticate user and issue JWT bearer token |
| `GET` | `/api/auth/me` | Protected | Verify active session and retrieve authenticated profile |

### FDR Management (`/api/fdrs`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/fdrs` | `institution` | Submit new FDR with multipart document upload |
| `GET` | `/api/fdrs` | Authenticated | Retrieve FDRs (scoped to own institution, or all for officer/admin) |
| `GET` | `/api/fdrs/:id` | Authenticated | Retrieve detailed FDR particulars (ownership enforced) |
| `PUT` | `/api/fdrs/:id` | `institution` | Rectify and resubmit FDR (only allowed when `SUBMITTED` or `DISCREPANCY_FLAGGED`) |
| `GET` | `/api/fdrs/:id/download-document` | Authenticated | Securely download attached FDR certificate (ownership enforced) |

### Verification Engine (`/api/verification`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/verification` | `officer`, `admin` | List verifications with pagination, filters, and summary stats |
| `GET` | `/api/verification/:fdrId` | Authenticated | Retrieve verification history for an FDR (ownership enforced) |
| `POST` | `/api/verification/:fdrId/verify` | `officer`, `admin` | Execute simulated bank CBS verification for an FDR |

### Lifecycle Requests (`/api/requests`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/requests/renewal` | `institution` | Submit FDR renewal / tenure extension request |
| `POST` | `/api/requests/release` | `institution` | Submit security deposit release and refund request |
| `GET` | `/api/requests` | Authenticated | Retrieve requests (scoped to own institution, or all for officer/admin) |
| `PATCH` | `/api/requests/:id/officer-recommend` | `officer`, `admin` | Recommend request for administrator authorization |
| `PATCH` | `/api/requests/:id/admin-decision` | `admin` strictly | Authorize (`APPROVE`) or reject (`REJECT`) request with official order number |

### Notifications (`/api/notifications`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/notifications` | Authenticated | Retrieve role-scoped notifications |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Mark a single notification as read (ownership enforced) |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Mark all notifications for the authenticated persona as read |

### Analytics & Reports (`/api/analytics`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics/metrics` | Authenticated | Retrieve dashboard KPI metrics (role-scoped) |
| `GET` | `/api/analytics/status-breakdown` | Authenticated | Retrieve FDR status distribution counts and amounts |
| `GET` | `/api/analytics/bank-distribution` | `officer`, `admin` | Retrieve exposure distribution across commercial banks |
| `GET` | `/api/analytics/maturity-timeline` | `officer`, `admin` | Retrieve monthly projected maturity schedule |
| `POST` | `/api/analytics/trigger-cron-scan` | `officer`, `admin` | Manually trigger on-demand maturity scan |

### Audit Trail (`/api/audit`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/audit` | `officer`, `admin` | View system audit logs with filters and pagination |
| `GET` | `/api/audit/fdr/:fdrId` | Authenticated | View audit trail for a specific FDR record |

### System Health

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Check service uptime and MongoDB connection status |

---

## Database Models

- **User:** Stores nodal officers, regional officers, and AICTE administrators with hashed credentials, role designations, phone numbers, and institution references.
- **Institution:** Stores affiliated technical institutions with official AICTE Permanent ID, institution type, campus address, and official contact information.
- **FDR:** Central deposit model tracking receipt numbers, bank particulars, submitted versus verified details, status constants, document attachment metadata, milestone arrays (`maturityAlertsSent`), and delivery receipts (`maturityAlertReceipts`).
- **BankVerification:** Immutable audit snapshots recording submitted versus confirmed bank particulars, verification codes, simulation scenarios, and field-by-field comparison breakdowns.
- **LifecycleRequest:** Tracks renewal proposals (extended maturity dates, amounts) and release petitions (justification, refund account details, NOCs) through the two-tier approval workflow.
- **Notification:** Scoped alerts with recipient roles, institution references, read/unread states, and unique idempotency keys for deduplication.
- **AuditLog:** Governance audit trail capturing actor identity, action type, entity references, previous state, new state, client IP address, and timestamps.
- **cron_locks:** Distributed lease-lock collection managing distributed mutual exclusion, owner UUID tokens, locked-until timestamps, and process IDs.

---

## Prerequisites

Before running the application, ensure the following software is installed on your workstation:

- **Node.js:** v18.0.0 or higher (v20+ recommended)
- **npm:** v9.0.0 or higher
- **MongoDB:** MongoDB Community Server (v6.0+) running locally on port `27017`, or a free MongoDB Atlas cloud cluster URI.

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/aicte-fdr-management-portal.git
cd aicte-fdr-management-portal
```

### 2. Install Server Dependencies

```bash
cd server
npm install
```

### 3. Install Client Dependencies

```bash
cd ../client
npm install
```

---

## Environment Variables

Create a `.env` file inside the `server/` directory:

```bash
# In server/.env
PORT=5000
NODE_ENV=development

# MongoDB Connection String (Mandatory)
# Option A: Local MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/aicte-securedeposit

# Option B: MongoDB Atlas
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/aicte-securedeposit?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Frontend Origin for CORS
CLIENT_URL=http://localhost:5173

# Email Service (Optional: defaults to simulated mode if omitted)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=demo_user@ethereal.email
EMAIL_PASS=demo_password
```

---

## Running the Application

### 1. Seed the Database (Initial Run)

Populate demo institutions, user accounts, sample active FDRs, and lifecycle requests:

```bash
cd server
npm run seed
```

### 2. Start the Backend API Server

```bash
# In server/
npm run dev
```

The backend API will start on `http://localhost:5000`. You can verify health via `http://localhost:5000/api/health`.

### 3. Start the Frontend Application

```bash
# In client/
npm run dev
```

The Vite development server will start on `http://localhost:5173`. Open your browser and navigate to `http://localhost:5173`.

### 4. Build Frontend for Production

```bash
cd client
npm run build
```

---

## Demo Credentials

The database seed script initializes the following pre-configured user personas:

| Role | Email Address | Password | Associated Entity |
|---|---|---|---|
| **Institution** | `institution@aicte.gov.in` | `Demo@123` | Delhi Institute of Engineering & Advanced Technology (ID: `1-432890123`) |
| **AICTE Officer** | `officer@aicte.gov.in` | `Demo@123` | Regional AICTE Officer (North Zone Desk) |
| **Administrator** | `admin@aicte.gov.in` | `Demo@123` | Director & Head of Approvals, AICTE HQ |

---

## Automated Testing

The project includes focused automated integration and unit test suites:

```bash
cd server

# 1. Complete End-to-End Workflows & Security Matrix (13 tests)
node testE2EIntegration.js

# 2. Distributed Lease-Lock & Owner Token Verification (7 tests)
node testDistributedLock.js

# 3. Notification Reliability & Idempotency Keys (7 tests)
node testNotificationReliability.js

# 4. Cross-Tenant Notification Isolation (10 tests)
node testNotificationSecurity.js

# 5. Tiered Maturity Milestones & Background Scanner (11 tests)
node testPhase5.js
```

All 48 test scenarios pass against the persistent MongoDB database.

---

## UI Overview

- **Login & Registration:** Clean, modern authentication screens with dual-column layout, Indian National branding, and real-time form validation.
- **Institution Dashboard:** Deposit overview metrics, recent activity feeds, quick submission action cards, and renewal/release tracking tables.
- **FDR Submission Desk:** Structured multi-field submission form with deposit validation, document attachment, and purpose selection.
- **Officer Verification Desk:** Filterable queue of `SUBMITTED` deposits featuring simulated Core Banking System inspection modals with scenario selection.
- **Discrepancy Resolution Center:** Comprehensive side-by-side comparison tables highlighting data discrepancies between institution submissions and simulated bank records.
- **Two-Tier Approval Desk:** Dedicated recommendation workflow for regional officers and authorization ordering for AICTE administrators.
- **Executive Analytics:** High-level dashboards with capital metrics, commercial bank exposure distribution, and 12-month projected maturity timelines.
- **Notification Center:** Dropdown bell menu in the navigation bar displaying recent updates, unread counters, and one-click mark-as-read actions.

---

## Future Scope

- **Direct Open Banking API Integration:** Transition from simulation to direct integration with Reserve Bank of India (RBI) Account Aggregator frameworks or scheduled commercial bank open banking APIs.
- **DigiLocker Verification:** Integrate DigiLocker APIs for direct verification of institutional registration certificates and nodal officer identity documents.
- **Automated SMS & WhatsApp Alerts:** Extend the notification layer to include statutory SMS gateways and WhatsApp Business APIs for time-sensitive maturity alerts.
- **Blockchain-Backed Audit Ledger:** Mirror audit logs to a permissioned blockchain ledger for immutable, tamper-proof governance compliance.
- **Automated Settlement Gateway:** Direct integration with Public Financial Management System (PFMS) for automated processing of authorized deposit refunds.

---

## License

This project is licensed under the [MIT License](LICENSE).
