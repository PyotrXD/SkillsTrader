import { pb } from "../../lib/pocketbase/pb";
import type {
  EducationEntry,
  EducationLevel,
  WorkExperienceEntry,
} from "../../types/Candidate";
import { educationLevels } from "./candidates.constants";
import { escapeFilterValue } from "./candidates.utils";

export const WORK_EXPERIENCE_COLLECTION = "candidate_work_experiences";
export const EDUCATION_COLLECTION = "candidate_educations";

const OPEN_ENDED = "9999";

type WorkExperienceRaw = {
  id: string;
  candidate?: string | null;
  position?: string | null;
  company?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  description?: string | null;
};

type EducationRaw = {
  id: string;
  candidate?: string | null;
  level?: string | null;
  school_name?: string | null;
  course?: string | null;
  start_year?: number | string | null;
  end_year?: number | string | null;
  notes?: string | null;
};

export function emptyWorkExperience(): WorkExperienceEntry {
  return {
    position: "",
    company: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
  };
}

export function emptyEducationEntry(): EducationEntry {
  return {
    level: "",
    school_name: "",
    course: "",
    start_year: "",
    end_year: "",
    notes: "",
  };
}

function text(value?: string | null): string {
  // PocketBase returns date fields as "YYYY-MM-DD 00:00:00" in some paths, so
  // the slice keeps <input type="date"> usable (ISO 8601 sorts as a string).
  return value ? String(value).slice(0, 10) : "";
}

function year(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

export function isWorkExperienceBlank(entry: WorkExperienceEntry): boolean {
  return !(
    entry.position.trim() ||
    entry.company.trim() ||
    entry.location.trim() ||
    entry.start_date ||
    entry.end_date ||
    entry.description.trim()
  );
}

export function isEducationBlank(entry: EducationEntry): boolean {
  return !(
    entry.level ||
    entry.school_name.trim() ||
    entry.course.trim() ||
    entry.start_year ||
    entry.end_year ||
    entry.notes.trim()
  );
}

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function buildWorkExperiencePayload(
  entry: WorkExperienceEntry,
): Record<string, unknown> {
  return {
    position: entry.position.trim() || null,
    company: entry.company.trim() || null,
    location: entry.location.trim() || null,
    start_date: entry.start_date || null,
    // A current role has no end date by definition; clearing it here keeps the
    // stored rows consistent with the "Present" rendering.
    end_date: entry.is_current ? null : entry.end_date || null,
    is_current: entry.is_current,
    description: entry.description.trim() || null,
  };
}

export function buildEducationPayload(
  entry: EducationEntry,
): Record<string, unknown> {
  // `level` is required server-side; a row with content but no chosen level
  // lands in "other" instead of being dropped or rejected.
  const level = entry.level || "other";
  return {
    level,
    school_name: entry.school_name.trim() || null,
    course: entry.course.trim() || null,
    start_year: toNumberOrNull(entry.start_year),
    end_year: toNumberOrNull(entry.end_year),
    notes: entry.notes.trim() || null,
  };
}

export function mapWorkExperienceRaw(raw: WorkExperienceRaw): WorkExperienceEntry {
  return {
    id: raw.id,
    candidate: raw.candidate ?? undefined,
    position: raw.position ?? "",
    company: raw.company ?? "",
    location: raw.location ?? "",
    start_date: text(raw.start_date),
    end_date: text(raw.end_date),
    is_current: raw.is_current === true,
    description: raw.description ?? "",
  };
}

export function mapEducationRaw(raw: EducationRaw): EducationEntry {
  const level = raw.level ?? "";
  return {
    id: raw.id,
    candidate: raw.candidate ?? undefined,
    level: level as EducationLevel | "",
    school_name: raw.school_name ?? "",
    course: raw.course ?? "",
    start_year: year(raw.start_year),
    end_year: year(raw.end_year),
    notes: raw.notes ?? "",
  };
}

function workRecencyKey(entry: WorkExperienceEntry): string {
  if (entry.is_current) return `${OPEN_ENDED}-12-31`;
  return entry.end_date || entry.start_date || "";
}

/** Newest first; Array#sort is stable, so same-period rows keep API order. */
export function sortWorkExperiences(
  entries: WorkExperienceEntry[],
): WorkExperienceEntry[] {
  return [...entries].sort(
    (a, b) => workRecencyKey(b).localeCompare(workRecencyKey(a)),
  );
}

function educationRecencyKey(entry: EducationEntry): string {
  return (entry.end_year || entry.start_year || "").padStart(4, "0") || "";
}

export function sortEducations(entries: EducationEntry[]): EducationEntry[] {
  return [...entries].sort(
    (a, b) => educationRecencyKey(b).localeCompare(educationRecencyKey(a)),
  );
}

export function getLatestWorkExperience(
  entries: WorkExperienceEntry[] | undefined,
): WorkExperienceEntry | null {
  const sorted = sortWorkExperiences(entries ?? []);
  return sorted.length > 0 ? sorted[0] : null;
}

export function formatWorkPeriod(entry: WorkExperienceEntry): string {
  const start = entry.start_date.slice(0, 4);
  const end = entry.is_current ? "Present" : entry.end_date.slice(0, 4);
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

export function formatEducationPeriod(entry: EducationEntry): string {
  const start = entry.start_year;
  const end = entry.end_year;
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

export function educationLevelLabel(level: EducationEntry["level"]): string {
  return (
    educationLevels.find(([value]) => value === level)?.[1] ?? String(level)
  );
}

/**
 * Derived from the stored entries rather than persisted on the candidate, so it
 * can never drift from the rows it summarises.
 */
export function getMostRecentRole(
  entries: WorkExperienceEntry[] | undefined,
): string {
  const latest = getLatestWorkExperience(entries);
  if (!latest) return "";

  const role = [latest.position.trim(), latest.company.trim()]
    .filter(Boolean)
    .join(" - ");
  const period = formatWorkPeriod(latest);

  if (!role) return period;
  return period ? `${role} (${period})` : role;
}

async function fetchGrouped<T>(
  candidateIds: string[],
  fetcher: (page: number, perPage: number) => Promise<{
    items: T[];
    page: number;
    totalPages: number;
  }>,
  getCandidateId: (item: T) => string | undefined,
): Promise<Record<string, T[]>> {
  const grouped: Record<string, T[]> = {};
  for (const id of candidateIds) grouped[id] = [];
  if (candidateIds.length === 0) return grouped;

  const perPage = 200;
  let page = 1;
  while (true) {
    const result = await fetcher(page, perPage);
    for (const item of result.items) {
      const candidateId = getCandidateId(item);
      if (!candidateId || !grouped[candidateId]) continue;
      grouped[candidateId].push(item);
    }
    if (page >= result.totalPages) break;
    page += 1;
  }

  return grouped;
}

function buildCandidateFilter(candidateIds: string[]): string {
  return candidateIds
    .map((id) => `candidate = "${escapeFilterValue(id)}"`)
    .join(" || ");
}

export async function fetchWorkExperiencesByCandidates(
  candidateIds: string[],
): Promise<Record<string, WorkExperienceEntry[]>> {
  if (candidateIds.length === 0) return {};

  try {
    const grouped = await fetchGrouped(
      candidateIds,
      (page, perPage) =>
        pb.collection(WORK_EXPERIENCE_COLLECTION).getList<WorkExperienceRaw>(
          page,
          perPage,
          {
            filter: buildCandidateFilter(candidateIds),
            sort: "-created",
            requestKey: null,
          },
        ),
      (raw) => raw.candidate ?? undefined,
    );

    const result: Record<string, WorkExperienceEntry[]> = {};
    for (const [id, rows] of Object.entries(grouped)) {
      result[id] = sortWorkExperiences(rows.map(mapWorkExperienceRaw));
    }
    return result;
  } catch (err) {
    console.error("Failed to fetch work experiences for candidates:", err);
    const empty: Record<string, WorkExperienceEntry[]> = {};
    for (const id of candidateIds) empty[id] = [];
    return empty;
  }
}

export async function fetchEducationsByCandidates(
  candidateIds: string[],
): Promise<Record<string, EducationEntry[]>> {
  if (candidateIds.length === 0) return {};

  try {
    const grouped = await fetchGrouped(
      candidateIds,
      (page, perPage) =>
        pb.collection(EDUCATION_COLLECTION).getList<EducationRaw>(page, perPage, {
          filter: buildCandidateFilter(candidateIds),
          sort: "-created",
          requestKey: null,
        }),
      (raw) => raw.candidate ?? undefined,
    );

    const result: Record<string, EducationEntry[]> = {};
    for (const [id, rows] of Object.entries(grouped)) {
      result[id] = sortEducations(rows.map(mapEducationRaw));
    }
    return result;
  } catch (err) {
    console.error("Failed to fetch educations for candidates:", err);
    const empty: Record<string, EducationEntry[]> = {};
    for (const id of candidateIds) empty[id] = [];
    return empty;
  }
}

/**
 * Diffs the rows the form was loaded with against the rows being saved, so a
 * candidate edit creates, updates and deletes child records to match.
 */
async function syncEntries<T extends { id?: string }>(
  collection: string,
  candidateId: string,
  previous: T[],
  next: T[],
  buildPayload: (entry: T) => Record<string, unknown>,
  isBlank: (entry: T) => boolean,
): Promise<void> {
  const keptIds = new Set(
    next.filter((entry) => entry.id && !isBlank(entry)).map((entry) => entry.id),
  );

  for (const entry of previous) {
    if (!entry.id || keptIds.has(entry.id)) continue;
    await pb.collection(collection).delete(entry.id);
  }

  const previousById = new Map(
    previous.filter((entry) => entry.id).map((entry) => [entry.id, entry]),
  );

  for (const entry of next) {
    if (isBlank(entry)) continue;
    const payload = buildPayload(entry);

    if (!entry.id) {
      await pb.collection(collection).create({ ...payload, candidate: candidateId });
      continue;
    }

    const before = previousById.get(entry.id);
    if (!before) continue;
    if (
      JSON.stringify(buildPayload(before)) === JSON.stringify(payload)
    ) {
      continue;
    }
    await pb.collection(collection).update(entry.id, payload);
  }
}

export function syncWorkExperiences(
  candidateId: string,
  previous: WorkExperienceEntry[],
  next: WorkExperienceEntry[],
): Promise<void> {
  return syncEntries(
    WORK_EXPERIENCE_COLLECTION,
    candidateId,
    previous,
    next,
    buildWorkExperiencePayload,
    isWorkExperienceBlank,
  );
}

export function syncEducations(
  candidateId: string,
  previous: EducationEntry[],
  next: EducationEntry[],
): Promise<void> {
  return syncEntries(
    EDUCATION_COLLECTION,
    candidateId,
    previous,
    next,
    buildEducationPayload,
    isEducationBlank,
  );
}
