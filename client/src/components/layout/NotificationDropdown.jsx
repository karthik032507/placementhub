import { Link } from "react-router-dom";
import { Building2, BadgeCheck, Megaphone, BellOff } from "lucide-react";
import { formatRelative } from "../../utils/format";

const TYPE_ICONS = {
  NEW_COMPANY: Building2,
  APPLICATION_STATUS: BadgeCheck,
  COMPANY_UPDATE: Megaphone,
};

// Compact list shown under the bell icon. Data comes from the parent (AppLayout)
// so the bell badge, the dropdown and the sidebar counter all stay in sync.
export default function NotificationDropdown({ notifications, unreadCount, loading, onMarkRead, onMarkAllRead, onClose }) {
  const recent = notifications.slice(0, 6);

  return (
    <div className="dropdown notif-dropdown">
      <div className="notif-head">
        <h4>Notifications {unreadCount > 0 && <span className="text-muted fw-600 text-sm">· {unreadCount} unread</span>}</h4>
        <button type="button" className="link-btn" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          Mark all read
        </button>
      </div>

      <div className="notif-list">
        {loading && (
          <div className="page-loading" style={{ padding: "28px 0" }}>
            <span className="spinner" /> Loading…
          </div>
        )}

        {!loading && recent.length === 0 && (
          <div className="empty-state" style={{ padding: "36px 20px" }}>
            <div className="empty-icon" style={{ width: 52, height: 52 }}>
              <BellOff size={22} />
            </div>
            <div className="empty-title" style={{ fontSize: 15 }}>
              No notifications yet
            </div>
            <p className="empty-text text-sm">Updates about companies and your applications will appear here.</p>
          </div>
        )}

        {!loading &&
          recent.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Building2;
            return (
              <div key={n._id} className={`notif-row ${n.isRead ? "" : "is-unread"}`} onClick={() => !n.isRead && onMarkRead(n._id)}>
                <div className={`notif-icon type-${n.type}`}>
                  <Icon size={17} />
                </div>
                <div className="notif-body">
                  <div className="notif-title">
                    <span>{n.title}</span>
                    <span className="notif-time">{formatRelative(n.createdAt)}</span>
                  </div>
                  <p className="notif-message">{n.message}</p>
                </div>
                {!n.isRead && <span className="notif-unread-dot" />}
              </div>
            );
          })}
      </div>

      <div className="notif-foot">
        <Link to="/notifications" onClick={onClose}>
          View all notifications
        </Link>
      </div>
    </div>
  );
}
