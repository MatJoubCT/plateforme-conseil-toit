'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type DialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error('Dialog components must be used within <Dialog>.')
  return ctx
}

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  const setOpen = React.useCallback((v: boolean) => onOpenChange(v), [onOpenChange])
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
}

export function DialogContent({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const { open, setOpen } = useDialogContext()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Overlay + Content wrapper */}
      <div
        className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
        onClick={() => setOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={[
            'relative w-full max-w-lg rounded-2xl border border-ct-grayLight bg-white p-6 shadow-xl',
            'max-h-[90vh] overflow-y-auto',
            className,
          ].join(' ')}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={['flex flex-col space-y-1.5', className].join(' ')}>{children}</div>
}

export function DialogFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        'mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function DialogTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={['text-lg font-semibold text-ct-grayDark', className].join(' ')}>{children}</h2>
}

export function DialogDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={['text-sm text-ct-gray', className].join(' ')}>{children}</p>
}
