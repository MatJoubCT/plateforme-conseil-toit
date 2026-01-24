# Tests API - Documentation

Ce dossier contient les tests pour tous les endpoints API de la plateforme.

## Structure des Tests

```
app/api/
├── admin/
│   ├── clients/
│   │   └── __tests__/
│   │       ├── create.test.ts
│   │       ├── update.test.ts
│   │       └── delete.test.ts
│   ├── batiments/__tests__/
│   ├── bassins/__tests__/
│   ├── entreprises/__tests__/
│   ├── materiaux/__tests__/
│   └── listes/__tests__/
└── auth/
    └── __tests__/
        └── login.test.ts
```

## Tests Implémentés

### ✅ Endpoints Testés

- **POST /api/auth/login** - 5 tests
  - Authentification valide
  - Identifiants invalides
  - Utilisateur inactif
  - Rate limiting
  - Validation email

- **POST /api/admin/clients/create** - 4 tests
  - Création avec données valides
  - Rejet sans authentification
  - Validation schéma Zod
  - Rate limiting

### 📝 Tests à Compléter

Les endpoints suivants ont été créés mais nécessitent des tests similaires :

**Clients:**
- PUT /api/admin/clients/update
- DELETE /api/admin/clients/delete

**Bâtiments:**
- POST /api/admin/batiments/create
- PUT /api/admin/batiments/update
- DELETE /api/admin/batiments/delete

**Bassins:**
- POST /api/admin/bassins/create
- PUT /api/admin/bassins/update
- DELETE /api/admin/bassins/delete

**Entreprises:**
- POST /api/admin/entreprises/create
- PUT /api/admin/entreprises/update
- DELETE /api/admin/entreprises/delete

**Matériaux:**
- POST /api/admin/materiaux/create
- PUT /api/admin/materiaux/update
- DELETE /api/admin/materiaux/delete

**Listes:**
- POST /api/admin/listes/create
- PUT /api/admin/listes/update
- DELETE /api/admin/listes/delete

## Exécution des Tests

```bash
# Tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Couverture de code
npm run test:coverage

# Tests API seulement
npm test -- app/api
```

## Pattern de Test Standard

Chaque endpoint devrait tester au minimum :

1. **Cas nominal** - Requête valide avec données correctes
2. **Authentification** - Rejet sans token ou avec token invalide
3. **Autorisation** - Vérification du rôle admin
4. **Validation** - Rejet avec données invalides (Zod)
5. **Rate Limiting** - Vérification des limites de requêtes
6. **CSRF** - Protection contre les attaques CSRF
7. **Cas d'erreur** - Gestion des erreurs DB, etc.

## Mocks Utilisés

### Supabase Admin
```typescript
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  },
}))
```

### Rate Limiting
```typescript
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 99,
    resetAt: Date.now() + 60000,
  })),
  RATE_LIMITS: { /* ... */ },
}))
```

### CSRF Protection
```typescript
vi.mock('@/lib/csrf', () => ({
  checkCsrf: vi.fn(() => null), // null = pas d'erreur
}))
```

## Bonnes Pratiques

1. **Isolation** - Chaque test doit être indépendant
2. **Mocks clairs** - Utiliser `beforeEach` pour réinitialiser les mocks
3. **Assertions précises** - Vérifier status, headers et body
4. **Nommage descriptif** - Tests doivent clairement indiquer ce qu'ils testent
5. **Couverture complète** - Tester tous les chemins de code (happy path + edge cases)

## Métriques de Couverture

Objectif : **80%+ de couverture** pour les routes API

Commandes utiles :
```bash
# Rapport de couverture
npm run test:coverage

# Voir le rapport HTML
open coverage/index.html
```

## Debugging

Pour déboguer un test :

```typescript
it.only('devrait créer un client', async () => {
  // Ce test sera le seul à s'exécuter
})
```

Ou utiliser le mode watch :
```bash
npm run test:watch
```

## Contribution

Lors de l'ajout d'un nouvel endpoint :

1. Créer le dossier `__tests__/` à côté de `route.ts`
2. Créer `{action}.test.ts` (ex: `create.test.ts`)
3. Implémenter au minimum les 7 cas de test standard
4. Vérifier la couverture avec `npm run test:coverage`
5. Mettre à jour cette documentation

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Next.js API Testing](https://nextjs.org/docs/app/building-your-application/testing/vitest)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
