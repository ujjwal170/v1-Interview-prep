/**
 * SettingsPage
 *
 * Allows the User to enter, update, and clear their Gemini API key.
 * Shows the current key status (masked) and a success message after saving.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext.jsx';
import ApiKeyInput from '../components/ApiKeyInput.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a masked representation of the API key, showing only the last 4
 * characters so the user can confirm which key is saved.
 *
 * @param {string} key
 * @returns {string}
 */
function maskApiKey(key) {
  if (!key || key.length <= 4) return '••••••••';
  return `••••••••${key.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @returns {JSX.Element}
 */
export default function SettingsPage() {
  const { apiKey, setApiKey, clearApiKey, loading, useMock } = useSettings();

  const [successMessage, setSuccessMessage] = useState('');
  const [clearing, setClearing] = useState(false);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  async function handleSave(key) {
    await setApiKey(key);
    setSuccessMessage('API key saved successfully.');
    // Auto-dismiss the success message after 4 seconds
    setTimeout(() => setSuccessMessage(''), 4000);
  }

  async function handleClear() {
    setClearing(true);
    try {
      await clearApiKey();
      setSuccessMessage('API key cleared.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } finally {
      setClearing(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-xl space-y-6">

        {/* ── Welcome state: no key saved yet (production only) ──────────── */}
        {!useMock && !apiKey && !loading ? (
          <>
            {/* Hero welcome card */}
            <Card className="border-[var(--accent-border)] bg-[var(--accent-bg)]">
              <div className="space-y-3 text-center">
                <h1 className="text-2xl font-semibold text-[var(--text-h)]">
                  Welcome to I-Prep
                </h1>
                <p className="text-sm text-[var(--text)]">
                  To start practicing, add your Gemini API key. It is stored locally
                  on your device and never sent to any server.
                </p>
                <p className="text-sm text-[var(--text)]">
                  Don&apos;t have one?{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--accent)] underline underline-offset-2 hover:opacity-80"
                  >
                    Get a free key from Google AI Studio
                  </a>
                  .
                </p>
              </div>
            </Card>

            {/* Input form — link is hidden because the welcome card already has it */}
            <Card>
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-[var(--text-h)]">
                  Enter your API key
                </h2>
                <ApiKeyInput onSave={handleSave} hideHelp />
              </div>
            </Card>
          </>
        ) : (
          /* ── Normal state: key already saved (or dev/mock mode) ─────────── */
          <>
            {/* Page heading */}
            <div className="space-y-1">
              <p className="text-sm text-[var(--text)] uppercase tracking-wide font-medium">
                Settings
              </p>
              <h1 className="text-2xl font-semibold text-[var(--text-h)]">
                API Key
              </h1>
              <p className="text-sm text-[var(--text)]">
                Your Gemini API key is used to generate questions and evaluate answers.
                It is stored locally in your browser and never sent to any server.
              </p>
            </div>

            {/* Current key status */}
            <Card>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text)]">
                  Current status
                </p>
                {loading ? (
                  <p className="text-sm text-[var(--text)]">Loading…</p>
                ) : apiKey ? (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-green-500 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-[var(--text-h)]">
                      API key saved
                    </p>
                    <span className="text-sm text-[var(--text)] font-mono">
                      {maskApiKey(apiKey)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-[var(--border)] flex-shrink-0"
                      aria-hidden="true"
                    />
                    <p className="text-sm text-[var(--text)]">No API key set</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Enter / update key */}
            <Card>
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-[var(--text-h)]">
                    {apiKey ? 'Update API key' : 'Enter API key'}
                  </h2>
                  <p className="text-xs text-[var(--text)]">
                    The key is masked by default — use the reveal toggle to check it
                    before saving.
                  </p>
                </div>
                <ApiKeyInput onSave={handleSave} />
              </div>
            </Card>
          </>
        )}

        {/* Success message — visible in both states */}
        {successMessage && (
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2"
          >
            {successMessage}
          </p>
        )}

        {/* Clear key — only shown when a key is set */}
        {apiKey && (
          <Card>
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-[var(--text-h)]">
                  Remove API key
                </h2>
                <p className="text-xs text-[var(--text)]">
                  Clearing the key will block session start until a new key is saved.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                loading={clearing}
                onClick={handleClear}
              >
                Clear API key
              </Button>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}
