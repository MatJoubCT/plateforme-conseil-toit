import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import {
  getBearerToken,
  getValidatedOrigin,
  requireAdmin,
  requireClient,
} from '../auth-middleware';
import { supabaseAdmin } from '../supabaseAdmin';

// Mock Supabase Admin
vi.mock('../supabaseAdmin', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Réinitialiser les variables d'environnement
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
  });

  describe('getBearerToken', () => {
    it('devrait extraire le token du header Authorization', () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer test-token-123',
        },
      });

      const token = getBearerToken(req);
      expect(token).toBe('test-token-123');
    });

    it('devrait extraire le token avec authorization en minuscule', () => {
      const req = new Request('http://localhost', {
        headers: {
          authorization: 'Bearer test-token-456',
        },
      });

      const token = getBearerToken(req);
      expect(token).toBe('test-token-456');
    });

    it('devrait retourner null si aucun header Authorization', () => {
      const req = new Request('http://localhost');

      const token = getBearerToken(req);
      expect(token).toBeNull();
    });

    it('devrait retourner null si le format n\'est pas Bearer', () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Basic user:pass',
        },
      });

      const token = getBearerToken(req);
      expect(token).toBeNull();
    });

    it('devrait gérer Bearer avec différentes casses', () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'bearer test-token-789',
        },
      });

      const token = getBearerToken(req);
      expect(token).toBe('test-token-789');
    });
  });

  describe('getValidatedOrigin', () => {
    it('devrait retourner l\'origin si elle est dans la liste blanche', () => {
      const req = new Request('http://localhost', {
        headers: {
          origin: 'https://example.com',
        },
      });

      const origin = getValidatedOrigin(req);
      expect(origin).toBe('https://example.com');
    });

    it('devrait retourner localhost:3000 si dans la liste blanche', () => {
      const req = new Request('http://localhost', {
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      const origin = getValidatedOrigin(req);
      expect(origin).toBe('http://localhost:3000');
    });

    it('devrait retourner localhost:3001 si dans la liste blanche', () => {
      const req = new Request('http://localhost', {
        headers: {
          origin: 'http://localhost:3001',
        },
      });

      const origin = getValidatedOrigin(req);
      expect(origin).toBe('http://localhost:3001');
    });

    it('devrait utiliser x-forwarded headers si validés', () => {
      const req = new Request('http://localhost', {
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'example.com',
        },
      });

      const origin = getValidatedOrigin(req);
      expect(origin).toBe('https://example.com');
    });

    it('devrait retourner le fallback si x-forwarded headers non validés', () => {
      const req = new Request('http://localhost', {
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'malicious.com',
        },
      });

      const origin = getValidatedOrigin(req);
      expect(origin).toBe('https://example.com');
    });

    it('devrait retourner le fallback si origin non validée', () => {
      const req = new Request('http://localhost', {
        headers: {
          origin: 'https://malicious.com',
        },
      });

      const origin = getValidatedOrigin(req);
      expect(origin).toBe('https://example.com');
    });

    it('devrait retourner localhost:3000 comme fallback ultime', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;

      const req = new Request('http://localhost', {
        headers: {
          origin: 'https://malicious.com',
        },
      });

      const origin = getValidatedOrigin(req);
      expect(origin).toBe('http://localhost:3000');
    });
  });

  describe('requireAdmin', () => {
    it('devrait retourner une erreur 401 si aucun token', async () => {
      const req = new Request('http://localhost');

      const result = await requireAdmin(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(401);
    });

    it('devrait retourner une erreur 401 si token invalide', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', name: 'AuthError', status: 401 },
      } as any);

      const result = await requireAdmin(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(401);
    });

    it('devrait retourner une erreur 500 si erreur de profil', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      } as any);

      const result = await requireAdmin(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(500);
    });

    it('devrait retourner une erreur 403 si l\'utilisateur n\'est pas admin', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                role: 'client',
                user_id: 'user-123',
                full_name: 'Test User',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await requireAdmin(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(403);
    });

    it('devrait retourner une erreur 403 si aucun profil trouvé', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await requireAdmin(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(403);
    });

    it('devrait retourner l\'utilisateur admin si tout est valide', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-admin-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'admin-123', email: 'admin@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                role: 'admin',
                user_id: 'admin-123',
                full_name: 'Admin User',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await requireAdmin(req);

      expect(result.error).toBeNull();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('admin-123');
      expect(result.user?.email).toBe('admin@example.com');
      expect(result.user?.profile.role).toBe('admin');
    });
  });

  describe('requireClient', () => {
    it('devrait retourner une erreur 401 si aucun token', async () => {
      const req = new Request('http://localhost');

      const result = await requireClient(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(401);
    });

    it('devrait retourner une erreur 401 si token invalide', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token', name: 'AuthError', status: 401 },
      } as any);

      const result = await requireClient(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(401);
    });

    it('devrait retourner une erreur 500 si erreur de profil', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      } as any);

      const result = await requireClient(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(500);
    });

    it('devrait retourner une erreur 403 si l\'utilisateur n\'est pas client', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                role: 'admin',
                user_id: 'user-123',
                full_name: 'Admin User',
                client_id: null,
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await requireClient(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(403);
    });

    it('devrait retourner une erreur 403 si le client est inactif', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                role: 'client',
                user_id: 'user-123',
                full_name: 'Client User',
                client_id: 'client-123',
                is_active: false,
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await requireClient(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(403);
    });

    it('devrait retourner une erreur 500 si erreur lors de la récupération des clients', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      } as any);

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // Premier appel pour user_profiles
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    role: 'client',
                    user_id: 'user-123',
                    full_name: 'Client User',
                    client_id: 'client-123',
                    is_active: true,
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        } else {
          // Deuxième appel pour user_clients
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          } as any;
        }
      });

      const result = await requireClient(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(500);
    });

    it('devrait retourner l\'utilisateur client avec clientIds si tout est valide', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-client-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'client-123', email: 'client@example.com' } },
        error: null,
      } as any);

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // Premier appel pour user_profiles
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    role: 'client',
                    user_id: 'client-123',
                    full_name: 'Client User',
                    client_id: 'client-456',
                    is_active: true,
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        } else {
          // Deuxième appel pour user_clients
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ client_id: 'client-456' }, { client_id: 'client-789' }],
                error: null,
              }),
            }),
          } as any;
        }
      });

      const result = await requireClient(req);

      expect(result.error).toBeNull();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('client-123');
      expect(result.user?.email).toBe('client@example.com');
      expect(result.user?.profile.role).toBe('client');
      expect(result.user?.clientIds).toEqual(['client-456', 'client-789']);
    });

    it('devrait retourner un tableau vide de clientIds si aucun client trouvé', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-client-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'client-123', email: 'client@example.com' } },
        error: null,
      } as any);

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    role: 'client',
                    user_id: 'client-123',
                    full_name: 'Client User',
                    client_id: 'client-456',
                    is_active: true,
                  },
                  error: null,
                }),
              }),
            }),
          } as any;
        } else {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          } as any;
        }
      });

      const result = await requireClient(req);

      expect(result.error).toBeNull();
      expect(result.user).toBeDefined();
      expect(result.user?.clientIds).toEqual([]);
    });

    it('devrait retourner une erreur 403 si aucun profil trouvé', async () => {
      const req = new Request('http://localhost', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await requireClient(req);

      expect(result.error).toBeDefined();
      expect(result.user).toBeNull();
      expect(result.error?.status).toBe(403);
    });
  });
});
