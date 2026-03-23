import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    setMessage(msg)
    timerRef.current = setTimeout(() => {
      setMessage(null)
      timerRef.current = null
    }, 3000)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          style={{
            position: 'fixed',
            bottom: 'var(--space-4)',
            right: 'var(--space-4)',
            zIndex: 9999,
            backgroundColor: 'var(--color-bg-overlay)',
            color: 'var(--color-text-primary)',
            padding: 'var(--space-3) var(--space-5)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--font-size-sm)',
            pointerEvents: 'none',
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export default ToastProvider
