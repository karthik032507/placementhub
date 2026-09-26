const mongoose = require("mongoose");

const NOTIFICATION_TYPES = ["NEW_COMPANY", "COMPANY_UPDATE", "APPLICATION_STATUS"];

const notificationSchema = new mongoose.Schema(
  {
    // The user who receives the notification
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // The company this notification is about (optional but usually present)
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Most common query: "all notifications for this user, newest first"
notificationSchema.index({ user: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
