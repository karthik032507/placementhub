import { STATUS_LABELS } from "../../utils/format";

const STATUS_CLASS = {
  APPLIED: "badge-info",
  SHORTLISTED: "badge-warning",
  SELECTED: "badge-success",
  REJECTED: "badge-danger",
  WITHDRAWN: "badge-neutral",
};

// Colored pill for an application status.
export default function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] || "badge-neutral"}`}>{STATUS_LABELS[status] || status}</span>;
}

// "● Applications Open" / "● Applications Closed" for a company.
export function CompanyStatus({ company }) {
  const isOpen = company.status === "OPEN" && new Date() < new Date(company.applicationDeadline);
  return <span className={`status-dot ${isOpen ? "status-open" : "status-closed"}`}>{isOpen ? "Applications Open" : "Applications Closed"}</span>;
}
