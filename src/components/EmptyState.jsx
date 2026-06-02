import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * EmptyState — centered empty-state display.
 *
 * Props:
 *   title       {string}     – primary message (required)
 *   description {string}     – optional supporting text
 *   action      {ReactNode}  – optional CTA button / link
 *   icon        {ReactNode}  – optional icon rendered above the title
 *   className   {string}     – extra classes on the wrapper
 *
 * Requirements: 18.1, 18.2
 */
export default function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-4 py-16 text-center',
        className
      )}
    >
      {icon && (
        <span
          className="flex items-center justify-center text-[var(--accent)] opacity-60"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}

      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-[var(--text-h)]">{title}</p>
        {description && (
          <p className="text-sm text-[var(--text)]">{description}</p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
