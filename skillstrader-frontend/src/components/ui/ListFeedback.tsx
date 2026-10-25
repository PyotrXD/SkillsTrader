interface ListFeedbackProps {
  /** The fetch failed. Takes precedence over `loading` and `emptyMessage`. */
  error?: string;
  /** A page is in flight. */
  loading?: boolean;
  /** What is being loaded, e.g. "employers" -- used for the loading line. */
  subject: string;
  /**
   * A retry affordance. Without it a failure has no way out short of navigating
   * away and back, which is how a transient blip becomes a dead end.
   */
  onRetry?: () => void;
}

/**
 * Inline status for a list that has no rows to show because it could not load
 * them. Distinct from an empty state: "No employers found" tells the user the
 * data is absent, when the truth may be that the request failed. Conflating the
 * two is what makes an outage indistinguishable from an empty table.
 *
 * `role="alert"` so the reason is announced, not just painted: WCAG 2.2 SC 4.1.3
 * (Status Messages) requires state changes conveyed to assistive tech without
 * stealing focus, which is exactly the case here -- the table is already the
 * user's focus.
 */
export default function ListFeedback({ error, loading, subject, onRetry }: ListFeedbackProps) {
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2.5 px-4 py-3.5 rounded-lg bg-[#fdecea] border border-[#f0c2bd] text-[#9f2d20] text-sm font-medium">
        <span>Could not load {subject}.</span>
        <span className="text-[13px] font-normal">This is a connection or server problem, not an empty list.</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-auto cursor-pointer border border-[#9f2d20] bg-white text-[#9f2d20] rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-all duration-150 hover:bg-[#9f2d20] hover:text-white"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <p className="m-0 px-1 py-2 text-(--muted) text-[13px]" aria-live="polite">
        Loading {subject}...
      </p>
    );
  }

  return null;
}
