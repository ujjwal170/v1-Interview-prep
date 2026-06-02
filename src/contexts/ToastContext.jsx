import { createContext, useCallback, useContext, useState } from 'react'
import {
  ToastProvider as RadixToastProvider,
  ToastViewport,
} from '../components/ui/Toast.jsx'
import ToastContainer from '../components/Toast.jsx'

export const ToastContext = createContext(null)

let nextId = 1

/**
 * ToastProvider wraps the app (or a subtree) and provides `showToast`.
 * It also renders the Radix ToastProvider + ToastViewport so toasts
 * are properly anchored in the DOM.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback(({ kind, message }) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, kind, message }])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToastProvider>
        {children}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  )
}

/**
 * useToast returns `{ showToast }` from the nearest ToastProvider.
 * Must be called inside a ToastProvider.
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
