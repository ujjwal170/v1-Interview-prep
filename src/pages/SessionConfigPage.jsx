/**
 * SessionConfigPage
 *
 * Reads `?topic=:name` from the URL, lets the user configure a session
 * (difficulty intent, session length, optional free-text instruction), then
 * creates a topic (deduped) + session record and navigates to `/session/:id`.
 *
 * When the topic has no taxonomy the run page's bootstrap flow handles it —
 * this page only persists the session record and hands off.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { createTopic, touchTopicActivity } from '../services/topicService.js'
import { createSession } from '../services/sessionService.js'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_OPTIONS = [
  { value: 'easy',     label: 'Easy',     description: 'Fixed difficulty 3/10 — great for warm-up' },
  { value: 'medium',   label: 'Medium',   description: 'Fixed difficulty 5/10 — balanced practice' },
  { value: 'hard',     label: 'Hard',     description: 'Fixed difficulty 8/10 — challenging questions' },
  { value: 'mixed',    label: 'Mixed',    description: 'Random difficulty 1–10 each question' },
  { value: 'adaptive', label: 'Adaptive', description: 'Adjusts to your skill profile automatically' },
]

const LENGTH_OPTIONS = [
  { value: 5,  label: '5 questions',  description: 'Quick session (~10 min)' },
  { value: 10, label: '10 questions', description: 'Standard session (~20 min)' },
  { value: 15, label: '15 questions', description: 'Deep dive (~30 min)' },
]

const MAX_INSTRUCTION_LENGTH = 500

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @returns {JSX.Element}
 */
export default function SessionConfigPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const topicName = searchParams.get('topic') ?? ''

  // Form state
  const [difficultyIntent, setDifficultyIntent] = useState('adaptive')
  const [targetLength, setTargetLength] = useState(10)
  const [freeTextInstruction, setFreeTextInstruction] = useState('')

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      // 1. Get or create the topic (handles case-insensitive dedupe)
      const topic = await createTopic(topicName)

      // Bump the topic's lastActivityAt so the home-page list reflects most
      // recent practice (Req 1.1, Req 1.2)
      await touchTopicActivity(topic.id)

      // 2. Create the session record
      const session = await createSession({
        topicId: topic.id,
        difficultyIntent,
        targetLength,
        freeTextInstruction: freeTextInstruction.trim(),
      })

      // 3. Navigate to the session run page
      navigate(`/session/${session.id}`)
    } catch (err) {
      console.error('[SessionConfigPage] Failed to create session:', err)
      setError('Something went wrong while starting the session. Please try again.')
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const instructionCharsLeft = MAX_INSTRUCTION_LENGTH - freeTextInstruction.length

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">

        {/* Page heading */}
        <div className="space-y-1">
          <p className="text-sm text-[var(--text)] uppercase tracking-wide font-medium">
            New session
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-h)] truncate">
            {topicName || 'Configure Session'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* ── Difficulty intent ── */}
          <Card>
            <fieldset>
              <legend className="text-sm font-semibold text-[var(--text-h)] mb-3">
                Difficulty intent
                <span className="ml-1 text-[var(--text)] font-normal">(Req 3.1)</span>
              </legend>
              <div className="space-y-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={[
                      'flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors',
                      difficultyIntent === opt.value
                        ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                        : 'border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="difficultyIntent"
                      value={opt.value}
                      checked={difficultyIntent === opt.value}
                      onChange={() => setDifficultyIntent(opt.value)}
                      className="mt-0.5 accent-[var(--accent)]"
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-[var(--text-h)]">
                        {opt.label}
                      </span>
                      <span className="text-xs text-[var(--text)]">
                        {opt.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>

          {/* ── Session length ── */}
          <Card>
            <fieldset>
              <legend className="text-sm font-semibold text-[var(--text-h)] mb-3">
                Session length
                <span className="ml-1 text-[var(--text)] font-normal">(Req 3.2)</span>
              </legend>
              <div className="flex flex-col sm:flex-row gap-2">
                {LENGTH_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={[
                      'flex-1 flex flex-col items-center gap-1 rounded-md border px-3 py-3 cursor-pointer transition-colors text-center',
                      targetLength === opt.value
                        ? 'border-[var(--accent)] bg-[var(--accent-bg)]'
                        : 'border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="targetLength"
                      value={opt.value}
                      checked={targetLength === opt.value}
                      onChange={() => setTargetLength(opt.value)}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold text-[var(--text-h)]">
                      {opt.label}
                    </span>
                    <span className="text-xs text-[var(--text)]">
                      {opt.description}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>

          {/* ── Free-text instruction ── */}
          <Card>
            <div className="space-y-2">
              <label
                htmlFor="freeTextInstruction"
                className="block text-sm font-semibold text-[var(--text-h)]"
              >
                Custom instruction
                <span className="ml-1 text-[var(--text)] font-normal">(optional, Req 3.3)</span>
              </label>
              <p className="text-xs text-[var(--text)]">
                Guide the AI — e.g. "Focus on React hooks" or "Ask system design questions at senior level".
              </p>
              <textarea
                id="freeTextInstruction"
                name="freeTextInstruction"
                rows={4}
                maxLength={MAX_INSTRUCTION_LENGTH}
                value={freeTextInstruction}
                onChange={(e) => setFreeTextInstruction(e.target.value)}
                placeholder="Optional: any specific focus or guidance for the AI…"
                className={[
                  'w-full rounded-md border bg-[var(--bg)] text-[var(--text)] text-sm',
                  'px-3 py-2 resize-none placeholder:text-[var(--text)] placeholder:opacity-50',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1',
                  'border-[var(--border)]',
                ].join(' ')}
              />
              <p
                className={[
                  'text-xs text-right',
                  instructionCharsLeft < 50 ? 'text-amber-500' : 'text-[var(--text)]',
                ].join(' ')}
                aria-live="polite"
              >
                {instructionCharsLeft} / {MAX_INSTRUCTION_LENGTH} characters remaining
              </p>
            </div>
          </Card>

          {/* ── Error message ── */}
          {error && (
            <p
              role="alert"
              className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}

          {/* ── Submit ── */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={!topicName.trim()}
            className="w-full"
          >
            {submitting ? 'Starting session…' : 'Start session'}
          </Button>

          {!topicName.trim() && (
            <p className="text-xs text-center text-[var(--text)] opacity-70">
              No topic specified. Return to the home page to pick a topic.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
