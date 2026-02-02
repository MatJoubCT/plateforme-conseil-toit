# Plan de Migration - Page admin/bassins/[id]

## Contexte

La page `app/admin/bassins/[id]/page.tsx` est la page la plus complexe du projet avec **3063 lignes de code**. Elle gère de multiples fonctionnalités critiques et nécessite une approche de migration progressive et méthodique.

## État Actuel

### ✅ Éléments Déjà Migrés
- Utilise `ConfirmDialog` pour les suppressions (bien !)
- Utilise `useValidatedId` pour validation des IDs
- Utilise des composants standardisés (`StateBadge`, `BassinMap`, etc.)

### ❌ Éléments À Migrer

#### 1. Modales Inline Custom (5+ modales)

**Modales identifiées** :
- `showModal` + états associés → Modale garanties (create/edit)
- `showRapportModal` + états associés → Modale rapports (create/edit)
- `showEditBassinModal` + états associés → Modale édition bassin
- `showDeleteBassinModal` + états associés → Modale suppression bassin
- `showInterventionEditor` + états associés → Modale intervention avec carte
- `modalImagesOpen` → Modale galerie d'images

**Migration requise** : Remplacer par composant `Dialog` standardisé

#### 2. Appels Supabase Directs

**Mutations identifiées utilisant Supabase direct** :
```typescript
// Garanties
- handleSubmitGarantie() → .insert()/.update() direct ligne ~692
- handleDeleteGarantie() → .delete() direct

// Rapports
- handleSubmitRapport() → .insert()/.update() direct ligne ~857
- handleDeleteRapport() → .delete() direct

// Bassins
- handleSubmitBassin() → .update() direct ligne ~1040
- handleDeleteBassin() → .delete() direct ligne ~1094

// Interventions
- handleSaveIntervention() → .insert()/.update() direct ligne ~1216
- handleDeleteIntervention() → .delete() direct
- handleConfirmDeleteFile() → .delete() direct ligne ~1396
```

**Migration requise** : Utiliser les endpoints API sécurisés

#### 3. États de Loading Redondants

**États à remplacer par useApiMutation** :
```typescript
const [saving, setSaving] = useState(false)              // → isLoading du hook
const [savingRapport, setSavingRapport] = useState(false)
const [savingBassin, setSavingBassin] = useState(false)
const [deletingBassin, setDeletingBassin] = useState(false)
const [deletingIntervention, setDeletingIntervention] = useState(false)
const [deletingGarantie, setDeletingGarantie] = useState(false)
const [deletingRapport, setDeletingRapport] = useState(false)
const [savingIntervention, setSavingIntervention] = useState(false)
```

## Plan de Migration Progressif

### Phase 1 : Préparation (1-2h) ✅ TERMINÉ

1. **Vérifier/créer les endpoints API manquants**
   - [x] ✅ Endpoints bassins existants : `/api/admin/bassins/{create,update,delete}`
   - [x] ✅ Endpoints garanties existants : `/api/client/garanties/{create,update,delete}`
   - [x] ✅ Endpoints interventions existants : `/api/client/interventions/{create,update,delete,upload-file,delete-file}`
   - [ ] ⏳ Endpoints rapports : À créer (non critique, utilisé seulement en admin)

2. **Créer les hooks useApiMutation** ✅ TERMINÉ
   ```typescript
   // Garanties
   const { mutate: createGarantie, isLoading: isCreatingGarantie } = useApiMutation(...)
   const { mutate: updateGarantie, isLoading: isUpdatingGarantie } = useApiMutation(...)
   const { mutate: deleteGarantie, isLoading: isDeletingGarantie } = useApiMutation(...)

   // Rapports
   const { mutate: createRapport, isLoading: isCreatingRapport } = useApiMutation(...)
   const { mutate: updateRapport, isLoading: isUpdatingRapport } = useApiMutation(...)
   const { mutate: deleteRapport, isLoading: isDeletingRapport } = useApiMutation(...)

   // Bassins
   const { mutate: updateBassin, isLoading: isUpdatingBassin } = useApiMutation(...)
   const { mutate: deleteBassin, isLoading: isDeletingBassin } = useApiMutation(...)

   // Interventions
   const { mutate: createIntervention, isLoading: isCreatingIntervention } = useApiMutation(...)
   const { mutate: updateIntervention, isLoading: isUpdatingIntervention } = useApiMutation(...)
   const { mutate: deleteIntervention, isLoading: isDeletingIntervention } = useApiMutation(...)
   ```

### Phase 2 : Migration des Mutations (2-3h)

**Ordre recommandé** (du plus simple au plus complexe) :

1. **Bassins** (update/delete) - Endpoints déjà créés
   - Remplacer `handleSubmitBassin()`
   - Remplacer `handleDeleteBassin()`
   - Supprimer états `savingBassin`, `deletingBassin`

2. **Garanties** (create/update/delete)
   - Inclut upload de fichiers PDF
   - Garder la logique de Supabase Storage pour les fichiers
   - Utiliser API pour les mutations DB

3. **Rapports** (create/update/delete)
   - Similaire aux garanties
   - Gestion de fichiers

4. **Interventions** (create/update/delete)
   - Le plus complexe : carte, marker, geolocation
   - Multiple fichiers attachés
   - Upload d'images

### Phase 3 : Migration des Modales (3-4h)

**Ordre recommandé** :

1. **Modale Suppression Bassin** - La plus simple
   - Déjà utilise ConfirmDialog en partie
   - Migration directe vers Dialog

2. **Modale Édition Bassin** - Moyenne complexité
   - Formulaire avec plusieurs champs
   - Dropdowns liés aux listes de choix

3. **Modale Garanties** - Moyenne complexité
   - Formulaire + upload PDF
   - Mode create/edit

4. **Modale Rapports** - Moyenne complexité
   - Similaire aux garanties

5. **Modale Images** - Simple (lecture seule)
   - Galerie d'images
   - Déjà bien structurée

6. **Modale Interventions** - La plus complexe
   - Formulaire + carte Google Maps
   - Picker de localisation
   - Upload multiple fichiers
   - **⚠️ Attention** : Garde toute la logique de la carte intacte

### Phase 4 : Tests et Validation (1-2h)

- [ ] Tester chaque mutation (create/update/delete)
- [ ] Vérifier que la carte fonctionne toujours
- [ ] Tester l'upload de fichiers
- [ ] Vérifier que les images se chargent
- [ ] Tester la géolocalisation des interventions
- [ ] Vérifier les polygones sur la carte
- [ ] Build Next.js réussi
- [ ] Aucune erreur TypeScript

## Complexités Particulières

### 1. Upload de Fichiers

**Actuel** :
```typescript
// Upload direct Supabase Storage dans le composant
const { error: uploadError } = await supabaseBrowser.storage
  .from('garanties')
  .upload(path, pdfFile)
```

**Options de migration** :
- **Option A** : Garder Supabase Storage direct (plus simple, déjà sécurisé par RLS)
- **Option B** : Créer endpoint API pour upload (plus cohérent, mais complexe)

**Recommandation** : Option A pour les fichiers, API pour les mutations DB

### 2. Carte Google Maps avec Interventions

- La carte affiche les interventions avec markers
- Modale intervention permet de picker une position sur la carte
- **⚠️ Ne pas toucher à cette logique** lors de la migration
- Juste migrer les appels API, pas la logique métier

### 3. États Partagés Complexes

Plusieurs états sont liés entre eux :
```typescript
- editingGarantie → formTypeGarantieId, formFournisseur, etc.
- editingIntervention → intDate, intTypeId, etc.
```

**Attention** : Ne pas casser ces liens lors de la migration

## Estimation Totale

- **Phase 1** : 1-2h
- **Phase 2** : 2-3h
- **Phase 3** : 3-4h
- **Phase 4** : 1-2h

**Total** : **7-11 heures** de travail concentré

## Notes Importantes

1. **Ne pas tout migrer d'un coup** : Tester après chaque phase
2. **Commit fréquents** : Créer un commit après chaque modale migrée
3. **Tests manuels** : Cette page a beaucoup de logique critique
4. **Backup** : Garder une copie de la version originale

## Références

- Guide de migration : `/docs/MIGRATION_GUIDE.md`
- Endpoints API : `/docs/API_MIGRATION_GUIDE.md`
- Composant Dialog : `/components/ui/dialog.tsx`
- Hook useApiMutation : `/lib/hooks/useApiMutation.ts`

## Prochaines Étapes

1. Créer les endpoints API manquants (garanties, rapports)
2. Commencer par Phase 1 (préparation)
3. Migrer progressivement selon l'ordre recommandé
4. Tester après chaque migration

---

**Dernière mise à jour** : 2026-02-02
**Statut** : Page non migrée (trop complexe pour migration automatique)
**Priorité** : Moyenne (la page fonctionne actuellement, mais devrait être migrée pour cohérence)
