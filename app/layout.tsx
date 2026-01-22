// app/layout.tsx
import type { ReactNode } from 'react'
import './globals.css'
import { ToastProvider } from '@/lib/toast-context'

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
