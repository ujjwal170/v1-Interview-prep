import { Component } from 'react';

/**
 * ErrorBoundary catches render-time errors in its subtree and displays
 * a fallback UI with options to reload the page or navigate home.
 *
 * Must be a class component — React error boundaries require class components.
 * Implements getDerivedStateFromError and componentDidCatch lifecycle methods.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log the error for debugging; in production this could be sent to a
    // monitoring service.
    console.error('[ErrorBoundary] Caught render error:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center"
      >
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-[var(--text-h)]">
            Something went wrong
          </h2>
          <p className="max-w-sm text-sm text-[var(--text)]">
            An unexpected error occurred while rendering this page. You can try
            reloading or return to the home page.
          </p>
        </div>

        {/* Error detail (collapsed, for debugging) */}
        {this.state.error && (
          <details className="max-w-md rounded-md border border-[var(--border)] bg-[var(--code-bg)] px-4 py-2 text-left text-xs text-[var(--text)]">
            <summary className="cursor-pointer select-none font-medium">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words font-mono">
              {this.state.error.message}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
          >
            Reload page
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/';
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-5 py-2.5 text-sm font-medium text-[var(--text-h)] transition-colors hover:bg-[var(--accent-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
          >
            Go to home
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
