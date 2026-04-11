import { useState } from "react";
import type { RemediationAction } from "@/generated/models";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  enableOverdueNotifications: boolean;
  notifyDaysBefore: number;
  notifyOnOverdue: boolean;
  notifyWeekly: boolean;
}

export interface EmailNotification {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sentAt: Date;
  type: "overdue_reminder" | "approval_request" | "finding_assigned";
  remediationActionId?: string;
  status?: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enableOverdueNotifications: true,
  notifyDaysBefore: 14,
  notifyOnOverdue: true,
  notifyWeekly: false,
};

// ── Pure utility functions ────────────────────────────────────────────────────

/**
 * Returns remediations that are past their due date and not yet completed.
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

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages email notification state for overdue remediation actions.
 * In production, notifications are triggered server-side by Django signals
 * or a scheduled Celery task. This hook provides local UI state and
 * simulated send operations for the notifications management page.
 */
export function useEmailNotifications() {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [sending, setSending] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  function generateNotificationEmail(
    remediation: RemediationAction,
    _type: string = "overdue"
  ): Omit<EmailNotification, "id" | "sentAt" | "status"> {
    const ownerName = (remediation.ownername as { findingownername?: string } | undefined)?.findingownername ?? "Owner";
    const ownerEmail = (remediation.ownername as { email?: string } | undefined)?.email ?? "owner@example.com";
    const daysOverdue = remediation.duedate
      ? Math.max(0, Math.floor((Date.now() - new Date(remediation.duedate).getTime()) / 86_400_000))
      : 0;

    return {
      recipientEmail: ownerEmail,
      subject: `Action Required: Remediation "${remediation.actiondescription ?? "Item"}" is ${daysOverdue} day(s) overdue`,
      body: [
        `Dear ${ownerName},`,
        "",
        `This is a reminder that the following remediation action is overdue:`,
        "",
        `  Action: ${remediation.actiondescription ?? "—"}`,
        `  Due Date: ${remediation.duedate ?? "—"}`,
        `  Days Overdue: ${daysOverdue}`,
        "",
        "Please update the status or contact your audit manager.",
        "",
        "Internal Audit Hub",
      ].join("\n"),
      type: "overdue_reminder" as const,
      remediationActionId: remediation.id,
    };
  }

  async function sendOverdueNotification(remediation: RemediationAction): Promise<void> {
    setSending(true);
    // Simulated send — replace with a real API call to a Django endpoint
    await new Promise((resolve) => setTimeout(resolve, 500));
    const email = generateNotificationEmail(remediation);
    setNotifications((prev) => [
      {
        id: crypto.randomUUID(),
        ...email,
        sentAt: new Date(),
        status: "sent",
      },
      ...prev,
    ]);
    setSending(false);
  }

  async function sendBulkNotifications(remediations: RemediationAction[]): Promise<void> {
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const now = new Date();
    const newEntries: EmailNotification[] = remediations.map((r) => ({
      id: crypto.randomUUID(),
      ...generateNotificationEmail(r),
      sentAt: now,
      status: "sent",
    }));
    setNotifications((prev) => [...newEntries, ...prev]);
    setSending(false);
  }

  function getNotificationHistory(): EmailNotification[] {
    return notifications;
  }

  async function sendReminder(params: {
    recipient: string;
    remediationId: string;
    daysOverdue: number;
  }): Promise<void> {
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setNotifications((prev) => [
      {
        id: crypto.randomUUID(),
        recipientEmail: params.recipient,
        subject: `Overdue Remediation Reminder (${params.daysOverdue} days overdue)`,
        body: `Reminder: remediation action ${params.remediationId} is ${params.daysOverdue} days overdue.`,
        sentAt: new Date(),
        type: "overdue_reminder",
        remediationActionId: params.remediationId,
        status: "sent",
      },
      ...prev,
    ]);
    setSending(false);
  }

  function clearLog() {
    setNotifications([]);
  }

  return {
    notifications,
    sending,
    isSending: sending,
    preferences,
    setPreferences,
    sendReminder,
    clearLog,
    sendOverdueNotification,
    sendBulkNotifications,
    getNotificationHistory,
    generateNotificationEmail,
  };
}
