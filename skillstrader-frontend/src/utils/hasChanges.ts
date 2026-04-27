function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function hasChanges<T extends Record<string, unknown>>(
  original: T,
  updated: T,
  fields?: (keyof T)[]
): boolean {
  const keys = fields ?? (Object.keys(updated) as (keyof T)[]);

  return keys.some((key) => {
    const orig = original[key];
    const upd = updated[key];

    // File objects always count as a change — cast to unknown first
    if (upd instanceof File) return true;

    // Arrays — compare by JSON
    if (Array.isArray(orig) && Array.isArray(upd)) {
      return JSON.stringify(orig) !== JSON.stringify(upd);
    }

    // Objects (like documents) — compare by JSON
    if (
      isObjectLike(orig) &&
      isObjectLike(upd)
    ) {
      return JSON.stringify(orig) !== JSON.stringify(upd);
    }

    return orig !== upd;
  });
}
