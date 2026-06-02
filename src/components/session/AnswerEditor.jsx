import { useCallback, useEffect, useState } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { useDebounce } from '../../hooks/useDebounce.js';

/**
 * AnswerEditor — textarea-based answer entry with optional voice input
 * via the Web Speech API.
 *
 * Props:
 *   onSubmit  {function} — called with the final answer text on submission
 *   disabled  {boolean}  — disables the editor (e.g. while evaluating)
 *   questionId {string}  — used to reset the editor when the question changes
 *
 * Requirements: 5.1, 5.5, 18.3
 */
export default function AnswerEditor({
  onSubmit,
  disabled = false,
  questionId,
}) {
  // Plain controlled textarea state
  const [text, setText] = useState('');

  // Debounced word count — updates 300ms after the user stops typing
  const debouncedText = useDebounce(text, 300);
  const wordCount = debouncedText.trim()
    ? debouncedText.trim().split(/\s+/).length
    : 0;

  // ── Voice input ───────────────────────────────────────────────────────────
  const handleSpeechResult = useCallback((finalText) => {
    const trimmed = finalText.trim();
    if (!trimmed) return;
    setText((prev) =>
      prev + (prev.length === 0 || prev.endsWith(' ') ? '' : ' ') + trimmed,
    );
  }, []);

  const {
    supported: speechSupported,
    listening,
    interimTranscript,
    error: speechError,
    start: startListening,
    stop: stopListening,
    reset: resetSpeech,
  } = useSpeechRecognition({ onResult: handleSpeechResult });

  // Reset textarea and stop speech when the question changes
  useEffect(() => {
    setText('');
    if (listening) stopListening();
    resetSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  // Submit handler
  function handleSubmit() {
    if (listening) stopListening();

    // Confirm empty submission
    if (!text.trim()) {
      const confirmed = window.confirm('Submit empty answer?');
      if (!confirmed) return;
    }

    onSubmit(text);
  }

  function toggleListening() {
    if (listening) stopListening();
    else startListening();
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Req 18.3 — textarea must remain fully visible on 320 px+ viewports */}
      <textarea
        aria-label="Your answer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        rows={6}
        className={[
          'w-full min-w-0 min-h-[8rem] resize-y',
          'rounded-md border border-[var(--border)]',
          'bg-[var(--bg)] text-[var(--text)]',
          'px-3 py-2 text-base leading-relaxed',
          'placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150',
        ].join(' ')}
        placeholder="Type your answer here…"
      />

      {/* Quiet word count helper — debounced to avoid flicker while typing */}
      <p
        className="text-xs text-[var(--text)] opacity-70 text-right -mt-1"
        aria-live="polite"
      >
        {wordCount} words
      </p>

      {/* Live interim transcript — faded preview while user is speaking */}
      {speechSupported && listening && interimTranscript && (
        <p
          aria-live="polite"
          className="text-xs italic text-[var(--text-muted)] opacity-70 px-1 -mt-1"
        >
          {interimTranscript}
        </p>
      )}

      {/* Speech error — tiny inline message */}
      {speechSupported && speechError && (
        <p
          role="alert"
          className="text-xs text-red-500 px-1 -mt-1"
        >
          Voice input error: {speechError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={listening}
            title={listening ? 'Stop voice input' : 'Start voice input'}
            className={[
              'inline-flex items-center justify-center',
              'rounded-md transition-colors duration-150',
              'h-10 w-10',
              'border border-[var(--border)]',
              listening
                ? 'bg-red-500 text-white border-red-500 animate-pulse'
                : 'bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--accent-bg)]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              'select-none',
            ].join(' ')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className={[
            'inline-flex items-center justify-center gap-2',
            'rounded-md font-medium transition-colors duration-150',
            'h-10 px-4 text-base',
            'bg-[var(--accent)] text-white',
            'hover:opacity-90 active:opacity-80',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            'select-none',
          ].join(' ')}
        >
          Submit Answer
        </button>
      </div>
    </div>
  );
}
