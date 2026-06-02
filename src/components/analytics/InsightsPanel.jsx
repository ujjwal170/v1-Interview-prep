/**
 * InsightsPanel — textual insights grouping subtopics by strength.
 *
 * Props:
 *   strong      {string[]}  – subtopics with level ≥ 7
 *   weak        {string[]}  – subtopics with level < 5 and attempts > 0
 *   unexplored  {string[]}  – subtopics with attempts === 0
 *
 * Requirements: 12.5
 */
export default function InsightsPanel({ strong = [], weak = [], unexplored = [] }) {
  const hasAny = strong.length > 0 || weak.length > 0 || unexplored.length > 0;

  if (!hasAny) {
    return (
      <p className="text-sm text-[var(--text)] opacity-60 py-4">
        Complete some sessions to see insights.
      </p>
    );
  }

  const groups = [
    {
      key: 'weak',
      label: 'Needs Work',
      emoji: '🔴',
      items: weak,
      description: 'Level below 5 — focus here to improve your aggregate score.',
      chipClass: 'bg-red-100 text-red-700 border-red-200',
    },
    {
      key: 'unexplored',
      label: 'Unexplored',
      emoji: '⚪',
      items: unexplored,
      description: 'Not yet attempted — try these to broaden your coverage.',
      chipClass: 'bg-[var(--border)] text-[var(--text)]',
    },
    {
      key: 'strong',
      label: 'Strong',
      emoji: '🟢',
      items: strong,
      description: 'Level 7 or above — keep reinforcing to maintain mastery.',
      chipClass: 'bg-green-100 text-green-700 border-green-200',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ key, label, emoji, items, description, chipClass }) => {
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <h3 className="text-sm font-semibold text-[var(--text-h)] mb-1">
              {emoji} {label}
            </h3>
            <p className="text-xs text-[var(--text)] opacity-70 mb-2">{description}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((name) => (
                <span
                  key={name}
                  className={`rounded-full border px-3 py-0.5 text-xs font-medium ${chipClass}`}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
