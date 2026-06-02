import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
} from './ui/Toast.jsx'

/**
 * Maps a toast kind to the shadcn Toast variant.
 * @param {'success'|'info'|'warning'|'error'} kind
 * @returns {string}
 */
function kindToVariant(kind) {
  const map = {
    success: 'success',
    info: 'info',
    warning: 'warning',
    error: 'error',
  }
  return map[kind] ?? 'default'
}

/**
 * ToastContainer renders all active toasts.
 *
 * @param {{ toasts: Array<{id: number, kind: string, message: string}>, onDismiss: (id: number) => void }} props
 */
export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <>
      {toasts.map(({ id, kind, message }) => {
        const variant = kindToVariant(kind)
        const showManualDismiss = kind === 'error' || kind === 'warning'

        return (
          <Toast
            key={id}
            variant={variant}
            onOpenChange={(open) => {
              if (!open) onDismiss(id)
            }}
          >
            <div className="grid gap-1">
              <ToastTitle>{kind.charAt(0).toUpperCase() + kind.slice(1)}</ToastTitle>
              <ToastDescription>{message}</ToastDescription>
            </div>
            {showManualDismiss ? (
              <ToastClose onClick={() => onDismiss(id)} />
            ) : (
              /* Accessible close still present but visually hidden for success/info */
              <ToastClose
                className="sr-only"
                onClick={() => onDismiss(id)}
                aria-label="Close notification"
              />
            )}
          </Toast>
        )
      })}
    </>
  )
}
