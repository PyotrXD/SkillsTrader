import type { Dispatch, SetStateAction } from "react";
import type { CandidateForm, PositionRecord } from "../../types/Candidate";
import { EducationFields, WorkExperienceFields } from "./CandidateHistoryFields";
import { candidateStatuses } from "./candidates.constants";

export type CandidateFormTab = "personal" | "education" | "work" | "details";

const TABS: Array<{ key: CandidateFormTab; label: string }> = [
  { key: "personal", label: "Personal Information" },
  { key: "education", label: "Education History" },
  { key: "work", label: "Work History" },
  { key: "details", label: "Details" },
];

type Props = {
  form: CandidateForm;
  setForm: Dispatch<SetStateAction<CandidateForm>>;
  positions: PositionRecord[];
  tab: CandidateFormTab;
  onTabChange: (tab: CandidateFormTab) => void;
};

export default function CandidateFormFields({ form, setForm, positions, tab, onTabChange }: Props) {
  return (
    <div>
    <div className="flex flex-wrap border-b border-gray-200 mb-6">
      {TABS.map((entry) => (
        <button
          key={entry.key}
          type="button"
          onClick={() => onTabChange(entry.key)}
          className={`px-4 py-2 font-medium text-sm ${
            tab === entry.key
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {entry.label}
        </button>
      ))}
    </div>
    {tab === "personal" && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-(--border) rounded-xl p-4">
          <h3 className="text-lg font-semibold text-(--text) mb-4">Personal Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Last Name *</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({...form, last_name: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">First Name *</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({...form, first_name: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Middle Name</label>
              <input
                type="text"
                value={form.middle_name}
                onChange={(e) => setForm({...form, middle_name: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Prefix</label>
              <input
                type="text"
                value={form.prefix}
                onChange={(e) => setForm({...form, prefix: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Suffix</label>
              <input
                type="text"
                value={form.suffix}
                onChange={(e) => setForm({...form, suffix: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Phone *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({...form, phone: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Marital Status</label>
              <select
                value={form.marital_status}
                onChange={(e) => setForm({...form, marital_status: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              >
                <option value="">Select Marital Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Birthdate</label>
              <input
                type="date"
                value={form.birthdate}
                onChange={(e) => setForm({...form, birthdate: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Gender</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({...form, gender: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              >
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Religion</label>
              <input
                type="text"
                value={form.religion}
                onChange={(e) => setForm({...form, religion: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Height</label>
              <input
                type="text"
                value={form.height}
                onChange={(e) => setForm({...form, height: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                placeholder="e.g. 1.52 m"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Weight</label>
              <input
                type="text"
                value={form.weight}
                onChange={(e) => setForm({...form, weight: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                placeholder="e.g. 47 kg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({...form, status: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              >
                {candidateStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border border-(--border) rounded-xl p-4">
          <h3 className="text-lg font-semibold text-(--text) mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Home Address</label>
              <textarea
                value={form.home_address}
                onChange={(e) => setForm({...form, home_address: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Permanent Address</label>
              <textarea
                value={form.permanent_address}
                onChange={(e) => setForm({...form, permanent_address: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                rows={3}
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-(--text) mb-4 mt-6">Government IDs</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Pag-IBIG Number</label>
              <input
                type="text"
                value={form.pagibig_number}
                onChange={(e) => setForm({...form, pagibig_number: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">SSS Number</label>
              <input
                type="text"
                value={form.sss_number}
                onChange={(e) => setForm({...form, sss_number: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">PhilHealth</label>
              <input
                type="text"
                value={form.philhealth}
                onChange={(e) => setForm({...form, philhealth: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
          </div>
        </div>
      </div>
    )}

    {tab === "education" && (
        <div className="border border-(--border) rounded-xl p-4">
          <h3 className="text-lg font-semibold text-(--text) mb-4">Education</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Highest Educational Attainment</label>
              <input
                type="text"
                value={form.highest_educ_attainment}
                onChange={(e) => setForm({...form, highest_educ_attainment: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Elementary School</label>
              <input
                type="text"
                value={form.school_elementary}
                onChange={(e) => setForm({...form, school_elementary: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Junior High School</label>
              <input
                type="text"
                value={form.school_junior_high}
                onChange={(e) => setForm({...form, school_junior_high: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Senior High School</label>
              <input
                type="text"
                value={form.school_senior_high}
                onChange={(e) => setForm({...form, school_senior_high: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">College</label>
              <input
                type="text"
                value={form.school_college}
                onChange={(e) => setForm({...form, school_college: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Other School</label>
              <input
                type="text"
                value={form.school_other}
                onChange={(e) => setForm({...form, school_other: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div className="pt-4 border-t border-(--border)">
              <h4 className="text-sm font-semibold text-(--text) mb-1">School History</h4>
              <p className="text-xs text-(--muted) mb-3">
                One row per school attended; every row is saved as its own entry.
              </p>
              <EducationFields
                entries={form.educations}
                onChange={(next) => setForm({...form, educations: next})}
              />
            </div>
          </div>
        </div>
    )}

    {tab === "work" && (
        <div className="border border-(--border) rounded-xl p-4">
          <h3 className="text-lg font-semibold text-(--text) mb-4">Work Experience</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-(--text) mb-1">Work History</h4>
              <p className="text-xs text-(--muted) mb-3">
                One row per job; the most recent row is used as the latest role.
              </p>
              <WorkExperienceFields
                entries={form.work_experiences}
                onChange={(next) => setForm({...form, work_experiences: next})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Skills</label>
              <textarea
                value={form.skills}
                onChange={(e) => setForm({...form, skills: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Certifications</label>
              <textarea
                value={form.certifications}
                onChange={(e) => setForm({...form, certifications: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                rows={3}
              />
            </div>
          </div>
        </div>
    )}

    {tab === "details" && (
      <div className="border border-(--border) rounded-xl p-4">
        <h3 className="text-lg font-semibold text-(--text) mb-4">Details</h3>
        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Desired Salary</label>
              <input
                type="text"
                value={form.desired_salary}
                onChange={(e) => setForm({...form, desired_salary: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Position Screened</label>
              <select
                value={form.position_screened}
                onChange={(e) => setForm({...form, position_screened: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
              >
                <option value="">Select a position</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.title}>
                    {position.industry} - {position.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-(--muted) mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({...form, notes: e.target.value})}
                className="w-full px-3 py-2 border border-(--border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--primary)"
                rows={3}
              />
            </div>
        </div>
      </div>
    )}
    </div>
  );
}
