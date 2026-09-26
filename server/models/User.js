const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = ["STUDENT", "ADMIN", "SUPER_ADMIN"];
const MAX_RESUMES = 5;

// A resume saved in the student's profile. Applying copies the file, so deleting
// a saved resume never touches a resume already attached to an application.
const resumeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    // originalName and size are duplicated here so the profile list needs no extra lookup
    originalName: { type: String, required: true },
    file: { type: mongoose.Schema.Types.ObjectId, ref: "StoredFile", required: true },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Stores the bcrypt hash, never the plain password.
    // select:false means queries do not return it unless explicitly asked for.
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "STUDENT" },

    // Student profile fields (optional, completed later from the Profile page)
    rollNumber: { type: String, trim: true, default: "" },
    branch: { type: String, trim: true, default: "" },
    cgpa: { type: Number, min: 0, max: 10, default: null },
    resumes: { type: [resumeSchema], default: [] },

    // Deactivated administrators keep their data but cannot log in.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash the password automatically before saving whenever it was changed.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare a plain password with the stored hash.
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// Safe representation sent to the client (no password hash, no server file paths).
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    rollNumber: this.rollNumber,
    branch: this.branch,
    cgpa: this.cgpa,
    resumes: (this.resumes || []).map((r) => ({
      id: r._id,
      label: r.label,
      originalName: r.originalName,
      size: r.size,
      uploadedAt: r.uploadedAt,
    })),
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model("User", userSchema);
module.exports = User;
module.exports.ROLES = ROLES;
module.exports.MAX_RESUMES = MAX_RESUMES;
