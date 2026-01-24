# Guide de Tests pour l'API Client

Ce guide explique comment créer des tests pour les endpoints API du portail client.

## Vue d'ensemble

Les endpoints API client utilisent l'authentification Bearer Token et la fonction `requireClient()` qui vérifie:
- ✅ Présence du token Bearer
- ✅ Validité du token
- ✅ Rôle `client` de l'utilisateur
- ✅ Statut `is_active = true`
- ✅ Accès via la table `user_clients`

## Endpoints à Tester

### Garanties
- `POST /api/client/garanties/create`
- `PUT /api/client/garanties/update`
- `DELETE /api/client/garanties/delete`

### Bassins
- `PUT /api/client/bassins/update`
- `DELETE /api/client/bassins/delete`

### Interventions
- `POST /api/client/interventions/create`
- `PUT /api/client/interventions/update`
- `DELETE /api/client/interventions/delete`
- `POST /api/client/interventions/upload-file`
- `DELETE /api/client/interventions/delete-file`

## Pattern de Test

### 1. Structure de Base

```typescript
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

describe('POST /api/client/resource/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait créer une ressource avec des données valides', async () => {
    // Test implementation
  })

  it('devrait rejeter sans authentification', async () => {
    // Test implementation
  })

  it('devrait rejeter un utilisateur non-client', async () => {
    // Test implementation
  })

  it('devrait rejeter un utilisateur inactif', async () => {
    // Test implementation
  })

  it('devrait valider le schéma Zod', async () => {
    // Test implementation
  })

  it('devrait rejeter l\'accès à une ressource d\'un autre client', async () => {
    // Test implementation
  })

  it('devrait respecter le rate limiting', async () => {
    // Test implementation
  })
})
```

### 2. Configuration des Mocks

#### Mock d'Authentification Réussie

```typescript
const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
const mockUser = { id: 'user-123', email: 'client@test.com' }
const mockProfile = {
  role: 'client',
  user_id: 'user-123',
  full_name: 'Client User',
  is_active: true,
}

vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
  data: { user: mockUser },
  error: null,
} as any)

vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
  if (table === 'user_profiles') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        })),
      })),
    } as any
  }
  if (table === 'user_clients') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [{ user_id: 'user-123', client_id: 'client-123' }],
          error: null,
        }),
      })),
    } as any
  }
  // Ajouter d'autres tables selon les besoins
  return {} as any
})
```

#### Mock d'Échec d'Authentification

```typescript
vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
  data: { user: null },
  error: { message: 'Invalid token' } as any,
} as any)
```

### 3. Exemple Complet - Test de Création

```typescript
it('devrait créer une garantie avec des données valides', async () => {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
  const mockUser = { id: 'user-123', email: 'client@test.com' }
  const mockProfile = {
    role: 'client',
    user_id: 'user-123',
    full_name: 'Client User',
    is_active: true,
  }
  const mockUserClient = { user_id: 'user-123', client_id: 'client-123' }
  const mockBassin = { id: 'bassin-123', batiment_id: 'batiment-123' }
  const mockBatiment = { id: 'batiment-123', client_id: 'client-123' }
  const mockGarantie = {
    id: 'garantie-123',
    bassin_id: 'bassin-123',
    fournisseur: 'Test Fournisseur',
  }

  // Mock auth
  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: mockUser },
    error: null,
  } as any)

  // Mock tables
  vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          })),
        })),
      } as any
    }
    if (table === 'user_clients') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [mockUserClient], error: null }),
        })),
      } as any
    }
    if (table === 'bassins') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockBassin, error: null }),
          })),
        })),
      } as any
    }
    if (table === 'batiments') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockBatiment, error: null }),
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
      Authorization: 'Bearer mock-token',
    },
    body: JSON.stringify({
      bassinId: 'bassin-123',
      fournisseur: 'Test Fournisseur',
    }),
  })

  const response = await POST(request)
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data.ok).toBe(true)
  expect(data.data).toEqual(mockGarantie)
})
```

### 4. Tests de Contrôle d'Accès

```typescript
it('devrait rejeter l\'accès à une ressource d\'un autre client', async () => {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
  const mockUser = { id: 'user-123', email: 'client@test.com' }
  const mockProfile = {
    role: 'client',
    user_id: 'user-123',
    full_name: 'Client User',
    is_active: true,
  }
  const mockBassin = { id: 'bassin-123', batiment_id: 'batiment-123' }
  const mockBatiment = { id: 'batiment-123', client_id: 'other-client-999' } // Client différent!

  vi.mocked(supabaseAdmin.auth.getUser).mockResolvedValue({
    data: { user: mockUser },
    error: null,
  } as any)

  vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
          })),
        })),
      } as any
    }
    if (table === 'user_clients') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [{ user_id: 'user-123', client_id: 'client-123' }],
            error: null,
          }),
        })),
      } as any
    }
    if (table === 'bassins') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockBassin, error: null }),
          })),
        })),
      } as any
    }
    if (table === 'batiments') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: mockBatiment, error: null }),
          })),
        })),
      } as any
    }
    return {} as any
  })

  const request = new NextRequest('http://localhost:3000/api/client/resource/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-token',
    },
    body: JSON.stringify({
      bassinId: 'bassin-123',
    }),
  })

  const response = await POST(request)
  const data = await response.json()

  expect(response.status).toBe(403)
  expect(data.error).toContain('Accès refusé')
})
```

## Tests Spéciaux

### Upload de Fichier

```typescript
it('devrait uploader un fichier valide', async () => {
  // Configuration des mocks incluant storage
  vi.mocked(supabaseAdmin.storage.from).mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: null }),
  } as any)

  const formData = new FormData()
  formData.append('interventionId', 'int-123')
  formData.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'test.jpg')

  const request = new NextRequest('http://localhost:3000/api/client/interventions/upload-file', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer mock-token',
    },
    body: formData as any,
  })

  const response = await POST(request)
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data.ok).toBe(true)
})
```

## Exécution des Tests

```bash
# Tous les tests client
npm run test:run app/api/client

# Un endpoint spécifique
npm run test:run app/api/client/garanties/__tests__/create.test.ts
```

## Références

- Tests admin existants: `app/api/admin/clients/__tests__/create.test.ts`
- Middleware auth: `lib/auth-middleware.ts`
- Schémas Zod: `lib/schemas/`
- Documentation API: `app/api/client/README.md`

## Notes Importantes

1. **Utiliser `supabaseAdmin`** - Les tests doivent mocker `@/lib/supabaseAdmin` (et NON `@/lib/supabaseClient`)
2. **Chaîne d'accès** - Les endpoints vérifient : User → Profile → user_clients → Bassin → Batiment → Client
3. **Rate Limiting** - Différent pour les uploads de fichiers (`FILE_UPLOAD`) vs opérations normales (`API_GENERAL`)
4. **Validation Zod** - Tous les payloads sont validés avec les schémas dans `lib/schemas/`

## TODO

Les tests suivants doivent être créés pour compléter la couverture :

- [ ] Garanties (create, update, delete)
- [ ] Bassins (update, delete)
- [ ] Interventions (create, update, delete, upload-file, delete-file)

Suivre les patterns ci-dessus et les tests admin existants comme référence.
