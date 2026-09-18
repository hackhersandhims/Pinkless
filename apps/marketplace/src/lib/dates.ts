/** Date formatting/validity helpers for offer freshness display. */

const OBSERVED_AT_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "Checked Sep 18, 2026". */
export function formatObservedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`formatObservedAt received an invalid ISO date-time: ${iso}`);
  }
  return `Checked ${OBSERVED_AT_FORMATTER.format(date)}`;
}

/** True when `iso` is at or before `now` (defaults to the current time). */
export function isExpired(iso: string, now: Date = new Date()): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`isExpired received an invalid ISO date-time: ${iso}`);
  }
  return date.valueOf() <= now.valueOf();
}
