# Guide de Migration vers les Nouveaux API Endpoints

## Vue d'ensemble

Les API endpoints sécurisés ont été créés pour toutes les entités principales de la plateforme. Cette migration permet de :

- ✅ Appliquer CSRF protection uniformément
- ✅ Appliquer rate limiting uniformément
- ✅ Centraliser la validation Zod
- ✅ Améliorer la sécurité et l'auditabilité
- ✅ Faciliter les tests

## Endpoints Disponibles

### Authentification

**POST /api/auth/login**
- Rate limit: 5 tentatives / 15 minutes
- Protection: Rate limiting
- Tests: ✅ 5 tests passants

### Clients

**POST /api/admin/clients/create**
**PUT /api/admin/clients/update**
**DELETE /api/admin/clients/delete**

### Bâtiments

**POST /api/admin/batiments/create**
**PUT /api/admin/batiments/update**
**DELETE /api/admin/batiments/delete**

### Bassins

**POST /api/admin/bassins/create**
**PUT /api/admin/bassins/update**
**DELETE /api/admin/bassins/delete**

### Entreprises

**POST /api/admin/entreprises/create**
**PUT /api/admin/entreprises/update**
**DELETE /api/admin/entreprises/delete**

### Matériaux

**POST /api/admin/materiaux/create**
**PUT /api/admin/materiaux/update**
**DELETE /api/admin/materiaux/delete**

### Listes de Choix

**POST /api/admin/listes/create**
**PUT /api/admin/listes/update**
**DELETE /api/admin/listes/delete**

## Migration des Pages Admin

### Avant (Direct DB Access)

```typescript
'use client'

import { createBrowserClient } from '@/lib/supabaseBrowser'

export default function ClientsPage() {
  const supabase = createBrowserClient()

  const handleCreate = async (data: any) => {
    // ❌ Accès direct à la DB sans protection
    const { error } = await supabase
      .from('clients')
      .insert({ name: data.name })

    if (error) {
      console.error(error)
    }
  }
}
```

### Après (API Endpoint)

```typescript
'use client'

import { createBrowserClient } from '@/lib/supabaseBrowser'

export default function ClientsPage() {
  const supabase = createBrowserClient()

  const handleCreate = async (data: any) => {
    // 1. Obtenir le token d'authentification
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      console.error('Not authenticated')
      return
    }

    // 2. Appeler l'API avec token et CSRF
    const response = await fetch('/api/admin/clients/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'x-csrf-token': getCsrfToken(), // Voir section CSRF
      },
      body: JSON.stringify({ name: data.name }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error(result.error)
      return
    }

    // ✅ Client créé avec validation, CSRF, rate limiting
    console.log('Client créé:', result.data)
  }
}
```

## Gestion du Token CSRF

### Initialisation (à faire dans le layout root)

```typescript
// app/layout.tsx
'use client'

import { useEffect } from 'react'

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialiser le token CSRF au chargement
    fetch('/api/csrf-token')
      .then(res => res.json())
      .catch(console.error)
  }, [])

  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### Utilisation dans les requêtes

```typescript
import { getCsrfTokenFromCookies } from '@/lib/csrf'

const csrfToken = getCsrfTokenFromCookies()

fetch('/api/admin/clients/create', {
  method: 'POST',
  headers: {
    'x-csrf-token': csrfToken || '',
    // ...
  },
  // ...
})
```

## Mapping camelCase ↔ snake_case

Les API acceptent **camelCase** mais la DB utilise **snake_case**.

### Exemple: Bâtiments

**Input API (camelCase):**
```typescript
{
  name: "Bâtiment A",
  clientId: "uuid-123",
  postalCode: "H1A 1A1",
  latitude: 45.5,
  longitude: -73.5
}
```

**Stockage DB (snake_case):**
```sql
{
  name: "Bâtiment A",
  client_id: "uuid-123",
  postal_code: "H1A 1A1",
  latitude: 45.5,
  longitude: -73.5
}
```

La conversion est faite automatiquement dans les routes API.

## Pages à Migrer

### Priorité Haute (opérations critiques)

1. **app/admin/clients/page.tsx** - Gestion clients
2. **app/admin/batiments/page.tsx** - Gestion bâtiments
3. **app/admin/bassins/page.tsx** - Gestion bassins
4. **app/admin/utilisateurs/page.tsx** - ✅ Déjà migré (users API)

### Priorité Moyenne

5. **app/admin/entreprises/page.tsx** - Gestion entreprises
6. **app/admin/materiaux/page.tsx** - Gestion matériaux
7. **app/admin/listes/page.tsx** - Gestion listes

### Impact de la Migration

Pour chaque page à migrer :

- **Rechercher:** Tous les appels `supabase.from(...).insert/update/delete`
- **Remplacer:** Par des appels `fetch('/api/admin/...')`
- **Ajouter:** Token d'authentification dans les headers
- **Ajouter:** Token CSRF dans les headers
- **Gérer:** Erreurs HTTP (401, 403, 429, etc.)

## Gestion des Erreurs

Les API retournent des erreurs structurées :

```typescript
// 400 Bad Request - Validation failed
{
  error: "Le nom du client est obligatoire"
}

// 401 Unauthorized - Token invalide
{
  error: "Token invalide ou session expirée."
}

// 403 Forbidden - Pas admin
{
  error: "Accès refusé (admin requis)."
}

// 404 Not Found
{
  error: "Client non trouvé"
}

// 409 Conflict - Contrainte référentielle
{
  error: "Impossible de supprimer ce client car 5 bâtiment(s) y sont associés..."
}

// 429 Too Many Requests - Rate limit
{
  error: "Trop de requêtes. Réessayez plus tard."
}
// Headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After

// 500 Internal Server Error
{
  error: "Une erreur interne est survenue"
}
```

## Exemple Complet: Mise à Jour d'un Client

```typescript
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabaseBrowser'
import { getCsrfTokenFromCookies } from '@/lib/csrf'
import { useToast } from '@/lib/toast-context'

export default function EditClientForm({ clientId }: { clientId: string }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient()
  const { showToast } = useToast()

  const handleUpdate = async () => {
    setLoading(true)

    try {
      // 1. Vérifier l'authentification
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        showToast('Session expirée', 'error')
        return
      }

      // 2. Appeler l'API
      const response = await fetch('/api/admin/clients/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-csrf-token': getCsrfTokenFromCookies() || '',
        },
        body: JSON.stringify({
          id: clientId,
          name: name,
        }),
      })

      const result = await response.json()

      // 3. Gérer les erreurs
      if (!response.ok) {
        if (response.status === 429) {
          showToast('Trop de requêtes, attendez un moment', 'error')
        } else if (response.status === 401) {
          showToast('Session expirée, reconnectez-vous', 'error')
        } else {
          showToast(result.error || 'Erreur lors de la mise à jour', 'error')
        }
        return
      }

      // 4. Succès
      showToast('Client mis à jour avec succès', 'success')
      // Rafraîchir la liste, fermer le modal, etc.

    } catch (error) {
      console.error('Update error:', error)
      showToast('Une erreur est survenue', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Mise à jour...' : 'Mettre à jour'}
      </button>
    </form>
  )
}
```

## Endpoint CSRF Token

Créer l'endpoint pour initialiser le token CSRF :

```typescript
// app/api/csrf-token/route.ts
import { NextResponse } from 'next/server'
import { setCsrfCookie } from '@/lib/csrf'

export async function GET() {
  const response = NextResponse.json({ ok: true })
  const token = setCsrfCookie(response)

  // Optionnel: retourner le token pour debug
  return NextResponse.json({ ok: true, token })
}
```

## Checklist de Migration par Page

- [ ] Identifier tous les appels DB directs
- [ ] Remplacer par appels API
- [ ] Ajouter gestion du token d'auth
- [ ] Ajouter gestion du token CSRF
- [ ] Gérer tous les codes d'erreur HTTP
- [ ] Tester les cas limites (rate limit, session expirée, etc.)
- [ ] Vérifier la conversion camelCase ↔ snake_case
- [ ] Mettre à jour les tests UI si nécessaire

## Bénéfices Après Migration

1. **Sécurité renforcée**
   - Protection CSRF sur toutes les mutations
   - Rate limiting pour prévenir les abus
   - Validation centralisée avec Zod

2. **Meilleure maintenabilité**
   - Logique métier centralisée dans les API
   - Validation cohérente
   - Logs et monitoring centralisés

3. **Testabilité**
   - Tests unitaires des endpoints
   - Tests d'intégration facilités
   - Mocks simplifiés

4. **Performance**
   - Rate limiting protège contre les DoS
   - Validation côté serveur avant DB

## Ressources

- [Documentation CSRF](/lib/csrf.ts)
- [Documentation Rate Limit](/lib/rate-limit.ts)
- [Tests API](/tests/api/README.md)
- [Schémas Zod](/lib/schemas/)

---

**Dernière mise à jour:** 2026-01-24
**Status:** Infrastructure API complète - Migration des pages en attente
