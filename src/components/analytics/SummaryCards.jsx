/**
 * SummaryCards — displays three summary stat cards for the Analytics view.
 *
 * Props:
 *   totalSessions  {number}  – total number of sessions for the topic
 *   totalQuestions {number}  – total questions answered across all sessions
 *   aggregate      {number}  – current topic-level aggregate score (0–10)
 *
 * Requirements: 12.4
 */
export default function SummaryCards({ totalSessions = 0, totalQuestions = 0, aggregate = 0 }) {
  const cards = [
    {
      label: 'Total Sessions',
      value: totalSessions,
      icon: '📋',
    },
    {
      label: 'Questions Answered',
      value: totalQuestions,
      icon: '❓',
    },
    {
      label: 'Current Level',
      value: Number(aggregate).toFixed(1),
      icon: '⭐',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon }) => (
        <div
          key={label}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-[var(--shadow)] p-5 flex flex-col items-center gap-2 text-center"
        >
          <span className="text-2xl" aria-hidden="true">{icon}</span>
          <span className="text-3xl font-semibold text-[var(--text-h)]">{value}</span>
          <span className="text-sm text-[var(--text)]">{label}</span>
        </div>
      ))}
    </div>
  );
}
