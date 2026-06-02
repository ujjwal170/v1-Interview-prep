/**
 * SessionSummaryPage
 *
 * Displayed after a session completes. On mount it:
 *   1. Loads the session by id from URL params and resolves the topic name
 *      from topicId (sessions only store topicId, not topicName).
 *   2. If the session is still `in_progress`, calls `completeSession` to
 *      persist the final `averageScore` (Req 10.4).
 *   3. Renders the summary: average score, per-subtopic breakdown sorted
 *      weakest first, and a "Weak areas" section for subtopics below 5
 *      (Req 10.1, 10.2, 10.3).
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSession, completeSession, setEvaluation } from '../services/sessionService.js'
import { getTopic } from '../services/topicService.js'
import { useAsyncResource } from '../hooks/useAsyncResource.js'
import { useAIProvider } from '../hooks/useAIProvider.js'
import { useSkillProfile } from '../contexts/SkillProfileContext.jsx'
import { evaluateWithRetry } from '../services/evaluateWithRetry.js'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import QuestionDetailCard from '../components/session/QuestionDetailCard.jsx'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the average score across all questions that have an evaluation.
 */
function computeAverageScore(questions) {
  const evaluated = questions.filter(
    (q) => q.evaluation != null && typeof q.evaluation.score === 'number'
  )
  if (evaluated.length === 0) return null
  const total = evaluated.reduce((sum, q) => sum + q.evaluation.score, 0)
  return Math.round((total / evaluated.length) * 10) / 10
}

/**
 * Group questions by subtopic and compute the average score per subtopic.
 * Returns an array sorted by average score ascending (weakest first).
 */
function computeSubtopicBreakdown(questions) {
  const evaluated = questions.filter(
    (q) => q.evaluation != null && typeof q.evaluation.score === 'number'
  )

  const map = new Map()

  for (const q of evaluated) {
    const key = q.subtopic ?? 'Unknown'
    const entry = map.get(key) ?? { total: 0, count: 0 }
    entry.total += q.evaluation.score
    entry.count += 1
    map.set(key, entry)
  }

  const breakdown = Array.from(map.entries()).map(([subtopic, { total, count }]) => ({
    subtopic,
    avgScore: Math.round((total / count) * 10) / 10,
    count,
  }))

  breakdown.sort((a, b) => a.avgScore - b.avgScore)

  return breakdown
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100))
  const color =
    score < 5
      ? 'bg-red-500'
      : score < 7
      ? 'bg-amber-400'
      : 'bg-emerald-500'

  return (
    <div
      className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden"
      role="presentation"
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SessionSummaryPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const completedRef = useRef(false)

  // Loader resolves both the session record and the human-readable topic name
  // in one shot. Sessions only store topicId, so we look up the topic here.
  const { data, loading, error, refetch } = useAsyncResource(
    useCallback(async () => {
      if (!id) throw new Error('No session ID provided.')
      const s = await getSession(id)
      if (!s) throw new Error('Session not found.')
      const topic = await getTopic(s.topicId)
      return { session: s, topicName: topic?.name ?? '' }
    }, [id]),
    [id]
  )

  // Destructure once — all consumers below use these two variables.
  const session = data?.session ?? null
  const topicName = data?.topicName ?? ''

  const [averageScore, setAverageScore] = useState(null)
  const [subtopicBreakdown, setSubtopicBreakdown] = useState([])
  const [retryingFailed, setRetryingFailed] = useState(false)

  const aiProvider = useAIProvider()
  const { applyEvaluation: applyEvaluationToProfile } = useSkillProfile(
    session?.topicId ?? null,
  )

  // Questions that were submitted but never received an evaluation.
  // Safe to read after loading/error guards below; session is non-null there.
  const failedEvaluations = session
    ? session.questions.filter((q) => q.answer != null && q.evaluation == null)
    : []

  // Complete the session if still in_progress (Req 10.4)
  useEffect(() => {
    if (!session) return

    const avg = computeAverageScore(session.questions)
    const breakdown = computeSubtopicBreakdown(session.questions)
    setAverageScore(avg)
    setSubtopicBreakdown(breakdown)

    if (session.status === 'in_progress' && !completedRef.current) {
      completedRef.current = true
      completeSession(session.id, avg)
        .then(() => refetch())
        .catch((err) => console.error('[SessionSummaryPage] Failed to complete session:', err))
    }
  }, [session, refetch])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleRetryFailed = useCallback(async () => {
    if (retryingFailed || failedEvaluations.length === 0) return
    setRetryingFailed(true)

    const results = await Promise.allSettled(
      failedEvaluations.map((q) =>
        evaluateWithRetry(aiProvider, q.text, q.answer),
      ),
    )

    await Promise.all(
      results.map(async (result, i) => {
        if (result.status !== 'fulfilled') return
        const q = failedEvaluations[i]
        try {
          await setEvaluation(session.id, q.id, result.value)
          await applyEvaluationToProfile(
            q.subtopic,
            result.value.score,
            Date.now(),
            q.difficulty,
          )
        } catch (err) {
          console.error('[SessionSummaryPage] retry persist failed:', err)
        }
      }),
    )

    const refreshed = await getSession(session.id)
    if (refreshed) {
      const newAvg = computeAverageScore(refreshed.questions)
      try {
        await completeSession(session.id, newAvg)
      } catch (err) {
        console.error('[SessionSummaryPage] update averageScore failed:', err)
      }
    }

    setRetryingFailed(false)
    refetch()
  }, [
    session,
    retryingFailed,
    failedEvaluations,
    aiProvider,
    applyEvaluationToProfile,
    refetch,
  ])

  function handlePracticeAgain() {
    const query = topicName ? `?topic=${encodeURIComponent(topicName)}` : ''
    navigate(`/session/new${query}`)
  }

  // -------------------------------------------------------------------------
  // Render: loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <LoadingSpinner size="lg" label="Loading session summary…" />
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
          to="/"
          className="text-sm text-[var(--accent)] underline underline-offset-2"
        >
          Go to home
        </Link>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: summary
  // session and topicName are both non-null past this point.
  // -------------------------------------------------------------------------

  const weakAreas = subtopicBreakdown.filter((s) => s.avgScore < 5)
  const hasEvaluations = averageScore !== null

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">

        {/* ── Page heading ── */}
        <div className="space-y-1">
          <p className="text-sm text-[var(--text)] uppercase tracking-wide font-medium">
            Session complete
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-h)]">
            {topicName ? `${topicName} — Summary` : 'Session Summary'}
          </h1>
        </div>

        {/* ── Failed evaluations banner ── */}
        {failedEvaluations.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-amber-800">
                <p className="font-semibold">
                  {failedEvaluations.length} answer
                  {failedEvaluations.length === 1 ? '' : 's'} couldn't be
                  evaluated
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Scores below exclude these. Retry to fill them in.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRetryFailed}
                loading={retryingFailed}
                disabled={retryingFailed}
              >
                {retryingFailed ? 'Retrying…' : 'Retry failed'}
              </Button>
            </div>
          </Card>
        )}

        {/* ── Average score (Req 10.3) ── */}
        <Card>
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm font-medium text-[var(--text)] uppercase tracking-wide">
              Average score
            </p>
            {hasEvaluations ? (
              <>
                <p
                  className="text-5xl font-bold text-[var(--text-h)]"
                  aria-label={`Average score: ${averageScore} out of 10`}
                >
                  {averageScore}
                  <span className="text-2xl font-normal text-[var(--text)] ml-1">
                    / 10
                  </span>
                </p>
                <ScoreBar score={averageScore} />
              </>
            ) : (
              <p className="text-[var(--text)] text-sm">
                No evaluated questions in this session.
              </p>
            )}
          </div>
        </Card>

        {/* ── Per-subtopic breakdown sorted weakest first (Req 10.3) ── */}
        {subtopicBreakdown.length > 0 && (
          <Card>
            <h2 className="text-sm font-semibold text-[var(--text-h)] mb-4">
              Per-subtopic breakdown
              <span className="ml-1 text-[var(--text)] font-normal text-xs">
                (weakest first)
              </span>
            </h2>
            <ul className="space-y-3" aria-label="Subtopic scores">
              {subtopicBreakdown.map(({ subtopic, avgScore, count }) => (
                <li key={subtopic}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--text-h)] font-medium truncate max-w-[60%]">
                      {subtopic}
                    </span>
                    <span className="text-sm text-[var(--text)] shrink-0">
                      <span
                        className={
                          avgScore < 5
                            ? 'text-red-500 font-semibold'
                            : avgScore < 7
                            ? 'text-amber-500 font-semibold'
                            : 'text-emerald-600 font-semibold'
                        }
                      >
                        {avgScore}
                      </span>
                      <span className="text-[var(--text)]"> / 10</span>
                      <span className="ml-2 text-xs text-[var(--text)] opacity-60">
                        ({count} {count === 1 ? 'question' : 'questions'})
                      </span>
                    </span>
                  </div>
                  <ScoreBar score={avgScore} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── Weak areas (Req 10.3) ── */}
        {weakAreas.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <h2 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <span aria-hidden="true">⚠️</span>
              Weak areas
              <span className="font-normal text-red-500 text-xs">
                (average score below 5)
              </span>
            </h2>
            <ul className="space-y-1" aria-label="Weak areas">
              {weakAreas.map(({ subtopic, avgScore }) => (
                <li
                  key={subtopic}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-red-800 font-medium">{subtopic}</span>
                  <span className="text-red-600 font-semibold">
                    {avgScore} / 10
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ── No evaluations fallback ── */}
        {!hasEvaluations && subtopicBreakdown.length === 0 && (
          <Card>
            <p className="text-sm text-[var(--text)] text-center py-2">
              This session has no evaluated answers to summarize.
            </p>
          </Card>
        )}

        {/* ── Per-question review ── */}
        {session.questions.length > 0 && (
          <section
            aria-label="Question-by-question review"
            className="space-y-4"
          >
            <h2 className="text-sm font-semibold text-[var(--text-h)] uppercase tracking-wide">
              Question-by-question review
            </h2>
            <ol className="space-y-4 list-none">
              {session.questions.map((q, i) => (
                <li key={q.id}>
                  <QuestionDetailCard question={q} index={i} />
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handlePracticeAgain}
          >
            Practice again
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            as={Link}
            to="/history"
            onClick={() => navigate('/history')}
          >
            View history
          </Button>
        </div>

        <p className="text-center text-sm text-[var(--text)]">
          or{' '}
          <Link
            to="/history"
            className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
          >
            view all sessions
          </Link>
        </p>

      </div>
    </div>
  )
}
