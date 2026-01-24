# Client API Endpoints

Cette documentation décrit tous les endpoints API sécurisés pour le portail client de la Plateforme Conseil-Toit.

## Sécurité

Tous les endpoints client implémentent :

- ✅ **Authentification Bearer Token** - Vérification du token JWT
- ✅ **Vérification de rôle** - L'utilisateur doit avoir `role = 'client'`
- ✅ **Statut actif** - L'utilisateur doit avoir `is_active = true`
- ✅ **Contrôle d'accès** - Vérification via la table `user_clients`
- ✅ **Protection CSRF** - Validation de l'origine de la requête
- ✅ **Rate Limiting** - Limitation du nombre de requêtes
- ✅ **Validation Zod** - Validation des données avec schemas Zod
- ✅ **Logging d'erreurs** - Traçabilité des erreurs

## Structure des réponses

### Succès
```json
{
  "ok": true,
  "data": { /* objet retourné */ }
}
```

### Erreur
```json
{
  "error": "Message d'erreur"
}
```

### Codes de statut HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 400 | Erreur de validation |
| 401 | Non authentifié |
| 403 | Accès refusé |
| 404 | Ressource non trouvée |
| 429 | Trop de requêtes (rate limit) |
| 500 | Erreur serveur |

## Headers requis

Tous les endpoints nécessitent :

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Pour obtenir le token :

```typescript
const supabase = createBrowserClient()
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

---

## Endpoints Bassins

### PUT /api/client/bassins/update

Met à jour un bassin existant.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bâtiment contenant le bassin

**Payload :**
```typescript
{
  id: string,                      // UUID du bassin (requis)
  batimentId: string,              // UUID du bâtiment (requis)
  name: string,                    // Nom du bassin (requis)
  surfaceM2?: number | null,       // Surface en m²
  membraneTypeId?: string | null,  // UUID type membrane
  etatId?: string | null,          // UUID état
  dureeVieId?: string | null,      // UUID durée de vie
  dureeVieText?: string | null,    // Texte durée de vie personnalisé
  anneeInstallation?: number | null,
  dateDerniereRefection?: string | null,  // Format: YYYY-MM-DD
  referenceInterne?: string | null,
  notes?: string | null,
  polygoneGeojson?: {              // GeoJSON polygon
    type: 'Polygon',
    coordinates: number[][][]
  } | null
}
```

**Réponse :**
```json
{
  "ok": true,
  "data": { /* bassin mis à jour */ }
}
```

### DELETE /api/client/bassins/delete

Supprime un bassin.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bâtiment contenant le bassin

**Payload :**
```json
{
  "id": "uuid-du-bassin"
}
```

**Réponse :**
```json
{
  "ok": true
}
```

---

## Endpoints Garanties

### POST /api/client/garanties/create

Crée une nouvelle garantie.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bassin

**Payload :**
```typescript
{
  bassinId: string,                // UUID du bassin (requis)
  typeGarantieId?: string | null,  // UUID type de garantie
  fournisseur?: string | null,     // Nom du fournisseur
  numeroGarantie?: string | null,  // Numéro de garantie
  dateDebut?: string | null,       // Format: YYYY-MM-DD
  dateFin?: string | null,         // Format: YYYY-MM-DD
  statutId?: string | null,        // UUID statut
  couverture?: string | null,      // Description de la couverture
  commentaire?: string | null,
  fichierPdfUrl?: string | null    // URL du PDF (géré séparément)
}
```

**Réponse :**
```json
{
  "ok": true,
  "data": { /* garantie créée */ }
}
```

### PUT /api/client/garanties/update

Met à jour une garantie existante.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bassin de la garantie

**Payload :**
```typescript
{
  id: string,                      // UUID de la garantie (requis)
  bassinId: string,                // UUID du bassin (requis)
  typeGarantieId?: string | null,
  fournisseur?: string | null,
  numeroGarantie?: string | null,
  dateDebut?: string | null,
  dateFin?: string | null,
  statutId?: string | null,
  couverture?: string | null,
  commentaire?: string | null,
  fichierPdfUrl?: string | null
}
```

**Réponse :**
```json
{
  "ok": true,
  "data": { /* garantie mise à jour */ }
}
```

### DELETE /api/client/garanties/delete

Supprime une garantie.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bassin de la garantie

**Payload :**
```json
{
  "id": "uuid-de-la-garantie"
}
```

**Réponse :**
```json
{
  "ok": true
}
```

---

## Endpoints Interventions

### POST /api/client/interventions/create

Crée une nouvelle intervention.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bassin

**Payload :**
```typescript
{
  bassinId: string,                    // UUID du bassin (requis)
  dateIntervention: string,            // Format: YYYY-MM-DD (requis)
  typeInterventionId?: string | null,  // UUID type d'intervention
  commentaire?: string | null,
  locationGeojson?: {                  // Point GeoJSON pour la carte
    type: 'Point',
    coordinates: [number, number]      // [longitude, latitude]
  } | null
}
```

**Réponse :**
```json
{
  "ok": true,
  "data": { /* intervention créée */ }
}
```

### PUT /api/client/interventions/update

Met à jour une intervention existante.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bassin de l'intervention

**Payload :**
```typescript
{
  id: string,                          // UUID de l'intervention (requis)
  bassinId: string,                    // UUID du bassin (requis)
  dateIntervention: string,            // Format: YYYY-MM-DD (requis)
  typeInterventionId?: string | null,
  commentaire?: string | null,
  locationGeojson?: {
    type: 'Point',
    coordinates: [number, number]
  } | null
}
```

**Réponse :**
```json
{
  "ok": true,
  "data": { /* intervention mise à jour */ }
}
```

### DELETE /api/client/interventions/delete

Supprime une intervention et tous ses fichiers associés.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bassin de l'intervention

**Comportement :**
- Supprime les fichiers du storage Supabase
- Supprime les enregistrements de `intervention_fichiers`
- Supprime l'intervention

**Payload :**
```json
{
  "id": "uuid-de-lintervention"
}
```

**Réponse :**
```json
{
  "ok": true
}
```

---

## Endpoints Fichiers d'Intervention

### POST /api/client/interventions/upload-file

Upload un fichier pour une intervention.

**⚠️ Note:** Cet endpoint utilise `multipart/form-data` au lieu de JSON.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bassin de l'intervention
- Rate limiting plus strict (limite FILE_UPLOAD)

**Restrictions :**
- Taille maximale : **10 MB**
- Types autorisés : JPEG, PNG, GIF, WebP, PDF
- Le nom de fichier est sanitizé automatiquement

**Headers :**
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**FormData :**
```typescript
const formData = new FormData()
formData.append('interventionId', 'uuid-de-lintervention')
formData.append('file', fileBlob, 'nom-du-fichier.jpg')
```

**Exemple d'utilisation :**
```typescript
const token = await getSessionToken()
const formData = new FormData()
formData.append('interventionId', interventionId)
formData.append('file', file)

const response = await fetch('/api/client/interventions/upload-file', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
})
```

**Réponse :**
```json
{
  "ok": true,
  "data": {
    "id": "uuid-du-fichier",
    "intervention_id": "uuid-de-lintervention",
    "file_path": "chemin/vers/fichier",
    "file_name": "nom-original.jpg",
    "mime_type": "image/jpeg"
  }
}
```

### DELETE /api/client/interventions/delete-file

Supprime un fichier d'intervention.

**Contrôle d'accès :**
- L'utilisateur doit avoir accès au client propriétaire du bassin de l'intervention

**Comportement :**
- Supprime le fichier du storage Supabase
- Supprime l'enregistrement de `intervention_fichiers`

**Payload :**
```json
{
  "fileId": "uuid-du-fichier"
}
```

**Réponse :**
```json
{
  "ok": true
}
```

---

## Exemple complet d'utilisation

### Helper pour obtenir le token de session

```typescript
import { createBrowserClient } from '@/lib/supabaseBrowser'

async function getSessionToken(): Promise<string | null> {
  const supabase = createBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}
```

### Créer une garantie

```typescript
const handleCreateGarantie = async (formData: any) => {
  try {
    const token = await getSessionToken()
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.')
      return
    }

    const response = await fetch('/api/client/garanties/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        bassinId: bassinId,
        typeGarantieId: formData.typeGarantieId || null,
        fournisseur: formData.fournisseur || null,
        numeroGarantie: formData.numeroGarantie || null,
        dateDebut: formData.dateDebut || null,
        dateFin: formData.dateFin || null,
        statutId: formData.statutId || null,
        couverture: formData.couverture || null,
        commentaire: formData.commentaire || null,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      alert(data.error || 'Erreur lors de la création')
      return
    }

    // Succès - rafraîchir les données
    await fetchGaranties()
  } catch (error) {
    console.error('Erreur:', error)
    alert('Erreur inattendue')
  }
}
```

### Uploader un fichier d'intervention

```typescript
const handleUploadFile = async (file: File) => {
  try {
    const token = await getSessionToken()
    if (!token) {
      alert('Session expirée. Veuillez vous reconnecter.')
      return
    }

    const formData = new FormData()
    formData.append('interventionId', interventionId)
    formData.append('file', file)

    const response = await fetch('/api/client/interventions/upload-file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      alert(data.error || 'Erreur lors de l\'upload')
      return
    }

    // Succès - rafraîchir les fichiers
    await fetchInterventionFiles()
  } catch (error) {
    console.error('Erreur:', error)
    alert('Erreur inattendue')
  }
}
```

---

## Gestion des erreurs

### Erreurs communes

**401 Unauthorized**
```json
{
  "error": "Authorization Bearer token manquant."
}
```
ou
```json
{
  "error": "Token invalide ou session expirée."
}
```

**403 Forbidden**
```json
{
  "error": "Accès refusé (client requis)."
}
```
ou
```json
{
  "error": "Compte suspendu. Veuillez contacter l'administrateur."
}
```
ou
```json
{
  "error": "Accès refusé à ce bassin"
}
```

**400 Bad Request** (validation Zod)
```json
{
  "error": "Le nom du bassin est obligatoire"
}
```

**404 Not Found**
```json
{
  "error": "Bassin non trouvé"
}
```

**429 Too Many Requests**
```json
{
  "error": "Trop de requêtes. Veuillez réessayer plus tard."
}
```

Headers de réponse:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
Retry-After: 60
```

---

## Migration depuis les appels Supabase directs

### Avant (❌ Non sécurisé)

```typescript
// Création directe - VULNÉRABLE
const { data, error } = await supabaseBrowser
  .from('garanties')
  .insert(payload)
  .select()
  .single()
```

### Après (✅ Sécurisé)

```typescript
// Via API endpoint sécurisé
const token = await getSessionToken()
const response = await fetch('/api/client/garanties/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(payload),
})

const data = await response.json()
if (!response.ok) {
  // Gérer l'erreur
  console.error(data.error)
}
```

---

## Schémas Zod

Les schemas de validation sont disponibles dans :

- `lib/schemas/bassin.schema.ts` - Bassins et interventions
- `lib/schemas/garantie.schema.ts` - Garanties

Ces schemas peuvent être réutilisés côté client pour validation avant envoi.

---

## Tests

Pour tester les endpoints :

1. **Obtenir un token valide** via une session utilisateur client actif
2. **Vérifier les headers** (Authorization, Content-Type)
3. **Valider le payload** avec les schemas Zod
4. **Vérifier l'accès** - l'utilisateur a-t-il accès au client propriétaire?
5. **Tester les erreurs** - 401, 403, 404, 429, etc.

---

## Rate Limits

| Type | Limite | Fenêtre |
|------|--------|---------|
| API_GENERAL | 100 req | 1 minute |
| FILE_UPLOAD | 20 req | 1 minute |

Les limites sont par utilisateur (user_id).
