const centralDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" });
export function dailyDate(now = Date.now()) { return centralDate.format(new Date(now)); }

// Find the date boundary in the actual timezone, including 23/25-hour DST days.
export function nextDailyReset(now = Date.now()) {
  const date = dailyDate(now);
  let low = now, high = now + 27 * 60 * 60 * 1000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (dailyDate(mid) === date) low = mid; else high = mid;
  }
  return high;
}
export function dailyTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  return `${hours ? `${hours}:` : ""}${String(Math.floor(value / 60) % 60).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function dailyDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
