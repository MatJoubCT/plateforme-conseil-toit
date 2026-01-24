import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../login/route'
import { NextRequest } from 'next/server'

// Mock des dépendances
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    auth: {
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 4,
    resetAt: Date.now() + 900000, // 15 minutes
  })),
  RATE_LIMITS: {
    LOGIN: {
      maxRequests: 5,
      windowSeconds: 900,
      prefix: 'login',
    },
  },
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait authentifier un utilisateur valide', async () => {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
    const mockUser = {
      id: 'user-123',
      email: 'user@test.com',
    }
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    }
    const mockProfile = {
      role: 'admin',
      client_id: null,
      is_active: true,
      full_name: 'Test User',
    }

    // Mock signInWithPassword
    vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: mockUser,
        session: mockSession,
      },
      error: null,
    } as any)

    // Mock profile fetch
    const mockSelectChain = {
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })),
    }
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn(() => mockSelectChain),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.session).toEqual(mockSession)
    expect(data.user.email).toBe('user@test.com')
    expect(data.user.role).toBe('admin')
  })

  it('devrait rejeter des identifiants invalides', async () => {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')

    vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' } as any,
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'wrongpassword',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Email ou mot de passe incorrect')
  })

  it('devrait bloquer un utilisateur inactif', async () => {
    const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
    const mockUser = {
      id: 'user-123',
      email: 'user@test.com',
    }
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    }
    const mockProfile = {
      role: 'client',
      client_id: 'client-123',
      is_active: false, // Utilisateur désactivé
      full_name: 'Inactive User',
    }

    vi.mocked(supabaseAdmin.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: mockUser,
        session: mockSession,
      },
      error: null,
    } as any)

    const mockSelectChain = {
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      })),
    }
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn(() => mockSelectChain),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('désactivé')
  })

  it('devrait respecter le rate limiting sur les tentatives de login', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')

    // Mock rate limit dépassé
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 900000,
      retryAfter: 900,
    })

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'user@test.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toContain('Trop de tentatives')
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5')
    expect(response.headers.get('Retry-After')).toBe('900')
  })

  it('devrait valider le format de l\'email', async () => {
    const { rateLimit } = await import('@/lib/rate-limit')

    // Réinitialiser le mock pour ce test
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 900000,
    })

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Email invalide')
  })
})
