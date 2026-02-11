import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Carte interactive' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
