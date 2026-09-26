// Small display helpers shared by many pages.

export function formatDate(value, options = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", ...options });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// "Today", "Yesterday", "3 days ago", else a date
export function formatRelative(value) {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(date);
}

// For <input type="datetime-local">, which needs "YYYY-MM-DDTHH:mm" in local time
export function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isDeadlinePassed(deadline) {
  return new Date() >= new Date(deadline);
}

export function daysUntil(deadline) {
  const diff = new Date(deadline) - new Date();
  return Math.ceil(diff / 86400000);
}

export const WORK_MODE_LABELS = {
  ON_SITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

export const STATUS_LABELS = {
  APPLIED: "Applied",
  SHORTLISTED: "Shortlisted",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const ROLE_LABELS = {
  STUDENT: "Student",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export const BRANCHES = ["CSE", "ECE", "AIDS", "OTHER"];

export function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function isCollegeEmail(email = "") {
  const value = email.trim().toLowerCase();
  return value.endsWith("@iiits.in") && value.indexOf("@") > 0 && value.indexOf("@") === value.lastIndexOf("@");
}
