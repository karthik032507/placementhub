import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

// Loads the logged-in user's notifications from the REST API.
// No sockets: we fetch on page load, when the bell is opened, and after actions.
export default function useNotifications(enabled) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await api.get("/notifications");
      setItems(res.data.data.notifications);
      setUnreadCount(res.data.data.unreadCount);
    } catch {
      // Silently ignore: the bell simply shows what we last had.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function markRead(id) {
    // Optimistic update so the UI feels instant, then confirm with the server.
    setItems((list) => list.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      refresh();
    }
  }

  async function markAllRead() {
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch("/notifications/read-all");
    } catch {
      refresh();
    }
  }

  return { items, unreadCount, loading, refresh, markRead, markAllRead };
}
