import { Building2, FileText, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// Two-column layout shared by the Login and Register pages.
export default function AuthShell({ children }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="auth-page">
      <aside className="auth-side">
        <div className="auth-brand">
          <span className="brand-mark">P</span>
          PlacementHub
        </div>

        <div>
          <h2>Placements, <em>organised.</em></h2>
          <p className="lead">One place for placement drives, applications and updates from the placement cell.</p>
          <div className="auth-points">
            <div className="auth-point">
              <Building2 size={18} /> Browse companies and apply with your resume
            </div>
            <div className="auth-point">
              <FileText size={18} /> Track every application status in one list
            </div>
            <div className="auth-point">
              <Bell size={18} /> Get notified about shortlists and schedule changes
            </div>
          </div>
        </div>

        <p className="auth-footnote">For IIITS students and placement cell staff.</p>
      </aside>

      <section className="auth-form-side">
        <button type="button" className="icon-btn auth-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="auth-card fade-in">
          <div className="auth-mobile-brand">
            <span className="brand-mark">P</span>
            PlacementHub
          </div>
          {children}
        </div>
      </section>
    </div>
  );
}
