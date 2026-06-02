import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTopic, listTopicsByActivity } from '../services/topicService.js'
import { useAsyncResource } from '../hooks/useAsyncResource.js'
import EmptyState from '../components/EmptyState.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'

/**
 * HomePage — topic selection and creation.
 *
 * Displays a list of previously used topics sorted by most recent activity,
 * and a form to create or reuse a topic by name.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export default function HomePage() {
  const navigate = useNavigate()

  const [topicInput, setTopicInput] = useState('')
  const [validationError, setValidationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load topics on mount, sorted by lastActivityAt desc (Req 1.1)
  const { data: topics, error: loadError, refetch: refetchTopics } = useAsyncResource(
    () => listTopicsByActivity(),
    []
  )

  /**
   * Navigate to the session config page for the given topic name.
   * @param {string} name
   */
  function goToSession(name) {
    navigate(`/session/new?topic=${encodeURIComponent(name)}`)
  }

  /**
   * Handle new-topic form submission.
   * Validates, dedupes (via createTopic), persists, and navigates.
   * @param {React.FormEvent} e
   */
  async function handleSubmit(e) {
    e.preventDefault()

    const trimmed = topicInput.trim()

    // Req 1.4 — reject empty / whitespace-only input
    if (!trimmed) {
      setValidationError('Topic name cannot be empty')
      return
    }

    setValidationError('')
    setIsSubmitting(true)

    try {
      // Req 1.3 — createTopic handles case-insensitive dedupe internally
      // Req 1.2 — persist and navigate
      const topic = await createTopic(trimmed)

      // Refresh the topic list so the new entry appears immediately
      //refetchTopics()

      setTopicInput('')
      goToSession(topic.name)
    } catch {
      setValidationError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Page heading */}
      <h1 className="mb-2 text-3xl font-bold text-[var(--text-h)]">
        Interview Prep
      </h1>
      <p className="mb-8 text-[var(--text)]">
        Pick a topic to practice or create a new one below.
      </p>

      {/* New-topic form */}
      <Card className="mb-8">
        <form onSubmit={handleSubmit} noValidate>
          <label
            htmlFor="topic-input"
            className="mb-1 block text-sm font-medium text-[var(--text-h)]"
          >
            New topic
          </label>
          <div className="flex gap-2">
            <input
              id="topic-input"
              type="text"
              value={topicInput}
              onChange={(e) => {
                setTopicInput(e.target.value)
                if (validationError) setValidationError('')
              }}
              placeholder="e.g. React, System Design, Accounting…"
              aria-describedby={validationError ? 'topic-error' : undefined}
              aria-invalid={!!validationError}
              className={[
                'flex-1 rounded-md border px-3 py-2 text-sm',
                'bg-[var(--bg)] text-[var(--text-h)]',
                'placeholder:text-[var(--text-muted,#9ca3af)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
                validationError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-[var(--border)]',
              ].join(' ')}
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Start
            </Button>
          </div>

          {/* Inline validation message (Req 1.4) */}
          {validationError && (
            <p
              id="topic-error"
              role="alert"
              className="mt-1.5 text-sm text-red-600"
            >
              {validationError}
            </p>
          )}
        </form>
      </Card>

      {/* Topic list (Req 1.1) */}
      <section aria-label="Your topics">
        <h2 className="mb-3 text-lg font-semibold text-[var(--text-h)]">
          Your topics
        </h2>

        {loadError && (
          <p className="text-sm text-red-600">Failed to load topics.</p>
        )}

        {!loadError && (topics ?? []).length === 0 ? (
          <EmptyState
            title="No topics yet. Create your first one above."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {(topics ?? []).map((topic) => (
              <li key={topic.id}>
                <Card className="flex items-center justify-between gap-4">
                  <span className="truncate font-medium text-[var(--text-h)]">
                    {topic.name}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => goToSession(topic.name)}
                  >
                    Practice
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
