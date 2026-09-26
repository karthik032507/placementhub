// Express application setup (no database connection or listen() here, so tests can reuse it).
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const companyRoutes = require("./routes/companyRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// CLIENT_URL may list several origins, separated by commas, so the deployed
// frontend and a local dev server can both talk to the same API.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header means it is not a browser cross-origin call
      // (curl, Render's health check, server-to-server), so let it through.
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
      // Returning false simply omits the CORS headers and the browser blocks it,
      // rather than turning a blocked origin into a 500 error.
      callback(null, false);
    },
  })
);
app.use(express.json());

// Plain text at the root so opening the API URL in a browser explains itself.
app.get("/", (req, res) => res.type("text").send("PlacementHub API. See /api/health."));
app.get("/api/health", (req, res) => res.json({ success: true, message: "Placement portal API is running." }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
