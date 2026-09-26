import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Moon, Sun, Menu, ChevronDown, UserRound, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { initials, ROLE_LABELS } from "../../utils/format";
import NotificationDropdown from "./NotificationDropdown";

// Closes a dropdown when the user clicks anywhere outside of it.
function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handle(event) {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

export default function TopBar({ onOpenMenu, notifications }) {
  const { user, logout, isStudent } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useClickOutside(profileRef, () => setProfileOpen(false));
  useClickOutside(notifRef, () => setNotifOpen(false));

  function openNotifications() {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) notifications.refresh(); // fetch fresh data when the dropdown opens
  }

  function handleLogout() {
    setProfileOpen(false);
    logout();
    navigate("/login");
  }

  const contextText = isStudent
    ? [user.branch, user.rollNumber].filter(Boolean).join(" • ") || "Student"
    : ROLE_LABELS[user.role];

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="icon-btn menu-btn" onClick={onOpenMenu} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <span className="context-chip">{contextText}</span>
      </div>

      <div className="topbar-right">
        {isStudent && (
          <div className="dropdown-anchor" ref={notifRef}>
            <button type="button" className={`icon-btn ${notifOpen ? "is-active" : ""}`} onClick={openNotifications} aria-label="Notifications">
              <Bell size={19} />
              {notifications.unreadCount > 0 && <span className="notif-count">{notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}</span>}
            </button>
            {notifOpen && (
              <NotificationDropdown
                notifications={notifications.items}
                unreadCount={notifications.unreadCount}
                loading={notifications.loading}
                onMarkRead={notifications.markRead}
                onMarkAllRead={notifications.markAllRead}
                onClose={() => setNotifOpen(false)}
              />
            )}
          </div>
        )}

        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme" title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <div className="dropdown-anchor" ref={profileRef}>
          <button type="button" className={`profile-btn ${profileOpen ? "is-open" : ""}`} onClick={() => setProfileOpen((v) => !v)}>
            <span className="avatar">{initials(user.name)}</span>
            <span className="profile-name">{user.name.split(" ")[0]}</span>
            <ChevronDown size={16} className="profile-chevron" />
          </button>

          {profileOpen && (
            <div className="dropdown profile-dropdown">
              <div className="profile-dropdown-head">
                <span className="avatar avatar-lg">{initials(user.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="name">{user.name}</div>
                  <div className="email">{user.email}</div>
                  <span className={`badge ${user.role === "SUPER_ADMIN" ? "badge-purple" : "badge-accent"}`}>{ROLE_LABELS[user.role]}</span>
                </div>
              </div>
              <Link to="/profile" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                <span className="item-icon">
                  <UserRound size={18} />
                </span>
                <span>
                  <div className="item-title">My Profile</div>
                  <div className="item-sub">View and edit your details</div>
                </span>
              </Link>
              <button type="button" className="dropdown-item danger" onClick={handleLogout}>
                <span className="item-icon">
                  <LogOut size={18} />
                </span>
                <span>
                  <div className="item-title">Sign Out</div>
                  <div className="item-sub">End your session safely</div>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
