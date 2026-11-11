const TZ = process.env.NEXT_PUBLIC_TZ || "Asia/Kolkata";

/** YYYY-MM-DD for "now" in the gym's timezone. */
export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing iso. */
export function weekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0
  return addDays(iso, -dow);
}

export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayName(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

export function monthStart(iso: string): string {
  return iso.slice(0, 8) + "01";
}

export function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}
