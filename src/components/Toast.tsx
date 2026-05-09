import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { toastEventName, type ToastPayload } from './toastEvents'

interface ToastItem extends ToastPayload {
  id: number
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const recentToastRef = useRef<{ key: string; timestamp: number } | null>(null)

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail
      const key = `${detail.kind}:${detail.message}`
      const now = Date.now()

      if (recentToastRef.current?.key === key && now - recentToastRef.current.timestamp < 700) {
        return
      }

      recentToastRef.current = { key, timestamp: now }
      const id = Date.now() + Math.random()

      setToasts((current) => [...current, { ...detail, id }].slice(-4))

      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, 4200)
    }

    window.addEventListener(toastEventName, handleToast)
    return () => window.removeEventListener(toastEventName, handleToast)
  }, [])

  const dismiss = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            className={`toast-card ${toast.kind}`}
            key={toast.id}
            initial={{ opacity: 0, x: 26, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 26, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="status"
          >
            <span className="toast-icon">
              {toast.kind === 'success' && <CheckCircle2 size={20} />}
              {toast.kind === 'error' && <AlertCircle size={20} />}
              {toast.kind === 'info' && <Info size={20} />}
            </span>
            <p>{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Đóng thông báo">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
