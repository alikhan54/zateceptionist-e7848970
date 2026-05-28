import { useMemo } from "react";

// UK bank holidays — Phase 1 mirror of REM.2's inline list.
// Phase 2: extract to shared lib/uk-bank-holidays.ts and dedupe with workflow.
// Source: gov.uk bank holidays for England + Wales 2026.
const UK_HOLIDAYS_ISO: ReadonlyArray<string> = [
  "2026-01-01", // New Year's Day
  "2026-04-03", // Good Friday
  "2026-04-06", // Easter Monday
  "2026-05-04", // Early May bank holiday
  "2026-05-25", // Spring bank holiday
  "2026-08-31", // Summer bank holiday
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day (substitute, since 26 Dec 2026 is a Saturday)
  "2027-01-01",
  "2027-03-26", // Good Friday 2027
  "2027-03-29",
  "2027-05-03",
  "2027-05-31",
  "2027-08-30",
  "2027-12-27",
  "2027-12-28",
];

const HOLIDAY_SET = new Set(UK_HOLIDAYS_ISO);

const FIRE_START_HOUR_LDN = 9;   // 09:00 London
const FIRE_END_HOUR_LDN = 17;    // last fire window 17:00 inclusive (per D6 cron 9-17 * * 1-5)

function londonDateParts(d: Date): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

function isoDateLdn(d: Date): string {
  const { year, month, day } = londonDateParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isFireableDayLdn(d: Date): boolean {
  const { weekday } = londonDateParts(d);
  if (weekday === 0 || weekday === 6) return false; // Sun / Sat
  if (HOLIDAY_SET.has(isoDateLdn(d))) return false;
  return true;
}

function setLondonHourInUtcIso(refDay: Date, hourLdn: number): Date {
  // Construct an ISO string in London-local and let JS parse it.
  // Use the London-local Y/M/D + the requested hour, then convert.
  const { year, month, day } = londonDateParts(refDay);
  // Determine current London UTC offset for that day (handles BST/GMT).
  const probe = new Date(Date.UTC(year, month - 1, day, hourLdn, 0, 0));
  const probeLdn = londonDateParts(probe);
  const driftHours = probeLdn.hour - hourLdn;
  return new Date(Date.UTC(year, month - 1, day, hourLdn - driftHours, 0, 0));
}

function nextFireWindow(now: Date = new Date()): Date {
  let candidate = new Date(now.getTime());
  for (let i = 0; i < 21; i++) {
    if (isFireableDayLdn(candidate)) {
      const { hour } = londonDateParts(candidate);
      if (i === 0 && hour < FIRE_START_HOUR_LDN) {
        return setLondonHourInUtcIso(candidate, FIRE_START_HOUR_LDN);
      }
      if (i === 0 && hour <= FIRE_END_HOUR_LDN) {
        // already in window — next 30-min slot today
        const m = londonDateParts(candidate).minute;
        const slot = m < 30 ? 30 : 60;
        const next = new Date(candidate.getTime() + (slot - m) * 60_000);
        if (londonDateParts(next).hour <= FIRE_END_HOUR_LDN) return next;
        // rolled past 17:30 — try next day
      } else if (i > 0) {
        return setLondonHourInUtcIso(candidate, FIRE_START_HOUR_LDN);
      }
    }
    // Move to next day in London time (add 24h, then re-anchor)
    candidate = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
  }
  return setLondonHourInUtcIso(now, FIRE_START_HOUR_LDN);
}

export function useNextReminderFireWindow(now?: Date) {
  return useMemo(() => {
    const nextUtc = nextFireWindow(now ?? new Date());
    const ldn = londonDateParts(nextUtc);
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][ldn.weekday];
    const label = `${weekday} ${String(ldn.hour).padStart(2, "0")}:${String(ldn.minute).padStart(2, "0")}`;
    return {
      nextFireUtc: nextUtc,
      nextFireLocalLabel: `${label} London`,
      iso: nextUtc.toISOString(),
    };
  }, [now]);
}

export function isWithinFireWindowNow(now: Date = new Date()): boolean {
  if (!isFireableDayLdn(now)) return false;
  const { hour } = londonDateParts(now);
  return hour >= FIRE_START_HOUR_LDN && hour <= FIRE_END_HOUR_LDN;
}
