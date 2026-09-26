const mongoose = require("mongoose");

const COMPANY_STATUSES = ["OPEN", "CLOSED"];
const WORK_MODES = ["ON_SITE", "REMOTE", "HYBRID"];

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    jobRole: { type: String, required: true, trim: true },
    // Package / stipend is stored as text so admins can write "12 LPA" or "40k/month".
    package: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    workMode: { type: String, enum: WORK_MODES, required: true },
    applicationDeadline: { type: Date, required: true },

    // Optional fields
    jobDescription: { type: String, trim: true, default: "" },
    companyWebsite: { type: String, trim: true, default: "" },

    // Optional job-description PDF uploaded by an administrator
    jobDescriptionFile: {
      type: {
        originalName: { type: String, required: true },
        file: { type: mongoose.Schema.Types.ObjectId, ref: "StoredFile", default: null },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
      },
      default: null,
    },

    status: { type: String, enum: COMPANY_STATUSES, default: "OPEN" },
    // The administrator who created the company. Any admin can still manage it.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);
module.exports = Company;
module.exports.COMPANY_STATUSES = COMPANY_STATUSES;
module.exports.WORK_MODES = WORK_MODES;
