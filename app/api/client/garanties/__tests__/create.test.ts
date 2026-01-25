import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../create/route'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Mock des dépendances
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
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

vi.mock('@/lib/auth-middleware', () => ({
  requireClient: vi.fn(),
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

describe('POST /api/client/garanties/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait créer une garantie avec des données valides', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')

    const mockUser = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'client@test.com',
      profile: {
        role: 'client',
        user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22',
        is_active: true,
        full_name: 'Test User',
      },
      clientIds: ['b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22'],
    }
    const mockGarantie = { id: 'e4bbdf55-5e4c-4ee4-972f-2cc7bd343c55', bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', fournisseur: 'Test' }

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'bassins') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' } }, error: null }),
            })),
          })),
        } as any
      }
      if (table === 'batiments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' }, error: null }),
            })),
          })),
        } as any
      }
      if (table === 'garanties') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockGarantie, error: null }),
            })),
          })),
        } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({ bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', fournisseur: 'Test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data).toEqual(mockGarantie)
  })

  it('devrait rejeter sans authentification', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')

    vi.mocked(requireClient).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBeDefined()
  })

  it('devrait rejeter un utilisateur non-client', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')

    vi.mocked(requireClient).mockResolvedValue({
      error: NextResponse.json({ error: 'Accès refusé (client requis).' }, { status: 403 }),
      user: null,
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({ bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('client')
  })

  it('devrait rejeter un utilisateur inactif', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')

    vi.mocked(requireClient).mockResolvedValue({
      error: NextResponse.json({ error: 'Compte suspendu. Veuillez contacter l\'administrateur.' }, { status: 403 }),
      user: null,
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({ bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('suspendu')
  })

  it('devrait valider le schéma Zod', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')

    const mockUser = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'client@test.com',
      profile: {
        role: 'client',
        user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22',
        is_active: true,
        full_name: 'Test User',
      },
      clientIds: ['b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22'],
    }

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({}), // bassinId manquant
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('devrait respecter le rate limiting', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')
    const { rateLimit } = await import('@/lib/rate-limit')

    const mockUser = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'client@test.com',
      profile: {
        role: 'client',
        user_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22',
        is_active: true,
        full_name: 'Test User',
      },
      clientIds: ['b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22'],
    }

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    // Mock rate limit dépassé
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
      retryAfter: 60,
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token',
      },
      body: JSON.stringify({ bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33' }),
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
  })
})
