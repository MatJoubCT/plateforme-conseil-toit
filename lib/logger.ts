// lib/logger.ts
// Logger utilitaire qui n'affiche les messages qu'en mode développement.
// Remplace les console.log/error/warn éparpillés dans le code.

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args)
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },
}
