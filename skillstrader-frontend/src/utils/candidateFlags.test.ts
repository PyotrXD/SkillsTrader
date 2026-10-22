import { describe, expect, it } from 'vitest';
import {
  computeCandidateFlags,
  isTerminalStatus,
  needsInterviewAction,
  REQUIRED_DOCUMENT_TYPES,
} from './candidateFlags';

const allDocs = Object.fromEntries(REQUIRED_DOCUMENT_TYPES.map((key) => [key, 'file.pdf']));

describe('isTerminalStatus', () => {
  it.each(['Deployed', 'Rejected', 'Unfit to work'])('treats %s as terminal', (status) => {
    expect(isTerminalStatus(status)).toBe(true);
  });

  it('does not treat an in-progress status as terminal', () => {
    expect(isTerminalStatus('Interviewed')).toBe(false);
  });

  it('is case sensitive so an unknown spelling is not silently terminal', () => {
    expect(isTerminalStatus('deployed')).toBe(false);
  });
});

describe('computeCandidateFlags', () => {
  it('returns no flags at all for a terminal candidate even when docs and interview are missing', () => {
    expect(computeCandidateFlags({ status: 'Rejected', documents: null }, null)).toEqual([]);
  });

  it('flags every action item for a brand new candidate', () => {
    const flags = computeCandidateFlags({ status: 'New', documents: null }, null);
    expect(flags).toEqual(['Missing Docs', 'Not Scheduled', 'Not Interviewed']);
  });

  it('only clears Missing Docs when all three required documents are present', () => {
    for (const missing of REQUIRED_DOCUMENT_TYPES) {
      const partial = { ...allDocs, [missing]: null };
      const flags = computeCandidateFlags({ status: 'Screened', documents: partial }, {
        interview_date: '2026-10-20',
        result: 'Passed',
      });
      expect(flags, `expected Missing Docs while ${missing} is absent`).toContain('Missing Docs');
    }

    const complete = computeCandidateFlags({ status: 'Screened', documents: allDocs }, {
      interview_date: '2026-10-20',
      result: 'Passed',
    });
    expect(complete).toEqual(['Completed']);
  });

  it('treats an empty-string document as missing', () => {
    const blankDoc = { ...allDocs, resume: '' };
    const flags = computeCandidateFlags({ status: 'Screened', documents: blankDoc }, {
      interview_date: '2026-10-20',
      result: 'Passed',
    });
    expect(flags).toContain('Missing Docs');
  });

  it('flags Not Scheduled when an interview record exists but has no date', () => {
    const flags = computeCandidateFlags({ status: 'Screened', documents: allDocs }, {
      interview_date: null,
      result: 'Passed',
    });
    expect(flags).toEqual(['Not Scheduled']);
  });

  it('flags Not Interviewed when scheduled but the result is still empty', () => {
    const flags = computeCandidateFlags({ status: 'Screened', documents: allDocs }, {
      interview_date: '2026-10-20',
      result: '',
    });
    expect(flags).toEqual(['Not Interviewed']);
  });
});

describe('needsInterviewAction', () => {
  it('keeps an unscheduled candidate in the interview queue', () => {
    expect(needsInterviewAction({ status: 'Screened', documents: allDocs }, null)).toBe(true);
  });

  it('drops a candidate that has both a date and a result', () => {
    const done = { status: 'Screened', documents: allDocs };
    expect(needsInterviewAction(done, { interview_date: '2026-10-20', result: 'Passed' })).toBe(false);
  });

  it('drops a terminal candidate even with no interview record', () => {
    expect(needsInterviewAction({ status: 'Deployed', documents: allDocs }, null)).toBe(false);
  });
});
