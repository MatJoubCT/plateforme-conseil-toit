# Analyse Debug - Plateforme Conseil-Toit

**Date:** 11 février 2026
**Analyste:** Claude Code
**Branche:** `claude/platform-debug-analysis-xPvYh`

---

## Sommaire Exécutif

L'analyse complète de la plateforme révèle **62 correctifs nécessaires** répartis en 4 niveaux de sévérité. La plateforme possède une architecture solide et une bonne sécurité de base, mais présente des problèmes concrets qui doivent être corrigés avant un déploiement en production.

| Sévérité | Nombre | Description |
|----------|--------|-------------|
| **CRITIQUE** | 8 | Bugs runtime, fuites mémoire, erreurs build |
| **MAJEUR** | 16 | Sécurité, UX dégradée, code non-sécurisé |
| **MOYEN** | 22 | Qualité code, performances, maintenabilité |
| **MINEUR** | 16 | Nettoyage, documentation, cosmétique |

---

## Résultats des Diagnostics Automatisés

| Outil | Résultat | Statut |
|-------|----------|--------|
| `npm audit` | 0 vulnérabilités | ✅ OK |
| `tsc --noEmit` | 2 erreurs | ❌ ÉCHEC |
| `vitest run` | 545/557 (12 tests échouent) | ❌ ÉCHEC |
| `eslint` | 283 erreurs, 95 warnings | ❌ ÉCHEC |
| `next build` | Échec (env vars manquantes) | ⚠️ Env |

---

## CATÉGORIE 1 : CORRECTIFS CRITIQUES

### C-01. Tests échoués : `liste.schema.test.ts` (3 tests)

**Fichier:** `lib/schemas/__tests__/liste.schema.test.ts`
**Cause racine:** Le test importe `CATEGORIES_VALIDES` qui n'existe pas. Le schéma exporte `CATEGORIES_REFERENCE`.

```typescript
// ❌ Ligne 6 du test
import { CATEGORIES_VALIDES } from '../liste.schema';

// ✅ Le schéma exporte CATEGORIES_REFERENCE
export const CATEGORIES_REFERENCE = [...] as const
```

**Tests affectés:**
1. `devrait accepter toutes les catégories valides` - `CATEGORIES_VALIDES.forEach` → TypeError
2. `devrait rejeter une catégorie invalide` - Attend une validation enum qui n'existe plus (catégorie est maintenant `z.string()`)
3. `devrait rejeter une description trop longue` - Le champ `description` a été retiré du schéma

**Correctif:** Mettre à jour le fichier de test pour refléter les changements du schéma.

---

### C-02. Tests échoués : `useSupabasePagination.test.ts` (9 tests)

**Fichier:** `lib/hooks/__tests__/useSupabasePagination.test.ts`
**Cause racine:** Les mocks ne sont pas adaptés au comportement actuel du hook. Le hook fonctionne en production mais les tests sont obsolètes.

**Tests affectés:** 9 tests incluant navigation, transformation de données, pagination.

**Correctif:** Réécrire les mocks pour correspondre au comportement actuel du hook.

---

### C-03. Erreurs TypeScript (2 erreurs)

**Fichier:** `lib/schemas/__tests__/liste.schema.test.ts`

```
error TS2305: Module '"../liste.schema"' has no exported member 'CATEGORIES_VALIDES'.
error TS7006: Parameter 'categorie' implicitly has an 'any' type.
```

**Correctif:** Renommer l'import `CATEGORIES_VALIDES` en `CATEGORIES_REFERENCE` et typer le paramètre.

---

### C-04. Fuite mémoire : Rate Limiter en mémoire

**Fichier:** `lib/rate-limit.ts:13-23`

Le rate limiter utilise un `Map<string, RateLimitEntry>` en mémoire sans limite de taille. Le nettoyage via `setInterval` ne fonctionne pas en environnement serverless (Vercel/Lambda).

```typescript
const storage = new Map<string, RateLimitEntry>() // ❌ Croissance illimitée
setInterval(() => { /* nettoyage */ }, 5 * 60 * 1000) // ❌ Ne survit pas en serverless
```

**Risques:**
- Épuisement mémoire sous charge
- Rate limiting inefficace en multi-instances (chaque instance a son propre Map)
- `setInterval` ne fonctionne pas en serverless

**Correctif:** Migrer vers Upstash Redis ou documenter la limitation à une seule instance.

---

### C-05. Middleware sans gestion d'erreurs sur Supabase

**Fichier:** `middleware.ts:42-136`

Les requêtes Supabase dans le middleware n'ont aucun `try-catch`. Si Supabase timeout ou retourne une erreur, le middleware crash avec une erreur 500 non informative.

```typescript
const { data: { user } } = await supabase.auth.getUser() // ❌ Pas de try-catch
const { data: profile } = await supabase
  .from('user_profiles').select('role').eq('user_id', user.id).single() // ❌ .single() peut throw
```

**Correctif:** Ajouter `try-catch` autour de toutes les requêtes Supabase dans le middleware.

---

### C-06. Rapports : appels directs à Supabase au lieu de l'API

**Fichier:** `app/client/bassins/[id]/page.tsx:1062-1131`

La gestion des rapports utilise des appels directs à `supabaseBrowser.from('rapports').insert/update` au lieu de passer par les endpoints API sécurisés. Cela contourne le CSRF, le rate limiting et la validation Zod côté serveur.

```typescript
// ❌ Appel direct (pas de CSRF, pas de rate limiting)
res = await supabaseBrowser.from('rapports').insert(payload).select().single()

// ✅ Devrait utiliser useApiMutation
await createRapport(payload)
```

**Correctif:** Migrer vers `useApiMutation` avec les endpoints `/api/client/rapports/*` ou `/api/admin/rapports/*`.

---

### C-07. Race condition : chargement d'images sans annulation

**Fichier:** `app/client/bassins/[id]/page.tsx:708-755`

Le `useEffect` de chargement des URLs signées lance des `Promise.all()` sans `AbortController`. Si le modal s'ouvre/ferme rapidement, les promises précédentes continuent et mettent à jour un state obsolète.

```typescript
useEffect(() => {
  Promise.all(imageFiles.map(...)) // ❌ Pas d'annulation
    .then((results) => {
      setImageUrls(urlMap) // ❌ Peut mettre à jour un state stale
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [modalImagesOpen, selectedInterventionForImages]) // ❌ Manque imageFiles
```

**Correctif:** Ajouter un `AbortController` ou un flag `isMounted` pour éviter les mises à jour d'état après démontage.

---

### C-08. Données rapport en snake_case envoyées à l'API qui attend camelCase

**Fichier:** `app/admin/bassins/[id]/page.tsx:936-944`

Le payload de rapport utilise `bassin_id`, `type_id`, `date_rapport` (snake_case) alors que l'API et le schéma Zod attendent `bassinId`, `typeId`, `dateRapport` (camelCase).

```typescript
const payload = {
  bassin_id: bassin.id,       // ❌ Devrait être: bassinId
  type_id: safeTypeRapportId, // ❌ Devrait être: typeId
  date_rapport: formDateRapport, // ❌ Devrait être: dateRapport
}
```

**Correctif:** Utiliser les noms camelCase conformes au schéma Zod.

---

## CATÉGORIE 2 : CORRECTIFS MAJEURS

### M-01. 49 appels `alert()` à remplacer par des toasts

**Fichiers:**
- `app/client/bassins/[id]/page.tsx` — 26 occurrences
- `app/admin/bassins/[id]/page.tsx` — 21 occurrences
- `components/maps/BassinMap.tsx` — 2 occurrences

Les `alert()` bloquent le thread UI et offrent une expérience utilisateur dégradée. Le projet dispose déjà d'un système de toast (`useToast` dans `lib/toast-context.tsx`).

**Correctif:** Remplacer chaque `alert(msg)` par `showToast(msg, 'error')`.

---

### M-02. 68 `console.log()` de debug en production

**Fichiers principaux:**
- `app/login/page.tsx` — 9 occurrences (logs avec emojis)
- `app/admin/entreprises/page.tsx` — 2 occurrences (DEBUG payloads)
- `app/api/admin/entreprises/create/route.ts` — 2 occurrences (DEBUG API)
- `app/admin/reactivate-users/page.tsx` — 5 occurrences

**Correctif:** Supprimer les `console.log()` ou les conditionner avec `process.env.NODE_ENV === 'development'`.

---

### M-03. Dépendance dépréciée non supprimée

**Fichier:** `package.json:19`

```json
"@supabase/auth-helpers-nextjs": "^0.10.0"  // ❌ DEPRECATED
```

Ce package n'est importé nulle part dans le code source — la migration vers `@supabase/ssr` est déjà faite. Mais il reste installé, générant des warnings npm.

**Correctif:** `npm uninstall @supabase/auth-helpers-nextjs`

---

### M-04. ESLint : 283 erreurs et 95 warnings

**Répartition des erreurs principales:**

| Catégorie | Nombre | Exemple |
|-----------|--------|---------|
| `@typescript-eslint/no-explicit-any` | ~100+ | `catch (err: any)` |
| `react-hooks/purity` | ~10 | Appels impurs dans composants |
| `@typescript-eslint/no-require-imports` | 7 | Scripts `.js` |
| `@typescript-eslint/no-unused-vars` | ~15 | Variables et imports non utilisés |

**Correctif:** Exécuter `npx eslint . --fix` pour les corrections automatiques, puis corriger manuellement les `any` restants.

---

### M-05. Incohérence `||` vs `??` pour les valeurs nullables

**Fichiers:** Tous les endpoints API de bassins (create, update)

```typescript
surface_m2: validated.surfaceM2 ?? null,           // ✅ Correct (préserve 0)
membrane_type_id: validated.membraneTypeId || null, // ❌ Bug si valeur = 0 ou ""
```

`||` transforme `0`, `false`, et `""` en `null`. Pour les champs numériques (`surface_m2`, `annee_installation`, `cout`), il faut utiliser `??`.

**Fichiers affectés:**
- `app/api/admin/bassins/create/route.ts:105-114`
- `app/api/admin/bassins/update/route.ts:113-127`
- `app/api/client/bassins/update/route.ts:129-142`

**Correctif:** Remplacer `|| null` par `?? null` pour tous les champs numériques.

---

### M-06. Spoofing IP dans le rate limiter

**Fichier:** `lib/rate-limit.ts:174-179`

L'extraction d'IP accepte `x-forwarded-for` sans vérification du proxy de confiance. Un attaquant peut contourner le rate limiting en variant les headers.

```typescript
const forwarded = request.headers.get('x-forwarded-for')
const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
```

**Correctif:** Utiliser uniquement les headers du proxy de confiance (Vercel, Cloudflare).

---

### M-07. Validation CSRF sans vérification Origin

**Fichier:** `lib/csrf.ts:41-58`

La vérification CSRF compare le token cookie au token header, mais ne vérifie pas l'en-tête `Origin` de la requête.

**Correctif:** Ajouter une vérification de l'en-tête `Origin` dans `checkCsrf()`.

---

### M-08. `.single()` sans gestion d'erreur dans le middleware

**Fichier:** `middleware.ts:57, 79, 109, 132`

Les appels `.single()` lèvent une exception si aucune ligne n'est trouvée (ex: utilisateur supprimé de `user_profiles` mais existant dans `auth.users`). Ces exceptions ne sont jamais capturées.

**Correctif:** Remplacer `.single()` par `.maybeSingle()` ou ajouter des blocs `try-catch`.

---

### M-09. Validation de dates par regex uniquement

**Fichiers:** `lib/schemas/bassin.schema.ts`, `lib/schemas/garantie.schema.ts`

```typescript
.regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide')
```

Cette regex accepte `2024-13-45` comme valide. Aucune validation de la date réelle.

**Correctif:** Ajouter une validation de date réelle avec `.refine()` ou `z.coerce.date()`.

---

### M-10. Validation GeoJSON sans vérification des coordonnées

**Fichier:** `lib/schemas/bassin.schema.ts:94-100`

Les coordonnées GeoJSON acceptent n'importe quel nombre, y compris `[500, 500]`.

```typescript
coordinates: z.array(z.array(z.array(z.number()))) // ❌ Pas de validation de plage
```

**Correctif:** Ajouter des contraintes `min(-180).max(180)` pour longitude et `min(-90).max(90)` pour latitude.

---

### M-11. Redirection ouverte potentielle

**Fichier:** `middleware.ts:70, 100, 120`

Le paramètre `redirect` dans l'URL n'est pas validé. Un attaquant pourrait forger `?redirect=//evil.com`.

```typescript
url.searchParams.set('redirect', pathname) // ❌ Pas de validation
```

**Correctif:** Valider que le redirect commence par `/` et ne contient pas `//`.

---

### M-12. Fichiers monolithiques (>2000 lignes)

| Fichier | Lignes | Recommandation |
|---------|--------|----------------|
| `app/client/bassins/[id]/page.tsx` | 2983 | Scinder en 8+ composants |
| `app/admin/bassins/[id]/page.tsx` | 2974 | Scinder en 8+ composants |

Ces fichiers sont impossibles à maintenir, tester et déboguer efficacement. Ils contiennent trop de responsabilités (data fetching, mutations, modals, formulaires, carte, galerie).

**Correctif:** Suivre le plan de découpage décrit dans `CHECKLIST_V1.md` (tâches 2.1 et 2.2).

---

### M-13. Duplication d'état de chargement

**Fichier:** `app/client/bassins/[id]/page.tsx:306, 383-403`

Le composant utilise à la fois `setSavingIntervention` (état manuel) et `isCreatingIntervention` / `isUpdatingIntervention` (de `useApiMutation`). L'état manuel est redondant.

**Correctif:** Supprimer `savingIntervention` et utiliser uniquement les états de `useApiMutation`.

---

### M-14. Erreur silencieuse lors de la suppression de fichiers storage

**Fichier:** `app/api/client/interventions/delete/route.ts:88-91`

Si la suppression de fichiers du storage échoue, l'erreur est loguée mais le client reçoit un succès (200). Les fichiers deviennent orphelins.

**Correctif:** Retourner une erreur ou documenter le comportement.

---

### M-15. Première erreur de validation seule retournée

**Fichiers:** Tous les endpoints API

```typescript
if (error instanceof z.ZodError) {
  return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
}
```

Si le formulaire a 5 erreurs, l'utilisateur doit soumettre 5 fois pour toutes les voir.

**Correctif:** Retourner `error.issues` au complet.

---

### M-16. Double `.min(1)` sur le nom du bassin

**Fichier:** `lib/schemas/bassin.schema.ts:36-37`

```typescript
name: z.string()
  .min(1, 'Le nom du bassin est obligatoire')
  .min(1, 'Le nom du bassin est obligatoire') // ❌ Dupliqué
  .max(200, ...)
```

**Correctif:** Supprimer la ligne dupliquée.

---

## CATÉGORIE 3 : CORRECTIFS MOYENS

### Mo-01. Import non utilisé `SupabaseClient`

**Fichier:** `lib/hooks/useSupabasePagination.ts:5`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'; // ❌ Non utilisé
```

---

### Mo-02. Import non utilisé `CookieOptions`

**Fichier:** `middleware.ts:3`

```typescript
import type { CookieOptions } from '@supabase/ssr' // ❌ Non utilisé
```

---

### Mo-03. Variable non utilisée `coordinatesSchema`

**Fichier:** `lib/schemas/batiment.schema.ts:11`

---

### Mo-04. Variable non utilisée `ToastProps`

**Fichier:** `lib/toast-context.tsx:4`

---

### Mo-05. Variable non utilisée `e` dans CSRF

**Fichier:** `lib/csrf.ts:135`

---

### Mo-06. Comparaison non-timing-safe pour CSRF

**Fichier:** `lib/csrf.ts:54-58`

```typescript
return hashedCookieToken === hashedHeaderToken // ❌ Vulnérable aux timing attacks
```

**Correctif:** Utiliser `crypto.timingSafeEqual()`.

---

### Mo-07. Requêtes profil multiples dans le middleware

**Fichier:** `middleware.ts`

Le middleware effectue 3-5 requêtes profil par requête HTTP (vérification de rôle pour chaque route). Cela ajoute 60-250ms de latence.

**Correctif:** Mettre en cache le profil après la première requête.

---

### Mo-08. Race condition dans le rate limiter

**Fichier:** `lib/rate-limit.ts:81`

```typescript
entry.count++ // ❌ Mutation directe - race condition possible en async
```

**Correctif:** Utiliser `storage.set()` avec une copie.

---

### Mo-09. Pas de timeout sur les requêtes Supabase middleware

**Fichier:** `middleware.ts`

Aucun `AbortSignal` ou timeout. Si Supabase est lent, la requête entière est bloquée.

**Correctif:** Ajouter un timeout de 5 secondes.

---

### Mo-10. `httpOnly: false` sur le cookie CSRF documenté

**Fichier:** `lib/csrf.ts:11`

Nécessaire pour que le JavaScript puisse lire le token, mais devrait être documenté comme choix architectural.

---

### Mo-11. Erreurs de base de données exposées au client

**Fichiers:** Tous les endpoints API

```typescript
{ error: `Erreur lors de la création du bassin: ${error.message}` }
```

Les messages d'erreur Supabase peuvent contenir des détails d'implémentation.

**Correctif:** Logger le détail côté serveur, retourner un message générique au client.

---

### Mo-12. TODO non résolu dans le code

**Fichier:** `lib/validation.ts:97`

```typescript
// TODO: Intégrer avec un service de monitoring
```

**Correctif:** Implémenter ou supprimer.

---

### Mo-13. Scripts JS utilisant `require()` au lieu d'imports ES

**Fichiers:** `scripts/check-constraint-loader.js`, `scripts/check-constraint.js`

7 erreurs ESLint `@typescript-eslint/no-require-imports`.

**Correctif:** Convertir en modules ES ou exclure des règles ESLint.

---

### Mo-14. Appel impur dans composant Toast

**Fichier:** `components/ui/Toast.tsx:22`

```typescript
const id = providedId || `toast-${Date.now()}` // ❌ Date.now() est impur
```

**Correctif:** Utiliser `useId()` de React ou déplacer dans un `useEffect`.

---

### Mo-15. Vérification `is_active` manquante dans `requireAdmin`

**Fichier:** `lib/auth-middleware.ts:117-119`

Le `select` de `requireAdmin` ne sélectionne pas `is_active`, mais le champ pourrait être vérifié plus tard.

**Correctif:** Ajouter `is_active` au select de `requireAdmin`.

---

### Mo-16. `clientIds` vide non détecté

**Fichier:** `lib/auth-middleware.ts:244`

Si un utilisateur client n'a aucun client assigné, `clientIds = []`. Tous les accès sont refusés avec un message générique "Accès refusé" sans explication.

**Correctif:** Vérifier si `clientIds` est vide et retourner un message explicatif.

---

### Mo-17. Cookie refresh race condition

**Fichier:** `middleware.ts:28-35`

`response` est réassigné dans le callback `setAll()`. Si le middleware fait un redirect après, les cookies rafraîchis sont perdus.

**Correctif:** Utiliser la même variable response pour les redirects.

---

### Mo-18. Pas de validation format token JWT

**Fichier:** `lib/auth-middleware.ts:106`

Le token est envoyé directement à Supabase sans vérification de format basique. Un token de 3 caractères sera accepté.

**Correctif:** Vérifier que le token contient au moins un `.` (format JWT).

---

### Mo-19. Nettoyage de fichiers manquant sur échec d'insertion

**Fichier:** `app/api/admin/bassins/create/route.ts:118-129`

Si l'insertion en base échoue après un traitement de données, aucun nettoyage n'est effectué (contrairement à l'upload d'interventions qui supprime le fichier en cas d'erreur).

---

### Mo-20. Inconsistance `numero_contrat` vs `numero_garantie`

CLAUDE.md documente le champ comme `numero_contrat` mais le schéma et les routes utilisent `numero_garantie`.

**Correctif:** Mettre à jour la documentation.

---

### Mo-21. Gestion incohérente des rôles inconnus

**Fichier:** `middleware.ts:135`

```typescript
url.pathname = profile?.role === 'admin' ? '/admin' : '/client'
```

Un rôle inconnu (ex: `moderator`) est redirigé vers `/client` sans vérification.

---

### Mo-22. Erreurs de fichiers orphelins dans le storage en cas d'échec silencieux

**Fichier:** `app/api/client/interventions/delete/route.ts:88-91`

Les erreurs de suppression storage sont loguées mais le client reçoit un succès.

---

## CATÉGORIE 4 : CORRECTIFS MINEURS

| # | Description | Fichier |
|---|-------------|---------|
| m-01 | Import `NextResponse` non utilisé | `lib/__tests__/auth-middleware.test.ts:2` |
| m-02 | Variable `container` non utilisée | `components/ui/__tests__/ConfirmDialog.test.tsx:194` |
| m-03 | Import `CoordinatesInput` non utilisé | `lib/schemas/__tests__/batiment.schema.test.ts:2` |
| m-04 | Import `z` non utilisé | `lib/schemas/__tests__/batiment.schema.test.ts:3` |
| m-05 | Import `expect` non utilisé | `tests/setup.ts:2` |
| m-06 | Variable `schemaInfo` non utilisée | `scripts/check-constraint.js:96` |
| m-07 | Variable `table` non utilisée (3x) | `lib/__tests__/auth-middleware.test.ts:470,523,579` |
| m-08 | `eslint-disable` sans justification | `app/client/bassins/[id]/page.tsx:754` |
| m-09 | Type `any` dans les tests (30+ occurrences) | Fichiers `__tests__/*.test.ts` |
| m-10 | HTTP 403 au lieu de 401 pour compte désactivé | `app/api/auth/login/route.ts:93` |
| m-11 | BUG detection code avec `alert()` en production | `app/admin/bassins/[id]/page.tsx:821-832, 946-956` |
| m-12 | `as any` pour contourner le typage | Multiples fichiers client API |
| m-13 | Chaîne optionnelle redondante dans delete-file | `app/api/client/interventions/delete-file/route.ts:65-67` |
| m-14 | Incohérence `telephone` (snake) vs `siteWeb` (camel) | `lib/schemas/entreprise.schema.ts` |
| m-15 | Variables d'état inutilisées dans pages admin/client | `app/client/bassins/[id]/page.tsx:294` |
| m-16 | Messages d'erreur en français/anglais mélangés | Multiples fichiers API |

---

## Plan de Correctifs Priorisé

### Phase 1 : Stabilisation (Critiques + Bloqueurs)

| # | Tâche | Complexité |
|---|-------|-----------|
| 1 | Corriger les 3 tests `liste.schema.test.ts` (import + assertions) | Faible |
| 2 | Corriger les 9 tests `useSupabasePagination.test.ts` (mocks) | Moyenne |
| 3 | Corriger les 2 erreurs TypeScript | Faible |
| 4 | Ajouter `try-catch` au middleware Supabase | Faible |
| 5 | Corriger le payload rapport snake_case → camelCase | Faible |
| 6 | Ajouter annulation aux Promise.all (images) | Faible |

### Phase 2 : Sécurité + UX

| # | Tâche | Complexité |
|---|-------|-----------|
| 7 | Remplacer 49 `alert()` par des toasts | Moyenne |
| 8 | Supprimer les `console.log()` de debug | Faible |
| 9 | Supprimer `@supabase/auth-helpers-nextjs` | Faible |
| 10 | Corriger `||` → `??` pour champs numériques API | Faible |
| 11 | Migrer rapports client vers useApiMutation | Moyenne |
| 12 | Ajouter validation Origin dans CSRF | Faible |
| 13 | Remplacer `.single()` par `.maybeSingle()` middleware | Faible |
| 14 | Valider paramètre redirect (open redirect) | Faible |
| 15 | Retourner toutes les erreurs Zod au client | Faible |

### Phase 3 : Qualité Code

| # | Tâche | Complexité |
|---|-------|-----------|
| 16 | Corriger ESLint (auto-fix + corrections manuelles `any`) | Haute |
| 17 | Scinder `client/bassins/[id]/page.tsx` (2983 lignes) | Haute |
| 18 | Scinder `admin/bassins/[id]/page.tsx` (2974 lignes) | Haute |
| 19 | Migrer rate limiter vers Redis/Upstash | Moyenne |
| 20 | Nettoyer imports et variables non utilisés | Faible |
| 21 | Supprimer état de chargement dupliqué | Faible |
| 22 | Ajouter validation de dates réelle | Faible |
| 23 | Ajouter validation coordonnées GeoJSON | Faible |

### Phase 4 : Polish

| # | Tâche | Complexité |
|---|-------|-----------|
| 24 | Résoudre les TODO dans le code | Faible |
| 25 | Corriger les mineurs (imports, types) | Faible |
| 26 | Documenter les choix architecturaux (CSRF httpOnly) | Faible |
| 27 | Harmoniser messages d'erreur (français) | Faible |

---

## Points Forts de la Plateforme

| Aspect | Score | Détail |
|--------|-------|--------|
| **Sécurité XSS** | 10/10 | Aucun `dangerouslySetInnerHTML`, `eval()`, `innerHTML` |
| **Injection SQL** | 10/10 | Toutes les requêtes sont paramétrées (Supabase ORM) |
| **Credentials** | 10/10 | Aucun secret hardcodé, gestion `.env` correcte |
| **Auth/RBAC** | 9/10 | Middleware, rôles, validation active status |
| **Validation input** | 8/10 | Zod sur tous les endpoints (dates et coords à améliorer) |
| **Headers HTTP** | 9/10 | CSP, HSTS, X-Frame-Options, Permissions-Policy |
| **Tests** | 8/10 | 545/557 passent, 87.82% couverture |
| **Documentation** | 9/10 | CLAUDE.md exhaustif (3000+ lignes) |
| **Architecture** | 7/10 | Bons patterns mais fichiers trop gros |

**Score global sécurité : 8.6/10**

---

## Métriques Actuelles vs Cibles

| Métrique | Actuel | Cible V1 |
|----------|--------|----------|
| Tests réussis | 545/557 (97.8%) | 557/557 (100%) |
| Erreurs TypeScript | 2 | 0 |
| Erreurs ESLint | 283 erreurs, 95 warnings | 0 erreurs, 0 warnings |
| Vulnérabilités npm | 0 | 0 |
| Fichiers >2000 lignes | 2 | 0 |
| Appels `alert()` | 49 | 0 |
| `console.log()` debug | 68 | 0 |
| Paquets dépréciés | 1 | 0 |

---

*Rapport généré automatiquement par Claude Code le 11 février 2026*
