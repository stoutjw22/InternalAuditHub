import { useState } from "react";

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
