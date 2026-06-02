import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listSessions } from '../services/sessionService.js'
import { listTopicsByActivity } from '../services/topicService.js'
import { useAsyncResource } from '../hooks/useAsyncResource.js'
import EmptyState from '../components/EmptyState.jsx'
import Card from '../components/Card.jsx'

/**
 * HistoryPage — lists all persisted sessions sorted by startedAt descending.
 *
 * Each row shows:
 *   - Topic name
 *   - Date (formatted from startedAt)
 *   - Question count (actual questions generated, not the target length)
 *   - Average score (averageScore ?? '—')
 *   - "Completed" badge (green) when status='completed' AND
 *     questions.length === targetLength
 *   - "Ended Early" badge (blue) for any other session with at least one
 *     answered question
 *   - View link for all sessions
 *
 * Sessions with zero answered questions are filtered out — they're either
 * abandoned-before-any-answer (deleted on End/Leave) or in-flight sessions
 * the user hasn't engaged with yet, and shouldn't appear in History.
 *
 * Empty state links to home when no sessions exist (Req 11.4).
 *
 * Requirements: 11.1, 11.3, 11.4
 */
export default function HistoryPage() {
  // Load sessions and topics in parallel on mount (Req 11.1)
  const { data, loading, error: loadError } = useAsyncResource(
    useCallback(async () => {
      const [allSessions, allTopics] = await Promise.all([
        listSessions(),
        listTopicsByActivity(),
      ])
      const map = {}
      for (const topic of allTopics) {
        map[topic.id] = topic.name
      }
      return { sessions: allSessions, topicsMap: map }
    }, []),
    []
  )

  const sessions = data?.sessions ?? []
  const topicsMap = data?.topicsMap ?? {}

  // Only show sessions with at least one answered question. Zero-answer
  // sessions are deleted on End/Leave and should never appear here.
  const visibleSessions = sessions.filter((s) => {
    const answered = (s.questions ?? []).filter((q) => q.answer != null)
    return answered.length > 0
  })

  /**
   * Format a timestamp into a human-readable date string.
   * @param {number} ts - Unix timestamp in milliseconds.
   * @returns {string}
   */
  function formatDate(ts) {
    if (!ts) return '—'
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  /**
   * For sessions ended early (no completeSession yet), averageScore may be
   * null. Compute on the fly from the evaluated questions so the row still
   * shows a meaningful number.
   */
  function computeAvg(session) {
    if (session.averageScore != null) return session.averageScore
    const evaluated = session.questions.filter(
      (q) => q.evaluation && typeof q.evaluation.score === 'number'
    )
    if (evaluated.length === 0) return null
    const sum = evaluated.reduce((acc, q) => acc + q.evaluation.score, 0)
    return sum / evaluated.length
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-[var(--text)]">Loading history…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-red-600">Failed to load session history.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Page heading */}
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-h)]">
        Session History
      </h1>
      <p className="mb-8 text-[var(--text)]">
        All your past practice sessions.
      </p>

      {/* Empty state (Req 11.4) */}
      {visibleSessions.length === 0 ? (
        <EmptyState
          title="No sessions yet."
          description="Start a practice session to see your history here."
          action={
            <Link
              to="/"
              className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              Go to Home
            </Link>
          }
        />
      ) : (
        /* Session list (Req 11.1) */
        <ul className="flex flex-col gap-3" aria-label="Session history">
          {visibleSessions.map((session) => {
            const topicName = topicsMap[session.topicId] ?? 'Unknown Topic'
            const computedAvg = computeAvg(session)
            const avgScore = computedAvg != null ? computedAvg.toFixed(1) : '—'

            let badgeLabel
            let badgeClass
            if (
              session.status === 'completed' &&
              session.questions.length === session.targetLength
            ) {
              badgeLabel = 'Completed'
              badgeClass =
                'bg-emerald-100 text-emerald-700 border border-emerald-200'
            } else {
              badgeLabel = 'Ended Early'
              badgeClass = 'bg-blue-100 text-blue-700 border border-blue-200'
            }

            return (
              <li key={session.id}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Session info */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-[var(--text-h)]">
                        {topicName}
                      </span>

                      {/* Status badge (Req 11.3) */}
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                        aria-label={`Session ${badgeLabel.toLowerCase()}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text)]">
                      <span>{formatDate(session.startedAt)}</span>
                      <span>{session.questions.length} {session.questions.length === 1 ? 'question' : 'questions'}</span>
                      <span>Avg score: {avgScore}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={`/history/${session.id}`}
                      className="inline-flex h-8 items-center rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-sm font-medium text-[var(--text-h)] transition-colors hover:bg-[var(--accent-bg)] hover:border-[var(--accent-border)]"
                    >
                      View
                    </Link>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
