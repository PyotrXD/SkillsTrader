import { describe, expect, it } from 'vitest';
import {
  EXPIRY_WARNING_DAYS,
  expiryInfo,
  expiryLabel,
  matchesExpiryFilter,
  summariseExpiry,
} from './documentExpiry';

// Fixed "today" so every day-count assertion is deterministic.
const TODAY = new Date(Date.UTC(2026, 9, 24)); // 2026-10-24

function stateOf(value: unknown, warningDays?: number) {
  return expiryInfo(value, TODAY, warningDays).state;
}

describe('expiryInfo date parsing', () => {
  it('reads the PocketBase date form, not just an ISO instant', () => {
    const info = expiryInfo('2026-12-23 00:00:00.000Z', TODAY);
    expect(info.state).toBe('valid');
    expect(info.dateText).toBe('2026-12-23');
    expect(info.daysRemaining).toBe(60);
  });

  it('counts the exact horizon as still inside the window', () => {
    const info = expiryInfo('2026-11-23 00:00:00.000Z', TODAY);
    expect(info.state).toBe('expiring');
    expect(info.daysRemaining).toBe(EXPIRY_WARNING_DAYS);
  });

  it('accepts the T-separated form too', () => {
    expect(expiryInfo('2026-10-24T00:00:00.000Z', TODAY).state).toBe('expiring');
  });

  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['null', null],
    ['undefined', undefined],
    ['a number', 1234],
    ['garbage', 'not a date'],
    ['a day that does not exist', '2027-02-31'],
    ['a month that does not exist', '2027-13-01'],
  ])('treats %s as no usable expiry date instead of guessing', (_label, value) => {
    const info = expiryInfo(value, TODAY);
    expect(info.state).toBe('unset');
    expect(info.daysRemaining).toBeNull();
    expect(info.dateText).toBe('-');
  });
});

describe('expiryInfo classification', () => {
  it('is expired the day before today', () => {
    expect(stateOf('2026-10-23')).toBe('expired');
  });

  it('is still expiring on the expiry date itself, not already expired', () => {
    expect(stateOf('2026-10-24')).toBe('expiring');
  });

  it('sits on the window edge: exactly the horizon is expiring, one day past is valid', () => {
    const horizon = new Date(Date.UTC(2026, 9, 24 + EXPIRY_WARNING_DAYS));
    const horizonText = horizon.toISOString().slice(0, 10);
    expect(stateOf(horizonText)).toBe('expiring');

    const nextDay = new Date(horizon.getTime() + 86_400_000).toISOString().slice(0, 10);
    expect(stateOf(nextDay)).toBe('valid');
  });

  it('honours a custom horizon without changing the stored date', () => {
    // 2026-10-29 is 5 days out, so a 5-day window catches it and a 4-day window does not.
    expect(stateOf('2026-10-29', 5)).toBe('expiring');
    expect(stateOf('2026-10-29', 4)).toBe('valid');
  });

  it('reports negative days remaining once lapsed', () => {
    expect(expiryInfo('2026-10-14', TODAY).daysRemaining).toBe(-10);
  });
});

describe('expiryLabel', () => {
  it('stays silent when there is no date rather than claiming a state', () => {
    expect(expiryLabel(expiryInfo('', TODAY))).toBe('');
    expect(expiryLabel(expiryInfo('2027-01-01', TODAY))).toBe('');
  });

  it.each([
    ['2026-10-24', 'Expires today'],
    ['2026-10-26', 'Expires in 2 days'],
    ['2026-10-23', 'Expired yesterday'],
    ['2026-10-14', 'Expired 10 days ago'],
  ])('renders %s as "%s"', (date, expected) => {
    expect(expiryLabel(expiryInfo(date, TODAY))).toBe(expected);
  });
});

describe('matchesExpiryFilter', () => {
  it('passes everything when no filter is chosen', () => {
    expect(matchesExpiryFilter(expiryInfo('', TODAY), '')).toBe(true);
    expect(matchesExpiryFilter(expiryInfo('2026-10-01', TODAY), '')).toBe(true);
  });

  it('hides dateless documents from every named filter, including "Still valid"', () => {
    const unset = expiryInfo('', TODAY);
    expect(matchesExpiryFilter(unset, 'valid')).toBe(false);
    expect(matchesExpiryFilter(unset, 'expired')).toBe(false);
    expect(matchesExpiryFilter(unset, 'expiring')).toBe(false);
  });

  it('routes each real state to exactly one filter', () => {
    const expired = expiryInfo('2026-01-01', TODAY);
    const expiring = expiryInfo('2026-10-25', TODAY);
    const valid = expiryInfo('2027-01-01', TODAY);

    expect(matchesExpiryFilter(expired, 'expired')).toBe(true);
    expect(matchesExpiryFilter(expired, 'expiring')).toBe(false);
    expect(matchesExpiryFilter(expired, 'valid')).toBe(false);

    expect(matchesExpiryFilter(expiring, 'expiring')).toBe(true);
    expect(matchesExpiryFilter(expiring, 'valid')).toBe(false);

    expect(matchesExpiryFilter(valid, 'valid')).toBe(true);
    expect(matchesExpiryFilter(valid, 'expired')).toBe(false);
  });
});

describe('summariseExpiry', () => {
  it('counts nothing from an empty list', () => {
    expect(summariseExpiry([], TODAY)).toEqual({ expired: 0, expiring: 0, attention: 0 });
  });

  it('separates lapsed from lapsing and ignores valid plus missing dates', () => {
    const rows = [
      { expiry_date: '2026-09-30 00:00:00.000Z' }, // expired
      { expiry_date: '2026-10-20' }, // expired
      { expiry_date: '2026-10-24' }, // expiring (today)
      { expiry_date: '2026-11-10' }, // expiring
      { expiry_date: '2027-04-01' }, // valid
      { expiry_date: '' }, // unset
      { expiry_date: null }, // unset
    ];

    expect(summariseExpiry(rows, TODAY)).toEqual({ expired: 2, expiring: 2, attention: 4 });
  });

  it('does not double-count a row whose date is unparseable', () => {
    expect(summariseExpiry([{ expiry_date: 'garbage' }], TODAY).attention).toBe(0);
  });
});
