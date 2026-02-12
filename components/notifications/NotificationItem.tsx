'use client'

import { Wrench, FileText, Shield, ShieldAlert, LogIn, X } from 'lucide-react'
import type { NotificationRow } from '@/types/database'

interface NotificationItemProps {
  notification: NotificationRow
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onClick: (notification: NotificationRow) => void
}

const TYPE_CONFIG: Record<string, { icon: typeof Wrench; color: string }> = {
  intervention_added: { icon: Wrench, color: 'text-orange-500' },
  rapport_added: { icon: FileText, color: 'text-blue-500' },
  garantie_added: { icon: Shield, color: 'text-green-500' },
  garantie_updated: { icon: Shield, color: 'text-green-600' },
  garantie_expiring: { icon: ShieldAlert, color: 'text-red-500' },
  client_login: { icon: LogIn, color: 'text-ct-primary' },
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`

  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`

  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Hier'
  if (diffD < 7) return `Il y a ${diffD} jours`

  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })
}

export default function NotificationItem({
  notification,
  onRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.intervention_added
  const Icon = config.icon

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id)
    }
    onClick(notification)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(notification.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`group flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
        notification.is_read
          ? 'bg-white hover:bg-slate-50'
          : 'bg-blue-50/60 hover:bg-blue-50'
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          notification.is_read ? 'bg-slate-100' : 'bg-white shadow-sm'
        }`}
      >
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            notification.is_read ? 'text-slate-600' : 'font-semibold text-slate-800'
          }`}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {formatRelativeDate(notification.created_at)}
        </p>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        className="mt-0.5 shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        title="Supprimer"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {!notification.is_read && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ct-primary" />
      )}
    </div>
  )
}
