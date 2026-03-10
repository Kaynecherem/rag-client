"use client";

import React, { useEffect, useState } from "react";
import { getTenantNotifications } from "@/lib/api";

/**
 * NotificationBanner — displays active back-office notifications.
 *
 * Place this in your staff and policyholder layouts:
 *   import NotificationBanner from "@/components/NotificationBanner";
 *   <NotificationBanner />
 *
 * It fetches on mount and shows dismissible banners for each active notification.
 * Dismissed notifications are tracked in sessionStorage so they don't reappear
 * during the same browser session.
 */

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  maintenance: {
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    text: "text-amber-300",
    icon: "⚠",
  },
  alert: {
    bg: "bg-red-400/10",
    border: "border-red-400/30",
    text: "text-red-300",
    icon: "⚡",
  },
  announcement: {
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    text: "text-blue-300",
    icon: "📢",
  },
  onboarding: {
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    text: "text-emerald-300",
    icon: "✨",
  },
};

export default function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed IDs from sessionStorage
    try {
      const stored = sessionStorage.getItem("dismissed_notifications");
      if (stored) setDismissed(new Set(JSON.parse(stored)));
    } catch {}

    // Fetch notifications
    getTenantNotifications()
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => {}); // Silently fail — not critical
  }, []);

  const dismiss = (id: string) => {
    const updated = new Set(dismissed);
    updated.add(id);
    setDismissed(updated);
    sessionStorage.setItem("dismissed_notifications", JSON.stringify([...updated]));
  };

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
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.message}</p>
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="text-gray-500 hover:text-gray-300 text-sm flex-shrink-0"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
