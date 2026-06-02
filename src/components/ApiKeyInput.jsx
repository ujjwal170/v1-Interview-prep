/**
 * ApiKeyInput.jsx
 *
 * Reusable masked API key input with a reveal toggle and a Save button.
 * Used on the Settings page and inside the DemoBanner modal.
 *
 * Props:
 *   onSave    {(key: string) => void}  – called with the trimmed key when user saves
 *   hideHelp  {boolean}                – when true, omits the "Get a free key" link
 *                                        (use when the parent already shows it)
 *
 * Requirements: 15.5, 15.7
 */

import { useState } from 'react';

export default function ApiKeyInput({ onSave, hideHelp = false }) {
  const [key, setKey] = useState('');
  const [revealed, setRevealed] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = key.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Link to obtain a key — hidden when caller already shows it */}
      {!hideHelp && (
        <p className="text-sm text-[var(--text)]">
          Don&apos;t have a key?{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
          >
            Get a free Gemini key from Google AI Studio
          </a>
          .
        </p>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id="api-key-input"
            type={revealed ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Paste your Gemini API key"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 pr-10 text-sm text-[var(--text-h)] placeholder:text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
          />
          {/* Reveal toggle */}
          <button
            type="button"
            aria-label={revealed ? 'Hide API key' : 'Show API key'}
            onClick={() => setRevealed((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center text-[var(--text)] hover:text-[var(--text-h)]"
          >
            {revealed ? (
              /* Eye-off icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              /* Eye icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={!key.trim()}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
        >
          Save
        </button>
      </div>
    </form>
  );
}
