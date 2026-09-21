/**
 * Centralized Date & Time Utilities for WhatsApp-Style Team Chat
 * Handles user's local timezone, dynamic today/yesterday detection,
 * day boundaries, and localized formatting without hardcoding.
 */

/**
 * Format timestamp into 12-hour message time (e.g. "03:46 PM", "12:21 PM")
 */
export function formatMessageTime(rawTimestamp?: string | number | Date | null): string {
  if (!rawTimestamp) return '';
  try {
    const date = new Date(rawTimestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

/**
 * Check if given date is today in user's local timezone
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if given date was yesterday in user's local timezone
 */
export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Format group list card preview timestamp
 * Today -> "03:46 PM"
 * Yesterday -> "Yesterday"
 * Within past 6 days -> "Monday", "Tuesday", etc.
 * Older -> "18/09/2026"
 */
export function formatGroupListTime(rawTimestamp?: string | number | Date | null): string {
  if (!rawTimestamp) return '';
  try {
    const date = new Date(rawTimestamp);
    if (isNaN(date.getTime())) return '';

    if (isToday(date)) {
      return formatMessageTime(date);
    }

    if (isYesterday(date)) {
      return 'Yesterday';
    }

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 7 && diffDays > 1) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }

    // Older: dd/mm/yyyy
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * WhatsApp-style Day Header Separator
 * Returns "TODAY", "YESTERDAY", or "18 SEP 2026"
 */
export function getDateSeparatorLabel(rawTimestamp?: string | number | Date | null): string {
  if (!rawTimestamp) return '';
  try {
    const date = new Date(rawTimestamp);
    if (isNaN(date.getTime())) return '';

    if (isToday(date)) {
      return 'TODAY';
    }

    if (isYesterday(date)) {
      return 'YESTERDAY';
    }

    const day = date.getDate();
    const month = date.toLocaleDateString([], { month: 'short' }).toUpperCase();
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();

    if (year === currentYear) {
      return `${day} ${month}`;
    }

    return `${day} ${month} ${year}`;
  } catch {
    return '';
  }
}

/**
 * Determine if a date separator pill should be rendered between two consecutive messages
 */
export function shouldShowDateSeparator(
  prevTimestamp?: string | number | Date | null,
  currTimestamp?: string | number | Date | null
): boolean {
  if (!currTimestamp) return false;
  if (!prevTimestamp) return true; // First message always gets separator

  try {
    const prevDate = new Date(prevTimestamp);
    const currDate = new Date(currTimestamp);

    if (isNaN(prevDate.getTime()) || isNaN(currDate.getTime())) return false;

    return (
      prevDate.getDate() !== currDate.getDate() ||
      prevDate.getMonth() !== currDate.getMonth() ||
      prevDate.getFullYear() !== currDate.getFullYear()
    );
  } catch {
    return false;
  }
}

/**
 * Determine if consecutive messages from the same sender should be grouped
 * (within 3 minutes and on the same day)
 */
export function shouldGroupWithPreviousMessage(
  prevMsg?: { senderId?: string; createdAt?: string } | null,
  currMsg?: { senderId?: string; createdAt?: string } | null
): boolean {
  if (!prevMsg || !currMsg) return false;
  if (prevMsg.senderId !== currMsg.senderId) return false;
  if (!prevMsg.createdAt || !currMsg.createdAt) return false;

  try {
    const prevTime = new Date(prevMsg.createdAt).getTime();
    const currTime = new Date(currMsg.createdAt).getTime();
    const diffMins = Math.abs(currTime - prevTime) / (1000 * 60);

    return diffMins <= 3 && !shouldShowDateSeparator(prevMsg.createdAt, currMsg.createdAt);
  } catch {
    return false;
  }
}
