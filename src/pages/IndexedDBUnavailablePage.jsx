/**
 * IndexedDBUnavailablePage
 *
 * Shown when IndexedDB is unavailable (e.g., private/incognito browsing mode,
 * or a browser with IndexedDB disabled). Routes are NOT mounted while in this
 * state — this page is rendered by App.jsx before the router is initialised.
 *
 * Props:
 *   onRetry {Function} — called when the user clicks "Retry". The parent
 *                        (App.jsx) should re-attempt db.open() and clear this
 *                        error state if it succeeds.
 *
 * Requirements: 16.3
 */

/**
 * @param {{ onRetry: () => void }} props
 */
export default function IndexedDBUnavailablePage({ onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-12">
      <div className="max-w-lg w-full text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[var(--text-h)]">
            IndexedDB is unavailable
          </h1>
          <p className="text-[var(--text)] text-base leading-relaxed">
            I-Prep stores all your sessions, skill profiles, and settings
            locally in your browser using <strong>IndexedDB</strong>. Without
            it the app cannot function.
          </p>
        </div>

        {/* Common causes */}
        <div className="rounded-lg border border-[var(--border)] bg-[var(--code-bg)] p-4 text-left space-y-2">
          <p className="text-sm font-medium text-[var(--text-h)]">Common causes</p>
          <ul className="list-disc list-inside text-sm text-[var(--text)] space-y-1">
            <li>You are browsing in <strong>private / incognito mode</strong>, which blocks IndexedDB in some browsers.</li>
            <li>Your browser's storage settings have IndexedDB disabled.</li>
            <li>A browser extension is blocking storage access.</li>
          </ul>
        </div>

        {/* Help links */}
        <div className="space-y-2 text-sm text-[var(--text)]">
          <p className="font-medium text-[var(--text-h)]">How to fix it</p>
          <ul className="space-y-1">
            <li>
              <a
                href="https://support.google.com/chrome/answer/2693767"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                Enable site storage in Chrome / Firefox settings
              </a>
            </li>
            <li>
              <a
                href="https://support.google.com/chrome/answer/95464"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                How to disable private / incognito mode
              </a>
            </li>
          </ul>
        </div>

        {/* Retry button */}
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry
        </button>

        <p className="text-xs text-[var(--text)] opacity-70">
          After fixing the issue above, click Retry to re-attempt opening the
          database.
        </p>
      </div>
    </div>
  )
}
