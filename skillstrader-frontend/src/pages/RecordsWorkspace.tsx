import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPocketBaseUiError, pb, type UserRole } from '../lib/pocketbase/pb';

type Option = {
  id: string;
  label: string;
};

type RelationKey = 'candidates' | 'employer' | 'job_orders' | 'users';

type RelationOptions = Record<RelationKey, Option[]>;

type FieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'tags'
  | 'relation'
  | 'file'
  | 'bool';

type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  relationKey?: RelationKey;
};

type ColumnConfig = {
  label: string;
  path: string;
};

type DateField = {
  label: string;
  field: string;
};

type EntityConfig = {
  key: string;
  label: string;
  collection: string;
  sort: string;
  expand?: string;
  searchFields: string[];
  statusField?: string;
  statusOptions?: string[];
  dateFields?: DateField[];
  fields: FieldConfig[];
  columns: ColumnConfig[];
};

type PbRecord = {
  id: string;
  expand?: Record<string, unknown>;
  [key: string]: unknown;
};

type Props = {
  role: UserRole;
  activeKey: string;
};

const candidateStatuses = [
  'Applied',
  'Screening',
  'Screened',
  'For Interview',
  'Interviewed',
  'For Placement',
  'Placed',
  'Rejected',
];

const placementStatuses = ['Pending', 'Confirmed', 'Started', 'Completed', 'Cancelled'];
const documentStatuses = ['Draft', 'Submitted', 'Verified', 'Rejected', 'Expired'];
const documentTypes = [
  'resume',
  'passport',
  'visa',
  'nbi_clearance',
  'police_clearance',
  'offer_letter',
  'dmw_approved_contract',
  'overseas_employment_contract',
  'employer_contract',
  'other',
];

const ENTITIES: EntityConfig[] = [
  {
    key: 'candidates',
    label: 'Candidates',
    collection: 'candidates',
    sort: '-updated',
    searchFields: ['full_name', 'email', 'phone', 'address', 'desired_salary', 'status'],
    statusField: 'status',
    statusOptions: candidateStatuses,
    dateFields: [{ label: 'Consent date', field: 'consent_at' }],
    fields: [
      { name: 'full_name', label: 'Full name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'education', label: 'Education', type: 'textarea' },
      { name: 'work_history', label: 'Work history', type: 'textarea' },
      { name: 'skills', label: 'Skills (comma separated)', type: 'tags' },
      { name: 'certifications', label: 'Certifications / licenses', type: 'textarea' },
      { name: 'desired_salary', label: 'Desired salary', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', required: true, options: candidateStatuses },
      { name: 'consent_given', label: 'Consent given', type: 'bool' },
      { name: 'consent_at', label: 'Consent date', type: 'date' },
      { name: 'consent_source', label: 'Consent source', type: 'text' },
      { name: 'consent_version', label: 'Consent version', type: 'text' },
    ],
    columns: [
      { label: 'Name', path: 'full_name' },
      { label: 'Email', path: 'email' },
      { label: 'Status', path: 'status' },
      { label: 'Skills', path: 'skills' },
      { label: 'Desired salary', path: 'desired_salary' },
    ],
  },
  {
    key: 'employer',
    label: 'Employers',
    collection: 'employer',
    sort: '-updated',
    searchFields: ['company_name', 'contact_person', 'contact_email', 'contact_phone', 'country', 'industry'],
    fields: [
      { name: 'company_name', label: 'Company name', type: 'text', required: true },
      { name: 'contact_person', label: 'Contact person', type: 'text' },
      { name: 'contact_email', label: 'Contact email', type: 'email' },
      { name: 'contact_phone', label: 'Contact phone', type: 'text' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'industry', label: 'Industry', type: 'text' },
      { name: 'billing_name', label: 'Billing name', type: 'text' },
      { name: 'billing_email', label: 'Billing email', type: 'email' },
      { name: 'billing_phone', label: 'Billing phone', type: 'text' },
      { name: 'billing_address', label: 'Billing address', type: 'textarea' },
      { name: 'payment_terms', label: 'Payment terms', type: 'text' },
      { name: 'billing_notes', label: 'Billing notes', type: 'textarea' },
    ],
    columns: [
      { label: 'Company', path: 'company_name' },
      { label: 'Contact person', path: 'contact_person' },
      { label: 'Contact email', path: 'contact_email' },
      { label: 'Country', path: 'country' },
      { label: 'Industry', path: 'industry' },
    ],
  },
  {
    key: 'job_orders',
    label: 'Job Orders',
    collection: 'job_orders',
    sort: '-updated',
    expand: 'employer',
    searchFields: ['title', 'description', 'salary_range', 'status', 'client_company_id'],
    statusField: 'status',
    statusOptions: ['open', 'closed', 'filled'],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'required_skills', label: 'Required skills (comma separated)', type: 'tags' },
      { name: 'salary_range', label: 'Salary range (display)', type: 'text' },
      { name: 'salary_min', label: 'Salary min', type: 'number' },
      { name: 'salary_max', label: 'Salary max', type: 'number' },
      { name: 'salary_currency', label: 'Salary currency', type: 'text' },
      { name: 'openings', label: 'Openings', type: 'number', required: true },
      { name: 'client_company_id', label: 'Client company ID', type: 'text' },
      { name: 'employer', label: 'Employer', type: 'relation', relationKey: 'employer', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: ['open', 'closed', 'filled'] },
    ],
    columns: [
      { label: 'Title', path: 'title' },
      { label: 'Employer', path: 'expand.employer.company_name' },
      { label: 'Status', path: 'status' },
      { label: 'Openings', path: 'openings' },
      { label: 'Salary range', path: 'salary_range' },
    ],
  },
  {
    key: 'placements',
    label: 'Placements',
    collection: 'placements',
    sort: '-updated',
    expand: 'candidate,job_order',
    searchFields: ['status', 'notes'],
    statusField: 'status',
    statusOptions: placementStatuses,
    dateFields: [
      { label: 'Departure date', field: 'departure_date' },
      { label: 'Arrival date', field: 'arrival_date' },
      { label: 'Placement date', field: 'placement_date' },
      { label: 'Start date', field: 'start_date' },
    ],
    fields: [
      { name: 'candidate', label: 'Candidate', type: 'relation', relationKey: 'candidates', required: true },
      { name: 'job_order', label: 'Job order', type: 'relation', relationKey: 'job_orders', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: placementStatuses },
      { name: 'departure_date', label: 'Departure date', type: 'date' },
      { name: 'arrival_date', label: 'Arrival date', type: 'date' },
      { name: 'placement_date', label: 'Placement date', type: 'date' },
      { name: 'placement_fee_date', label: 'Placement fee date', type: 'date' },
      { name: 'placement_fee_amount', label: 'Placement fee amount', type: 'number' },
      { name: 'start_date', label: 'Start date', type: 'date' },
      { name: 'agency_fee_amount', label: 'Agency fee amount', type: 'number' },
      { name: 'commission_amount', label: 'Commission amount', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { label: 'Candidate', path: 'expand.candidate.full_name' },
      { label: 'Job order', path: 'expand.job_order.title' },
      { label: 'Status', path: 'status' },
      { label: 'Departure', path: 'departure_date' },
      { label: 'Arrival', path: 'arrival_date' },
    ],
  },
  {
    key: 'interviews',
    label: 'Interviews',
    collection: 'interviews',
    sort: '-updated',
    expand: 'candidate',
    searchFields: ['result', 'notes', 'assessment_notes'],
    dateFields: [{ label: 'Interview date', field: 'interview_date' }],
    fields: [
      { name: 'candidate', label: 'Candidate', type: 'relation', relationKey: 'candidates', required: true },
      { name: 'interview_date', label: 'Interview date', type: 'date' },
      { name: 'result', label: 'Result', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
      { name: 'assessment_score', label: 'Assessment score', type: 'number' },
      { name: 'assessment_max_score', label: 'Assessment max score', type: 'number' },
      { name: 'assessment_notes', label: 'Assessment notes', type: 'textarea' },
    ],
    columns: [
      { label: 'Candidate', path: 'expand.candidate.full_name' },
      { label: 'Interview date', path: 'interview_date' },
      { label: 'Result', path: 'result' },
      { label: 'Assessment', path: 'assessment_score' },
    ],
  },
  {
    key: 'documents',
    label: 'Documents',
    collection: 'documents',
    sort: '-updated',
    expand: 'candidate,employer,verified_by',
    searchFields: ['doc_type', 'status', 'notes'],
    statusField: 'status',
    statusOptions: documentStatuses,
    dateFields: [
      { label: 'Issued date', field: 'issued_date' },
      { label: 'Expiry date', field: 'expiry_date' },
      { label: 'Verified date', field: 'verified_at' },
    ],
    fields: [
      { name: 'candidate', label: 'Candidate', type: 'relation', relationKey: 'candidates' },
      { name: 'employer', label: 'Employer', type: 'relation', relationKey: 'employer' },
      { name: 'doc_type', label: 'Document type', type: 'select', required: true, options: documentTypes },
      { name: 'file', label: 'File', type: 'file', required: true },
      { name: 'issued_date', label: 'Issued date', type: 'date' },
      { name: 'expiry_date', label: 'Expiry date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', required: true, options: documentStatuses },
      { name: 'notes', label: 'Notes', type: 'textarea' },
      { name: 'verified_by', label: 'Verified by', type: 'relation', relationKey: 'users' },
      { name: 'verified_at', label: 'Verified at', type: 'date' },
    ],
    columns: [
      { label: 'Type', path: 'doc_type' },
      { label: 'Candidate', path: 'expand.candidate.full_name' },
      { label: 'Employer', path: 'expand.employer.company_name' },
      { label: 'Status', path: 'status' },
      { label: 'Verified by', path: 'expand.verified_by.email' },
    ],
  },
];

export const RECORD_ENTITY_ITEMS = ENTITIES.map((entity) => ({
  key: entity.key,
  label: entity.label,
}));

function toArrayString(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .join(', ');
}

function valueAtPath(record: Record<string, unknown> | undefined, path: string): unknown {
  if (!record) return undefined;

  const parts = path.split('.');
  let current: unknown = record;

  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.length > 0 ? value : '-';
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  return String(value);
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildInitialForm(config: EntityConfig): Record<string, string> {
  const initial: Record<string, string> = {};
  for (const field of config.fields) {
    if (field.type === 'bool') {
      initial[field.name] = '';
      continue;
    }
    initial[field.name] = '';
  }
  return initial;
}

async function loadRelationOptions(): Promise<RelationOptions> {
  const [candidates, employers, jobOrders, users] = await Promise.all([
    pb.collection('candidates').getFullList({ sort: 'full_name' }),
    pb.collection('employer').getFullList({ sort: 'company_name' }),
    pb.collection('job_orders').getFullList({ sort: 'title' }),
    pb.collection('users').getFullList({ sort: 'email' }),
  ]);

  return {
    candidates: candidates.map((item) => ({ id: item.id, label: String(item.full_name ?? item.id) })),
    employer: employers.map((item) => ({ id: item.id, label: String(item.company_name ?? item.id) })),
    job_orders: jobOrders.map((item) => ({ id: item.id, label: String(item.title ?? item.id) })),
    users: users.map((item) => ({ id: item.id, label: String(item.email ?? item.id) })),
  };
}

export default function RecordsWorkspace({ role, activeKey }: Props) {
  const canDelete = role !== 'staff';
  const [records, setRecords] = useState<PbRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [dateField, setDateField] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PbRecord | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [relationOptions, setRelationOptions] = useState<RelationOptions>({
    candidates: [],
    employer: [],
    job_orders: [],
    users: [],
  });

  const activeConfig = useMemo(() => ENTITIES.find((entity) => entity.key === activeKey) ?? ENTITIES[0], [activeKey]);

  useEffect(() => {
    let mounted = true;

    loadRelationOptions()
      .then((options) => {
        if (mounted) setRelationOptions(options);
      })
      .catch(() => {
        if (mounted) setRelationOptions({ candidates: [], employer: [], job_orders: [], users: [] });
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setIsCreating(false);
    setEditingRecord(null);
    setFormData(buildInitialForm(activeConfig));
    setFiles({});
    setFormError(null);
    setStatusValue('');

    if (activeConfig.dateFields && activeConfig.dateFields.length > 0) {
      setDateField(activeConfig.dateFields[0].field);
    } else {
      setDateField('');
    }

    setDateFrom('');
    setDateTo('');
  }, [activeConfig]);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const conditions: string[] = [];
      const trimmedQuery = query.trim();

      if (trimmedQuery.length > 0 && activeConfig.searchFields.length > 0) {
        const escaped = escapeFilterValue(trimmedQuery);
        const searchParts = activeConfig.searchFields.map((field) => `${field} ~ '${escaped}'`);
        conditions.push(`(${searchParts.join(' || ')})`);
      }

      if (activeConfig.statusField && statusValue) {
        conditions.push(`${activeConfig.statusField} = '${escapeFilterValue(statusValue)}'`);
      }

      if (dateField && dateFrom) {
        conditions.push(`${dateField} >= '${escapeFilterValue(dateFrom)}'`);
      }

      if (dateField && dateTo) {
        conditions.push(`${dateField} <= '${escapeFilterValue(dateTo)}'`);
      }

      const filter = conditions.length > 0 ? conditions.join(' && ') : undefined;

      const list = await pb.collection(activeConfig.collection).getFullList<PbRecord>({
        sort: activeConfig.sort,
        expand: activeConfig.expand,
        filter,
      });

      setRecords(list);
    } catch (err) {
      const message = getPocketBaseUiError(err, 'Failed to load records.');
      if (message) {
        setError(message);
        setRecords([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeConfig, dateField, dateFrom, dateTo, query, statusValue]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    if (!query.trim()) return records;

    const lowerQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const values = activeConfig.columns
        .map((column) => renderValue(valueAtPath(record, column.path)).toLowerCase())
        .join(' ');
      return values.includes(lowerQuery);
    });
  }, [activeConfig.columns, query, records]);

  function startCreate() {
    setIsCreating(true);
    setEditingRecord(null);
    setFormData(buildInitialForm(activeConfig));
    setFiles({});
    setFormError(null);
  }

  function startEdit(record: PbRecord) {
    const nextForm: Record<string, string> = {};

    for (const field of activeConfig.fields) {
      const value = record[field.name];

      if (field.type === 'tags') {
        nextForm[field.name] = toArrayString(value);
      } else if (field.type === 'bool') {
        if (typeof value === 'boolean') nextForm[field.name] = value ? 'true' : 'false';
        else nextForm[field.name] = '';
      } else if (value === null || value === undefined) {
        nextForm[field.name] = '';
      } else {
        nextForm[field.name] = String(value);
      }
    }

    setEditingRecord(record);
    setIsCreating(false);
    setFormData(nextForm);
    setFiles({});
    setFormError(null);
  }

  function cancelForm() {
    setIsCreating(false);
    setEditingRecord(null);
    setFormData(buildInitialForm(activeConfig));
    setFiles({});
    setFormError(null);
  }

  function validateForm(): string | null {
    for (const field of activeConfig.fields) {
      const currentValue = (formData[field.name] ?? '').trim();

      if (field.required && field.type !== 'file' && currentValue.length === 0) {
        return `${field.label} is required.`;
      }

      if (field.type === 'file' && field.required && !editingRecord && !files[field.name]) {
        return `${field.label} is required.`;
      }
    }

    return null;
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const payload: Record<string, unknown> = {};

      for (const field of activeConfig.fields) {
        const raw = formData[field.name] ?? '';

        if (field.type === 'file') {
          if (files[field.name]) payload[field.name] = files[field.name];
          continue;
        }

        if (field.type === 'number') {
          payload[field.name] = raw.trim().length > 0 ? Number(raw) : null;
          continue;
        }

        if (field.type === 'tags') {
          payload[field.name] = raw
            .split(',')
            .map((token) => token.trim())
            .filter(Boolean);
          continue;
        }

        if (field.type === 'bool') {
          if (raw === 'true') payload[field.name] = true;
          else if (raw === 'false') payload[field.name] = false;
          else payload[field.name] = null;
          continue;
        }

        payload[field.name] = raw.trim().length > 0 ? raw.trim() : null;
      }

      if (editingRecord) {
        await pb.collection(activeConfig.collection).update(editingRecord.id, payload);
      } else {
        await pb.collection(activeConfig.collection).create(payload);
      }

      cancelForm();
      await loadRecords();
      const options = await loadRelationOptions();
      setRelationOptions(options);
    } catch (err) {
      const message = getPocketBaseUiError(err, 'Failed to save record.');
      if (message) setFormError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function removeRecord(record: PbRecord) {
    if (!canDelete) return;

    const confirmed = window.confirm(`Delete this ${activeConfig.label.slice(0, -1).toLowerCase()} record?`);
    if (!confirmed) return;

    try {
      await pb.collection(activeConfig.collection).delete(record.id);
      await loadRecords();
      const options = await loadRelationOptions();
      setRelationOptions(options);
    } catch (err) {
      const message = getPocketBaseUiError(err, 'Failed to delete record.');
      if (message) setError(message);
    }
  }

  const showForm = isCreating || editingRecord !== null;

  return (
    <section className="bg-[var(--surface)] border border-[var(--border)] rounded-[18px] shadow-[0_14px_44px_rgba(26,23,20,0.08),var(--inset)] p-[18px]" aria-label="Core records workspace">
      <div className="grid gap-3.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5" aria-label="Search and filters">
            <input
              className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              placeholder={`Search ${activeConfig.label.toLowerCase()}...`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            {activeConfig.statusField && activeConfig.statusOptions ? (
              <select
                className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                value={statusValue}
                onChange={(event) => setStatusValue(event.target.value)}
              >
                <option value="">Any status</option>
                {activeConfig.statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            ) : null}

            {activeConfig.dateFields && activeConfig.dateFields.length > 0 ? (
              <select
                className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                value={dateField}
                onChange={(event) => setDateField(event.target.value)}
              >
                {activeConfig.dateFields.map((item) => (
                  <option key={item.field} value={item.field}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : null}

            {activeConfig.dateFields && activeConfig.dateFields.length > 0 ? (
              <input
                className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            ) : null}

            {activeConfig.dateFields && activeConfig.dateFields.length > 0 ? (
              <input
                className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            ) : null}

            <button type="button" className="border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 active:translate-y-[1px] active:filter-none inline-flex items-center justify-center no-underline" onClick={() => void loadRecords()}>
              Apply filters
            </button>

            {!showForm ? (
              <button type="button" className="border-none text-white bg-gradient-to-br from-[var(--primary)] to-[var(--primary2)] shadow-[0_8px_26px_rgba(200,75,49,0.18)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 active:translate-y-[1px] active:filter-none inline-flex items-center justify-center no-underline" onClick={startCreate}>
                New {activeConfig.label.slice(0, -1)}
              </button>
            ) : null}
        </div>

        {showForm ? (
          <form className="border border-[var(--border)] rounded-2xl p-3.5 grid gap-3 bg-white" onSubmit={submitForm}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-[17px]">{editingRecord ? 'Edit record' : 'Create record'}</h2>
              <div className="flex items-center gap-2">
                <button type="button" className="border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 active:translate-y-[1px] active:filter-none inline-flex items-center justify-center no-underline" onClick={cancelForm}>
                  Cancel
                </button>
                <button type="submit" className="border-none text-white bg-gradient-to-br from-[var(--primary)] to-[var(--primary2)] shadow-[0_8px_26px_rgba(200,75,49,0.18)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 active:translate-y-[1px] active:filter-none inline-flex items-center justify-center no-underline disabled:opacity-70" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {activeConfig.fields.map((field) => {
                const value = formData[field.name] ?? '';

                if (field.type === 'textarea') {
                  return (
                    <label key={field.name} className="grid gap-[5px] col-span-1 md:col-span-2">
                      <span className="text-[12px] text-[var(--muted)] font-bold">{field.label}</span>
                      <textarea
                        className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] min-h-[88px] resize-y"
                        value={value}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [field.name]: event.target.value }))
                        }
                      />
                    </label>
                  );
                }

                if (field.type === 'select' && field.options) {
                  return (
                    <label key={field.name} className="grid gap-[5px]">
                      <span className="text-[12px] text-[var(--muted)] font-bold">{field.label}</span>
                      <select
                        className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                        value={value}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [field.name]: event.target.value }))
                        }
                      >
                        <option value="">Select...</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (field.type === 'bool') {
                  return (
                    <label key={field.name} className="grid gap-[5px]">
                      <span className="text-[12px] text-[var(--muted)] font-bold">{field.label}</span>
                      <select
                        className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                        value={value}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [field.name]: event.target.value }))
                        }
                      >
                        <option value="">Not set</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </label>
                  );
                }

                if (field.type === 'relation' && field.relationKey) {
                  const options = relationOptions[field.relationKey] ?? [];
                  return (
                    <label key={field.name} className="grid gap-[5px]">
                      <span className="text-[12px] text-[var(--muted)] font-bold">{field.label}</span>
                      <select
                        className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                        value={value}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, [field.name]: event.target.value }))
                        }
                      >
                        <option value="">Select...</option>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                if (field.type === 'file') {
                  return (
                    <label key={field.name} className="grid gap-[5px] col-span-1 md:col-span-2">
                      <span className="text-[12px] text-[var(--muted)] font-bold">{field.label}</span>
                      <input
                        className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                        type="file"
                        onChange={(event) => {
                          const selected = event.target.files?.[0] ?? null;
                          setFiles((prev) => ({ ...prev, [field.name]: selected }));
                        }}
                      />
                    </label>
                  );
                }

                const inputType = field.type === 'number' || field.type === 'date' || field.type === 'email' ? field.type : 'text';

                return (
                  <label key={field.name} className="grid gap-[5px]">
                    <span className="text-[12px] text-[var(--muted)] font-bold">{field.label}</span>
                    <input
                      className="w-full border border-[var(--border)] bg-white text-[var(--text)] rounded-xl px-[11px] py-[10px] text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      type={inputType}
                      value={value}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, [field.name]: event.target.value }))
                      }
                    />
                  </label>
                );
              })}
            </div>

            {formError ? <p className="m-0 text-[#9f2d20] text-[13px]">{formError}</p> : null}
          </form>
        ) : null}

        {error ? <p className="m-0 text-[#9f2d20] text-[13px]">{error}</p> : null}

        <div className="grid gap-2.5" aria-live="polite">
          {isLoading ? <p className="m-0 text-[var(--muted)] text-[13px]">Loading {activeConfig.label.toLowerCase()}...</p> : null}
          {!isLoading && filteredRecords.length === 0 ? (
            <p className="m-0 text-[var(--muted)] text-[13px]">No records found.</p>
          ) : null}

          {!isLoading
            ? filteredRecords.map((record) => (
                <article key={record.id} className="border border-[var(--border)] rounded-2xl bg-white p-3 grid gap-2">
                  <div className="flex justify-between gap-2 items-center">
                    <h3 className="m-0 text-[12px] text-[var(--muted)] font-mono">{record.id}</h3>
                    <div className="flex gap-2">
                      <button type="button" className="border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 active:translate-y-[1px] active:filter-none inline-flex items-center justify-center no-underline" onClick={() => startEdit(record)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 active:translate-y-[1px] active:filter-none inline-flex items-center justify-center no-underline disabled:opacity-50"
                        disabled={!canDelete}
                        onClick={() => void removeRecord(record)}
                        title={canDelete ? 'Delete record' : 'Staff cannot delete records'}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <dl className="m-0 grid grid-cols-2 lg:grid-cols-5 gap-2">
                    {activeConfig.columns.map((column) => {
                      const raw = valueAtPath(record, column.path);
                      const rendered = renderValue(raw);
                      return (
                        <div key={`${record.id}-${column.path}`} className="grid gap-[3px]">
                          <dt className="text-[11px] text-[var(--muted)] font-bold">{column.label}</dt>
                          <dd className="m-0 text-[13px]">{rendered}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </article>
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
