const timeOfDay = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayAndMonth = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/** A message's time: the time of day if it was sent today, otherwise the date. */
export function formatMessageTime(iso: string, now = new Date()): string {
  const sent = new Date(iso);
  return sent.toDateString() === now.toDateString()
    ? timeOfDay.format(sent)
    : dayAndMonth.format(sent);
}
