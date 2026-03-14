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
            bottom: '1rem',
            right: '1rem',
            zIndex: 9999,
            backgroundColor: '#27272a',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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
