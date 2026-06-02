/**
 * HistoryDetailPage
 *
 * Displays every question, answer, and evaluation in the order they occurred
 * for a selected session. Loaded by URL param `id` via `getSession`.
 *
 * Requirements: 11.2
 */

import { useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSession } from '../services/sessionService.js'
import { getTopic } from '../services/topicService.js'
import { useAsyncResource } from '../hooks/useAsyncResource.js'
import Card from '../components/Card.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import QuestionDetailCard from '../components/session/QuestionDetailCard.jsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns Tailwind color classes for a numeric score (0–10).
 */
function scoreColor(score) {
  if (score >= 7) return 'text-emerald-600'
  if (score >= 5) return 'text-amber-500'
  return 'text-red-500'
}

/**
 * Badge — small pill label.
 */
function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * @returns {JSX.Element}
 */
export default function HistoryDetailPage() {
  const { id } = useParams()

  // Load session on mount (Req 11.2)
  const { data: session, loading, error } = useAsyncResource(
    useCallback(async () => {
      if (!id) throw new Error('No session ID provided.')
      const s = await getSession(id)
      if (!s) throw new Error('Session not found.')
      // Resolve the actual topic name — sessions only store topicId, not topicName.
      // Return a new object rather than mutating the Dexie-returned record.
      const topic = await getTopic(s.topicId)
      return { ...s, topicName: topic?.name ?? null }
    }, [id]),
    [id]
  )

  // -------------------------------------------------------------------------
  // Render: loading
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading session…" />
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: error
  // -------------------------------------------------------------------------
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-[var(--text)] text-center">{error.message ?? 'Failed to load session data.'}</p>
        <Link
          to="/history"
          className="text-sm text-[var(--accent)] underline underline-offset-2"
        >
          ← Back to history
        </Link>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: session detail (Req 11.2)
  // -------------------------------------------------------------------------
  const questions = session.questions
  const topicName = session.topicName ?? session.topicId
  const startDate = session.startedAt
    ? new Date(session.startedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  let badgeLabel
  let badgeClass
  if (
    session.status === 'completed' &&
    session.questions.length === session.targetLength
  ) {
    badgeLabel = 'Completed'
    badgeClass = 'bg-emerald-100 text-emerald-700 border border-emerald-200'
  } else {
    badgeLabel = 'Ended Early'
    badgeClass = 'bg-blue-100 text-blue-700 border border-blue-200'
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">

        {/* ── Back link ── */}
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:opacity-80 underline underline-offset-2"
        >
          ← Back to history
        </Link>

        {/* ── Page heading ── */}
        <div className="space-y-1">
          <p className="text-sm text-[var(--text)] uppercase tracking-wide font-medium">
            Session detail
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-h)]">
            {topicName}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text)]">
            {startDate && <span>{startDate}</span>}
            <span>{questions.length} {questions.length === 1 ? 'question' : 'questions'}</span>
            {session.averageScore != null && (
              <span>
                Avg score:{' '}
                <span className={`font-semibold ${scoreColor(session.averageScore)}`}>
                  {session.averageScore} / 10
                </span>
              </span>
            )}
            <Badge className={badgeClass}>
              {badgeLabel}
            </Badge>
          </div>
        </div>

        {/* ── Status banners ── */}
        {session.questions.length < session.targetLength && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            This session was ended early. Showing the {session.questions.length} {session.questions.length === 1 ? 'question' : 'questions'} that were generated.
          </div>
        )}

        {/* ── Questions list ── */}
        {questions.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--text)] text-center py-4">
              No questions recorded for this session.
            </p>
          </Card>
        ) : (
          <ol className="space-y-6 list-none" aria-label="Session questions">
            {questions.map((q, i) => (
              <li key={q.id}>
                <QuestionDetailCard question={q} index={i} />
              </li>
            ))}
          </ol>
        )}

        {/* ── Bottom back link ── */}
        <Link
          to="/history"
          className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:opacity-80 underline underline-offset-2"
        >
          ← Back to history
        </Link>

      </div>
    </div>
  )
}
