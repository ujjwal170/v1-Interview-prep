/**
 * SubtopicBarChart — renders a horizontal bar chart of per-subtopic levels.
 *
 * Props:
 *   subtopics  {Array<{ name: string, level: number, attempts: number }>}
 *              – sorted weakest first (ascending by level)
 *
 * Requirements: 12.3
 *
 * Uses plain HTML/CSS bars to avoid adding a charting library dependency.
 */
export default function SubtopicBarChart({ subtopics = [] }) {
  if (subtopics.length === 0) {
    return (
      <p className="text-sm text-[var(--text)] opacity-60 py-4">
        No subtopic data available yet.
      </p>
    );
  }

  const maxLevel = 10;

  /**
   * Determine bar colour based on level:
   *   < 5  → weak  (red-ish accent)
   *   5–6  → mid   (yellow-ish)
   *   ≥ 7  → strong (green-ish)
   *   0 attempts → unexplored (muted)
   */
  function barColor(level, attempts) {
    if (attempts === 0) return 'var(--border)';
    if (level < 5) return '#ef4444';   // red-500
    if (level < 7) return '#f59e0b';   // amber-500
    return '#22c55e';                  // green-500
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {subtopics.map(({ name, level, attempts }) => {
        const pct = ((level / maxLevel) * 100).toFixed(1);
        const color = barColor(level, attempts);
        const label = attempts === 0 ? 'unexplored' : `${level.toFixed(1)} / 10`;

        return (
          <div key={name} className="flex items-center gap-3">
            {/* Subtopic name */}
            <span
              className="w-36 shrink-0 text-sm text-[var(--text)] truncate text-right"
              title={name}
            >
              {name}
            </span>

            {/* Bar track */}
            <div
              className="flex-1 h-5 rounded-full bg-[var(--border)] overflow-hidden"
              role="progressbar"
              aria-valuenow={level}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label={`${name}: ${label}`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>

            {/* Level label */}
            <span className="w-20 shrink-0 text-xs text-[var(--text)] opacity-70">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
