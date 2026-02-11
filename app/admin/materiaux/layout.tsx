import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Catalogue des matériaux' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
