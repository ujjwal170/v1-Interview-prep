import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
}

/**
 * LoadingSpinner — accessible animated spinner for async operations.
 *
 * Props:
 *   size      {'sm'|'md'|'lg'}  – spinner size (default 'md')
 *   label     {string}          – screen-reader text (default 'Loading…')
 *   className {string}          – extra classes on the wrapper span
 *
 * Requirement 17.5 — display loading indicators for all async operations
 * whose duration may exceed 200 ms.
 */
export default function LoadingSpinner({
  size = 'md',
  label = 'Loading\u2026',
  className,
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <span
        className={cn(
          'animate-spin rounded-full',
          'border-[var(--border)] border-t-[var(--accent)]',
          sizeMap[size] ?? sizeMap.md
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
