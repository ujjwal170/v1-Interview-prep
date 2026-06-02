/**
 * DemoBanner.jsx
 *
 * Shown when the app is running in Demo Mode:
 *   - `useMock === true`  (build-time flag), OR
 *   - `!apiKey`           (no Gemini key saved)
 *
 * Displays a banner with an "Add API Key" button that opens a Modal
 * containing the shared ApiKeyInput component. Saving the key calls
 * `setApiKey()` from SettingsContext, which causes the banner to unmount
 * (because apiKey is now truthy) and switches the AI provider to Gemini
 * without a page reload (Req 15.6, 15.7, 15.8).
 *
 * Requirements: 15.6, 15.7, 15.8
 */

import { useState } from 'react';
import Modal from './Modal';
import ApiKeyInput from './ApiKeyInput';
import { useSettings } from '../contexts/SettingsContext.jsx';

export default function DemoBanner() {
  const { apiKey, useMock, setApiKey } = useSettings();
  const [modalOpen, setModalOpen] = useState(false);

  // Only render when in demo mode
  if (!useMock && apiKey) return null;

  async function handleSave(key) {
    await setApiKey(key);
    setModalOpen(false);
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-between gap-3 border-b border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-2.5 text-sm"
      >
        <div className="flex items-center gap-2 text-[var(--text-h)]">
          {/* Info icon */}
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
            className="shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="8" />
            <line x1="12" y1="12" x2="12" y2="16" />
          </svg>
          <span>
            <strong className="font-semibold">Demo Mode</strong> — using sample
            answers
          </span>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded-md border border-[var(--accent-border)] bg-[var(--bg)] px-3 py-1 text-xs font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
        >
          Add API Key
        </button>
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Add your Gemini API Key"
        description="Your key is stored locally in your browser and never sent to any server."
      >
        <ApiKeyInput onSave={handleSave} />
      </Modal>
    </>
  );
}
