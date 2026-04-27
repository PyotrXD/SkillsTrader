export function hasChanges<T extends Record<string, any>>(
  original: T,
  updated: T,
  fields?: (keyof T)[]
): boolean {
  const keys = fields ?? (Object.keys(updated) as (keyof T)[]);

  return keys.some((key) => {
    const orig = original[key];
    const upd = updated[key];

    // File objects always count as a change — cast to unknown first
    if (typeof upd === 'object' && upd instanceof File) return true;

    // Arrays — compare by JSON
    if (Array.isArray(orig) && Array.isArray(upd)) {
      return JSON.stringify(orig) !== JSON.stringify(upd);
    }

    // Objects (like documents) — compare by JSON
    if (
      typeof orig === 'object' && orig !== null &&
      typeof upd === 'object' && upd !== null
    ) {
      return JSON.stringify(orig) !== JSON.stringify(upd);
    }

    return orig !== upd;
  });
}