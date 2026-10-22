import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import type { EducationEntry, WorkExperienceEntry } from "../../types/Candidate";
import { educationLevels } from "./candidates.constants";
import {
  emptyEducationEntry,
  emptyWorkExperience,
  formatEducationPeriod,
  formatWorkPeriod,
} from "./candidateHistory";

const inputClass =
  "w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)";
const labelClass = "block text-sm font-medium text-(--muted) mb-1";
const addButtonClass =
  "inline-flex items-center gap-1 px-3 py-1.5 border border-(--border) text-(--text) rounded-md hover:bg-(--surface2) transition-colors text-sm";
const removeButtonClass =
  "inline-flex items-center gap-1 px-2 py-1 text-(--muted) hover:text-(--accent) transition-colors text-sm";

type RowProps = {
  index: number;
  title: string;
  onRemove: () => void;
  removeLabel: string;
  children: ReactNode;
};

function EntryRow({ index, title, onRemove, removeLabel, children }: RowProps) {
  return (
    <fieldset className="border border-(--border) rounded-lg p-3">
      <legend className="sr-only">{`Entry ${index + 1}`}</legend>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-sm font-medium text-(--text)">{title}</span>
        <button
          type="button"
          onClick={onRemove}
          className={removeButtonClass}
          aria-label={removeLabel}
        >
          <Icon icon="tabler:trash" width="16" height="16" aria-hidden="true" />
          Remove
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function AddEntryButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={addButtonClass}>
      <Icon icon="tabler:plus" width="16" height="16" aria-hidden="true" />
      {label}
    </button>
  );
}

type HistoryListProps<T extends { id?: string }> = {
  entries: T[];
  onChange: (next: T[]) => void;
  createEmpty: () => T;
  addLabel: string;
  rowTitle: (entry: T, index: number) => string;
  removeLabel: (index: number) => string;
  renderFields: (entry: T, index: number, patch: (next: Partial<T>) => void) => ReactNode;
};

function HistoryList<T extends { id?: string }>({
  entries,
  onChange,
  createEmpty,
  addLabel,
  rowTitle,
  removeLabel,
  renderFields,
}: HistoryListProps<T>) {
  function patchAt(index: number, changes: Partial<T>) {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...changes } : entry)));
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-sm text-(--muted)">No entries yet.</p>
      )}
      {entries.map((entry, index) => (
        <EntryRow
          key={entry.id ?? `new-${index}`}
          index={index}
          title={rowTitle(entry, index)}
          removeLabel={removeLabel(index)}
          onRemove={() => onChange(entries.filter((_, i) => i !== index))}
        >
          {renderFields(entry, index, (changes) => patchAt(index, changes))}
        </EntryRow>
      ))}
      <AddEntryButton onClick={() => onChange([...entries, createEmpty()])} label={addLabel} />
    </div>
  );
}

type WorkExperienceFieldsProps = {
  entries: WorkExperienceEntry[];
  onChange: (next: WorkExperienceEntry[]) => void;
};

export function WorkExperienceFields({
  entries,
  onChange,
}: WorkExperienceFieldsProps) {
  return (
    <HistoryList
      entries={entries}
      onChange={onChange}
      createEmpty={emptyWorkExperience}
      addLabel="Add work history entry"
      rowTitle={(entry, index) =>
        entry.position || entry.company
          ? `${entry.position || "Role"}${entry.company ? ` — ${entry.company}` : ""}`
          : `Entry ${index + 1}`
      }
      removeLabel={(index) => `Remove work history entry ${index + 1}`}
      renderFields={(entry, index, patch) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor={`work-position-${index}`}>
                Position
              </label>
              <input
                id={`work-position-${index}`}
                type="text"
                value={entry.position}
                onChange={(e) => patch({ position: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`work-company-${index}`}>
                Company
              </label>
              <input
                id={`work-company-${index}`}
                type="text"
                value={entry.company}
                onChange={(e) => patch({ company: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor={`work-location-${index}`}>
              Location
            </label>
            <input
              id={`work-location-${index}`}
              type="text"
              value={entry.location}
              onChange={(e) => patch({ location: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor={`work-start-${index}`}>
                Start date
              </label>
              <input
                id={`work-start-${index}`}
                type="date"
                value={entry.start_date}
                onChange={(e) => patch({ start_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`work-end-${index}`}>
                End date
              </label>
              <input
                id={`work-end-${index}`}
                type="date"
                value={entry.end_date}
                onChange={(e) => patch({ end_date: e.target.value })}
                className={inputClass}
                disabled={entry.is_current}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id={`work-current-${index}`}
              type="checkbox"
              checked={entry.is_current}
              onChange={(e) =>
                patch({ is_current: e.target.checked, end_date: e.target.checked ? "" : entry.end_date })
              }
              className="h-4 w-4 border border-(--border) rounded"
            />
            <label className="text-sm text-(--muted)" htmlFor={`work-current-${index}`}>
              Currently employed here
            </label>
          </div>
          <div>
            <label className={labelClass} htmlFor={`work-description-${index}`}>
              Description
            </label>
            <textarea
              id={`work-description-${index}`}
              value={entry.description}
              onChange={(e) => patch({ description: e.target.value })}
              className={inputClass}
              rows={3}
            />
          </div>
          <p className="text-xs text-(--muted)">
            Period: {formatWorkPeriod(entry) || "Not set"}
          </p>
        </>
      )}
    />
  );
}

type EducationFieldsProps = {
  entries: EducationEntry[];
  onChange: (next: EducationEntry[]) => void;
};

export function EducationFields({ entries, onChange }: EducationFieldsProps) {
  return (
    <HistoryList
      entries={entries}
      onChange={onChange}
      createEmpty={emptyEducationEntry}
      addLabel="Add school entry"
      rowTitle={(entry, index) =>
        entry.school_name
          ? `${entry.school_name}${entry.course ? ` — ${entry.course}` : ""}`
          : `Entry ${index + 1}`
      }
      removeLabel={(index) => `Remove school entry ${index + 1}`}
      renderFields={(entry, index, patch) => (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor={`edu-level-${index}`}>
                Level
              </label>
              <select
                id={`edu-level-${index}`}
                value={entry.level}
                onChange={(e) => patch({ level: e.target.value as EducationEntry["level"] })}
                className={inputClass}
              >
                <option value="">Select a level</option>
                {educationLevels.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor={`edu-school-${index}`}>
                School name
              </label>
              <input
                id={`edu-school-${index}`}
                type="text"
                value={entry.school_name}
                onChange={(e) => patch({ school_name: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor={`edu-course-${index}`}>
              Course / degree / strand
            </label>
            <input
              id={`edu-course-${index}`}
              type="text"
              value={entry.course}
              onChange={(e) => patch({ course: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor={`edu-start-${index}`}>
                Start year
              </label>
              <input
                id={`edu-start-${index}`}
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                value={entry.start_year}
                onChange={(e) => patch({ start_year: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`edu-end-${index}`}>
                End year
              </label>
              <input
                id={`edu-end-${index}`}
                type="number"
                inputMode="numeric"
                min={1900}
                max={2100}
                value={entry.end_year}
                onChange={(e) => patch({ end_year: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor={`edu-notes-${index}`}>
              Notes
            </label>
            <input
              id={`edu-notes-${index}`}
              type="text"
              value={entry.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              className={inputClass}
            />
          </div>
          <p className="text-xs text-(--muted)">
            Years: {formatEducationPeriod(entry) || "Not set"}
          </p>
        </>
      )}
    />
  );
}
