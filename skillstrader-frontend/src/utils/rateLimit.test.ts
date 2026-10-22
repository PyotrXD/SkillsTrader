import { beforeEach, describe, expect, it } from 'vitest';
import { clearAttemptsLS, getAttemptsLS, setAttemptsLS } from './rateLimit';

const EMAIL = 'applicant@example.com';

describe('getAttemptsLS', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty array when nothing is stored', () => {
    expect(getAttemptsLS(EMAIL)).toEqual([]);
  });

  it('reads back the timestamps it stored', () => {
    const attempts = [1_700_000_000_000, 1_700_000_005_000];
    setAttemptsLS(EMAIL, attempts);
    expect(getAttemptsLS(EMAIL)).toEqual(attempts);
  });

  it('returns an empty array instead of throwing on malformed JSON', () => {
    localStorage.setItem(`login_attempts_${EMAIL}`, '{not json');
    expect(() => getAttemptsLS(EMAIL)).not.toThrow();
    expect(getAttemptsLS(EMAIL)).toEqual([]);
  });

  it('never reads another email bucket — one account lockout must not leak into another', () => {
    setAttemptsLS('other@example.com', [1_700_000_000_000]);
    expect(getAttemptsLS(EMAIL)).toEqual([]);
  });

  it('is inert for an empty email so it cannot write a shared key', () => {
    setAttemptsLS('', [1_700_000_000_000]);
    expect(localStorage.length).toBe(0);
    expect(getAttemptsLS('')).toEqual([]);
  });
});

describe('clearAttemptsLS', () => {
  it('removes only that email bucket', () => {
    setAttemptsLS(EMAIL, [1_700_000_000_000]);
    setAttemptsLS('other@example.com', [1_700_000_000_000]);

    clearAttemptsLS(EMAIL);

    expect(getAttemptsLS(EMAIL)).toEqual([]);
    expect(getAttemptsLS('other@example.com')).toHaveLength(1);
  });
});
