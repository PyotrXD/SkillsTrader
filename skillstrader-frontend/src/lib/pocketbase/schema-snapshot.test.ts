import { describe, expect, it } from 'vitest';

import { schemaSnapshot } from './schema-snapshot';
import { buildCandidatePayload, initialForm } from '../../components/custom/candidates.utils';

// Guards docs/system-improvements.md S5. PocketBase silently discards any body field that is not a
// column on the collection, so a form field left behind by a migration looks like it saved and then
// reads back empty. `school_other_name` did exactly that: declared in the form types, initialised,
// sent in the write payload, rendered in two forms and read by the resume generator, long after
// 1784276050 had dropped the column.
//
// The snapshot is generated from a throwaway replay of pb_migrations/ (see
// scripts/export-schema-snapshot.mjs). This test needs no database and no PocketBase binary, so it
// runs in the normal `npm run test` suite. Snapshot *freshness* is verified separately by
// `node scripts/export-schema-snapshot.mjs --verify`, because a browser test cannot read the
// filesystem to notice that a new migration landed without the snapshot being regenerated.

const candidatesFields = schemaSnapshot.collections.candidates as readonly string[];
const payload = buildCandidatePayload(initialForm);

describe('candidate write payload against the collection schema', () => {
  it('sends only fields that exist as candidates columns', () => {
    const dropped = Object.keys(payload).filter((key) => !candidatesFields.includes(key));
    // Anything listed here is input PocketBase will discard with no error and no log.
    expect(dropped).toEqual([]);
  });

  it('does not resurrect the dropped school_other_name as a dead write', () => {
    expect(payload).not.toHaveProperty('school_other_name');
    expect(candidatesFields).not.toContain('school_other_name');
    // The column that replaced it must be written, or editing "Other School" is silently lost --
    // the second half of the S5 bug, where the change-detection list watched the dead key and
    // omitted the live one.
    expect(candidatesFields).toContain('school_other');
    expect(payload).toHaveProperty('school_other');
  });

  it('writes the personal-detail columns the profile view reads back', () => {
    for (const field of [
      'full_name',
      'first_name',
      'last_name',
      'middle_name',
      'prefix',
      'suffix',
      'email',
      'phone',
      'birthdate',
      'gender',
      'marital_status',
      'religion',
      'home_address',
      'permanent_address',
      'sss_number',
      'pagibig_number',
      'philhealth',
      'highest_educ_attainment',
      'school_elementary',
      'school_junior_high',
      'school_senior_high',
      'school_college',
      'work_history',
      'certifications',
      'desired_salary',
      'position_screened',
      'notes',
      'status',
      'consent_given',
      'consent_version',
    ]) {
      expect(payload, `the candidate form no longer writes ${field}`).toHaveProperty(field);
      expect(candidatesFields, `the candidates collection no longer has a ${field} column`).toContain(field);
    }
  });
});

describe('collections the authorization tiers depend on', () => {
  // scripts/check-api-rules.mjs asserts API rules against these exact collection names. If one is
  // renamed or dropped, that script would silently stop governing a live collection, so it fails
  // here first.
  it('includes every collection governed by the access rules', () => {
    for (const name of [
      'candidates',
      'documents',
      'employer',
      'interviews',
      'job_orders',
      'placements',
      'positions',
      'candidates_legacy',
      'candidate_work_experiences',
      'candidate_educations',
      'audit_logs',
    ]) {
      expect(schemaSnapshot.collections, `${name} is not in the schema snapshot`).toHaveProperty(name);
    }
  });

  it('keeps the columns the documents UI binds to', () => {
    const fields = schemaSnapshot.collections.documents as readonly string[];
    for (const field of ['file', 'doc_type', 'candidate', 'status', 'issued_date', 'expiry_date', 'verified_at', 'verified_by']) {
      expect(fields, `documents is missing the ${field} column`).toContain(field);
    }
  });

  it('keeps the child columns the history entry editors write to', () => {
    const work = schemaSnapshot.collections.candidate_work_experiences as readonly string[];
    const edu = schemaSnapshot.collections.candidate_educations as readonly string[];
    expect(work).toContain('candidate');
    expect(edu).toContain('candidate');
  });

  it('records which migration the snapshot was generated from', () => {
    expect(schemaSnapshot.generatedFrom.migrationCount).toBeGreaterThan(0);
    expect(schemaSnapshot.generatedFrom.lastMigration).toMatch(/^17\d{8}_.+\.js$/);
  });
});
