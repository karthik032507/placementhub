import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Building2, FileText, Bell, UserRound, LogOut, Megaphone, ShieldCheck, PlusCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Sidebar: narrow by default, expands smoothly on hover (desktop) or slides in as a drawer (mobile).
export default function Sidebar({ mobileOpen, onCloseMobile, unreadCount }) {
  const { logout, isStudent, isSuperAdmin } = useAuth();
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const studentLinks = [
    { to: "/companies", label: "Companies", icon: Building2 },
    { to: "/my-applications", label: "My Applications", icon: FileText },
    { to: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];

  const adminLinks = [
    { to: "/companies", label: "Companies", icon: Building2 },
    { to: "/companies/new", label: "Add Company", icon: PlusCircle },
    { to: "/updates", label: "Company Updates", icon: Megaphone },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];

  const links = isStudent ? studentLinks : adminLinks;

  const className = ["sidebar", hovered ? "is-expanded" : "", mobileOpen ? "is-mobile-open" : ""].join(" ").trim();

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onCloseMobile} />}
      <aside className={className} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <div className="sidebar-brand">
          <div className="brand-mark">P</div>
          <span className="brand-name">PlacementHub</span>
        </div>

        <nav className="sidebar-nav">
          {links.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} end={to === "/companies"} className="nav-item" onClick={onCloseMobile} title={label}>
              <Icon size={20} />
              <span className="nav-label">{label}</span>
              {badge > 0 && <span className="nav-badge">{badge > 99 ? "99+" : badge}</span>}
            </NavLink>
          ))}

          {isSuperAdmin && (
            <>
              <div className="nav-section-label">Super Admin</div>
              <NavLink to="/administrators" className="nav-item" onClick={onCloseMobile} title="Administrators">
                <ShieldCheck size={20} />
                <span className="nav-label">Administrators</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="nav-item nav-logout" onClick={handleLogout} title="Logout">
            <LogOut size={20} />
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
