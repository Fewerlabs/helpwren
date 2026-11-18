const timeOfDay = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayAndMonth = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A message's time: the time of day if it was sent today, otherwise the date. */
export function formatMessageTime(iso: string, now = new Date()): string {
  const sent = new Date(iso);
  return sent.toDateString() === now.toDateString()
    ? timeOfDay.format(sent)
    : dayAndMonth.format(sent);
}

/** How long ago something happened, for lists: "now", "5m ago", "3h ago", "2d ago", then the date. */
export function formatTimeAgo(iso: string, now = new Date()): string {
  const then = new Date(iso);
  const elapsed = now.getTime() - then.getTime();
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
  return dayAndMonth.format(then);
}

/** Whether a moment falls on the same calendar day as now. */
export function isToday(iso: string, now = new Date()): boolean {
  return new Date(iso).toDateString() === now.toDateString();
}
