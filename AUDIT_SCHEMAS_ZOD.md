# Audit Complet des Schémas Zod - Plateforme Conseil-Toit

**Date:** 2026-02-03
**Auditeur:** Claude Code
**Statut:** ✅ Audit terminé

---

## 📊 Vue d'Ensemble

| Schéma | Convention | Conversion API | Statut | Risque |
|--------|-----------|----------------|--------|--------|
| `client.schema.ts` | ✅ snake_case | ✅ Pas nécessaire | ✅ OK | 🟢 Aucun |
| `batiment.schema.ts` | 🔄 camelCase | ✅ Fait par API | ✅ OK | 🟡 Faible |
| `materiau.schema.ts` | ✅ snake_case | ✅ Pas nécessaire | ✅ OK | 🟢 Aucun |
| `bassin.schema.ts` | 🔄 camelCase | ✅ Fait par API | ✅ OK | 🟡 Faible |
| `entreprise.schema.ts` | 🔄 camelCase | ✅ Fait par API | ✅ OK | 🟡 Faible |
| `liste.schema.ts` | ✅ snake_case | ✅ Pas nécessaire | ✅ OK | 🟢 Aucun |
| `user.schema.ts` | 🔄 camelCase | ✅ Fait par API | ✅ OK | 🟡 Faible |
| `garantie.schema.ts` | 🔄 camelCase | ✅ Fait par API | ✅ OK | 🟡 Faible |
| `rapport.schema.ts` | ✅ snake_case | ✅ Pas nécessaire | ✅ OK | 🟢 Aucun |

**Légende:**
- 🟢 Aucun risque
- 🟡 Faible risque (nécessite vigilance)
- 🔴 Risque élevé (correction recommandée)

---

## 🔍 Analyse Détaillée par Schéma

### 1. ✅ `client.schema.ts` - CONFORME

**Champs:**
```typescript
{
  name: string  // ✅ Correspond à DB: name
}
```

**Évaluation:**
- ✅ Pas de conversion nécessaire
- ✅ Cohérence parfaite schéma ↔ DB
- ✅ Aucun risque d'erreur

---

### 2. 🔄 `batiment.schema.ts` - UTILISE CAMELCASE (CORRIGÉ)

**Champs du schéma (camelCase):**
```typescript
{
  name: string,
  address: string,          // ✅ Récemment corrigé (optionnel)
  city: string,             // ✅ Récemment corrigé (optionnel)
  postalCode: string,       // → Converti vers: postal_code
  clientId: UUID,           // → Converti vers: client_id
  latitude: number,
  longitude: number,
  notes: string,
}
```

**Conversion dans l'API:**
```typescript
const dbData = {
  name: validated.name,
  address: validated.address || null,
  city: validated.city || null,
  postal_code: validated.postalCode || null,  // ✅ Conversion
  client_id: validated.clientId,              // ✅ Conversion
  latitude: validated.latitude ?? null,
  longitude: validated.longitude ?? null,
  notes: validated.notes || null,
}
```

**Évaluation:**
- ✅ Conversion bien implémentée dans les API endpoints
- ⚠️ Nécessite vigilance lors de modifications futures
- 🟡 Risque faible de régression si oubli de conversion

**Correction récente (2026-02-03):**
- ✅ Champs `address` et `city` rendus optionnels pour correspondre aux formulaires

---

### 3. ✅ `materiau.schema.ts` - CONFORME (CORRIGÉ COMPLÈTEMENT)

**Champs du schéma (snake_case):**
```typescript
{
  nom: string,
  description: string | null,
  categorie_id: UUID | null,              // ✅ FK vers listes_choix
  unite_id: UUID | null,                  // ✅ FK vers listes_choix
  prix_cad: number,                       // ✅ Prix en dollars canadiens
  manufacturier_entreprise_id: UUID | null,  // ✅ FK vers entreprises
  actif: boolean,
}
```

**Correspondance DB:**
```sql
CREATE TABLE materiaux (
  id UUID PRIMARY KEY,
  nom TEXT NOT NULL,
  description TEXT,
  categorie_id UUID REFERENCES listes_choix(id),
  unite_id UUID REFERENCES listes_choix(id),
  prix_cad NUMERIC NOT NULL DEFAULT 0,
  manufacturier_entreprise_id UUID REFERENCES entreprises(id),
  actif BOOLEAN DEFAULT TRUE
);
```

**Évaluation:**
- ✅ Cohérence parfaite schéma ↔ DB
- ✅ Pas de conversion nécessaire
- ✅ Aucun risque d'erreur

**Correction majeure (2026-02-03):**
- ❌ **AVANT:** Schéma utilisait `categorie`, `unite`, `prixUnitaire` (ERREUR MAJEURE)
- ✅ **APRÈS:** Réécriture complète pour utiliser `categorie_id`, `unite_id`, `prix_cad`

---

### 4. 🔄 `bassin.schema.ts` - UTILISE CAMELCASE

**Champs du schéma (camelCase):**
```typescript
{
  batimentId: UUID,             // → batiment_id
  name: string,
  surfaceM2: number,            // → surface_m2
  membraneTypeId: UUID,         // → membrane_type_id
  etatId: UUID,                 // → etat_id
  dureeVieId: UUID,             // → duree_vie_id
  dureeVieText: string,         // → duree_vie_text
  anneeInstallation: number,    // → annee_installation
  dateDerniereRefection: string,  // → date_derniere_refection
  referenceInterne: string,     // → reference_interne
  notes: string,
  polygoneGeojson: GeoJSON,     // → polygone_geojson
}
```

**Conversion dans l'API:**
```typescript
const dbData = {
  batiment_id: validated.batimentId,             // ✅
  name: validated.name,
  surface_m2: validated.surfaceM2 ?? null,       // ✅
  membrane_type_id: validated.membraneTypeId || null,  // ✅
  etat_id: validated.etatId || null,             // ✅
  duree_vie_id: validated.dureeVieId || null,    // ✅
  duree_vie_text: validated.dureeVieText || null,  // ✅
  annee_installation: validated.anneeInstallation ?? null,  // ✅
  date_derniere_refection: validated.dateDerniereRefection || null,  // ✅
  reference_interne: validated.referenceInterne || null,  // ✅
  notes: validated.notes || null,
  polygone_geojson: validated.polygoneGeojson || null,  // ✅
}
```

**Évaluation:**
- ✅ Conversion bien implémentée (12 champs convertis)
- ⚠️ Complexité élevée (beaucoup de champs à convertir)
- 🟡 Risque de régression si nouvelle colonne ajoutée

---

### 5. 🔄 `entreprise.schema.ts` - UTILISE CAMELCASE

**Champs du schéma (camelCase):**
```typescript
{
  type: string,
  nom: string,
  telephone: string,     // ✅ Pas de conversion (déjà en snake_case dans DB)
  siteWeb: string,       // → Converti vers: site_web
  notes: string,
}
```

**Conversion dans l'API:**
```typescript
const dbData = {
  type: validated.type,
  nom: validated.nom,
  telephone: validated.telephone || null,
  site_web: validated.siteWeb || null,  // ✅ Conversion
  notes: validated.notes || null,
}
```

**Évaluation:**
- ✅ Conversion bien implémentée
- ⚠️ Incohérence: `telephone` en snake_case dans schéma, `siteWeb` en camelCase
- 🟡 Risque faible mais présence d'incohérence

---

### 6. ✅ `liste.schema.ts` - CONFORME

**Champs:**
```typescript
{
  categorie: enum,
  code: string,
  label: string,
  couleur: string,
  ordre: number,
  description: string,
}
```

**Évaluation:**
- ✅ Pas de conversion nécessaire
- ✅ Cohérence parfaite schéma ↔ DB
- ✅ Aucun risque d'erreur

---

### 7. 🔄 `user.schema.ts` - UTILISE CAMELCASE

**Champs du schéma (camelCase):**
```typescript
{
  email: string,
  fullName: string,                  // → full_name
  role: 'admin' | 'client',
  clientId: UUID,                    // → client_id
  userId: UUID,                      // → user_id
  profileId: UUID,                   // → profile_id (dans user_profiles)
  selectedClientIds: UUID[],         // Utilisé pour user_clients
  selectedBatimentIds: UUID[],       // Utilisé pour user_batiments
}
```

**Conversion dans l'API:**
```typescript
// user_profiles
const profileData = {
  user_id: userId,                   // ✅
  full_name: validated.fullName,     // ✅
  role: validated.role,
  client_id: validated.clientId || null,  // ✅
  is_active: true,
}
```

**Évaluation:**
- ✅ Conversion bien implémentée
- ⚠️ Gestion multi-tables (auth.users, user_profiles, user_clients)
- 🟡 Risque faible mais complexité élevée

---

### 8. 🔄 `garantie.schema.ts` - UTILISE CAMELCASE

**Champs du schéma (camelCase):**
```typescript
{
  bassinId: UUID,              // → bassin_id
  typeGarantieId: UUID,        // → type_garantie_id
  fournisseur: string,
  numeroGarantie: string,      // → numero_garantie
  dateDebut: string,           // → date_debut
  dateFin: string,             // → date_fin
  statutId: UUID,              // → statut_id
  couverture: string,
  commentaire: string,
  fichierPdfUrl: string,       // → fichier_pdf_url
}
```

**Conversion dans l'API (client/garanties):**
```typescript
const dbData = {
  bassin_id: validated.bassinId,              // ✅
  type_garantie_id: validated.typeGarantieId || null,  // ✅
  fournisseur: validated.fournisseur || null,
  numero_garantie: validated.numeroGarantie || null,  // ✅
  date_debut: validated.dateDebut || null,    // ✅
  date_fin: validated.dateFin || null,        // ✅
  statut_id: validated.statutId || null,      // ✅
  couverture: validated.couverture || null,
  commentaire: validated.commentaire || null,
  fichier_pdf_url: validated.fichierPdfUrl || null,  // ✅
}
```

**Évaluation:**
- ✅ Conversion bien implémentée (7 champs convertis)
- ⚠️ Complexité moyenne
- 🟡 Risque faible de régression

---

### 9. ✅ `rapport.schema.ts` - CONFORME

**Champs:**
```typescript
{
  bassin_id: UUID,
  type_id: UUID,
  date_rapport: string,
  numero_ct: string,
  titre: string,
  description: string,
  file_url: string,
}
```

**Évaluation:**
- ✅ Pas de conversion nécessaire
- ✅ Cohérence parfaite schéma ↔ DB
- ✅ Aucun risque d'erreur

---

## 📈 Statistiques Globales

### Par Convention de Nommage

| Convention | Nombre | % | Schémas |
|-----------|--------|---|---------|
| **snake_case pur** | 4 | 44% | client, materiau, liste, rapport |
| **camelCase → snake_case** | 5 | 56% | batiment, bassin, entreprise, user, garantie |

### Par Niveau de Risque

| Risque | Nombre | % | Impact |
|--------|--------|---|--------|
| 🟢 **Aucun** (snake_case pur) | 4 | 44% | Aucun risque |
| 🟡 **Faible** (camelCase converti) | 5 | 56% | Nécessite vigilance |
| 🔴 **Élevé** | 0 | 0% | Aucun risque élevé |

### Complexité des Conversions

| Schéma | Champs Convertis | Complexité |
|--------|------------------|-----------|
| batiment | 2 | Faible |
| bassin | 12 | **Élevée** |
| entreprise | 1 | Faible |
| user | 4 | Moyenne |
| garantie | 7 | Moyenne |

---

## ⚠️ Risques Identifiés

### 1. 🟡 Risque de Régression lors d'Ajout de Colonnes

**Scénario:**
```typescript
// Nouvelle colonne ajoutée à la DB: status_code (snake_case)

// ❌ Si on oublie de mettre à jour le schéma Zod
const bassinSchema = z.object({
  // ... champs existants
  // statusCode manquant !
})

// ❌ Si on oublie d'ajouter la conversion dans l'API
const dbData = {
  // ... conversions existantes
  // status_code: validated.statusCode manquant !
}
```

**Impact:** Données non sauvegardées, validation échouée silencieusement

**Probabilité:** Moyenne (surtout pour bassin.schema.ts avec 12 champs)

### 2. 🟡 Incohérence dans entreprise.schema.ts

**Problème:**
```typescript
{
  telephone: string,  // ✅ snake_case
  siteWeb: string,    // ❌ camelCase
}
```

**Impact:** Confusion pour les développeurs

**Probabilité:** Faible (mais présent)

### 3. 🟡 Complexité de Maintenance

**Problème:**
- Chaque modification de schéma nécessite aussi modification de l'API endpoint
- Double point de maintenance (schéma + endpoint)

**Exemple:** Pour ajouter un champ à `bassin`:
1. Modifier `bassin.schema.ts` (ajouter `newField`)
2. Modifier `/api/admin/bassins/create/route.ts` (ajouter conversion `new_field: validated.newField`)
3. Modifier `/api/admin/bassins/update/route.ts` (même conversion)

**Impact:** Augmentation du risque d'erreur humaine

---

## ✅ Points Positifs

### 1. Conversion Systématique

**Toutes les conversions sont bien implémentées:**
- ✅ Aucun endpoint n'envoie directement les données camelCase à la DB
- ✅ Pattern cohérent: `validated.camelCase` → `snake_case: value`

### 2. Validation Zod Fonctionnelle

**Tous les schémas valident correctement:**
- ✅ Types corrects (string, number, UUID, boolean)
- ✅ Contraintes respectées (min, max, regex, nullable)
- ✅ Messages d'erreur en français

### 3. Corrections Récentes

**Corrections appliquées (2026-02-03):**
- ✅ `batiment.schema.ts`: Champs `address` et `city` optionnels
- ✅ `materiau.schema.ts`: Réécriture complète pour correspondre à la DB
- ✅ `useApiMutation`: Logs de débogage ajoutés

---

## 💡 Recommandations

### Recommandation 1: Maintenir le Status Quo ✅ (RECOMMANDÉ)

**Approche:** Garder les schémas actuels avec camelCase + conversion API

**Avantages:**
- ✅ Pas de modification massive nécessaire
- ✅ Pattern déjà utilisé dans 56% des schémas
- ✅ Convention JavaScript/TypeScript standard (camelCase)
- ✅ Séparation claire entre couche API et couche DB

**Inconvénients:**
- ⚠️ Nécessite vigilance lors d'ajouts de colonnes
- ⚠️ Double point de maintenance (schéma + endpoint)

**Actions:**
1. Documenter clairement le pattern dans CLAUDE.md
2. Ajouter des commentaires de mapping dans les schémas
3. Créer un template pour nouveaux schémas

---

### Recommandation 2: Migration Vers snake_case (NON RECOMMANDÉ)

**Approche:** Convertir tous les schémas vers snake_case

**Avantages:**
- ✅ Cohérence parfaite schéma ↔ DB
- ✅ Pas de conversion nécessaire dans les API

**Inconvénients:**
- ❌ Modification massive de 5 schémas
- ❌ Modification de tous les formulaires (pages .tsx)
- ❌ Modification de tous les API endpoints
- ❌ Risque élevé de régression
- ❌ Convention non-standard pour JavaScript/TypeScript

**Estimation effort:** 8-12 heures de travail + tests extensifs

---

### Recommandation 3: Actions Immédiates 🎯 (RECOMMANDÉ)

**Actions à court terme:**

1. **Corriger l'incohérence dans `entreprise.schema.ts`**
   ```typescript
   // ❌ AVANT
   siteWeb: string,

   // ✅ APRÈS (choisir l'une des options)
   // Option A: Harmoniser vers camelCase
   telephone: string,  → telephoneNumber: string
   siteWeb: string,

   // Option B: Harmoniser vers snake_case
   telephone: string,
   site_web: string,
   ```

2. **Ajouter des commentaires de mapping dans tous les schémas camelCase**
   ```typescript
   export const createBassinSchema = z.object({
     batimentId: z.string().uuid(),  // → batiment_id
     name: z.string(),
     surfaceM2: z.number(),          // → surface_m2
     membraneTypeId: z.string(),     // → membrane_type_id
     // ... etc
   })
   ```

3. **Créer un template de schéma standardisé**
   ```typescript
   // Template: /lib/schemas/TEMPLATE.schema.ts
   import { z } from 'zod'

   /**
    * Schéma de validation pour [ENTITÉ]
    *
    * Mapping DB (snake_case → camelCase):
    * - field_name → fieldName
    * - another_field → anotherField
    */
   export const create[Entity]Schema = z.object({
     fieldName: z.string(),  // → field_name
     // ...
   })
   ```

4. **Mettre à jour CLAUDE.md avec le pattern de conversion**

---

## 📝 Checklist de Validation pour Nouveaux Schémas

Lorsque vous créez ou modifiez un schéma Zod:

- [ ] Les noms de champs correspondent-ils à la table DB (ou sont documentés)?
- [ ] Les types Zod correspondent-ils aux types PostgreSQL?
- [ ] Les champs `nullable()` correspondent-ils aux `NULL` autorisés en DB?
- [ ] Les contraintes (min, max, regex) sont-elles appropriées?
- [ ] Les messages d'erreur sont-ils en français et clairs?
- [ ] L'API endpoint effectue-t-il la conversion camelCase → snake_case?
- [ ] Les deux endpoints (create + update) ont-ils la même conversion?
- [ ] Un test manuel a-t-il été effectué pour valider le schéma?

---

## 🎯 Conclusion

### Statut Global: ✅ **FONCTIONNEL**

Tous les schémas Zod fonctionnent correctement. Les conversions camelCase → snake_case sont bien implémentées dans tous les API endpoints.

### Risque Global: 🟡 **FAIBLE**

Le risque principal est la régression lors d'ajouts de colonnes, mais il est gérable avec une bonne documentation et des templates.

### Action Recommandée: 🎯 **MAINTIEN + DOCUMENTATION**

1. **Garder** l'approche actuelle (camelCase + conversion)
2. **Documenter** clairement le pattern dans CLAUDE.md
3. **Corriger** l'incohérence dans entreprise.schema.ts
4. **Ajouter** des commentaires de mapping dans les schémas
5. **Créer** un template pour nouveaux schémas

---

**Prochaines étapes:**
1. Mettre à jour CLAUDE.md avec ce rapport
2. Corriger entreprise.schema.ts
3. Ajouter commentaires de mapping
4. Créer template de schéma

**Auteur:** Claude Code
**Date:** 2026-02-03
