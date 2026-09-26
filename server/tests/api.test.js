// End-to-end API tests using Node's built-in test runner and an in-memory MongoDB.
// Run with:  npm test
// No real MongoDB is needed; mongodb-memory-server starts a temporary one.
const { test, before, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

process.env.JWT_SECRET = "test_secret";
process.env.NODE_ENV = "test";

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/User");
const StoredFile = require("../models/StoredFile");

let mongod;
let server;
let baseUrl;

// ---------- tiny HTTP helper ----------
async function api(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(baseUrl + url, { method, headers, body: payload });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  return { status: response.status, body: data };
}

function pdfForm(fields, { name = "resume.pdf", type = "application/pdf", size = 1024 } = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  form.append("resume", new Blob([Buffer.alloc(size, "%PDF-1.4 test")], { type }), name);
  return form;
}

async function login(email, password, loginAs) {
  const res = await api("POST", "/api/auth/login", { body: { email, password, loginAs } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.data;
}

const PASSWORD = "Password@123";
const tokens = {};
const ids = {};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Seed one Super Admin the same way a real deployment would (directly in the DB).
  const superAdmin = await User.create({ name: "Root", email: "root@iiits.in", password: PASSWORD, role: "SUPER_ADMIN" });
  ids.superAdmin = superAdmin._id.toString();

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

describe("Authentication", () => {
  test("register rejects non-college email", async () => {
    const res = await api("POST", "/api/auth/register", { body: { name: "X", email: "x@gmail.com", password: PASSWORD, confirmPassword: PASSWORD } });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /@iiits\.in/);
  });

  test("register rejects weak password and mismatched confirmation", async () => {
    let res = await api("POST", "/api/auth/register", { body: { name: "X", email: "x@iiits.in", password: "short", confirmPassword: "short" } });
    assert.equal(res.status, 400);
    res = await api("POST", "/api/auth/register", { body: { name: "X", email: "x@iiits.in", password: PASSWORD, confirmPassword: "Different@123" } });
    assert.equal(res.status, 400);
    res = await api("POST", "/api/auth/register", { body: { email: "x@iiits.in" } });
    assert.equal(res.status, 400);
  });

  test("student can register; password never returned; duplicate -> 409", async () => {
    const res = await api("POST", "/api/auth/register", { body: { name: "Karthikeya", email: "Karthikeya.m24@iiits.in", password: PASSWORD, confirmPassword: PASSWORD } });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.role, "STUDENT");
    assert.equal(res.body.data.user.email, "karthikeya.m24@iiits.in");
    assert.equal(res.body.data.user.password, undefined);
    tokens.student1 = res.body.data.token;
    ids.student1 = res.body.data.user.id;

    const dup = await api("POST", "/api/auth/register", { body: { name: "Again", email: "karthikeya.m24@iiits.in", password: PASSWORD, confirmPassword: PASSWORD } });
    assert.equal(dup.status, 409);

    const second = await api("POST", "/api/auth/register", { body: { name: "Ananya", email: "ananya@iiits.in", password: PASSWORD, confirmPassword: PASSWORD } });
    tokens.student2 = second.body.data.token;
    ids.student2 = second.body.data.user.id;
  });

  test("login: wrong password / wrong email -> 401, wrong tab -> 403", async () => {
    let res = await api("POST", "/api/auth/login", { body: { email: "karthikeya.m24@iiits.in", password: "wrong", loginAs: "STUDENT" } });
    assert.equal(res.status, 401);
    res = await api("POST", "/api/auth/login", { body: { email: "nobody@iiits.in", password: PASSWORD, loginAs: "STUDENT" } });
    assert.equal(res.status, 401);
    res = await api("POST", "/api/auth/login", { body: { email: "root@iiits.in", password: PASSWORD, loginAs: "STUDENT" } });
    assert.equal(res.status, 403);
  });

  test("super admin logs in through the Admin tab", async () => {
    const data = await login("root@iiits.in", PASSWORD, "ADMIN");
    assert.equal(data.user.role, "SUPER_ADMIN");
    tokens.superAdmin = data.token;
  });

  test("JWT: missing / invalid token -> 401", async () => {
    let res = await api("GET", "/api/auth/me");
    assert.equal(res.status, 401);
    res = await api("GET", "/api/auth/me", { token: "not.a.token" });
    assert.equal(res.status, 401);
    res = await api("GET", "/api/auth/me", { token: tokens.student1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.id, ids.student1);
  });

  test("a forged token with a different secret is rejected", async () => {
    const jwt = require("jsonwebtoken");
    const forged = jwt.sign({ userId: ids.student1, role: "SUPER_ADMIN" }, "other_secret");
    const res = await api("GET", "/api/admin/users", { token: forged });
    assert.equal(res.status, 401);
  });
});

describe("Profile", () => {
  test("student updates profile but cannot change role", async () => {
    const res = await api("PUT", "/api/users/profile", { token: tokens.student1, body: { rollNumber: "S20220010101", branch: "CSE", cgpa: 8.6, role: "SUPER_ADMIN", isActive: false } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.cgpa, 8.6);
    assert.equal(res.body.data.user.role, "STUDENT");
    assert.equal(res.body.data.user.isActive, true);

    await api("PUT", "/api/users/profile", { token: tokens.student2, body: { rollNumber: "S20220010102", branch: "ECE", cgpa: 9.1 } });

    const bad = await api("PUT", "/api/users/profile", { token: tokens.student1, body: { cgpa: 11 } });
    assert.equal(bad.status, 400);
  });
});

describe("Super Admin management", () => {
  test("student and admin cannot access admin management (403)", async () => {
    const res = await api("GET", "/api/admin/users", { token: tokens.student1 });
    assert.equal(res.status, 403);
  });

  test("super admin creates an ADMIN and another SUPER_ADMIN; invalid role & duplicate rejected", async () => {
    let res = await api("POST", "/api/admin/users", { token: tokens.superAdmin, body: { name: "Coordinator", email: "admin@iiits.in", password: PASSWORD, role: "ADMIN" } });
    assert.equal(res.status, 201);
    ids.admin = res.body.data.user.id;
    assert.equal(res.body.data.user.password, undefined);

    res = await api("POST", "/api/admin/users", { token: tokens.superAdmin, body: { name: "Second Root", email: "root2@iiits.in", password: PASSWORD, role: "SUPER_ADMIN" } });
    assert.equal(res.status, 201);
    ids.superAdmin2 = res.body.data.user.id;

    res = await api("POST", "/api/admin/users", { token: tokens.superAdmin, body: { name: "Bad", email: "bad@iiits.in", password: PASSWORD, role: "STUDENT" } });
    assert.equal(res.status, 400);

    res = await api("POST", "/api/admin/users", { token: tokens.superAdmin, body: { name: "Dup", email: "admin@iiits.in", password: PASSWORD, role: "ADMIN" } });
    assert.equal(res.status, 409);

    tokens.admin = (await login("admin@iiits.in", PASSWORD, "ADMIN")).token;
    const forbidden = await api("GET", "/api/admin/users", { token: tokens.admin });
    assert.equal(forbidden.status, 403);

    const list = await api("GET", "/api/admin/users", { token: tokens.superAdmin });
    assert.equal(list.status, 200);
    assert.equal(list.body.data.administrators.length, 3);
  });

  test("self-deactivation prevented; deactivation works; deactivated admin cannot log in", async () => {
    let res = await api("PATCH", `/api/admin/users/${ids.superAdmin}/deactivate`, { token: tokens.superAdmin });
    assert.equal(res.status, 400);

    // deactivate the second super admin (still leaves one active)
    res = await api("PATCH", `/api/admin/users/${ids.superAdmin2}/deactivate`, { token: tokens.superAdmin });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.isActive, false);

    const loginRes = await api("POST", "/api/auth/login", { body: { email: "root2@iiits.in", password: PASSWORD, loginAs: "ADMIN" } });
    assert.equal(loginRes.status, 401);
    assert.match(loginRes.body.message, /deactivated/i);

    // last active super admin cannot be deactivated (even by another super admin)
    const superAdmin2 = await User.findById(ids.superAdmin2);
    superAdmin2.isActive = true;
    await superAdmin2.save();
    const token2 = (await login("root2@iiits.in", PASSWORD, "ADMIN")).token;
    superAdmin2.isActive = false;
    await superAdmin2.save(); // now root is the only active super admin again
    res = await api("PATCH", `/api/admin/users/${ids.superAdmin}/deactivate`, { token: token2 });
    assert.equal(res.status, 401, "deactivated super admin token must stop working immediately");

    // Activate root2 and try to deactivate root when root2 is active: allowed (2 active). Then the reverse should fail.
    superAdmin2.isActive = true;
    await superAdmin2.save();
    res = await api("PATCH", `/api/admin/users/${ids.superAdmin}/deactivate`, { token: token2 });
    assert.equal(res.status, 200);
    res = await api("PATCH", `/api/admin/users/${ids.superAdmin2}/deactivate`, { token: tokens.superAdmin });
    assert.equal(res.status, 401, "deactivated root token is rejected");
    // Restore root (root2 is the only active one -> cannot be deactivated)
    const root = await User.findById(ids.superAdmin);
    root.isActive = true;
    await root.save();
    superAdmin2.isActive = false;
    await superAdmin2.save();
    res = await api("PATCH", `/api/admin/users/${ids.superAdmin}/deactivate`, { token: tokens.superAdmin });
    assert.equal(res.status, 400, "self deactivation");
    // Only one active super admin remains -> another super admin trying would be blocked by the last-active rule:
    const onlyOne = await User.countDocuments({ role: "SUPER_ADMIN", isActive: true });
    assert.equal(onlyOne, 1);
  });

  test("nonexistent administrator -> 404, invalid id -> 400", async () => {
    let res = await api("PATCH", `/api/admin/users/${new mongoose.Types.ObjectId()}/deactivate`, { token: tokens.superAdmin });
    assert.equal(res.status, 404);
    res = await api("PATCH", `/api/admin/users/abc/deactivate`, { token: tokens.superAdmin });
    assert.equal(res.status, 400);
  });
});

describe("Companies", () => {
  const future = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const companyBody = {
    name: "Microsoft",
    description: "Hiring SDEs",
    jobRole: "Software Development Engineer",
    package: "50 LPA",
    location: "Hyderabad",
    workMode: "HYBRID",
    applicationDeadline: future,
    companyWebsite: "https://careers.microsoft.com",
  };

  test("student cannot create a company (403); missing fields & past deadline -> 400", async () => {
    let res = await api("POST", "/api/companies", { token: tokens.student1, body: companyBody });
    assert.equal(res.status, 403);
    res = await api("POST", "/api/companies", { token: tokens.admin, body: { name: "Incomplete" } });
    assert.equal(res.status, 400);
    res = await api("POST", "/api/companies", { token: tokens.admin, body: { ...companyBody, applicationDeadline: "2020-01-01" } });
    assert.equal(res.status, 400);
    res = await api("POST", "/api/companies", { token: tokens.admin, body: { ...companyBody, workMode: "MOON" } });
    assert.equal(res.status, 400);
  });

  test("admin and super admin create companies; students get NEW_COMPANY notifications", async () => {
    let res = await api("POST", "/api/companies", { token: tokens.admin, body: companyBody });
    assert.equal(res.status, 201);
    ids.microsoft = res.body.data.company._id;

    res = await api("POST", "/api/companies", { token: tokens.superAdmin, body: { ...companyBody, name: "Amazon", jobRole: "SDE-1" } });
    assert.equal(res.status, 201);
    ids.amazon = res.body.data.company._id;

    res = await api("POST", "/api/companies", { token: tokens.superAdmin, body: { ...companyBody, name: "Deloitte", jobRole: "Analyst" } });
    ids.deloitte = res.body.data.company._id;

    const notifications = await api("GET", "/api/notifications", { token: tokens.student1 });
    assert.equal(notifications.status, 200);
    assert.equal(notifications.body.data.unreadCount, 3);
    assert.equal(notifications.body.data.notifications[0].type, "NEW_COMPANY");
  });

  test("students view companies and details; unknown -> 404; invalid id -> 400", async () => {
    let res = await api("GET", "/api/companies", { token: tokens.student1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.companies.length, 3);
    assert.equal(res.body.data.companies[0].myApplicationStatus, null);

    res = await api("GET", `/api/companies/${ids.microsoft}`, { token: tokens.student1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.company.name, "Microsoft");
    assert.equal(res.body.data.company.myApplication, null);

    res = await api("GET", `/api/companies/${new mongoose.Types.ObjectId()}`, { token: tokens.student1 });
    assert.equal(res.status, 404);
    res = await api("GET", `/api/companies/not-an-id`, { token: tokens.student1 });
    assert.equal(res.status, 400);
  });

  test("admin edits a company; student cannot; editing nonexistent -> 404", async () => {
    let res = await api("PUT", `/api/companies/${ids.microsoft}`, { token: tokens.admin, body: { package: "52 LPA" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.company.package, "52 LPA");
    res = await api("PUT", `/api/companies/${ids.microsoft}`, { token: tokens.student1, body: { package: "1 LPA" } });
    assert.equal(res.status, 403);
    res = await api("PUT", `/api/companies/${new mongoose.Types.ObjectId()}`, { token: tokens.admin, body: { package: "1 LPA" } });
    assert.equal(res.status, 404);
  });
});

describe("Applications", () => {
  test("student applies with a PDF resume and correct password", async () => {
    const res = await api("POST", "/api/applications", { token: tokens.student1, form: pdfForm({ companyId: ids.microsoft, password: PASSWORD }, { name: "Karthikeya_Resume.pdf" }) });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ids.app1 = res.body.data.application._id;
    assert.equal(res.body.data.application.status, "APPLIED");
    assert.equal(res.body.data.application.student, ids.student1);
    assert.ok(res.body.data.application.resume.file, "the application references a stored file");
    assert.equal(await StoredFile.countDocuments({ _id: res.body.data.application.resume.file }), 1);
  });

  test("duplicate application -> 409, and no orphan file is stored", async () => {
    const before = await StoredFile.countDocuments();
    const res = await api("POST", "/api/applications", { token: tokens.student1, form: pdfForm({ companyId: ids.microsoft, password: PASSWORD }) });
    assert.equal(res.status, 409);
    assert.equal(await StoredFile.countDocuments(), before, "a rejected upload must not be stored");
  });

  test("wrong confirmation password -> 400; missing resume -> 400; non-PDF -> 400; oversized -> 400", async () => {
    let res = await api("POST", "/api/applications", { token: tokens.student1, form: pdfForm({ companyId: ids.amazon, password: "wrong" }) });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /password/i);

    const noFile = new FormData();
    noFile.append("companyId", ids.amazon);
    noFile.append("password", PASSWORD);
    res = await api("POST", "/api/applications", { token: tokens.student1, form: noFile });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /resume/i);

    res = await api("POST", "/api/applications", { token: tokens.student1, form: pdfForm({ companyId: ids.amazon, password: PASSWORD }, { name: "virus.exe", type: "application/octet-stream" }) });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /PDF/);

    res = await api("POST", "/api/applications", { token: tokens.student1, form: pdfForm({ companyId: ids.amazon, password: PASSWORD }, { size: 6 * 1024 * 1024 }) });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /5 MB/);
  });

  test("admin cannot apply (403); nonexistent company -> 404", async () => {
    let res = await api("POST", "/api/applications", { token: tokens.admin, form: pdfForm({ companyId: ids.amazon, password: PASSWORD }) });
    assert.equal(res.status, 403);
    res = await api("POST", "/api/applications", { token: tokens.student1, form: pdfForm({ companyId: new mongoose.Types.ObjectId().toString(), password: PASSWORD }) });
    assert.equal(res.status, 404);
  });

  test("closed company and past deadline reject applications", async () => {
    let res = await api("PATCH", `/api/companies/${ids.deloitte}/close`, { token: tokens.admin });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.company.status, "CLOSED");
    res = await api("PATCH", `/api/companies/${ids.deloitte}/close`, { token: tokens.student1 });
    assert.equal(res.status, 403);

    res = await api("POST", "/api/applications", { token: tokens.student1, form: pdfForm({ companyId: ids.deloitte, password: PASSWORD }) });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /no longer accepting/);

    // Past deadline but still OPEN
    const Company = require("../models/Company");
    await Company.findByIdAndUpdate(ids.amazon, { applicationDeadline: new Date(Date.now() - 1000) });
    res = await api("POST", "/api/applications", { token: tokens.student2, form: pdfForm({ companyId: ids.amazon, password: PASSWORD }) });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /deadline/);
    await Company.findByIdAndUpdate(ids.amazon, { applicationDeadline: new Date(Date.now() + 86400000) });
  });

  test("second student applies to Microsoft and Amazon with different resumes", async () => {
    let res = await api("POST", "/api/applications", { token: tokens.student2, form: pdfForm({ companyId: ids.microsoft, password: PASSWORD }, { name: "ananya_ms.pdf" }) });
    assert.equal(res.status, 201);
    ids.app2 = res.body.data.application._id;
    res = await api("POST", "/api/applications", { token: tokens.student2, form: pdfForm({ companyId: ids.amazon, password: PASSWORD }, { name: "ananya_amazon.pdf" }) });
    assert.equal(res.status, 201);
    ids.app3 = res.body.data.application._id;
    // Each application holds its own stored copy, so the two never share a file id.
    const mine = (await api("GET", "/api/applications/my", { token: tokens.student2 })).body.data.applications;
    assert.notEqual(mine[0].resume.file, mine[1].resume.file);
    assert.ok(mine[0].resume.file && mine[1].resume.file);
  });

  test("GET /my returns only own applications; company list shows myApplicationStatus", async () => {
    let res = await api("GET", "/api/applications/my", { token: tokens.student1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.applications.length, 1);
    assert.equal(res.body.data.applications[0].company.name, "Microsoft");

    res = await api("GET", "/api/applications/my", { token: tokens.admin });
    assert.equal(res.status, 403);

    res = await api("GET", "/api/companies", { token: tokens.student1 });
    const ms = res.body.data.companies.find((c) => c._id === ids.microsoft);
    assert.equal(ms.myApplicationStatus, "APPLIED");
  });

  test("resume download: owner and admin allowed, other student forbidden", async () => {
    let res = await api("GET", `/api/applications/${ids.app1}/resume`, { token: tokens.student1 });
    assert.equal(res.status, 200);
    res = await api("GET", `/api/applications/${ids.app1}/resume`, { token: tokens.admin });
    assert.equal(res.status, 200);
    res = await api("GET", `/api/applications/${ids.app1}/resume`, { token: tokens.student2 });
    assert.equal(res.status, 403);
  });

  test("student cannot withdraw another student's application (403)", async () => {
    const res = await api("PATCH", `/api/applications/${ids.app2}/withdraw`, { token: tokens.student1 });
    assert.equal(res.status, 403);
  });

  test("student cannot change status; admin status transitions create notifications", async () => {
    let res = await api("PATCH", `/api/applications/${ids.app1}/status`, { token: tokens.student1, body: { status: "SELECTED" } });
    assert.equal(res.status, 403);

    res = await api("PATCH", `/api/applications/${ids.app1}/status`, { token: tokens.admin, body: { status: "SELECTED" } });
    assert.equal(res.status, 400, "APPLIED -> SELECTED must go through SHORTLISTED");

    res = await api("PATCH", `/api/applications/${ids.app1}/status`, { token: tokens.admin, body: { status: "SHORTLISTED" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.application.status, "SHORTLISTED");

    let notes = await api("GET", "/api/notifications", { token: tokens.student1 });
    assert.equal(notes.body.data.notifications[0].type, "APPLICATION_STATUS");
    assert.match(notes.body.data.notifications[0].message, /shortlisted for Microsoft/);

    res = await api("PATCH", `/api/applications/${ids.app1}/status`, { token: tokens.superAdmin, body: { status: "SELECTED" } });
    assert.equal(res.status, 200);
    notes = await api("GET", "/api/notifications", { token: tokens.student1 });
    assert.match(notes.body.data.notifications[0].message, /Congratulations/);

    res = await api("PATCH", `/api/applications/${ids.app1}/status`, { token: tokens.admin, body: { status: "WITHDRAWN" } });
    assert.equal(res.status, 400);
    res = await api("PATCH", `/api/applications/${ids.app1}/status`, { token: tokens.admin, body: { status: "BOGUS" } });
    assert.equal(res.status, 400);
    res = await api("PATCH", `/api/applications/${new mongoose.Types.ObjectId()}/status`, { token: tokens.admin, body: { status: "SHORTLISTED" } });
    assert.equal(res.status, 404);
  });

  test("withdraw rules: not after SELECTED; allowed while APPLIED; cannot re-apply after withdrawal", async () => {
    let res = await api("PATCH", `/api/applications/${ids.app1}/withdraw`, { token: tokens.student1 });
    assert.equal(res.status, 400);

    res = await api("PATCH", `/api/applications/${ids.app3}/withdraw`, { token: tokens.student2 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.application.status, "WITHDRAWN");

    res = await api("POST", "/api/applications", { token: tokens.student2, form: pdfForm({ companyId: ids.amazon, password: PASSWORD }) });
    assert.equal(res.status, 409);
  });

  test("rejection notification", async () => {
    const res = await api("PATCH", `/api/applications/${ids.app2}/status`, { token: tokens.admin, body: { status: "REJECTED" } });
    assert.equal(res.status, 200);
    const notes = await api("GET", "/api/notifications", { token: tokens.student2 });
    assert.match(notes.body.data.notifications[0].message, /not shortlisted/);
  });
});

describe("Applicants view (admin)", () => {
  test("student forbidden; admin sees applicants with student fields and no password", async () => {
    let res = await api("GET", `/api/companies/${ids.microsoft}/applications`, { token: tokens.student1 });
    assert.equal(res.status, 403);

    res = await api("GET", `/api/companies/${ids.microsoft}/applications`, { token: tokens.admin });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total, 2);
    const applicant = res.body.data.applications[0];
    assert.ok(applicant.student.name && applicant.student.email && applicant.student.rollNumber);
    assert.equal(applicant.student.password, undefined);
    assert.ok(applicant.resume.originalName);
  });

  test("search by name/roll/email, filter by branch/status, sort by cgpa", async () => {
    let res = await api("GET", `/api/companies/${ids.microsoft}/applications?search=karthik`, { token: tokens.admin });
    assert.equal(res.body.data.total, 1);
    assert.equal(res.body.data.applications[0].student.name, "Karthikeya");

    res = await api("GET", `/api/companies/${ids.microsoft}/applications?search=S20220010102`, { token: tokens.admin });
    assert.equal(res.body.data.applications[0].student.name, "Ananya");

    res = await api("GET", `/api/companies/${ids.microsoft}/applications?branch=ECE`, { token: tokens.admin });
    assert.equal(res.body.data.total, 1);

    res = await api("GET", `/api/companies/${ids.microsoft}/applications?status=SELECTED`, { token: tokens.admin });
    assert.equal(res.body.data.total, 1);
    assert.equal(res.body.data.applications[0].status, "SELECTED");

    res = await api("GET", `/api/companies/${ids.microsoft}/applications?sortBy=cgpa&order=desc`, { token: tokens.admin });
    assert.equal(res.body.data.applications[0].student.cgpa, 9.1);
    res = await api("GET", `/api/companies/${ids.microsoft}/applications?sortBy=cgpa&order=asc`, { token: tokens.admin });
    assert.equal(res.body.data.applications[0].student.cgpa, 8.6);

    res = await api("GET", `/api/companies/${ids.microsoft}/applications?sortBy=password`, { token: tokens.admin });
    assert.equal(res.status, 400);
    res = await api("GET", `/api/companies/${ids.microsoft}/applications?status=NOPE`, { token: tokens.admin });
    assert.equal(res.status, 400);
    res = await api("GET", `/api/companies/${new mongoose.Types.ObjectId()}/applications`, { token: tokens.admin });
    assert.equal(res.status, 404);
  });
});

describe("Notifications", () => {
  test("company update goes only to active applicants (not REJECTED / WITHDRAWN)", async () => {
    // Microsoft: student1 = SELECTED (active), student2 = REJECTED (inactive)
    const before1 = (await api("GET", "/api/notifications", { token: tokens.student1 })).body.data.notifications.length;
    const before2 = (await api("GET", "/api/notifications", { token: tokens.student2 })).body.data.notifications.length;

    let res = await api("POST", `/api/companies/${ids.microsoft}/notifications`, { token: tokens.admin, body: { message: "Interviews moved to Sept 20, 10 AM." } });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.sent, 1);

    const after1 = (await api("GET", "/api/notifications", { token: tokens.student1 })).body.data;
    const after2 = (await api("GET", "/api/notifications", { token: tokens.student2 })).body.data;
    assert.equal(after1.notifications.length, before1 + 1);
    assert.equal(after1.notifications[0].type, "COMPANY_UPDATE");
    assert.equal(after2.notifications.length, before2);

    // Amazon: only applicant withdrew -> no active applicants
    res = await api("POST", `/api/companies/${ids.amazon}/notifications`, { token: tokens.admin, body: { message: "Hello" } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.sent, 0);
    assert.match(res.body.message, /No active applicants/);

    res = await api("POST", `/api/companies/${ids.amazon}/notifications`, { token: tokens.admin, body: { message: "   " } });
    assert.equal(res.status, 400);
    res = await api("POST", `/api/companies/${ids.amazon}/notifications`, { token: tokens.student1, body: { message: "x" } });
    assert.equal(res.status, 403);
    res = await api("POST", `/api/companies/${new mongoose.Types.ObjectId()}/notifications`, { token: tokens.admin, body: { message: "x" } });
    assert.equal(res.status, 404);
  });

  test("mark as read: ownership enforced; read-all works", async () => {
    const mine = (await api("GET", "/api/notifications", { token: tokens.student1 })).body.data.notifications;
    const theirs = (await api("GET", "/api/notifications", { token: tokens.student2 })).body.data.notifications;

    let res = await api("PATCH", `/api/notifications/${theirs[0]._id}/read`, { token: tokens.student1 });
    assert.equal(res.status, 403);

    res = await api("PATCH", `/api/notifications/${mine[0]._id}/read`, { token: tokens.student1 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.notification.isRead, true);

    res = await api("PATCH", `/api/notifications/${new mongoose.Types.ObjectId()}/read`, { token: tokens.student1 });
    assert.equal(res.status, 404);

    res = await api("PATCH", `/api/notifications/read-all`, { token: tokens.student1 });
    assert.equal(res.status, 200);
    const after = (await api("GET", "/api/notifications", { token: tokens.student1 })).body.data;
    assert.equal(after.unreadCount, 0);
  });
});

describe("Misc", () => {
  test("unknown route -> 404 JSON", async () => {
    const res = await api("GET", "/api/does-not-exist");
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});

describe("Saved resumes and job description PDFs", () => {
  test("student saves resumes in profile (cap 5), downloads and deletes them", async () => {
    const form1 = pdfForm({ label: "General" }, { name: "general.pdf" });
    let res = await api("POST", "/api/users/resumes", { token: tokens.student1, form: form1 });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.user.resumes.length, 1);
    assert.equal(res.body.data.user.resumes[0].label, "General");
    assert.equal(res.body.data.user.resumes[0].file, undefined, "internal file ids must not leak to the client");
    ids.savedResume = res.body.data.user.resumes[0].id;

    for (let i = 2; i <= 5; i++) {
      res = await api("POST", "/api/users/resumes", { token: tokens.student1, form: pdfForm({}, { name: `r${i}.pdf` }) });
      assert.equal(res.status, 201);
    }
    assert.equal(res.body.data.user.resumes.length, 5);
    assert.equal(res.body.data.user.resumes[4].label, "r5", "label defaults to file name");

    res = await api("POST", "/api/users/resumes", { token: tokens.student1, form: pdfForm({}, { name: "r6.pdf" }) });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /up to 5/);

    res = await api("POST", "/api/users/resumes", { token: tokens.student1, form: pdfForm({}, { name: "x.exe", type: "application/octet-stream" }) });
    assert.equal(res.status, 400);

    res = await api("POST", "/api/users/resumes", { token: tokens.admin, form: pdfForm({}) });
    assert.equal(res.status, 403);

    res = await api("GET", `/api/users/resumes/${ids.savedResume}/download`, { token: tokens.student1 });
    assert.equal(res.status, 200);
    res = await api("GET", `/api/users/resumes/${ids.savedResume}/download`, { token: tokens.student2 });
    assert.equal(res.status, 404, "another student cannot see it");

    const profile = await api("GET", "/api/users/profile", { token: tokens.student1 });
    const toDelete = profile.body.data.user.resumes.slice(1, 4).map((r) => r.id);
    for (const id of toDelete) {
      res = await api("DELETE", `/api/users/resumes/${id}`, { token: tokens.student1 });
      assert.equal(res.status, 200);
    }
    assert.equal(res.body.data.user.resumes.length, 2);
    res = await api("DELETE", `/api/users/resumes/${new mongoose.Types.ObjectId()}`, { token: tokens.student1 });
    assert.equal(res.status, 404);
  });

  test("apply with a saved resume copies the file; deleting the saved resume keeps the application's copy", async () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString();
    let res = await api("POST", "/api/companies", { token: tokens.admin, body: { name: "Google", description: "Hiring", jobRole: "SWE", package: "60 LPA", location: "Bangalore", workMode: "ON_SITE", applicationDeadline: future } });
    ids.google = res.body.data.company._id;

    const form = new FormData();
    form.append("companyId", ids.google);
    form.append("password", PASSWORD);
    form.append("resumeId", ids.savedResume);
    res = await api("POST", "/api/applications", { token: tokens.student1, form });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    ids.appGoogle = res.body.data.application._id;
    assert.equal(res.body.data.application.resume.originalName, "general.pdf");

    res = await api("DELETE", `/api/users/resumes/${ids.savedResume}`, { token: tokens.student1 });
    assert.equal(res.status, 200);
    res = await api("GET", `/api/applications/${ids.appGoogle}/resume`, { token: tokens.student1 });
    assert.equal(res.status, 200, "application keeps its own copy");

    const bad = new FormData();
    bad.append("companyId", ids.google);
    bad.append("password", PASSWORD);
    bad.append("resumeId", new mongoose.Types.ObjectId().toString());
    res = await api("POST", "/api/applications", { token: tokens.student2, form: bad });
    assert.equal(res.status, 404);
  });

  test("uploading a new resume while applying can also save it to the profile", async () => {
    const before = (await api("GET", "/api/users/profile", { token: tokens.student2 })).body.data.user.resumes.length;
    const res = await api("POST", "/api/applications", { token: tokens.student2, form: pdfForm({ companyId: ids.google, password: PASSWORD, saveToProfile: "true" }, { name: "ananya_google.pdf" }) });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.savedToProfile, true);
    const after = (await api("GET", "/api/users/profile", { token: tokens.student2 })).body.data.user.resumes;
    assert.equal(after.length, before + 1);
    assert.equal(after[after.length - 1].label, "ananya_google");
  });

  test("admin uploads, replaces, downloads and removes a job description PDF", async () => {
    function jdForm(name) {
      const f = new FormData();
      f.append("file", new Blob([Buffer.alloc(2048, "%PDF-1.4 jd")], { type: "application/pdf" }), name);
      return f;
    }
    let res = await api("POST", `/api/companies/${ids.google}/job-description`, { token: tokens.student1, form: jdForm("jd.pdf") });
    assert.equal(res.status, 403);

    res = await api("POST", `/api/companies/${ids.google}/job-description`, { token: tokens.admin, form: jdForm("jd-v1.pdf") });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.company.jobDescriptionFile.originalName, "jd-v1.pdf");
    const firstFileId = res.body.data.company.jobDescriptionFile.file;

    res = await api("POST", `/api/companies/${ids.google}/job-description`, { token: tokens.superAdmin, form: jdForm("jd-v2.pdf") });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.company.jobDescriptionFile.originalName, "jd-v2.pdf");
    assert.equal(await StoredFile.countDocuments({ _id: firstFileId }), 0, "the replaced PDF is deleted");

    res = await api("GET", `/api/companies/${ids.google}/job-description`, { token: tokens.student1 });
    assert.equal(res.status, 200, "students can download the JD");
    res = await api("GET", `/api/companies/${ids.google}`, { token: tokens.student1 });
    assert.equal(res.body.data.company.jobDescriptionFile.originalName, "jd-v2.pdf");

    res = await api("DELETE", `/api/companies/${ids.google}/job-description`, { token: tokens.student1 });
    assert.equal(res.status, 403);
    res = await api("DELETE", `/api/companies/${ids.google}/job-description`, { token: tokens.admin });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.company.jobDescriptionFile, null);
    res = await api("GET", `/api/companies/${ids.google}/job-description`, { token: tokens.student1 });
    assert.equal(res.status, 404);
    res = await api("POST", `/api/companies/${new mongoose.Types.ObjectId()}/job-description`, { token: tokens.admin, form: jdForm("x.pdf") });
    assert.equal(res.status, 404);
  });
});
