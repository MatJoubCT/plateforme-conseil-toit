# CHECKLIST PRODUCTION V1 - Plateforme Conseil-Toit

**Date de création:** 4 février 2026
**Deadline V1:** [À définir]
**Estimé total:** 37 heures (~5 jours)

---

## 🔴 PHASE 1: BLOCKERS CRITIQUES (Jour 1-3)

### Jour 1 - Fondations (8h)

#### ✅ Tâche 1.1: Mise à jour Next.js (1h)
- [ ] Sauvegarder `package.json` et `package-lock.json`
- [ ] Exécuter: `npm install next@latest`
- [ ] Vérifier version: `npm list next` (doit être >16.1.4)
- [ ] Exécuter: `npm audit` (vérifier aucune vulnérabilité High)
- [ ] Tester: `npm run dev` (vérifier démarrage OK)
- [ ] Tester: `npm run build` (vérifier build OK)
- [ ] Commit: "chore: Mise à jour Next.js vers [version] (sécurité)"

**Validation:**
```bash
npm audit | grep -i "high"  # Doit retourner 0 résultats
```

---

#### ✅ Tâche 1.2: Résoudre 10 erreurs TypeScript (2h)

**Sous-tâche A: Fixer `beforeEach` non importé**
- [ ] Ouvrir `components/ui/__tests__/ConfirmDialog.test.tsx`
- [ ] Ligne 1: Ajouter `beforeEach` à l'import
  ```typescript
  import { describe, it, expect, beforeEach } from 'vitest';
  ```
- [ ] Vérifier: `npm run type-check` (1 erreur en moins)

**Sous-tâche B: Fixer assignations `NODE_ENV` (7 erreurs)**
- [ ] Ouvrir `lib/__tests__/validation.test.ts`
- [ ] Ajouter en haut: `import { vi } from 'vitest';`
- [ ] Remplacer toutes les lignes `process.env.NODE_ENV = 'xxx'` par:
  ```typescript
  vi.stubEnv('NODE_ENV', 'xxx');
  ```
- [ ] Ajouter `afterEach(() => { vi.unstubAllEnvs(); });`
- [ ] Vérifier: `npm run type-check` (7 erreurs en moins)

**Sous-tâche C: Fixer appels invalides (2 erreurs)**
- [ ] Ouvrir `lib/hooks/__tests__/useSessionToken.test.ts`
- [ ] Ligne 91: Vérifier les mocks de `useSessionToken`
- [ ] Corriger le type de retour du mock
- [ ] Vérifier: `npm run type-check` (0 erreurs!)

**Validation finale:**
```bash
npm run type-check  # Doit afficher: "0 errors"
```

- [ ] Commit: "fix: Résolution des 10 erreurs TypeScript (tests)"

---

#### ✅ Tâche 1.3: Fixer tests useApiMutation (2h)

**Fichier:** `lib/hooks/__tests__/useApiMutation.test.ts`

- [ ] Ajouter dans `beforeEach`:
  ```typescript
  beforeEach(() => {
    // Initialiser CSRF token
    document.cookie = 'csrf-token=test-csrf-token-123; path=/';

    // Reset mocks
    vi.clearAllMocks();
  });
  ```

- [ ] Modifier le mock de fetch pour accepter les headers CSRF:
  ```typescript
  global.fetch = vi.fn((url, options) => {
    const headers = options?.headers as Record<string, string>;

    // Vérifier présence du CSRF token
    if (!headers['X-CSRF-Token']) {
      return Promise.resolve({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Token CSRF manquant' }),
      });
    }

    // Si CSRF OK, retourner succès
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
  }) as any;
  ```

- [ ] Exécuter: `npm test -- lib/hooks/__tests__/useApiMutation.test.ts`
- [ ] Vérifier: 5/5 tests passent ✅
- [ ] Commit: "fix: Correction tests useApiMutation (CSRF token)"

---

#### ✅ Tâche 1.4: Fixer tests useSupabasePagination (3h)

**Fichier:** `lib/hooks/useSupabasePagination.ts`

**Problème:** `fetchData` n'est pas appelé quand `currentPage` change.

- [ ] Ajouter `useEffect` pour déclencher `fetchData`:
  ```typescript
  // Après la définition de fetchData
  useEffect(() => {
    void fetchData();
  }, [fetchData, currentPage]); // ✅ Ajouter currentPage!
  ```

- [ ] Vérifier que `fetchData` est dans les dépendances de `useCallback`:
  ```typescript
  const fetchData = useCallback(async () => {
    // ... code existant
  }, [supabase, table, select, itemsPerPage, orderBy, filters, currentPage, transform]);
  ```

- [ ] Exécuter: `npm test -- lib/hooks/__tests__/useSupabasePagination.test.ts`
- [ ] Vérifier: 12/12 tests passent ✅
- [ ] Commit: "fix: Correction useSupabasePagination (useEffect currentPage)"

**Validation finale Jour 1:**
```bash
npm test  # Doit afficher: 547/547 tests passing ✅
```

---

### Jour 2-3 - Refactoring Fichiers Monolithes (16h)

#### ✅ Tâche 2.1: Scinder `/app/client/bassins/[id]/page.tsx` (10h)

**Fichier actuel:** 2,991 lignes

**Structure cible:**
```
app/client/bassins/[id]/
├── page.tsx (200 lignes max)
├── components/
│   ├── BassinHeader.tsx
│   ├── BassinInformationCard.tsx
│   ├── BassinMaterialsCard.tsx
│   ├── BassinGarantiesCard.tsx
│   ├── BassinInterventionsCard.tsx
│   ├── BassinReportsCard.tsx
│   ├── BassinMapCard.tsx
│   └── BassinGalleryCard.tsx
└── hooks/
    ├── useBassinData.ts
    ├── useBassinMutations.ts
    └── useBassinFiles.ts
```

**Étapes:**

1. **Créer les dossiers** (5 min)
   ```bash
   mkdir -p app/client/bassins/[id]/components
   mkdir -p app/client/bassins/[id]/hooks
   ```

2. **Extraire les hooks personnalisés** (2h)
   - [ ] Créer `hooks/useBassinData.ts`:
     - Déplacer `fetchBassin()`
     - Déplacer les states de données (bassin, materiaux, etc.)
     - Retourner: `{ bassin, loading, error, refresh }`

   - [ ] Créer `hooks/useBassinMutations.ts`:
     - Déplacer tous les `useApiMutation` hooks
     - Retourner: `{ updateBassin, deleteBassin, createGarantie, ... }`

   - [ ] Créer `hooks/useBassinFiles.ts`:
     - Déplacer la logique d'upload de fichiers
     - Retourner: `{ uploadFile, deleteFile, isUploading }`

3. **Extraire les composants de cartes** (6h)
   - [ ] `BassinHeader.tsx` - Header avec nom et actions
   - [ ] `BassinInformationCard.tsx` - Informations générales
   - [ ] `BassinMaterialsCard.tsx` - Composition matériaux
   - [ ] `BassinGarantiesCard.tsx` - Liste garanties + modals
   - [ ] `BassinInterventionsCard.tsx` - Liste interventions + modals
   - [ ] `BassinReportsCard.tsx` - Liste rapports + modals
   - [ ] `BassinMapCard.tsx` - Carte Google Maps
   - [ ] `BassinGalleryCard.tsx` - Galerie de photos

4. **Refactoriser page.tsx** (1h)
   - [ ] Importer les hooks et composants
   - [ ] Composer la page (max 200 lignes)
   - [ ] Tester que tout fonctionne

5. **Validation** (1h)
   - [ ] Tester création/modification de garanties
   - [ ] Tester création/modification d'interventions
   - [ ] Tester upload de fichiers
   - [ ] Vérifier aucune régression
   - [ ] Commit: "refactor: Scinder page client/bassins/[id] (2991→200 lignes)"

---

#### ✅ Tâche 2.2: Scinder `/app/admin/bassins/[id]/page.tsx` (6h)

**Fichier actuel:** 2,969 lignes

**Structure similaire à 2.1:**
```
app/admin/bassins/[id]/
├── page.tsx (200 lignes max)
├── components/
│   ├── BassinHeaderAdmin.tsx
│   ├── BassinFormCard.tsx
│   ├── BassinMaterialsCard.tsx
│   ├── BassinInterventionsCard.tsx
│   ├── BassinReportsCard.tsx
│   └── BassinMapCard.tsx
└── hooks/
    ├── useBassinAdminData.ts
    └── useBassinAdminMutations.ts
```

**Note:** Réutiliser au maximum les composants créés en 2.1 si possible.

- [ ] Suivre les mêmes étapes que 2.1
- [ ] Validation complète
- [ ] Commit: "refactor: Scinder page admin/bassins/[id] (2969→200 lignes)"

---

## 🟠 PHASE 2: HAUTE PRIORITÉ (Jour 4)

### Jour 4 - Qualité et Performance (8h)

#### ✅ Tâche 3.1: Rate Limiting Distribué (4h)

**Option choisie:** [ ] Upstash  [ ] Redis  [ ] Documentation limitation

**Si Upstash (Recommandé):**

1. **Setup Upstash** (30 min)
   - [ ] Créer compte sur https://upstash.com/
   - [ ] Créer une database Redis
   - [ ] Noter: `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
   - [ ] Ajouter à `.env.local`:
     ```env
     UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
     UPSTASH_REDIS_REST_TOKEN=xxx
     ```

2. **Installer dépendances** (5 min)
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

3. **Créer nouveau rate-limit** (1h)
   - [ ] Créer `lib/rate-limit-upstash.ts`:
     ```typescript
     import { Ratelimit } from '@upstash/ratelimit';
     import { Redis } from '@upstash/redis';

     const redis = new Redis({
       url: process.env.UPSTASH_REDIS_REST_URL!,
       token: process.env.UPSTASH_REDIS_REST_TOKEN!,
     });

     export const rateLimitAPI = new Ratelimit({
       redis,
       limiter: Ratelimit.slidingWindow(100, '1 m'),
       analytics: true,
     });

     export const rateLimitLogin = new Ratelimit({
       redis,
       limiter: Ratelimit.slidingWindow(5, '15 m'),
       analytics: true,
     });
     ```

4. **Migrer tous les endpoints** (2h)
   - [ ] Remplacer `import { rateLimit } from '@/lib/rate-limit'`
   - [ ] Par: `import { rateLimitAPI } from '@/lib/rate-limit-upstash'`
   - [ ] Adapter le code:
     ```typescript
     // Ancien:
     const rateLimitResult = await rateLimit(req, RATE_LIMITS.API_GENERAL, userId);
     if (!rateLimitResult.allowed) { ... }

     // Nouveau:
     const { success, limit, reset, remaining } = await rateLimitAPI.limit(userId);
     if (!success) {
       return NextResponse.json(
         { error: 'Trop de requêtes' },
         {
           status: 429,
           headers: {
             'X-RateLimit-Limit': String(limit),
             'X-RateLimit-Remaining': String(remaining),
             'X-RateLimit-Reset': String(reset),
           },
         }
       );
     }
     ```

5. **Tester** (30 min)
   - [ ] Tester rate limiting avec Postman/curl
   - [ ] Vérifier que ça fonctionne avec multi-instances
   - [ ] Commit: "feat: Migrer rate limiting vers Upstash (scalable)"

---

#### ✅ Tâche 3.2: ESLint Fixes (2h)

1. **Auto-fix** (30 min)
   ```bash
   npm run lint -- --fix
   ```

2. **Corriger manuellement** (1h 30min)
   - [ ] Remplacer les `any` par des types appropriés
   - [ ] Corriger les React Hooks violations
   - [ ] Corriger les HTML entities

3. **Validation**
   ```bash
   npm run lint  # Doit afficher: 0 errors, 0 warnings
   ```

- [ ] Commit: "fix: Correction de toutes les erreurs ESLint (370→0)"

---

#### ✅ Tâche 3.3: Supprimer Code de Débogage (1h 30min)

1. **Remplacer `alert()` par toasts** (45 min)

   Fichier: `app/admin/bassins/[id]/page.tsx`

   - [ ] Ligne 827-829: Remplacer par:
     ```typescript
     // Au lieu de:
     alert('BUG interne: un champ uuid vaut "undefined" (voir console).')

     // Utiliser:
     showToast('Une erreur est survenue. Veuillez réessayer.', 'error');
     console.error('[ERREUR INTERNE]', { payload, badUuidFields });
     ```

   - [ ] Répéter pour toutes les occurrences de `alert()`

2. **Supprimer `console.error()` en production** (45 min)

   **Option A: Utiliser Sentry (Recommandé)**
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

   Remplacer:
   ```typescript
   // Ancien:
   console.error('Erreur:', err);

   // Nouveau:
   import * as Sentry from '@sentry/nextjs';

   Sentry.captureException(err, {
     tags: { context: 'bassin-update' },
     extra: { bassinId, userId },
   });
   ```

   **Option B: Wrapper conditionnel**
   ```typescript
   // lib/logger.ts
   export const logger = {
     error: (message: string, error: unknown, context?: Record<string, any>) => {
       if (process.env.NODE_ENV === 'development') {
         console.error(message, error, context);
       }
       // En production: envoyer à service de monitoring
     },
   };
   ```

- [ ] Commit: "fix: Suppression code de débogage (alert, console.error)"

---

## ✅ PHASE 3: VALIDATION FINALE (Jour 5)

### Jour 5 - Tests et Déploiement (5h)

#### ✅ Tâche 4.1: Validation Build (1h)

1. **Build réussi**
   ```bash
   npm run build
   ```
   - [ ] Vérifier: 0 erreurs TypeScript
   - [ ] Vérifier: 0 warnings ESLint
   - [ ] Noter la taille des bundles

2. **Test build local**
   ```bash
   npm start
   ```
   - [ ] Tester login admin
   - [ ] Tester création client
   - [ ] Tester création bassin
   - [ ] Tester upload fichiers
   - [ ] Tester rate limiting

---

#### ✅ Tâche 4.2: Tests Complets (1h)

```bash
npm test
```

- [ ] Vérifier: 547/547 tests passent ✅
- [ ] Vérifier: 0 tests échoués

```bash
npm run type-check
```

- [ ] Vérifier: 0 erreurs TypeScript

```bash
npm run lint
```

- [ ] Vérifier: 0 erreurs, 0 warnings

---

#### ✅ Tâche 4.3: Variables d'Environnement Production (30 min)

**Fichier:** `.env.production` (NE PAS COMMIT!)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx

# Site URL (production)
NEXT_PUBLIC_SITE_URL=https://votre-domaine.com

# Upstash (si utilisé)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Sentry (si utilisé)
SENTRY_DSN=xxx
NEXT_PUBLIC_SENTRY_DSN=xxx
```

- [ ] Vérifier toutes les variables sont définies
- [ ] Tester avec les variables de production en local

---

#### ✅ Tâche 4.4: Déploiement Staging (1h 30min)

**Plateforme:** [ ] Vercel  [ ] Autre

1. **Setup staging environment**
   - [ ] Créer projet staging sur Vercel
   - [ ] Configurer toutes les env vars
   - [ ] Déployer branche `staging`

2. **Tests staging**
   - [ ] Tester login
   - [ ] Tester CRUD operations
   - [ ] Tester upload fichiers
   - [ ] Tester rate limiting
   - [ ] Tester sur mobile
   - [ ] Tester sur différents navigateurs

3. **Monitoring**
   - [ ] Vérifier Sentry reçoit les erreurs
   - [ ] Vérifier pas d'erreurs JavaScript
   - [ ] Vérifier performances (Lighthouse)

---

#### ✅ Tâche 4.5: Documentation Déploiement (1h)

- [ ] Créer `DEPLOYMENT.md`:
  - [ ] Guide de déploiement Vercel
  - [ ] Configuration des env vars
  - [ ] Healthcheck endpoints
  - [ ] Rollback procedure

- [ ] Créer `README.md` principal:
  - [ ] Installation
  - [ ] Démarrage dev
  - [ ] Scripts disponibles
  - [ ] Variables d'environnement
  - [ ] Architecture overview

---

## 📊 RÉCAPITULATIF

### Progression

**Total estimé:** 37 heures

- [ ] Phase 1: Blockers (22h) - Jours 1-3
- [ ] Phase 2: Haute priorité (11h) - Jour 4
- [ ] Phase 3: Validation (4h) - Jour 5

### Métriques Cibles

**Avant corrections:**
- ❌ Tests: 533/547 (97.4%)
- ❌ TypeScript: 10 erreurs
- ❌ ESLint: 370 erreurs
- ❌ Vulnérabilités: 1 High Severity
- ❌ Fichiers >2000 lignes: 2

**Après corrections:**
- ✅ Tests: 547/547 (100%)
- ✅ TypeScript: 0 erreurs
- ✅ ESLint: 0 erreurs
- ✅ Vulnérabilités: 0
- ✅ Fichiers >2000 lignes: 0

---

## 🚀 DÉPLOIEMENT PRODUCTION

**Critères de validation:**
- ✅ Tous les tests passent (100%)
- ✅ Build réussi sans warnings
- ✅ ESLint 0 erreurs
- ✅ TypeScript 0 erreurs
- ✅ Staging testé et validé
- ✅ Monitoring configuré
- ✅ Documentation complète

**Go/No-Go Decision:**
- [ ] 🟢 **GO** - Tous les critères validés
- [ ] 🔴 **NO-GO** - Issues critiques restantes

---

**Date de dernière mise à jour:** 4 février 2026
**Prochaine révision:** Après Phase 1
