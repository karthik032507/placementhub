// Development seed script:  npm run seed
// WARNING: this wipes users, companies, applications and notifications in the configured database.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Company = require("./models/Company");
const Application = require("./models/Application");
const Notification = require("./models/Notification");

const SEED_PASSWORD = "Password@123"; // same password for every seeded account (development only)

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return date;
}

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed a production database.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Clearing existing data...");

  await Promise.all([User.deleteMany({}), Company.deleteMany({}), Application.deleteMany({}), Notification.deleteMany({})]);

  // Users (passwords are hashed by the User model pre-save hook)
  const superAdmin = await User.create({ name: "Placement Officer", email: "superadmin@iiits.in", password: SEED_PASSWORD, role: "SUPER_ADMIN" });
  const admin = await User.create({ name: "Placement Coordinator", email: "admin@iiits.in", password: SEED_PASSWORD, role: "ADMIN" });

  const students = await User.create([
    { name: "Karthikeya M", email: "karthikeya.m24@iiits.in", password: SEED_PASSWORD, role: "STUDENT", rollNumber: "S20220010101", branch: "CSE", cgpa: 8.6 },
    { name: "Ananya Reddy", email: "ananya.r22@iiits.in", password: SEED_PASSWORD, role: "STUDENT", rollNumber: "S20220010102", branch: "ECE", cgpa: 9.1 },
    { name: "Rohit Verma", email: "rohit.v22@iiits.in", password: SEED_PASSWORD, role: "STUDENT", rollNumber: "S20220010103", branch: "CSE", cgpa: 7.4 },
  ]);

  // Companies
  const companies = await Company.create([
    {
      name: "Microsoft",
      description: "Microsoft is hiring full-time Software Development Engineers for its Hyderabad development center.",
      jobRole: "Software Development Engineer",
      package: "₹50 LPA",
      location: "Hyderabad",
      workMode: "HYBRID",
      applicationDeadline: daysFromNow(14),
      jobDescription: "Work on Azure core services. Strong fundamentals in data structures, algorithms and system design expected. Eligibility: CGPA 7.0 and above, no active backlogs.",
      companyWebsite: "https://careers.microsoft.com",
      createdBy: superAdmin._id,
    },
    {
      name: "Amazon",
      description: "Amazon is hiring SDE-1 candidates for its India development centers.",
      jobRole: "SDE-1",
      package: "₹44 LPA",
      location: "Bangalore",
      workMode: "ON_SITE",
      applicationDeadline: daysFromNow(7),
      jobDescription: "Design and build scalable distributed systems. Online assessment followed by three technical rounds.",
      companyWebsite: "https://amazon.jobs",
      createdBy: admin._id,
    },
    {
      name: "Deloitte",
      description: "Deloitte is hiring Analysts for its technology consulting practice.",
      jobRole: "Analyst",
      package: "₹7.6 LPA",
      location: "Pune",
      workMode: "ON_SITE",
      applicationDeadline: daysFromNow(21),
      createdBy: admin._id,
    },
    {
      name: "Zoho",
      description: "Zoho is hiring Member Technical Staff for its Chennai office. Applications for this drive are closed.",
      jobRole: "Member Technical Staff",
      package: "₹12 LPA",
      location: "Chennai",
      workMode: "REMOTE",
      applicationDeadline: daysFromNow(-2),
      status: "CLOSED",
      createdBy: superAdmin._id,
    },
  ]);

  console.log("Seed complete.\n");
  console.log("Accounts (password for all: " + SEED_PASSWORD + ")");
  console.log("  SUPER_ADMIN  superadmin@iiits.in");
  console.log("  ADMIN        admin@iiits.in");
  for (const s of students) console.log(`  STUDENT      ${s.email}`);
  console.log(`\nCompanies: ${companies.map((c) => c.name).join(", ")}`);

  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
