import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('logger', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.stubEnv('NODE_ENV', originalEnv!)
    vi.resetModules()
  })

  it('devrait appeler console.log en mode développement', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { logger } = await import('../logger')
    logger.log('test message')
    expect(console.log).toHaveBeenCalledWith('test message')
  })

  it('devrait appeler console.error en mode développement', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { logger } = await import('../logger')
    logger.error('error message')
    expect(console.error).toHaveBeenCalledWith('error message')
  })

  it('devrait appeler console.warn en mode développement', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { logger } = await import('../logger')
    logger.warn('warn message')
    expect(console.warn).toHaveBeenCalledWith('warn message')
  })

  it('ne devrait PAS appeler console.log en production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('../logger')
    logger.log('test message')
    expect(console.log).not.toHaveBeenCalled()
  })

  it('ne devrait PAS appeler console.error en production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('../logger')
    logger.error('error message')
    expect(console.error).not.toHaveBeenCalled()
  })

  it('ne devrait PAS appeler console.warn en production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { logger } = await import('../logger')
    logger.warn('warn message')
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('devrait transmettre plusieurs arguments', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { logger } = await import('../logger')
    logger.log('message', { data: 1 }, 42)
    expect(console.log).toHaveBeenCalledWith('message', { data: 1 }, 42)
  })
})
