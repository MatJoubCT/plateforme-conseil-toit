import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../create/route'
import { NextRequest } from 'next/server'

// Mock des dépendances
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          maybeSingle: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

vi.mock('@/lib/csrf', () => ({
  checkCsrf: vi.fn(() => null),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 99,
    resetAt: Date.now() + 60000,
  })),
  RATE_LIMITS: {
    API_GENERAL: {
      maxRequests: 100,
      windowSeconds: 60,
      prefix: 'api',
    },
  },
}))

describe('POST /api/admin/clients/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait créer un client avec des données valides', async () => {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
    const mockUser = { id: 'user-123', email: 'admin@test.com' }
    const mockProfile = { role: 'admin', user_id: 'user-123', full_name: 'Admin User' }
    const mockClient = { id: 'client-123', name: 'Test Client' }

    // Mock auth.getUser
    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any)

    // Mock profile fetch
    const mockSelectChain = {
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })),
    }
    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'user_profiles') {
        return {
          select: vi.fn(() => mockSelectChain),
        } as any
      }
      // Mock insert for clients
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockClient, error: null }),
          })),
        })),
      } as any
    })

    const request = new NextRequest('http://localhost:3000/api/admin/clients/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({ name: 'Test Client' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data).toEqual(mockClient)
  })

  it('devrait rejeter sans authentification', async () => {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' } as any,
    } as any)

    const request = new NextRequest('http://localhost:3000/api/admin/clients/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test Client' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBeDefined()
  })

  it('devrait valider le schéma Zod', async () => {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
    const mockUser = { id: 'user-123', email: 'admin@test.com' }
    const mockProfile = { role: 'admin', user_id: 'user-123', full_name: 'Admin User' }

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any)

    const mockSelectChain = {
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })),
    }
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn(() => mockSelectChain),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/admin/clients/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({ name: '' }), // Nom vide invalide
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('obligatoire')
  })

  it('devrait respecter le rate limiting', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
    const mockUser = { id: 'user-123', email: 'admin@test.com' }
    const mockProfile = { role: 'admin', user_id: 'user-123', full_name: 'Admin User' }

    vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    } as any)

    const mockSelectChain = {
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })),
    }
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn(() => mockSelectChain),
    } as any)

    // Mock rate limit dépassé
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
      retryAfter: 60,
    })

    const request = new NextRequest('http://localhost:3000/api/admin/clients/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({ name: 'Test Client' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
  })
})
