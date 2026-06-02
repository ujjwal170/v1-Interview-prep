import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Card — simple card container.
 *
 * Props:
 *   children  {ReactNode}  – card content
 *   className {string}     – extra classes
 *   as        {string}     – HTML element to render (default 'div')
 *
 * Requirements: 18.1, 18.2
 */
export default function Card({ children, className, as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={cn(
        'rounded-lg border border-[var(--border)] bg-[var(--bg)]',
        'shadow-[var(--shadow)] p-4',
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
