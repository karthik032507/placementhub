import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useAuth } from "../../context/AuthContext";
import useNotifications from "../../hooks/useNotifications";

// Shared shell for every logged-in page: sidebar + top bar + page content.
// Notifications are loaded here once so the bell, dropdown and Notifications page share state.
export default function AppLayout() {
  const { isStudent } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const notifications = useNotifications(isStudent);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} unreadCount={notifications.unreadCount} />
      <div className="app-main">
        <TopBar onOpenMenu={() => setMobileOpen(true)} notifications={notifications} />
        <main className="app-content">
          {/* Pages can reach the notification state through the router outlet context */}
          <Outlet context={{ notifications }} />
        </main>
      </div>
    </div>
  );
}
