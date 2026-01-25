import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../update/route'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })) })),
    })),
  },
}))

vi.mock('@/lib/auth-middleware', () => ({
  requireClient: vi.fn(),
}))

vi.mock('@/lib/csrf', () => ({ checkCsrf: vi.fn(() => null) }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, remaining: 99, resetAt: Date.now() + 60000 })),
  RATE_LIMITS: { API_GENERAL: { maxRequests: 100, windowSeconds: 60, prefix: 'api' } },
}))

describe('PUT /api/client/interventions/update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devrait mettre à jour une intervention', async () => {
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
    const mockIntervention = { id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66', bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', date_intervention: '2024-01-15' }
    const mockUpdated = { ...mockIntervention, commentaire: 'Updated' }

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'interventions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66',
                  bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33',
                  bassins: { batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' } },
                },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
              })),
            })),
          })),
        } as any
      }
      if (table === 'bassins') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' } },
                error: null,
              }),
            })),
          })),
        } as any
      }
      if (table === 'listes_choix') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: '17aacf33-3c2a-4cd2-950d-0cc5af565e77' }, error: null }),
            })),
          })),
        } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/interventions/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify({
        id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66',
        bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33',
        dateIntervention: '2024-01-15',
        commentaire: 'Updated',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.data).toEqual(mockUpdated)
  })

  it('devrait rejeter sans authentification', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')

    vi.mocked(requireClient).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    })

    const request = new NextRequest('http://localhost:3000/api/client/interventions/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66', bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', dateIntervention: '2024-01-15' }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(401)
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

    const request = new NextRequest('http://localhost:3000/api/client/interventions/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66' }), // bassinId et dateIntervention manquants
    })

    const response = await PUT(request)
    expect(response.status).toBe(400)
  })

  it('devrait rejeter si l\'intervention n\'existe pas', async () => {
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

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'interventions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/interventions/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ id: '99ddbe22-2b1a-4bc1-849c-9bb4ae676f88', bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', dateIntervention: '2024-01-15' }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(404)
  })

  it('devrait rejeter l\'accès à une intervention d\'un autre client', async () => {
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

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'interventions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66',
                  bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33',
                  bassins: { batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', batiments: { client_id: '99ddbe22-2b1a-4bc1-849c-9bb4ae676f88' } },
                },
                error: null,
              }),
            })),
          })),
        } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/interventions/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66', bassinId: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', dateIntervention: '2024-01-15' }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(403)
  })
})
