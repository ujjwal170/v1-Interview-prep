import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { cva } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const ToastProvider = ToastPrimitive.Provider

const ToastViewport = React.forwardRef(function ToastViewport({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Viewport
      ref={ref}
      className={cn(
        'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4',
        'sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
        className
      )}
      {...props}
    />
  )
})
ToastViewport.displayName = ToastPrimitive.Viewport.displayName

const toastVariants = cva(
  cn(
    'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
    'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
    'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[swipe=end]:animate-out data-[state=closed]:fade-out-80',
    'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
    'data-[state=open]:sm:slide-in-from-bottom-full'
  ),
  {
    variants: {
      variant: {
        default: 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)]',
        success: 'border-green-500/30 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
        info: 'border-blue-500/30 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
        warning: 'border-yellow-500/30 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
        error: 'border-red-500/30 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

const Toast = React.forwardRef(function Toast({ className, variant, ...props }, ref) {
  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitive.Root.displayName

const ToastAction = React.forwardRef(function ToastAction({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Action
      ref={ref}
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors',
        'hover:bg-[var(--accent-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'group-[.error]:border-red-500/30 group-[.error]:hover:border-red-500/30 group-[.error]:hover:bg-red-100 group-[.error]:hover:text-red-900',
        className
      )}
      {...props}
    />
  )
})
ToastAction.displayName = ToastPrimitive.Action.displayName

const ToastClose = React.forwardRef(function ToastClose({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Close
      ref={ref}
      className={cn(
        'absolute right-2 top-2 rounded-md p-1 text-[var(--text)] opacity-0 transition-opacity',
        'hover:text-[var(--text-h)] focus:opacity-100 focus:outline-none focus:ring-2',
        'group-hover:opacity-100',
        'group-[.error]:text-red-300 group-[.error]:hover:text-red-50 group-[.error]:focus:ring-red-400 group-[.error]:focus:ring-offset-red-600',
        className
      )}
      toast-close=""
      {...props}
    >
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
        className="h-4 w-4"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
      <span className="sr-only">Close</span>
    </ToastPrimitive.Close>
  )
})
ToastClose.displayName = ToastPrimitive.Close.displayName

const ToastTitle = React.forwardRef(function ToastTitle({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Title
      ref={ref}
      className={cn('text-sm font-semibold', className)}
      {...props}
    />
  )
})
ToastTitle.displayName = ToastPrimitive.Title.displayName

const ToastDescription = React.forwardRef(function ToastDescription({ className, ...props }, ref) {
  return (
    <ToastPrimitive.Description
      ref={ref}
      className={cn('text-sm opacity-90', className)}
      {...props}
    />
  )
})
ToastDescription.displayName = ToastPrimitive.Description.displayName

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
