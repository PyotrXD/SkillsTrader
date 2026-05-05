import { useState, useMemo, useEffect } from "react";
import Modal from "../ui/Modal";
import Searchbar from "../ui/Searchbar";
import Selection from "../ui/Selection";
import IndustryPositionPicker from "../ui/IndustryPositionPicker";
import { Icon } from "@iconify/react";
import { pb } from '../../lib/pocketbase/pb';

interface Position {
  id: number | string;
  industry: string;
  title: string;
  description: string;
}

type PositionRecord = {
  id: string;
  industry?: string;
  title?: string;
  description?: string;
};

const initialForm: Omit<Position, "id"> = {
  industry: "",
  title: "",
  description: "",
};

const NEW_INDUSTRY_VALUE = "__new__";

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [form, setForm] = useState(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | string | null>(null);
  const [expandedIndustry, setExpandedIndustry] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePosition, setDeletePosition] = useState<Position | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  // Filter by position title via the picker (empty = show all)
  const [filterPosition, setFilterPosition] = useState("");
  const [error, setError] = useState("");
  const [isNewIndustry, setIsNewIndustry] = useState(false);
  const isEditing = editId !== null;

  async function fetchPositions() {
    try {
      const items = await pb.collection('positions').getFullList<PositionRecord>({
        sort: 'industry,title',
        requestKey: null,
      });
      setPositions(
        items.map((it) => ({
          id: it.id,
          industry: it.industry ?? '',
          title: it.title ?? '',
          description: it.description ?? '',
        }))
      );
    } catch (err) {
      console.error('Failed to load positions', err);
      setPositions([]);
    }
  }

  useEffect(() => {
    fetchPositions();
  }, []);

  const existingIndustries = useMemo(
    () =>
      Array.from(new Set(positions.map((p) => p.industry)))
        .filter(Boolean)
        .sort(),
    [positions]
  );

  const industrySelectOptions = useMemo(() => [
    ...existingIndustries.map((ind) => ({ value: ind, label: ind })),
    { value: "", label: "— or create a new one —", disabled: true },
    { value: NEW_INDUSTRY_VALUE, label: "+ Create new industry" },
  ], [existingIndustries]);

  // Filtered positions — filter by search text AND selected position from picker
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return positions.filter((p) => {
      const matchesSearch =
        !q ||
        p.industry.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      // If a position is picked in the filter, only show that industry's group
      const matchesFilter = filterPosition
        ? p.industry === positions.find((pos) => pos.title === filterPosition)?.industry
        : true;
      return matchesSearch && matchesFilter;
    });
  }, [positions, search, filterPosition]);

  const grouped = useMemo(() => {
    const map = new Map<string, Position[]>();
    for (const p of filtered) {
      if (!map.has(p.industry)) map.set(p.industry, []);
      map.get(p.industry)!.push(p);
    }
    return map;
  }, [filtered]);

  function openForm(position?: Position) {
    if (position) {
      setForm({ industry: position.industry, title: position.title, description: position.description });
      setEditId(position.id);
      setIsNewIndustry(!existingIndustries.includes(position.industry));
    } else {
      setForm(initialForm);
      setEditId(null);
      setIsNewIndustry(false);
    }
    setIsFormOpen(true);
    setError("");
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditId(null);
    setIsNewIndustry(false);
    setError("");
  }

  function openDeleteModal(position: Position) {
    setDeletePosition(position);
    setIsDeleteModalOpen(true);
    setError("");
  }

  function closeDeleteModal() {
    setDeletePosition(null);
    setIsDeleteModalOpen(false);
    setError("");
  }

  function handleIndustrySelectChange(val: string) {
    if (val === NEW_INDUSTRY_VALUE) {
      setIsNewIndustry(true);
      setForm((f) => ({ ...f, industry: "" }));
    } else {
      setIsNewIndustry(false);
      setForm((f) => ({ ...f, industry: val }));
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.industry.trim() || !form.title.trim()) {
      setError("Industry and Position Title are required.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const payload = {
        industry: form.industry.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
      };
      if (isEditing && editId !== null) {
        await pb.collection('positions').update(String(editId), payload);
      } else {
        await pb.collection('positions').create(payload);
      }
      await fetchPositions();
      closeForm();
      setForm(initialForm);
    } catch (err) {
      console.error('Failed to save position', err);
      setError('Failed to save position. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDeleteSubmit() {
    if (!deletePosition) return;
    setIsSubmitting(true);
    setError("");
    try {
      await pb.collection('positions').delete(String(deletePosition.id));
      await fetchPositions();
      const remaining = positions.filter(
        (p) => p.industry === deletePosition.industry && p.id !== deletePosition.id
      );
      if (remaining.length === 0) setExpandedIndustry(null);
      closeDeleteModal();
    } catch (err) {
      console.error('Failed to delete position', err);
      setError("Failed to delete position.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Cast positions for IndustryPositionPicker (needs id as string)
  const pickerPositions = useMemo(
    () => positions.map((p) => ({ id: String(p.id), industry: p.industry, title: p.title })),
    [positions]
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="w-full mx-auto">
        <main className="grid gap-3">
          <section className="w-full bg-white border border-(--border) rounded-md shadow-[var(--shadow),var(--inset)] px-4 py-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl text-(--text) font-bold">Positions</h1>
                <p className="text-(--muted) text-sm font-medium">Manage positions and industries.</p>
              </div>
              <button
                className="border-none text-white text-sm bg-linear-to-br from-(--primary) to-(--primary2) rounded-md px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
                onClick={() => openForm()}
              >
                + Add Position
              </button>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="max-w-sm flex-1">
                <Searchbar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by industry or position"
                  className="text-sm"
                />
              </div>
              {/* IndustryPositionPicker as filter — hover industry → see positions → click to filter */}
              <div className="min-w-56">
                <IndustryPositionPicker
                  positions={pickerPositions}
                  value={filterPosition}
                  onChange={setFilterPosition}
                  placeholder="Filter by position..."
                />
              </div>
              {/* Clear filters */}
              {(search || filterPosition) && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setFilterPosition(""); }}
                  className="px-4 py-2.5 flex items-center gap-1 rounded-md bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 transition-colors"
                >
                  <Icon icon="tabler:x" width="14" height="14" />
                  Clear
                </button>
              )}
            </div>

            {/* Grouped positions list */}
            <div className="mt-2 grid gap-3">
              {grouped.size === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(58,77,117,0.08)] text-(--muted)">
                    <Icon icon="fluent:briefcase-off-16-regular" width="28" height="28" />
                  </div>
                  <p className="text-lg font-semibold text-(--text)">No positions found</p>
                  <p className="mt-2 text-sm text-(--muted)">Try adjusting your filters or add a new position.</p>
                </div>
              ) : (
                Array.from(grouped.entries()).map(([industry, industryPositions]) => {
                  const isExpanded = expandedIndustry === industry;
                  return (
                    <article key={industry} className="overflow-hidden rounded-md border border-(--border) bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedIndustry(isExpanded ? null : industry)}
                        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-(--surface2)"
                      >
                        <div className="flex items-center gap-3">
                          <p className="text-sm uppercase font-bold text-(--text)">{industry}</p>
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-blue-200 text-gray-800 text-xs font-semibold border border-(--border)">
                            {industryPositions.length} {industryPositions.length === 1 ? 'position' : 'positions'}
                          </span>
                        </div>
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--border) transition ${isExpanded ? 'bg-(--primary) text-white' : 'bg-white text-(--muted)'}`}>
                          <Icon icon="mdi:chevron-down" width="18" height="18" className={`${isExpanded ? 'rotate-180' : ''} transition-transform`} />
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-(--border) divide-y divide-(--border) bg-(--surface)">
                          {industryPositions.map((p, idx) => (
                            <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-(--surface2) transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-(--surface2) border border-(--border) text-xs font-bold text-(--muted)">
                                  {idx + 1}
                                </span>
                                <span className="text-sm font-semibold text-(--text)">{p.title}</span>
                                {/* Description hidden per client requirement */}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition-colors"
                                  onClick={() => openForm(p)}
                                >
                                  <Icon icon="tabler:edit" width="15" height="15" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition-colors"
                                  onClick={() => openDeleteModal(p)}
                                >
                                  <Icon icon="tabler:trash" width="15" height="15" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Position Form Modal */}
      <Modal open={isFormOpen} onClose={closeForm} title={isEditing ? "Edit Position" : "Add Position"}>
        <form onSubmit={handleFormSubmit} className="grid gap-3">
          <div className="grid gap-1">
            <span className="text-[12px] text-(--muted) font-bold">Industry</span>
            {!isNewIndustry ? (
              <Selection
                value={form.industry}
                onChange={handleIndustrySelectChange}
                options={
                  existingIndustries.length === 0
                    ? [{ value: NEW_INDUSTRY_VALUE, label: "+ Create new industry" }]
                    : industrySelectOptions
                }
                placeholder="Select an industry..."
                required
              />
            ) : (
              <div className="grid gap-1.5">
                <input
                  required
                  autoFocus
                  placeholder="e.g. Information Technology"
                  className="w-full border border-(--border) bg-white text-(--text) rounded-md px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                  value={form.industry}
                  onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                />
                {existingIndustries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setIsNewIndustry(false); setForm((f) => ({ ...f, industry: "" })); }}
                    className="self-start inline-flex items-center gap-1 text-xs text-(--primary) font-semibold hover:underline"
                  >
                    <Icon icon="tabler:arrow-left" width="12" height="12" />
                    Back to existing industries
                  </button>
                )}
              </div>
            )}
          </div>

          <label className="grid gap-1">
            <span className="text-[12px] text-(--muted) font-bold">Position Title</span>
            <input
              required
              placeholder="e.g. Software Developer"
              className="w-full border border-(--border) bg-white text-(--text) rounded-md px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>

          {/* Description hidden per client requirement
          <label className="grid gap-1">
            <span className="text-[12px] text-(--muted) font-bold">Description <span className="font-normal opacity-60">(optional)</span></span>
            <input
              placeholder="e.g. Develops and maintains web applications"
              className="w-full border border-(--border) bg-white text-(--text) rounded-md px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          */}

          {error && <p className="m-0 text-[#9f2d20] text-[13px]">{error}</p>}

          <div className="flex items-center justify-end gap-2 mt-2">
            <button type="button" onClick={closeForm} className="border border-(--border) bg-(--surface) text-(--text) rounded-md px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 hover:scale-105">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-md px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 hover:scale-105 disabled:opacity-60">
              {isSubmitting ? (isEditing ? "Saving..." : "Adding...") : (isEditing ? "Save Changes" : "Add Position")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={isDeleteModalOpen} onClose={closeDeleteModal} title="Delete Position">
        <form onSubmit={(e) => { e.preventDefault(); onDeleteSubmit(); }} className="flex flex-col gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-full flex flex-col items-center justify-center mb-2">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 mb-2">
                <Icon icon="tabler:trash" width="38" height="38" className="text-red-500" />
              </div>
            </div>
            <p className="text-base font-semibold text-(--text) mb-1">
              Are you sure you want to <span className="text-red-600 font-bold">delete</span> this position?
            </p>
            <p className="text-sm text-(--muted)">
              <span className="font-bold">{deletePosition?.title}</span> — {deletePosition?.industry}
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="border border-(--border) bg-white text-(--text) rounded-md px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105" onClick={closeDeleteModal} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="border-none text-white bg-linear-to-br from-red-500 to-red-700 rounded-md px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105 shadow-md shadow-red-200" disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete"}
            </button>
          </div>
          {error && <p className="mt-3 text-[#9f2d20] text-sm text-center">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
