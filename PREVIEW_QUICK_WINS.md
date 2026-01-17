# 🚀 PRÉVISUALISATION - QUICK WINS

Ce document montre tous les changements qui vont être appliqués.

---

## 📦 QUICK WIN 1 : Extraire la Fonction Dupliquée (400+ lignes)

### ❌ PROBLÈME ACTUEL

Dans `app/admin/utilisateurs/page.tsx`, la fonction de chargement des données est **copiée-collée 4 fois** :

1. **Ligne 92-192** : Chargement initial (useEffect)
2. **Ligne 322-420** : Après modification utilisateur
3. **Ligne 446-544** : Après toggle actif/inactif
4. **Ligne 630-728** : Après création utilisateur

**Code dupliqué** (100 lignes x 4 = 400 lignes) :
```typescript
const load = async () => {
  setLoading(true)
  setErrorMsg(null)

  const { data: profilesData, error: profilesError } = await supabaseBrowser
    .from('user_profiles')
    .select('id, user_id, full_name, role, client_id, is_active')
    .order('full_name', { ascending: true })

  if (profilesError) {
    setErrorMsg(profilesError.message)
    setLoading(false)
    return
  }

  const profiles = (profilesData || []) as UserProfileRow[]

  const { data: clientsData, error: clientsError } = await supabaseBrowser
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

  if (clientsError) {
    setErrorMsg(clientsError.message)
    setLoading(false)
    return
  }

  const allClients = (clientsData || []) as ClientRow[]

  const { data: batData, error: batError } = await supabaseBrowser
    .from('batiments')
    .select('id, client_id, name, address, city, postal_code')
    .order('name', { ascending: true })

  if (batError) {
    setErrorMsg(batError.message)
    setLoading(false)
    return
  }

  const allBatiments = (batData || []) as BatimentRow[]

  const { data: ucData, error: ucError } = await supabaseBrowser
    .from('user_clients')
    .select('user_id, client_id')

  if (ucError) {
    setErrorMsg(ucError.message)
    setLoading(false)
    return
  }

  const userClients = (ucData || []) as UserClientRow[]

  const { data: ubaData, error: ubaError } = await supabaseBrowser
    .from('user_batiments_access')
    .select('user_id, batiment_id')

  if (ubaError) {
    setErrorMsg(ubaError.message)
    setLoading(false)
    return
  }

  const userBatiments = (ubaData || []) as UserBatimentAccessRow[]

  const clientsByIdMap = new Map<string, ClientRow>()
  allClients.forEach((c) => clientsByIdMap.set(c.id, c))

  const batById = new Map<string, BatimentRow>()
  allBatiments.forEach((b) => batById.set(b.id, b))

  const editable: EditableUser[] = profiles.map((p) => {
    const uc = userClients.filter((x) => x.user_id === p.user_id)
    const uba = userBatiments.filter((x) => x.user_id === p.user_id)

    const clientsLabels = uc
      .map((x) => clientsByIdMap.get(x.client_id)?.name || null)
      .filter((x): x is string => !!x)

    const batimentsLabels = uba
      .map((x) => {
        const b = batById.get(x.batiment_id)
        if (!b) return null
        if (b.name && b.city) return `${b.name} — ${b.city}`
        if (b.name) return b.name
        return null
      })
      .filter((x): x is string => !!x)

    return { ...p, clientsLabels, batimentsLabels }
  })

  setUsers(editable)
  setClients(allClients)
  setBatiments(allBatiments)
  setLoading(false)
}

await load()
```

**Impact** :
- 400+ lignes de duplication
- Maintenance difficile (corriger un bug dans 4 endroits)
- Bundle JS plus gros
- Risque d'incohérence

---

### ✅ SOLUTION : Hook Custom Réutilisable

**Nouveau fichier** : `lib/hooks/useUsersData.ts`

```typescript
import { useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabaseBrowser'

export type UserProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  role: string | null
  client_id: string | null
  is_active: boolean | null
}

export type ClientRow = {
  id: string
  name: string | null
}

export type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
}

export type UserClientRow = {
  user_id: string
  client_id: string
}

export type UserBatimentAccessRow = {
  user_id: string
  batiment_id: string
}

export type EditableUser = UserProfileRow & {
  clientsLabels: string[]
  batimentsLabels: string[]
}

/**
 * Hook personnalisé pour charger toutes les données utilisateurs
 * avec leurs relations (clients, bâtiments).
 *
 * Remplace la fonction dupliquée 4 fois dans la page utilisateurs.
 */
export function useUsersData() {
  const [users, setUsers] = useState<EditableUser[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Charge toutes les données utilisateurs avec leurs relations
   */
  const loadUsersData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient()

    try {
      // 1. Charger les profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, role, client_id, is_active')
        .order('full_name', { ascending: true })

      if (profilesError) throw profilesError

      const profiles = (profilesData || []) as UserProfileRow[]

      // 2. Charger les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      if (clientsError) throw clientsError

      const allClients = (clientsData || []) as ClientRow[]

      // 3. Charger les bâtiments
      const { data: batData, error: batError } = await supabase
        .from('batiments')
        .select('id, client_id, name, address, city, postal_code')
        .order('name', { ascending: true })

      if (batError) throw batError

      const allBatiments = (batData || []) as BatimentRow[]

      // 4. Charger les relations user_clients
      const { data: ucData, error: ucError } = await supabase
        .from('user_clients')
        .select('user_id, client_id')

      if (ucError) throw ucError

      const userClients = (ucData || []) as UserClientRow[]

      // 5. Charger les relations user_batiments_access
      const { data: ubaData, error: ubaError } = await supabase
        .from('user_batiments_access')
        .select('user_id, batiment_id')

      if (ubaError) throw ubaError

      const userBatiments = (ubaData || []) as UserBatimentAccessRow[]

      // 6. Créer les maps pour lookup rapide
      const clientsByIdMap = new Map<string, ClientRow>()
      allClients.forEach((c) => clientsByIdMap.set(c.id, c))

      const batById = new Map<string, BatimentRow>()
      allBatiments.forEach((b) => batById.set(b.id, b))

      // 7. Enrichir les profils avec les labels
      const editable: EditableUser[] = profiles.map((p) => {
        const uc = userClients.filter((x) => x.user_id === p.user_id)
        const uba = userBatiments.filter((x) => x.user_id === p.user_id)

        const clientsLabels = uc
          .map((x) => clientsByIdMap.get(x.client_id)?.name || null)
          .filter((x): x is string => !!x)

        const batimentsLabels = uba
          .map((x) => {
            const b = batById.get(x.batiment_id)
            if (!b) return null
            if (b.name && b.city) return `${b.name} — ${b.city}`
            if (b.name) return b.name
            return null
          })
          .filter((x): x is string => !!x)

        return { ...p, clientsLabels, batimentsLabels }
      })

      // 8. Mettre à jour les états
      setUsers(editable)
      setClients(allClients)
      setBatiments(allBatiments)
      setLoading(false)

    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données')
      setLoading(false)
    }
  }, [])

  return {
    users,
    clients,
    batiments,
    loading,
    error,
    loadUsersData,
    setUsers,
    setClients,
    setBatiments,
  }
}
```

---

### ✅ UTILISATION DANS LA PAGE

**Avant** (lignes 42-192) :
```typescript
export default function AdminUtilisateursPage() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<EditableUser[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])

  useEffect(() => {
    const load = async () => {
      // ... 100 lignes de code dupliqué
    }
    void load()
  }, [])

  // Plus loin dans le code...
  const handleSave = async () => {
    // ... logique de sauvegarde

    // DUPLICATION #2
    const load = async () => {
      // ... encore 100 lignes identiques
    }
    await load()
  }

  // Et encore...
  const toggleUserActive = async () => {
    // ... logique toggle

    // DUPLICATION #3
    const load = async () => {
      // ... encore 100 lignes identiques
    }
    await load()
  }

  // Et encore...
  const handleCreate = async () => {
    // ... logique création

    // DUPLICATION #4
    const load = async () => {
      // ... encore 100 lignes identiques
    }
    await load()
  }
}
```

**Après** (beaucoup plus simple !) :
```typescript
import { useUsersData } from '@/lib/hooks/useUsersData'

export default function AdminUtilisateursPage() {
  // ✅ UN SEUL appel au hook
  const { users, clients, batiments, loading, error, loadUsersData } = useUsersData()

  useEffect(() => {
    loadUsersData()
  }, [loadUsersData])

  const handleSave = async () => {
    // ... logique de sauvegarde
    await loadUsersData() // ✅ Une seule ligne !
  }

  const toggleUserActive = async () => {
    // ... logique toggle
    await loadUsersData() // ✅ Une seule ligne !
  }

  const handleCreate = async () => {
    // ... logique création
    await loadUsersData() // ✅ Une seule ligne !
  }
}
```

**Bénéfices** :
- ✅ 400 lignes de code en moins
- ✅ Un seul endroit à maintenir
- ✅ Code testable facilement
- ✅ Réutilisable dans d'autres pages
- ✅ Plus lisible et professionnel

---

## 📦 QUICK WIN 2 : Ajouter Confirmations Actions Destructives

### ❌ PROBLÈME ACTUEL

**Fichier** : `app/admin/utilisateurs/page.tsx`

Actions destructives sans confirmation :
```typescript
// Ligne 1042 : Toggle actif/inactif - AUCUNE CONFIRMATION !
<button onClick={() => toggleUserActive(u.id, u.user_id, u.is_active)}>
  {u.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
  {u.is_active ? 'Suspendre' : 'Réactiver'}
</button>
```

Un clic et l'utilisateur est suspendu immédiatement. Risque d'erreur !

---

### ✅ SOLUTION : Modal de Confirmation

**Nouveau composant** : `components/ui/ConfirmDialog.tsx`

```typescript
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  confirmVariant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmer',
  confirmVariant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded ${
              confirmVariant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#1F4E79] hover:bg-[#163555]'
            }`}
          >
            {loading ? 'Traitement...' : confirmText}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Utilisation dans la page** :

```typescript
// États pour les confirmations
const [confirmToggle, setConfirmToggle] = useState<{
  profileId: string
  userId: string
  currentState: boolean
  userName: string
} | null>(null)

// Fonction de toggle mise à jour
const toggleUserActive = async () => {
  if (!confirmToggle) return

  const { profileId, userId, currentState } = confirmToggle

  const { error } = await supabaseBrowser
    .from('user_profiles')
    .update({ is_active: !currentState })
    .eq('id', profileId)

  if (error) {
    pushToast('error', `Erreur: ${error.message}`)
    return
  }

  pushToast('success', currentState ? 'Utilisateur suspendu.' : 'Utilisateur réactivé.')
  setConfirmToggle(null)
  await loadUsersData()
}

// Bouton avec confirmation
<button onClick={() => setConfirmToggle({
  profileId: u.id,
  userId: u.user_id,
  currentState: u.is_active,
  userName: u.full_name || u.user_id
})}>
  {u.is_active ? 'Suspendre' : 'Réactiver'}
</button>

// Modal de confirmation
<ConfirmDialog
  open={!!confirmToggle}
  onOpenChange={() => setConfirmToggle(null)}
  onConfirm={toggleUserActive}
  title={confirmToggle?.currentState ? 'Suspendre cet utilisateur ?' : 'Réactiver cet utilisateur ?'}
  description={
    confirmToggle?.currentState
      ? `${confirmToggle?.userName} ne pourra plus se connecter jusqu'à ce que vous le réactiviez.`
      : `${confirmToggle?.userName} pourra à nouveau se connecter à la plateforme.`
  }
  confirmText={confirmToggle?.currentState ? 'Suspendre' : 'Réactiver'}
  confirmVariant={confirmToggle?.currentState ? 'danger' : 'primary'}
/>
```

**Bénéfices** :
- ✅ Protection contre les clics accidentels
- ✅ UX professionnelle
- ✅ Composant réutilisable
- ✅ Messages clairs pour l'utilisateur

---

## 📦 QUICK WIN 3 : Extraire Couleurs dans Config Tailwind

### ❌ PROBLÈME ACTUEL

**255+ instances** de couleurs en dur dans tout le code :

```typescript
// app/admin/layout.tsx
className="bg-gradient-to-b from-[#1F4E79] via-[#1a4168] to-[#163555]"

// app/admin/page.tsx
className="bg-[#1F4E79] text-white"

// app/admin/clients/page.tsx
className="border-[#1F4E79]"

// Répété 255+ fois !
```

**Problèmes** :
- Changement de charte = modifier 255 fichiers
- Risque d'incohérence (#1F4E79 vs #1f4e79 vs #1F4E78)
- Pas maintenable
- Contre les bonnes pratiques

---

### ✅ SOLUTION : Configuration Tailwind Centralisée

**Fichier** : `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs primaires Conseil-Toit
        'ct-primary': '#1F4E79',
        'ct-primary-dark': '#163555',
        'ct-primary-medium': '#1a4168',
        'ct-primary-light': '#C7D6E6',

        // Grises
        'ct-gray-dark': '#2E2E2E',
        'ct-gray': '#7A7A7A',
        'ct-gray-light': '#F5F6F7',

        // États des bassins
        'ct-state-good': '#28A745',
        'ct-state-watch': '#FFC107',
        'ct-state-plan': '#FD7E14',
        'ct-state-urgent': '#DC3545',
        'ct-state-unknown': '#6C757D',
      },
      boxShadow: {
        'ct-card': '0 8px 20px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
```

**Avant** :
```typescript
<div className="bg-gradient-to-b from-[#1F4E79] via-[#1a4168] to-[#163555]">
<button className="bg-[#1F4E79] hover:bg-[#163555] text-white">
<span className="text-[#1F4E79]">
```

**Après** :
```typescript
<div className="bg-gradient-to-b from-ct-primary via-ct-primary-medium to-ct-primary-dark">
<button className="bg-ct-primary hover:bg-ct-primary-dark text-white">
<span className="text-ct-primary">
```

**Bénéfices** :
- ✅ Un seul fichier à modifier pour changer la charte
- ✅ Autocomplétion dans l'IDE
- ✅ Cohérence garantie
- ✅ Noms sémantiques (`ct-primary` vs `#1F4E79`)
- ✅ Plus maintenable

---

## 📊 RÉSUMÉ DES CHANGEMENTS

| Quick Win | Fichiers modifiés | Lignes économisées | Impact |
|-----------|-------------------|-------------------|--------|
| **1. Fonction dupliquée** | 2 (nouveau hook + page) | -300 lignes | HAUTE |
| **2. Confirmations** | 2 (nouveau composant + page) | +50 lignes | MOYENNE |
| **3. Couleurs Tailwind** | ~20 fichiers | 0 lignes (refactor) | HAUTE |
| **TOTAL** | ~22 fichiers | -250 lignes nettes | TRÈS HAUTE |

---

## 🎯 ORDRE D'IMPLÉMENTATION

1. ✅ **Quick Win 1** : Hook useUsersData (30 min)
2. ✅ **Quick Win 2** : Confirmations (20 min)
3. ✅ **Quick Win 3** : Couleurs Tailwind (30 min)

**Temps total estimé** : 1h20

---

## ✅ VALIDATION

Après implémentation, vérifier :
- [ ] Page utilisateurs charge correctement
- [ ] Modification utilisateur fonctionne
- [ ] Toggle actif/inactif demande confirmation
- [ ] Création utilisateur fonctionne
- [ ] Couleurs identiques visuellement
- [ ] Pas d'erreur TypeScript
- [ ] Build réussit

---

**Voulez-vous que je procède avec ces changements ?**
