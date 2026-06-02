import { cva } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import LoadingSpinner from './LoadingSpinner'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const buttonVariants = cva(
  // Base styles applied to every variant
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--accent)] text-white',
          'hover:opacity-90 active:opacity-80',
        ],
        secondary: [
          'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)]',
          'hover:bg-[var(--accent-bg)] hover:border-[var(--accent-border)]',
          'active:opacity-80',
        ],
        ghost: [
          'bg-transparent text-[var(--text)]',
          'hover:bg-[var(--accent-bg)] hover:text-[var(--text-h)]',
          'active:opacity-80',
        ],
        danger: [
          'bg-red-600 text-white',
          'hover:bg-red-700 active:bg-red-800',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

/**
 * Button — button component with variants.
 *
 * Props:
 *   variant   {'primary'|'secondary'|'ghost'|'danger'}  – visual style (default 'primary')
 *   size      {'sm'|'md'|'lg'}                          – size preset (default 'md')
 *   disabled  {boolean}                                 – disables the button
 *   loading   {boolean}                                 – shows spinner and disables interaction
 *   children  {ReactNode}                               – button label / content
 *   className {string}                                  – extra classes
 *   ...rest   {object}                                  – all native <button> props
 *
 * Requirements: 17.5, 18.1, 18.2
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  className,
  ...rest
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    >
      {loading && (
        <LoadingSpinner
          size={size === 'lg' ? 'md' : 'sm'}
          label="Loading\u2026"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
