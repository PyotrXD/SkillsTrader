/**
 * `documents.expiry_date` has been captured since the collection was created, but
 * nothing in the app ever read it except the printed resume template. For an
 * overseas manpower agency an expired NBI clearance, police clearance or OEC is the
 * thing that blocks deployment, so the date has to meet the recruiter before the
 * airside check does — ISO/IEC 25010 functional suitability: the capability exists
 * in the data and was simply not exposed.
 *
 * Deliberately read-only. This classifies the date a record already carries; it
 * never writes `documents.status = 'Expired'`. A stored status is set by staff and
 * an automatic write could re-open a Rejected document or overwrite a manual
 * decision, so that belongs behind its own reviewed design, not a display helper.
 *
 * All day maths is UTC calendar-day arithmetic on the `YYYY-MM-DD` prefix, because
 * PocketBase returns date fields as `"2027-03-15 00:00:00.000Z"`, not as instants.
 * `today` is injectable so the counts are deterministic under test.
 */

/** Documents inside this window are flagged. One line to change the alert horizon. */
export const EXPIRY_WARNING_DAYS = 30;

export type ExpiryState = 'unset' | 'expired' | 'expiring' | 'valid';

export type ExpiryInfo = {
  state: ExpiryState;
  /** Whole calendar days from today to the expiry date; negative once lapsed. */
  daysRemaining: number | null;
  /** Normalised `YYYY-MM-DD`, or '-' when the record carries no usable date. */
  dateText: string;
};

export type ExpiryFilter = '' | 'expired' | 'expiring' | 'valid';

export const EXPIRY_FILTER_OPTIONS: { value: ExpiryFilter; label: string }[] = [
  { value: '', label: 'Any expiry' },
  { value: 'expired', label: 'Expired only' },
  { value: 'expiring', label: `Expiring in ${EXPIRY_WARNING_DAYS} days` },
  { value: 'valid', label: 'Still valid' },
];

const MS_PER_DAY = 86_400_000;
const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * PocketBase date -> UTC midnight on that calendar day. Anything unparseable is
 * treated as absent rather than guessed at: a wrong expiry badge on a clearance the
 * recruiter was about to trust is worse than no badge.
 */
function toUtcDay(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = DATE_PREFIX.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  // Reject rolled-over inputs such as 2027-02-31.
  if (parsed.getUTCDate() !== day || parsed.getUTCMonth() !== month - 1) return null;
  return parsed;
}

function utcDayStart(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

export function expiryInfo(
  value: unknown,
  today: Date = new Date(),
  warningDays: number = EXPIRY_WARNING_DAYS,
): ExpiryInfo {
  const expiry = toUtcDay(value);
  if (!expiry) return { state: 'unset', daysRemaining: null, dateText: '-' };

  const daysRemaining = Math.round((expiry.getTime() - utcDayStart(today)) / MS_PER_DAY);
  const dateText = value === undefined || value === null ? '-' : String(value).trim().slice(0, 10);

  if (daysRemaining < 0) return { state: 'expired', daysRemaining, dateText };
  if (daysRemaining <= warningDays) return { state: 'expiring', daysRemaining, dateText };
  return { state: 'valid', daysRemaining, dateText };
}

/**
 * Short text for the badge. `unset` returns '' so callers can render nothing at all
 * instead of a misleading "no expiry" claim — an empty expiry_date on a real
 * clearance is a data-entry gap, and the date column already shows the dash.
 */
export function expiryLabel(info: ExpiryInfo): string {
  switch (info.state) {
    case 'expired':
      return info.daysRemaining === -1 ? 'Expired yesterday' : `Expired ${Math.abs(info.daysRemaining ?? 0)} days ago`;
    case 'expiring':
      return info.daysRemaining === 0 ? 'Expires today' : `Expires in ${info.daysRemaining} days`;
    default:
      return '';
  }
}

export function matchesExpiryFilter(info: ExpiryInfo, filter: ExpiryFilter): boolean {
  if (!filter) return true;
  // A document with no expiry date is not "still valid" — it is unknown, and it
  // should not be hidden from the two filters that carry real risk.
  if (info.state === 'unset') return false;
  if (filter === 'valid') return info.state === 'valid';
  if (filter === 'expired') return info.state === 'expired';
  return info.state === 'expiring';
}

export type ExpirySummary = {
  expired: number;
  expiring: number;
  /** Documents that need a recruiter to act: lapsed or lapsing inside the window. */
  attention: number;
};

export function summariseExpiry(
  rows: readonly { expiry_date?: unknown }[],
  today: Date = new Date(),
  warningDays: number = EXPIRY_WARNING_DAYS,
): ExpirySummary {
  let expired = 0;
  let expiring = 0;

  for (const row of rows) {
    const { state } = expiryInfo(row?.expiry_date, today, warningDays);
    if (state === 'expired') expired += 1;
    if (state === 'expiring') expiring += 1;
  }

  return { expired, expiring, attention: expired + expiring };
}
