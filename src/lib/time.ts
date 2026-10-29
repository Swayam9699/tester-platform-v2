export const DAY_MS = 86_400_000;

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * DAY_MS);
}

export function addHours(d: Date, hours: number) {
  return new Date(d.getTime() + hours * 3_600_000);
}

/** Calendar day in UTC, as stored in `date` columns (YYYY-MM-DD). */
export function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function parseDay(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

/** Whole calendar days from a to b (b later → positive). */
export function daysBetween(a: Date, b: Date) {
  return Math.round((parseDay(dayKey(b)).getTime() - parseDay(dayKey(a)).getTime()) / DAY_MS);
}

export function relativeTime(from: Date, now: Date) {
  const diff = now.getTime() - from.getTime();
  const abs = Math.abs(diff);
  const future = diff < 0;
  const units: [number, string][] = [
    [DAY_MS, "d"],
    [3_600_000, "h"],
    [60_000, "m"],
  ];
  for (const [ms, unit] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      return future ? `in ${n}${unit}` : `${n}${unit} ago`;
    }
  }
  return "just now";
}
