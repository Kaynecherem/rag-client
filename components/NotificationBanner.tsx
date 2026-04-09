"use client";

import React, { useEffect, useState, useCallback } from "react";
import { getTenantNotifications } from "@/lib/api";

/**
 * NotificationBanner — displays active back-office notifications.
 *
 * FIX 1 changes:
 * - Uses localStorage (not sessionStorage) so dismissed state persists across sessions
 * - Tracks "seen" vs "dismissed" — dismissed notifications stay hidden,
 *   but NEW notifications published while the user was offline will appear
 * - Polls every 5 minutes for new notifications
 * - Gracefully handles API failures (shows nothing, doesn't break the app)
 */

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

const STORAGE_KEY = "dismissed_notification_ids";
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  maintenance: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: "⚠️" },
  alert: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "🚨" },
  announcement: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: "📢" },
  onboarding: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", icon: "✨" },
};

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(() => {
    getTenantNotifications()
        .then((data) => {
          if (data?.notifications && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
        })
        .catch(() => {
          // Silently fail — notifications are not critical
        });
  }, []);

  // Fetch on mount + poll every 5 minutes
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Clean up old dismissed IDs that no longer exist in active notifications
  useEffect(() => {
    if (notifications.length === 0 || dismissed.size === 0) return;
    const activeIds = new Set(notifications.map((n) => n.id));
    const cleaned = new Set(Array.from(dismissed).filter((id) => activeIds.has(id)));    if (cleaned.size !== dismissed.size) {
      setDismissed(cleaned);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cleaned)));    }
  }, [notifications, dismissed]);

  const dismiss = (id: string) => {
    const updated = new Set(dismissed);
    updated.add(id);
    setDismissed(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(updated)));  };

  const visible = notifications.filter((n) => !dismissed.has(n.id));

  if (visible.length === 0) return null;

  return (
      <div className="space-y-2 mb-4">
        {visible.map((n) => {
          const style = TYPE_STYLES[n.type] || TYPE_STYLES.announcement;
          return (
              <div
                  key={n.id}
                  className={`${style.bg} border ${style.border} rounded-lg px-4 py-3 flex items-start gap-3`}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${style.text}`}>{n.title}</div>
                  <p className="text-xs text-secondary mt-0.5 leading-relaxed">{n.message}</p>
                </div>
                <button
                    onClick={() => dismiss(n.id)}
                    className="text-muted hover:text-secondary text-sm flex-shrink-0"
                >
                  ✕
                </button>
              </div>
          );
        })}
      </div>
  );
}
