// app/layout.tsx
import type { ReactNode } from 'react'
import './globals.css'
import { ToastProvider } from '@/lib/toast-context'
import CsrfInitializer from '@/components/CsrfInitializer'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>
        <CsrfInitializer />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
