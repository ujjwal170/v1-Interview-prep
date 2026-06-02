import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Human-readable messages keyed by error category.
 *
 * @type {Record<string, string>}
 */
const CATEGORY_MESSAGES = {
  rate_limit: 'Rate limit reached. Please wait a moment before retrying.',
  transient: 'A temporary error occurred. Please try again.',
  network: 'Network error. Check your connection and retry.',
  malformed: 'The AI returned an unexpected response. Retrying may help.',
  invalid: 'Invalid request. Please check your settings.',
  unknown: 'An unexpected error occurred. Please try again.',
}

/**
 * ErrorPanel — inline error panel for the session run page.
 *
 * Renders a categorized error message and a "Retry" button. This is an
 * inline panel, not a modal — it appears in the normal document flow so
 * the answer editor below it remains visible and editable when the failure
 * occurred during evaluation.
 *
 * Props:
 *   category  {string}    — error category from the reducer:
 *                           'invalid' | 'rate_limit' | 'transient' |
 *                           'malformed' | 'network' | 'unknown'
 *   onRetry   {function}  — called when the user clicks "Retry"
 *   className {string}    — optional extra classes on the panel wrapper
 *
 * Requirements: 17.1, 17.3, 17.4
 */
export default function ErrorPanel({ category = 'unknown', onRetry, className }) {
  const message = CATEGORY_MESSAGES[category] ?? CATEGORY_MESSAGES.unknown

  // rate_limit and transient are "softer" warnings; everything else is a hard error
  const isWarning = category === 'rate_limit' || category === 'transient'

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3',
        isWarning
          ? [
              'border-amber-300 bg-amber-50',
              'dark:border-amber-700 dark:bg-amber-950/40',
            ]
          : [
              'border-red-300 bg-red-50',
              'dark:border-red-700 dark:bg-red-950/40',
            ],
        className
      )}
    >
      {/* Icon + message */}
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 shrink-0 text-base leading-none',
            isWarning ? 'text-amber-500' : 'text-red-500'
          )}
        >
          {isWarning ? '⚠️' : '✖'}
        </span>
        <p
          className={cn(
            'text-sm leading-snug',
            isWarning
              ? 'text-amber-800 dark:text-amber-200'
              : 'text-red-800 dark:text-red-200'
          )}
        >
          {message}
        </p>
      </div>

      {/* Retry button */}
      {typeof onRetry === 'function' && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'shrink-0 inline-flex items-center justify-center',
            'rounded-md px-3 h-8 text-sm font-medium',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            isWarning
              ? [
                  'bg-amber-100 text-amber-800 border border-amber-300',
                  'hover:bg-amber-200 active:bg-amber-300',
                  'focus-visible:ring-amber-400',
                  'dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700',
                  'dark:hover:bg-amber-800/60',
                ]
              : [
                  'bg-red-100 text-red-800 border border-red-300',
                  'hover:bg-red-200 active:bg-red-300',
                  'focus-visible:ring-red-400',
                  'dark:bg-red-900/50 dark:text-red-200 dark:border-red-700',
                  'dark:hover:bg-red-800/60',
                ]
          )}
        >
          Retry
        </button>
      )}
    </div>
  )
}
