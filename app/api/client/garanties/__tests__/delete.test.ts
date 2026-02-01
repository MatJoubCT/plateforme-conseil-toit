import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../delete/route'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
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

describe('DELETE /api/client/garanties/delete', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devrait supprimer une garantie', async () => {
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
      if (table === 'garanties') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'e4bbdf55-5e4c-4ee4-972f-2cc7bd343c55', bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', bassins: { batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' } } }, error: null }) })) })),
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        } as any
      }
      if (table === 'bassins') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44' }, error: null }) })) })) } as any
      }
      if (table === 'batiments') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' }, error: null }) })) })) } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
      body: JSON.stringify({ id: 'e4bbdf55-5e4c-4ee4-972f-2cc7bd343c55' }),
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('devrait rejeter sans authentification', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')

    vi.mocked(requireClient).mockResolvedValue({
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'e4bbdf55-5e4c-4ee4-972f-2cc7bd343c55' }),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(401)
  })

  it('devrait rejeter la suppression d\'une garantie introuvable', async () => {
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
      if (table === 'garanties') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })) })) } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
      body: JSON.stringify({ id: '99ddbe22-2b1a-4bc1-849c-9bb4ae676f88' }),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(404)
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

    const request = new NextRequest('http://localhost:3000/api/client/garanties/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
      body: JSON.stringify({}), // id manquant
    })

    const response = await DELETE(request)
    expect(response.status).toBe(400)
  })

  it('devrait rejeter la suppression d\'une garantie d\'un autre client', async () => {
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
      if (table === 'garanties') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'e4bbdf55-5e4c-4ee4-972f-2cc7bd343c55', bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', bassins: { batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', batiments: { client_id: '99ddbe22-2b1a-4bc1-849c-9bb4ae676f88' } } }, error: null }) })) })) } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
      body: JSON.stringify({ id: 'e4bbdf55-5e4c-4ee4-972f-2cc7bd343c55' }),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(403)
  })

  it('devrait retourner 500 si erreur lors de la suppression', async () => {
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
      if (table === 'garanties') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'e4bbdf55-5e4c-4ee4-972f-2cc7bd343c55', bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33', bassins: { batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44', batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' } } }, error: null }) })) })),
          delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }) })),
        } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/garanties/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
      body: JSON.stringify({ id: 'e4bbdf55-5e4c-4ee4-972f-2cc7bd343c55' }),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(500)
  })
})
