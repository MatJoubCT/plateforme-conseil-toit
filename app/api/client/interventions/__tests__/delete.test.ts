import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../delete/route'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(),
      })),
    },
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

describe('DELETE /api/client/interventions/delete', () => {
  beforeEach(() => vi.clearAllMocks())

  it('devrait supprimer une intervention avec ses fichiers', async () => {
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
    const mockIntervention = {
      id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66',
      bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33',
      bassins: {
        batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44',
        batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' },
      },
    }
    const mockFiles = [
      { id: 'a1bbcc77-6d2a-4ff4-882d-2bb7ad151a44', file_path: 'path/to/file1.pdf' },
      { id: 'b2ccdd88-7e3b-4ff5-993e-3cc8be262b55', file_path: 'path/to/file2.jpg' },
    ]

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'interventions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockIntervention, error: null }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        } as any
      }
      if (table === 'intervention_fichiers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: mockFiles, error: null }),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        } as any
      }
      return {} as any
    })

    vi.mocked(supabaseAdmin.storage.from).mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/client/interventions/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66' }),
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('devrait supprimer une intervention sans fichiers', async () => {
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
    const mockIntervention = {
      id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66',
      bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33',
      bassins: {
        batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44',
        batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' },
      },
    }

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'interventions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockIntervention, error: null }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        } as any
      }
      if (table === 'intervention_fichiers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/interventions/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66' }),
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

    const request = new NextRequest('http://localhost:3000/api/client/interventions/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66' }),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(401)
  })

  it('devrait rejeter un utilisateur non-client', async () => {
    const { requireClient } = await import('@/lib/auth-middleware')

    vi.mocked(requireClient).mockResolvedValue({
      error: NextResponse.json({ error: 'Accès refusé (client requis).' }, { status: 403 }),
      user: null,
    })

    const request = new NextRequest('http://localhost:3000/api/client/interventions/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66' }),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(403)
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

    const request = new NextRequest('http://localhost:3000/api/client/interventions/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({}), // id manquant
    })

    const response = await DELETE(request)
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

    const request = new NextRequest('http://localhost:3000/api/client/interventions/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ id: 'aaaaaaaa-aaaa-4aaa-9aaa-aaaaaaaaaaaa' }),
    })

    const response = await DELETE(request)
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
    const mockIntervention = {
      id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66',
      bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33',
      bassins: {
        batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44',
        batiments: { client_id: '99ddbe22-2b1a-4bc1-849c-9bb4ae676f88' },
      },
    }

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'interventions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockIntervention, error: null }),
            })),
          })),
        } as any
      }
      return {} as any
    })

    const request = new NextRequest('http://localhost:3000/api/client/interventions/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66' }),
    })

    const response = await DELETE(request)
    expect(response.status).toBe(403)
  })

  it('devrait continuer si la suppression du storage échoue', async () => {
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
    const mockIntervention = {
      id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66',
      bassin_id: 'c2ddde77-7e2a-4ef6-994d-4aa9bc261a33',
      bassins: {
        batiment_id: 'd3ccef66-6f3b-4ff5-883e-3bb8ad252b44',
        batiments: { client_id: 'b1ffcd88-8d1a-4df7-aa5c-5aa8ac270b22' },
      },
    }
    const mockFiles = [{ id: 'a1bbcc77-6d2a-4ff4-882d-2bb7ad151a44', file_path: 'path/to/file1.pdf' }]

    vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser })

    vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
      if (table === 'interventions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockIntervention, error: null }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        } as any
      }
      if (table === 'intervention_fichiers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: mockFiles, error: null }),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        } as any
      }
      return {} as any
    })

    // Simuler une erreur de storage
    vi.mocked(supabaseAdmin.storage.from).mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: { message: 'Storage error' } }),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/client/interventions/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-token',
      },
      body: JSON.stringify({ id: 'f5ccee44-4d3b-4de3-961e-1dd6be454d66' }),
    })

    const response = await DELETE(request)
    const data = await response.json()

    // Devrait réussir malgré l'erreur de storage
    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })
})
