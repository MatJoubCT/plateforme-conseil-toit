// app/layout.tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { ToastProvider } from '@/lib/toast-context'
import CsrfInitializer from '@/components/CsrfInitializer'

export const metadata: Metadata = {
  title: {
    default: 'Connect-Toit',
    template: '%s | Connect-Toit',
  },
  description: 'Plateforme de gestion des toitures et bassins',
}

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
