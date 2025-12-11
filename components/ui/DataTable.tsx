'use client'

import { ReactNode } from 'react'

type DataTableProps = {
  children: ReactNode
  /** Hauteur max en pixels pour activer un scroll vertical interne (ex.: 420) */
  maxHeight?: number
}

/**
 * Conteneur de tableau standard Conseil-Toit.
 * - Bord arrondi + ombre légère
 * - Scroll VERTICAL optionnel (maxHeight)
 * - PAS de scroll horizontal (on laisse le tableau s’ajuster dans le cadre)
 */
export function DataTable({ children, maxHeight }: DataTableProps) {
  const innerClassName = maxHeight ? 'w-full overflow-y-auto' : 'w-full'
  const innerStyle = maxHeight ? { maxHeight } : undefined

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div className="overflow-hidden rounded-2xl border border-ct-grayLight bg-white shadow-sm">
        <div className={innerClassName} style={innerStyle}>
          {/* min-w-full pour que le tableau prenne toute la largeur du cadre */}
          <div className="min-w-full">{children}</div>
        </div>
      </div>
    </div>
  )
}

type SectionProps = {
  children: ReactNode
}

export function DataTableHeader({ children }: SectionProps) {
  return (
    <thead className="bg-ct-grayLight/60 text-[11px] uppercase tracking-wide text-ct-grayDark">
      {children}
    </thead>
  )
}

export function DataTableBody({ children }: SectionProps) {
  return (
    <tbody className="divide-y divide-ct-grayLight text-sm text-ct-grayDark">
      {children}
    </tbody>
  )
}
