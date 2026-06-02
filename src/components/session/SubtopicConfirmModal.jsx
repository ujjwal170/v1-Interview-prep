import { useState, useEffect } from 'react'
import Modal from '../Modal'
import Button from '../Button'

/**
 * SubtopicConfirmModal — displays AI-suggested subtopics for user confirmation
 * at the start of every session. The full taxonomy is always shown; the
 * `initiallyChecked` prop controls which items are pre-checked.
 *
 * Props:
 *   open               {boolean}    — controls modal visibility
 *   suggestedSubtopics {string[]}   — full list of subtopics to display
 *   initiallyChecked   {string[]}   — subset of suggestedSubtopics to pre-check.
 *                                     If omitted, all suggestedSubtopics are checked.
 *                                     Used to restore the user's last-session selection.
 *   onConfirm          {function}   — called with final list of checked + custom subtopics
 *   onClose            {function}   — called when modal is dismissed without confirming
 *   topicName          {string}     — topic name for display in the modal title
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export default function SubtopicConfirmModal({
  open,
  suggestedSubtopics = [],
  initiallyChecked = undefined,
  onConfirm,
  onClose,
  topicName = '',
}) {
  // Set of checked subtopic names — initialized from `initiallyChecked` when
  // provided (e.g. user's previous-session selection), otherwise all suggested
  // subtopics are pre-checked (first session on a new topic).
  const [checked, setChecked] = useState(
    () => new Set(initiallyChecked ?? suggestedSubtopics),
  )
  // Free-text input for adding a custom subtopic
  const [customInput, setCustomInput] = useState('')
  // List of custom subtopics added by the user
  const [customSubtopics, setCustomSubtopics] = useState([])

  // Re-initialize checked state when prop inputs change (e.g. modal reopens)
  useEffect(() => {
    setChecked(new Set(initiallyChecked ?? suggestedSubtopics))
    setCustomSubtopics([])
    setCustomInput('')
  }, [suggestedSubtopics, initiallyChecked, open])

  function handleToggle(subtopic) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(subtopic)) {
        next.delete(subtopic)
      } else {
        next.add(subtopic)
      }
      return next
    })
  }

  function handleAddCustom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    // Avoid duplicates (case-insensitive check against suggested + existing custom)
    const allExisting = [
      ...suggestedSubtopics.map(s => s.toLowerCase()),
      ...customSubtopics.map(s => s.toLowerCase()),
    ]
    if (allExisting.includes(trimmed.toLowerCase())) {
      setCustomInput('')
      return
    }
    setCustomSubtopics(prev => [...prev, trimmed])
    setCustomInput('')
  }

  function handleRemoveCustom(subtopic) {
    setCustomSubtopics(prev => prev.filter(s => s !== subtopic))
  }

  function handleCustomInputKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCustom()
    }
  }

  function handleConfirm() {
    const finalSubtopics = [
      ...Array.from(checked),
      ...customSubtopics,
    ]
    onConfirm?.(finalSubtopics)
  }

  return (
    <Modal
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose?.()
      }}
      title={`Confirm subtopics for ${topicName}`}
      description="Select the subtopics you want to practice. You can add custom ones too."
      className="sm:max-w-xl"
    >
      <div className="flex flex-col gap-4 pt-2">

        {/* Suggested subtopics list */}
        {suggestedSubtopics.length > 0 ? (
          <fieldset className="border-0 p-0 m-0">
            <legend className="text-sm font-medium text-[var(--text-h)] mb-2">
              AI-suggested subtopics
            </legend>
            <ul
              className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto pr-1"
              role="list"
            >
              {suggestedSubtopics.map(subtopic => {
                const id = `subtopic-${subtopic.replace(/\s+/g, '-')}`
                return (
                  <li key={subtopic}>
                    <label
                      htmlFor={id}
                      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer
                        hover:bg-[var(--accent-bg)] transition-colors duration-100
                        text-sm text-[var(--text)]"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked.has(subtopic)}
                        onChange={() => handleToggle(subtopic)}
                        className="accent-[var(--accent)] w-4 h-4 shrink-0"
                      />
                      <span className="truncate">{subtopic}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        ) : (
          <p className="text-sm text-[var(--text)] italic">
            No suggestions available. Add your own subtopics below.
          </p>
        )}

        {/* Custom subtopic input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="custom-subtopic-input"
            className="text-sm font-medium text-[var(--text-h)]"
          >
            Add custom subtopic
          </label>
          <div className="flex gap-2">
            <input
              id="custom-subtopic-input"
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={handleCustomInputKeyDown}
              placeholder="e.g. concurrency"
              maxLength={80}
              className="flex-1 h-10 px-3 rounded-md border border-[var(--border)]
                bg-[var(--bg)] text-[var(--text)] text-sm
                focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1
                placeholder:text-[var(--text)] placeholder:opacity-50"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddCustom}
              disabled={!customInput.trim()}
              aria-label="Add custom subtopic"
            >
              Add
            </Button>
          </div>

          {/* Custom subtopic chips */}
          {customSubtopics.length > 0 && (
            <ul
              className="flex flex-wrap gap-2 mt-1"
              aria-label="Custom subtopics"
              role="list"
            >
              {customSubtopics.map(subtopic => (
                <li key={subtopic}>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                      bg-[var(--accent-bg)] border border-[var(--accent-border)]
                      text-xs text-[var(--text-h)]"
                  >
                    {subtopic}
                    <button
                      type="button"
                      onClick={() => handleRemoveCustom(subtopic)}
                      aria-label={`Remove ${subtopic}`}
                      className="ml-0.5 rounded-full hover:bg-[var(--accent)] hover:text-white
                        w-4 h-4 flex items-center justify-center transition-colors duration-100
                        focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirm}
            aria-label="Confirm selected subtopics"
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  )
}
