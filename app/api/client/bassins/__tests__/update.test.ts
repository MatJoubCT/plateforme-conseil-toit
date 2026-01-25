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

// Valid test UUIDs (v4 format)
const TEST_IDS = {
  USER: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  CLIENT: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22',
  BASSIN: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33',
  BATIMENT: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44',
  OTHER_CLIENT: 'e4bbdf55-5e4c-0ee4-772f-2cc7bd343c55',
}

describe('PUT /api/client/bassins/update', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devrait mettre à jour un bassin', async () => {
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
    const mockBassin = { id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', name: 'Bassin 1' }
    const mockUpdated = { ...mockBassin, name: 'Updated' }

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'bassins') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { ...mockBassin, batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' } }, error: null }) })) })),
          update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }) })) })) })),
        } as any
      }
      if (table === 'batiments') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' }, error: null }) })) })) } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/bassins/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
      body: JSON.stringify({ id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batimentId: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', name: 'Updated' }),
    })

    const response = await PUT(request)
    const data = await response.json()

    if (response.status !== 200) {
      console.log('ERROR Response:', JSON.stringify(data, null, 2))
    }

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

    const request = new NextRequest('http://localhost:3000/api/client/bassins/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batimentId: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', name: 'Test' }),
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

    const request = new NextRequest('http://localhost:3000/api/client/bassins/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
      body: JSON.stringify({ id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batimentId: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44' }), // name manquant
    })

    const response = await PUT(request)
    expect(response.status).toBe(400)
  })

  it('devrait rejeter l\'accès à un bassin d\'un autre client', async () => {
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
      if (table === 'bassins') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', batiments: { client_id: '99ddbe22-2b1a-4bc1-849c-9bb4ae676f88' } }, error: null }) })) })) } as any
      }
      if (table === 'batiments') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', client_id: '99ddbe22-2b1a-4bc1-849c-9bb4ae676f88' }, error: null }) })) })) } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/bassins/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
      body: JSON.stringify({ id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batimentId: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', name: 'Test' }),
    })

    const response = await PUT(request)
    expect(response.status).toBe(403)
  })
})
