import { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { Bell, Building2, BadgeCheck, Megaphone, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import EmptyState, { PageLoading } from "../components/ui/EmptyState";
import { formatRelative, formatDateTime } from "../utils/format";

const TYPE_ICONS = { NEW_COMPANY: Building2, APPLICATION_STATUS: BadgeCheck, COMPANY_UPDATE: Megaphone };
const TYPE_LABELS = { ALL: "All", NEW_COMPANY: "New Companies", APPLICATION_STATUS: "Application Updates", COMPANY_UPDATE: "Company Updates" };

export default function NotificationsPage() {
  const { isStudent } = useAuth();
  // Shared state from AppLayout so the bell badge updates when we mark things read here.
  const { notifications } = useOutletContext();
  const [filter, setFilter] = useState("ALL");

  if (!isStudent) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">Notifications are delivered to students</p>
          </div>
        </div>
        <div className="card">
          <EmptyState
            icon={Megaphone}
            title="Send updates to applicants"
            text="Administrators do not receive notifications. Use Company Updates to message the active applicants of a company."
            action={
              <Link to="/updates" className="btn btn-primary">
                Go to Company Updates
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const { items, unreadCount, loading, markRead, markAllRead } = notifications;
  const visible = filter === "ALL" ? items : items.filter((n) => n.type === filter);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : "You are all caught up"}</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck size={17} /> Mark all as read
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="filter-pills">
          {Object.keys(TYPE_LABELS).map((value) => (
            <button key={value} type="button" className={`pill ${filter === value ? "is-active" : ""}`} onClick={() => setFilter(value)}>
              {TYPE_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="card notif-page-list">
        {loading && items.length === 0 && <PageLoading />}

        {!loading && visible.length === 0 && <EmptyState icon={Bell} title="No notifications" text="Updates about new companies and your applications will appear here." />}

        {visible.map((n) => {
          const Icon = TYPE_ICONS[n.type] || Bell;
          return (
            <div key={n._id} className={`notif-row ${n.isRead ? "" : "is-unread"}`} onClick={() => !n.isRead && markRead(n._id)} title={n.isRead ? "" : "Click to mark as read"}>
              <div className={`notif-icon type-${n.type}`}>
                <Icon size={19} />
              </div>
              <div className="notif-body">
                <div className="notif-title">
                  <span>
                    {n.title}
                    {n.company?.name && <span className="text-muted fw-600"> · {n.company.name}</span>}
                  </span>
                  <span className="notif-time" title={formatDateTime(n.createdAt)}>
                    {formatRelative(n.createdAt)}
                  </span>
                </div>
                <p className="notif-message">{n.message}</p>
                {n.company?._id && (
                  <Link to={`/companies/${n.company._id}`} className="text-sm fw-600" style={{ display: "inline-block", marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                    View company →
                  </Link>
                )}
              </div>
              {!n.isRead && <span className="notif-unread-dot" />}
            </div>
          );
        })}
      </div>
    </>
  );
}
