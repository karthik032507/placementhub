const mongoose = require("mongoose");

const APPLICATION_STATUSES = ["APPLIED", "SHORTLISTED", "SELECTED", "REJECTED", "WITHDRAWN"];

// Application is the "join" collection between User (student) and Company.
// One student -> many applications, one company -> many applications.
const applicationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    // The resume uploaded for THIS application. Different applications can have different resumes.
    resume: {
      originalName: { type: String, required: true },
      file: { type: mongoose.Schema.Types.ObjectId, ref: "StoredFile", default: null },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: Date.now },
    },

    status: { type: String, enum: APPLICATION_STATUSES, default: "APPLIED" },
  },
  { timestamps: { createdAt: "appliedAt", updatedAt: "updatedAt" } }
);

// Compound unique index: a student can have only ONE application per company.
// Even if two requests arrive at the same moment, MongoDB rejects the second one.
applicationSchema.index({ student: 1, company: 1 }, { unique: true });

const Application = mongoose.model("Application", applicationSchema);
module.exports = Application;
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
