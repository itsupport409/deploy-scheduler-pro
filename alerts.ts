import { Notification, ChangeRequest, RequestStatus, User } from './types';

// A unified item shown in the dashboard "Recent System Notifications"
// feed and the header Alerts bell. It merges sent notifications with
// still-pending requests so both surface in one chronological list.
export interface AlertItem {
  id: string;
  subject: string;
  content: string;
  sentAt: string;
  userName: string;
  userEmail: string;
  kind: 'notification' | 'request';
}

export const buildAlerts = (
  notifications: Notification[],
  requests: ChangeRequest[],
  users: User[]
): AlertItem[] => {
  const fromNotifications: AlertItem[] = notifications.map(n => ({
    id: n.id,
    subject: n.subject,
    content: n.content,
    sentAt: n.sentAt,
    userName: n.userName,
    userEmail: n.userEmail,
    kind: 'notification',
  }));

  const fromPendingRequests: AlertItem[] = requests
    .filter(r => r.status === RequestStatus.PENDING)
    .map(r => {
      const requester = users.find(u => u.id === r.requesterId);
      const start = new Date(r.targetDate).toLocaleDateString();
      const end = r.endDate ? ` – ${new Date(r.endDate).toLocaleDateString()}` : '';
      const pay = r.payType ? ` (${r.payType})` : '';
      return {
        id: r.id,
        subject: `Pending: ${r.type}`,
        content: `${requester?.name || 'A staff member'} requested ${r.type} for ${start}${end}${pay}. Awaiting manager review.`,
        sentAt: r.createdAt,
        userName: requester?.name || 'Unknown',
        userEmail: requester?.email || '',
        kind: 'request',
      };
    });

  return [...fromNotifications, ...fromPendingRequests].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );
};

// Date + time, e.g. "Jun 18, 2:30 PM"
export const formatAlertTime = (iso: string): string =>
  new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
