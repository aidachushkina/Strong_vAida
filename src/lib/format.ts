/**
 * Formatting + units helpers. The app is metric throughout:
 *   weight  -> kg
 *   distance-> km
 *   pace    -> min/km  (free text, e.g. "5:30")
 *   duration-> stored in seconds, shown as m:ss or "Xm"
 */

export const UNIT = {
  weight: 'kg',
  distance: 'km',
  pace: 'min/km',
} as const;

export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return `${trimNum(kg)} kg`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return '—';
  return `${trimNum(km)} km`;
}

/** seconds -> "m:ss" (e.g. 95 -> "1:35"). */
export function secondsToClock(sec: number | null | undefined): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** seconds -> rounded minutes string for compact display (e.g. 1800 -> "30 min"). */
export function secondsToMinutes(sec: number | null | undefined): string {
  if (sec == null) return '—';
  return `${trimNum(Math.round((sec / 60) * 10) / 10)} min`;
}

/** minutes (number/decimal) -> seconds, or null. */
export function minutesToSeconds(min: string | number | null | undefined): number | null {
  const n = typeof min === 'string' ? parseFloat(min) : min;
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n * 60);
}

function trimNum(n: number): string {
  // Drop trailing ".0" but keep meaningful decimals.
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

// --- numeric input parsing ------------------------------------------------- //
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}

export function parseInteger(text: string): number | null {
  const n = parseNumber(text);
  return n == null ? null : Math.round(n);
}

// --- dates (local, ISO yyyy-mm-dd) ----------------------------------------- //
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "2026-06-30" -> "Mon, Jun 30". */
export function prettyDate(iso: string | null | undefined): string {
  if (!iso) return 'No date';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function isToday(iso: string | null | undefined): boolean {
  return !!iso && iso === todayISO();
}
