const Notification = require("../models/Notification");
const Application = require("../models/Application");
const Company = require("../models/Company");
const httpError = require("../utils/httpError");

// GET /api/notifications  - only the logged-in user's notifications, newest first
async function getMyNotifications(req, res) {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("company", "name")
    .lean();

  const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });

  res.json({ success: true, data: { notifications, unreadCount } });
}

// PATCH /api/notifications/:id/read
async function markAsRead(req, res) {
  const notification = await Notification.findById(req.params.id);
  if (!notification) throw httpError(404, "Notification not found.");

  // Ownership check: a user can only touch their own notifications.
  if (notification.user.toString() !== req.user.id) {
    throw httpError(403, "You cannot modify another user's notification.");
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  res.json({ success: true, message: "Notification marked as read.", data: { notification } });
}

// PATCH /api/notifications/read-all
async function markAllAsRead(req, res) {
  const result = await Notification.updateMany({ user: req.user.id, isRead: false }, { $set: { isRead: true } });
  res.json({ success: true, message: "All notifications marked as read.", data: { updated: result.modifiedCount } });
}

// POST /api/companies/:companyId/notifications  (ADMIN, SUPER_ADMIN)  body: { message }
// Sent only to ACTIVE applicants: APPLIED, SHORTLISTED, SELECTED.
async function sendCompanyNotification(req, res) {
  const { message } = req.body;
  if (!message || !String(message).trim()) throw httpError(400, "Message cannot be empty.");
  if (String(message).trim().length > 1000) throw httpError(400, "Message is too long (max 1000 characters).");

  const company = await Company.findById(req.params.companyId).select("name");
  if (!company) throw httpError(404, "Company not found.");

  const activeApplications = await Application.find({
    company: company._id,
    status: { $in: ["APPLIED", "SHORTLISTED", "SELECTED"] },
  })
    .select("student")
    .lean();

  if (activeApplications.length === 0) {
    return res.status(200).json({ success: true, message: "No active applicants to notify.", data: { sent: 0 } });
  }

  await Notification.insertMany(
    activeApplications.map((application) => ({
      user: application.student,
      company: company._id,
      type: "COMPANY_UPDATE",
      title: `Update from ${company.name}`,
      message: String(message).trim(),
    }))
  );

  res.status(201).json({
    success: true,
    message: `Notification sent to ${activeApplications.length} active applicant(s).`,
    data: { sent: activeApplications.length },
  });
}

module.exports = { getMyNotifications, markAsRead, markAllAsRead, sendCompanyNotification };
