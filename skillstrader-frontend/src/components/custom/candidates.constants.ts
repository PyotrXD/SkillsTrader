export const candidateStatuses = [
  "New Applicant",
  "Lined-Up",
  "For final interview",
  "For medical",
  "Fit to work",
  "Unfit to work",
  "Pending medical",
  "For deployment",
  "Visa Arrived",
  "Awaiting Visa",
  "Deployed",
  "Rejected",
] as const;

export const flagBadge: Record<string, string> = {
  "Not Interviewed": "bg-yellow-100 text-yellow-800",
  "Not Scheduled": "bg-yellow-100 text-yellow-800",
  "Missing Docs": "bg-[var(--accent)]/20 text-[var(--accent)]",
  Completed: "bg-blue-100 text-blue-700",
};

export const quickFilters = [
  { key: "not-interviewed", label: "Not Interviewed" },
  { key: "not-scheduled", label: "Not Scheduled" },
  { key: "missing-docs", label: "Missing Docs" },
] as const;

export const documentTypes: Array<[string, string]> = [
  ["resume", "Resume"],
  ["passport", "Passport"],
  ["visa", "VISA"],
  ["nbi_clearance", "NBI Clearance"],
  ["police_clearance", "Police Clearance"],
  ["offer_letter", "Offer Letter"],
  ["dmw_approved_contract", "DMW Approved Contract"],
  ["overseas_employment_certificate", "Overseas Employment Certificate"],
  ["peos_certificate", "PEOS Certificate"],
  ["e_registration_file", "E-registration File"],
  ["other", "Other"],
];

export const statusBadge: Record<string, string> = {
  "New Applicant": "bg-gray-100 text-gray-700",
  "Lined-Up": "bg-blue-100 text-blue-700",
  "For final interview": "bg-yellow-100 text-yellow-700",
  "For medical": "bg-purple-100 text-purple-700",
  "Fit to work": "bg-green-100 text-green-700",
  "Unfit to work": "bg-[var(--accent)]/20 text-[var(--accent)]",
  "Pending medical": "bg-orange-100 text-orange-700",
  "For deployment": "bg-sky-100 text-sky-700",
  "Visa Arrived": "bg-emerald-100 text-emerald-700",
  "Awaiting Visa": "bg-amber-100 text-amber-700",
  Deployed: "bg-teal-100 text-teal-700",
  Rejected: "bg-[var(--accent)]/20 text-[var(--accent)]",
};
