import { useState } from "react";
import type { RemediationAction } from "@/generated/models";

// ── Pure utility functions ────────────────────────────────────────────────────
// Exported for use by notifications, findings, and index pages.

/**
 * Returns remediations that are past their due date and not yet completed.
 * "Completed" maps to RemediationActionStatusKey 'StatusKey2'.
 */
export function getOverdueRemediations(remediations: RemediationAction[]): RemediationAction[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return remediations.filter(
    r => r.statusKey !== "StatusKey2" && r.duedate && new Date(r.duedate) < today
  );
}

/**
 * Returns remediations due within `daysAhead` days that are not yet completed.
 * Defaults to a 14-day window.
 */
export function getUpcomingRemediations(
  remediations: RemediationAction[],
  daysAhead = 14
): RemediationAction[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today.getTime() + daysAhead * 86_400_000);
  return remediations.filter(r => {
    if (r.statusKey === "StatusKey2" || !r.duedate) return false;
    const due = new Date(r.duedate);
    return due >= today && due <= cutoff;
  });
}

export interface EmailNotification {
  id: string;
  recipient: string;
  subject: string;
  sentAt: Date;
  type: "overdue_reminder" | "approval_request" | "finding_assigned";
}

/**
 * Simulates email notification management.
 * In production, notifications are triggered server-side by Django signals
 * or a scheduled Celery task. This hook provides local UI state for
 * the notifications management page.
 */
export function useEmailNotifications() {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [sending, setSending] = useState(false);

  async function sendReminder(params: {
    recipient: string;
    remediationId: string;
    daysOverdue: number;
  }): Promise<void> {
    setSending(true);
    // Simulate async send — replace with a real API call to a Django task endpoint
    await new Promise((resolve) => setTimeout(resolve, 500));
    setNotifications((prev) => [
      {
        id: crypto.randomUUID(),
        recipient: params.recipient,
        subject: `Overdue Remediation Reminder (${params.daysOverdue} days overdue)`,
        sentAt: new Date(),
        type: "overdue_reminder",
      },
      ...prev,
    ]);
    setSending(false);
  }

  function clearLog() {
    setNotifications([]);
  }

  return { notifications, sending, sendReminder, clearLog };
}
