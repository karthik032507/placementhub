# PlacementHub – College Placement Management Portal

A MERN-style web application for a college placement cell. Students browse companies and apply with a resume, administrators manage companies and applicants, and super admins manage administrator accounts.

The code is intentionally simple: **Routes → Middleware → Controllers → Models** on the backend, and **React + React Router + Axios + plain CSS** on the frontend. Every important decision is explained in this file and in short comments in the code.

---

## Features

**Students**
- Register with a college email (`@iiits.in` only) and log in
- Browse companies as cards, search by company or role, filter open/closed
- View company details and apply with a PDF resume (confirmed with the account password)
- Track all applications, withdraw while the status is still *Applied*
- Receive notifications (new company, status changes, company updates) with unread badge, dropdown and full page
- Update profile (name, roll number, branch, CGPA)

**Admins**
- Create, edit and close companies (closing keeps all history)
- View applicants per company with **search** (name / roll number / email), **filters** (branch, status) and **sorting** (CGPA, application date), all executed by the backend
- Download applicant resumes
- Change an application status one student at a time (Applied → Shortlisted → Selected, or → Rejected); the student is notified automatically
- Send a company-specific update to *active* applicants only

**Super Admins** – everything an Admin can do, plus:
- List, create and deactivate Admin / Super Admin accounts
- Cannot deactivate themselves or the last active Super Admin

**Everyone**
- Light and dark mode (persisted), collapsible hover sidebar, mobile drawer navigation, consistent design system

---

## Tech stack

| Layer    | Technology                                                       |
| -------- | ---------------------------------------------------------------- |
| Frontend | React 19, React Router 7, Axios, lucide-react icons, plain CSS    |
| Backend  | Node.js, Express 5, Mongoose 9, MongoDB                          |
| Auth     | JSON Web Tokens (access token), bcrypt password hashing          |
| Uploads  | Multer (PDF only, 5 MB max, generated file names)                |
| Tests    | Node's built-in test runner + `mongodb-memory-server` (dev only) |

No sockets, Redis, Redux, GraphQL, email or payment services.

---

## Folder structure

```
Project1/
├── server/
│   ├── app.js                  # Express app: middleware + route mounting (no listen)
│   ├── server.js               # Loads .env, connects MongoDB, starts the server
│   ├── seed.js                 # Development seed data (npm run seed)
│   ├── dev-memory.js           # Run API + seed on an in-memory MongoDB (npm run dev:memory)
│   ├── config/db.js            # mongoose.connect
│   ├── models/                 # User, Company, Application, Notification
│   ├── middleware/
│   │   ├── auth.js             # Verifies JWT, loads user, sets req.user = { id, role }
│   │   ├── requireRole.js      # requireRole("ADMIN", "SUPER_ADMIN")
│   │   ├── upload.js           # Multer config for resumes
│   │   └── errorHandler.js     # 404 + central error → { success:false, message }
│   ├── controllers/            # One file per resource; all business rules live here
│   ├── routes/                 # URL → middleware chain → controller
│   ├── utils/                  # httpError() helper and small validators
│   ├── uploads/resumes/        # Uploaded PDFs (git-ignored)
│   └── tests/api.test.js       # End-to-end API tests (33 tests)
└── client/
    ├── vite.config.js          # Dev proxy: /api → http://localhost:5000
    └── src/
        ├── api/axios.js        # Axios instance, attaches Bearer token, handles 401
        ├── context/            # AuthContext, ThemeContext, ToastContext
        ├── hooks/useNotifications.js
        ├── components/
        │   ├── ProtectedRoute.jsx      # Frontend route guard (UI only)
        │   ├── layout/                 # AppLayout, Sidebar, TopBar, NotificationDropdown
        │   └── ui/                     # Modal, ConfirmDialog, StatusBadge, EmptyState
        ├── pages/
        │   ├── auth/                   # LoginPage, RegisterPage
        │   ├── CompaniesPage.jsx, CompanyDetailsPage.jsx, NotificationsPage.jsx, ProfilePage.jsx
        │   ├── student/                # ApplyModal, MyApplicationsPage
        │   ├── admin/                  # CompanyFormPage, ApplicantsPage, CompanyUpdatesPage, SendUpdateModal
        │   └── superadmin/AdministratorsPage.jsx
        ├── styles/                     # global.css (design tokens), layout.css, auth.css, pages.css
        └── utils/                      # format.js, download.js
```

---

## Environment variables

`server/.env` (copy from `server/.env.example`):

```
MONGO_URI=mongodb://127.0.0.1:27017/placement_portal
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

`client/.env` is optional. Leave `VITE_API_URL` empty in development so the Vite proxy is used.

Never commit `.env`.

---

## MongoDB setup

Option A – local MongoDB Community Server: install it, make sure it listens on `127.0.0.1:27017`, keep the default `MONGO_URI`.

Option B – MongoDB Atlas: create a free cluster, add your IP, create a database user and paste the connection string into `MONGO_URI`.

Option C – no MongoDB installed: `npm run dev:memory` in `server/` starts a temporary in-memory MongoDB, seeds it and runs the API. Data disappears when the process stops. This only uses the dev dependency `mongodb-memory-server`.

---

## Install and run

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # then edit JWT_SECRET / MONGO_URI
npm run seed                # creates sample users + companies (wipes the database!)
npm run dev                 # http://localhost:5000   (nodemon)

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Other scripts (in `server/`):

| Script               | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| `npm start`          | Run the API with plain `node`                            |
| `npm run seed`       | Reset and seed the configured database                   |
| `npm run dev:memory` | API + seed on an in-memory MongoDB (no install needed)   |
| `npm test`           | Run the 33 end-to-end API tests on an in-memory MongoDB  |

### Seed accounts

Password for all seeded accounts: `Password@123`

| Role        | Email                     |
| ----------- | ------------------------- |
| SUPER_ADMIN | superadmin@iiits.in       |
| ADMIN       | admin@iiits.in            |
| STUDENT     | karthikeya.m24@iiits.in   |
| STUDENT     | ananya.r22@iiits.in       |
| STUDENT     | rohit.v22@iiits.in        |

Super Admins log in through the **Admin** tab. The seed is for development only.

### Creating the first Super Admin without the seed

Run `npm run seed` once, or insert a user directly in MongoDB with `role: "SUPER_ADMIN"` and a bcrypt-hashed password. There is deliberately no public "create super admin" page.

---

## API overview

All responses have the shape `{ success, message?, data? }`. Protected routes need `Authorization: Bearer <token>`.

| Method | Route                                         | Who                  | Purpose                                                    |
| ------ | --------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| POST   | `/api/auth/register`                          | public               | Student registration (`@iiits.in` only)                    |
| POST   | `/api/auth/login`                             | public               | Login; body `{ email, password, loginAs: STUDENT\|ADMIN }` |
| GET    | `/api/auth/me`                                | any user             | Current user from the verified token                       |
| GET    | `/api/users/profile`                          | any user             | Own profile                                                |
| PUT    | `/api/users/profile`                          | any user             | Update name / rollNumber / branch / cgpa                   |
| GET    | `/api/companies`                              | any user             | List companies (+ own application status / applicant count)|
| GET    | `/api/companies/:id`                          | any user             | Company details                                            |
| POST   | `/api/companies`                              | ADMIN, SUPER_ADMIN   | Create company → NEW_COMPANY notification to students      |
| PUT    | `/api/companies/:id`                          | ADMIN, SUPER_ADMIN   | Edit company                                               |
| PATCH  | `/api/companies/:id/close`                    | ADMIN, SUPER_ADMIN   | Close company                                              |
| GET    | `/api/companies/:companyId/applications`      | ADMIN, SUPER_ADMIN   | Applicants; `?search=&branch=&status=&sortBy=cgpa\|appliedAt&order=asc\|desc` |
| POST   | `/api/companies/:companyId/notifications`     | ADMIN, SUPER_ADMIN   | Message active applicants                                  |
| POST   | `/api/applications`                           | STUDENT              | Apply: multipart `companyId`, `password`, `resume` (PDF)   |
| GET    | `/api/applications/my`                        | STUDENT              | Own applications                                           |
| PATCH  | `/api/applications/:id/withdraw`              | STUDENT (owner)      | APPLIED → WITHDRAWN                                        |
| PATCH  | `/api/applications/:id/status`                | ADMIN, SUPER_ADMIN   | Change status → notification to the student                |
| GET    | `/api/applications/:id/resume`                | owner or admins      | Download the resume PDF                                    |
| GET    | `/api/notifications`                          | any user             | Own notifications, newest first, with `unreadCount`        |
| PATCH  | `/api/notifications/:id/read`                 | owner                | Mark one as read                                           |
| PATCH  | `/api/notifications/read-all`                 | any user             | Mark all own notifications read                            |
| GET    | `/api/admin/users`                            | SUPER_ADMIN          | List administrators                                        |
| POST   | `/api/admin/users`                            | SUPER_ADMIN          | Create ADMIN or SUPER_ADMIN                                |
| PATCH  | `/api/admin/users/:id/deactivate`             | SUPER_ADMIN          | Soft-deactivate an administrator                           |

### HTTP status codes

200 success · 201 created · 400 invalid input / business rule · 401 not authenticated (missing, invalid, expired token, inactive account) · 403 authenticated but not allowed · 404 not found · 409 conflict (duplicate email or duplicate application) · 500 unexpected error (stack trace only in the server log).

---

## Roles and permissions

| Action                                        | STUDENT | ADMIN | SUPER_ADMIN |
| --------------------------------------------- | :-----: | :---: | :---------: |
| Register                                      |    ✓    |       |             |
| View companies / details                      |    ✓    |   ✓   |      ✓      |
| Apply, withdraw, view own applications        |    ✓    |       |             |
| View / mark own notifications                 |    ✓    |       |             |
| Update own profile                            |    ✓    |   ✓   |      ✓      |
| Create / edit / close companies               |         |   ✓   |      ✓      |
| View, search, filter, sort applicants         |         |   ✓   |      ✓      |
| Change application status                     |         |   ✓   |      ✓      |
| Send company-specific notifications           |         |   ✓   |      ✓      |
| List / create / deactivate administrators     |         |       |      ✓      |

There is no Super Admin login tab; Super Admins use the Admin tab. The backend reads the real role from the database on every request.

---

## Important business rules

1. Student emails must end with `@iiits.in` (validated on the backend, mirrored in the UI).
2. Passwords are at least 8 characters and stored as bcrypt hashes; the hash is never returned (`select: false` + `toSafeObject()`).
3. A student can apply to many companies but only **once per company**. Enforced by a check *and* a compound unique index `{ student: 1, company: 1 }` → 409 on a race.
4. A withdrawn application still occupies that index, so the student cannot apply again.
5. Applications are rejected by the backend when the company is CLOSED or `now >= applicationDeadline`, even if a stale page still shows *Apply Now*.
6. Applying requires a PDF resume (MIME type + extension checked, 5 MB max, generated file name) **and** the student's password re-entered. If any check fails the uploaded file is deleted.
7. The resume belongs to the application, not the student. Different companies can receive different resumes.
8. Status transitions: `APPLIED → SHORTLISTED → SELECTED`, `APPLIED/SHORTLISTED → REJECTED`, `APPLIED → WITHDRAWN` (student only). Anything else is 400.
9. Every admin status change stores an APPLICATION_STATUS notification for that student.
10. Creating a company stores a NEW_COMPANY notification for every active student.
11. Company updates go only to APPLIED / SHORTLISTED / SELECTED applicants. With no active applicants the API returns `sent: 0` and says so.
12. Notifications are plain MongoDB documents fetched over REST; there is no real-time layer.
13. Companies are closed, never deleted; applications, resumes, statuses and notifications stay intact.
14. Administrators are deactivated (`isActive: false`), never deleted; they cannot log in and existing tokens stop working on the next request.
15. A Super Admin cannot deactivate themselves, and the last active Super Admin cannot be deactivated.
16. No eligibility or placement-policy engine: eligibility text is informational; students can apply to many companies even after being selected elsewhere.

---

## Architecture explanation

### Request flow

```
Browser (React) ── Axios (adds Authorization: Bearer <jwt>) ──▶ Express
   Route  →  auth (who?)  →  requireRole (allowed?)  →  [multer]  →  Controller  →  Mongoose model
                                                                       │
                                                       throw httpError(status, message)
                                                                       ▼
                                                  errorHandler → { success:false, message }
```

- **Authentication** (`middleware/auth.js`): reads the Bearer token, verifies it with `JWT_SECRET`, then loads the user from MongoDB to make sure the account is still active and to take the role from the database, not the token. Sets `req.user = { id, role }`.
- **Authorization** (`middleware/requireRole.js`): a tiny factory that returns 403 when `req.user.role` is not in the allowed list. Ownership checks (own application, own notification) are done in the controllers by comparing IDs with `req.user.id`.
- **Never trust the client**: the applicant is always `req.user.id`; `role` and `isActive` in a profile update body are ignored; sort fields and status filters are validated against allow-lists.
- **Express 5** forwards rejected promises to the error middleware, so controllers simply `throw httpError(404, "...")`. The error handler also maps Mongoose `CastError` → 400, duplicate key `11000` → 409, `ValidationError` → 400, Multer errors → 400 and hides stack traces.

### Database design

```
User (STUDENT | ADMIN | SUPER_ADMIN)
  │ 1..n                              Company (OPEN | CLOSED, createdBy → User)
  ▼                                      ▲ 1..n
Application { student → User, company → Company, resume{...}, status }
              unique index (student, company)
Notification { user → User, company → Company?, type, title, message, isRead }
```

Application is a separate collection instead of an array inside Company so it can be queried, indexed and paginated independently, and so the compound unique index can enforce "one application per student per company". `populate()` joins the referenced documents when the API needs student or company details.

### Frontend

- `AuthContext` keeps the current user; on load it calls `/auth/me` to validate the saved token (stored in `localStorage` for this educational project).
- `ProtectedRoute` redirects by authentication state and role. This is only for navigation; the backend enforces everything again.
- `ThemeContext` sets `data-theme` on `<html>`; every colour in the CSS is a variable defined per theme, so dark mode is a designed palette rather than an inversion.
- `useNotifications` is created once in `AppLayout` and shared with the bell, the dropdown and the Notifications page via the router outlet context. It refetches on load, when the bell opens and after actions.
- Search / filter / sort on the applicants page are sent as query parameters; the company list search is done client-side because the list is already loaded.

---

## Testing

```bash
cd server && npm test
```

`tests/api.test.js` boots the Express app on a random port with an in-memory MongoDB and walks through the whole checklist: registration rules, login (wrong password, wrong tab, inactive account, forged token), profile limits, super-admin management (self / last-super-admin protection), company CRUD and authorization, applying (PDF only, size limit, wrong password, duplicates, deadline, closed company), withdrawal rules, status transitions with notifications, applicant search / filter / sort validation, company updates reaching only active applicants, and notification ownership.

---

## Interview talking points

- Why JWT + bcrypt, and why the role comes from the DB on every request
- Authentication vs authorization middleware
- Compound unique index vs "check then insert"
- Multer disk storage, MIME + extension validation, deleting orphan files
- Why Application is its own collection (many-to-many through a join collection)
- Status lifecycle and where transitions are enforced
- REST design, consistent JSON envelope, HTTP status codes
- Centralized error handling in Express 5
- Query-parameter validation with allow-lists (no arbitrary sort fields)
- CSS variables for theming, React context for auth/theme/toasts, route guards as UX only
