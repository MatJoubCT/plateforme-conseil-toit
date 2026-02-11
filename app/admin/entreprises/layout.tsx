import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Répertoire des entreprises' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
