# 🗺️ Guide de résolution : Google Maps ne s'affiche pas sur mobile (iOS)

**Date:** 2026-02-06
**Problème:** Les cartes Google Maps ne s'affichent pas sur iPhone (affichage de l'erreur "Une erreur s'est produite")
**Statut:** ✅ Partiellement résolu (corrections code appliquées)

---

## 📋 Diagnostic du problème

### 1. **Restrictions de la clé API Google Maps** ⚠️ CAUSE PRINCIPALE

La clé API Google Maps (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) a probablement des restrictions HTTP Referrers qui bloquent les requêtes venant de votre iPhone.

**Symptômes:**
- ✅ La carte fonctionne sur ordinateur (localhost, domaine de production)
- ❌ La carte ne charge pas sur iPhone
- ❌ Message d'erreur : "Cette page n'a pas correctement chargé Google Maps"

**Pourquoi ?**
- Les restrictions HTTP Referrers autorisent uniquement certains domaines (ex: `localhost:3000`, `gestion.connect-toit.ca`)
- Quand vous accédez depuis un iPhone, l'URL peut être différente :
  - Adresse IP locale : `http://192.168.1.10:3000`
  - Domaine mobile : `http://10.0.0.5:3000`
  - Tunnel de développement : `https://xxx.ngrok.io`
- Ces URLs ne correspondent pas aux restrictions → Google bloque les requêtes

### 2. **Problèmes de dimensions sur mobile**

Sur iOS Safari, les conteneurs avec `height: 100%` peuvent ne pas fonctionner correctement si le parent n'a pas de hauteur définie.

### 3. **Messages d'erreur peu clairs**

Les anciennes versions ne distinguaient pas entre "chargement en cours" et "erreur de chargement API".

---

## ✅ Solutions appliquées (Commit 70954c6)

### 1. **Gestion des erreurs améliorée**

**Avant:**
```tsx
if (!isLoaded) {
  return <div>Chargement de la carte…</div>
}
```

**Après:**
```tsx
if (loadError) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl bg-red-50 p-6">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle />
      </div>
      <p className="mb-2 text-sm font-semibold text-red-900">
        Erreur de chargement de Google Maps
      </p>
      <p className="max-w-md text-xs text-red-700">
        Vérifiez que la clé API Google Maps est correctement configurée
        et que votre domaine est autorisé dans les restrictions de la
        console Google Cloud.
      </p>
    </div>
  )
}

if (!isLoaded) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-ct-primary border-t-transparent" />
      <p>Chargement de la carte…</p>
    </div>
  )
}
```

**Bénéfices:**
- ✅ Distinction claire entre loading et error
- ✅ Message d'erreur explicite avec instructions
- ✅ Feedback visuel immédiat

### 2. **Dimensions fixes pour mobile**

**Avant:**
```tsx
<div className="h-full w-full">
  <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} />
</div>
```

**Après:**
```tsx
<div className="h-full min-h-[400px] w-full md:min-h-[320px]">
  <GoogleMap
    mapContainerStyle={{ width: '100%', height: '100%', minHeight: '400px' }}
  />
</div>
```

**Bénéfices:**
- ✅ Hauteur minimale garantie sur mobile (400px)
- ✅ Hauteur adaptée sur desktop (320px minimum)
- ✅ Évite les conteneurs vides ou écrasés

### 3. **Composants modifiés**

- ✅ `components/maps/BassinMap.tsx` - Composant réutilisable
- ✅ `app/admin/batiments/[id]/page.tsx` - Fonction BatimentBasinsMap

---

## 🔧 Solution à appliquer : Configuration de la clé API Google Maps

### Étape 1 : Accéder à la console Google Cloud

1. Rendez-vous sur [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/credentials)
2. Connectez-vous avec votre compte Google
3. Sélectionnez le projet contenant votre clé API Maps

### Étape 2 : Configurer les restrictions HTTP Referrers

1. Dans la liste des clés API, cliquez sur votre clé Maps JavaScript API
2. Sous **"Restrictions relatives aux applications"**, sélectionnez **"Référents HTTP (sites web)"**
3. Ajoutez les patterns suivants (un par ligne) :

```
http://localhost:*/*
https://localhost:*/*
http://*.connect-toit.ca/*
https://*.connect-toit.ca/*
http://192.168.*:*/*
https://192.168.*:*/*
http://10.*:*/*
https://10.*:*/*
http://172.16.*:*/*
https://172.16.*:*/*
```

**Explication des patterns:**
- `localhost:*` → Développement local (tous les ports)
- `*.connect-toit.ca` → Domaine de production et sous-domaines
- `192.168.*` → Réseau local privé (classe C)
- `10.*` → Réseau local privé (classe A)
- `172.16.*` → Réseau local privé (classe B)

4. Cliquez sur **"Enregistrer"**
5. ⏱️ **Attendez 5 minutes** pour que les changements se propagent

### Étape 3 : Tester sur mobile

1. Sur votre iPhone, rafraîchissez la page (tirez vers le bas)
2. Vérifiez que la carte s'affiche correctement
3. Si le problème persiste :
   - Ouvrez l'inspecteur Safari (Préférences → Avancées → Activer le menu Développement)
   - Connectez l'iPhone à votre Mac
   - Safari → Développement → [Votre iPhone] → [Onglet]
   - Consultez la console pour les erreurs détaillées

---

## 🧪 Tests de validation

### Test 1 : Sur ordinateur (localhost)
```bash
npm run dev
```
Ouvrir `http://localhost:3000/admin/batiments` → La carte doit s'afficher

### Test 2 : Sur iPhone (même réseau)
1. Trouver l'adresse IP de votre ordinateur :
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```
2. Sur iPhone, ouvrir Safari : `http://[IP]:3000/admin/batiments`
3. La carte doit s'afficher **après configuration des restrictions API**

### Test 3 : Pages concernées
- ✅ `/admin/batiments/[id]` → BatimentBasinsMap (liste des polygones)
- ✅ `/admin/bassins/[id]` → BassinMap (édition polygone)
- ✅ `/client/bassins/[id]` → BassinMap (lecture seule)

---

## 🔍 Dépannage avancé

### Problème : La carte ne charge toujours pas après configuration API

**1. Vérifier que la clé API est correcte**
```bash
# Afficher la clé actuelle
echo $NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Vérifier le fichier .env.local
cat .env.local | grep GOOGLE
```

**2. Tester la clé API directement**
Ouvrir dans le navigateur :
```
https://maps.googleapis.com/maps/api/js?key=VOTRE_CLE_API&callback=initMap
```
- ✅ Si vous voyez du JavaScript → Clé valide
- ❌ Si erreur 403/401 → Problème de restrictions ou clé invalide

**3. Vérifier les APIs activées**
Dans Google Cloud Console :
- Maps JavaScript API → ✅ Doit être activé
- Geocoding API → ✅ Recommandé (pour les adresses)
- Maps Static API → ❌ Pas nécessaire

**4. Consulter les logs d'erreur Google Maps**
Dans la console JavaScript du navigateur (F12) :
```javascript
// Vérifier les erreurs Google Maps
window.google?.maps
```

Erreurs courantes :
- `RefererNotAllowedMapError` → Restrictions HTTP Referrers trop strictes
- `ApiNotActivatedMapError` → Maps JavaScript API non activé
- `InvalidKeyMapError` → Clé API invalide ou expirée

### Problème : La carte s'affiche mais les polygones non

**Causes possibles:**
1. **Données GeoJSON invalides** dans la base de données
   ```sql
   SELECT id, name, polygone_geojson
   FROM bassins
   WHERE polygone_geojson IS NOT NULL;
   ```
2. **Coordonnées inversées** (lat/lng au lieu de lng/lat)
3. **Polygone non fermé** (premier point ≠ dernier point)

**Solution:**
Vérifier le format GeoJSON :
```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [-73.5698, 45.5017],  // lng, lat (IMPORTANT: lng en premier!)
      [-73.5697, 45.5018],
      [-73.5696, 45.5017],
      [-73.5698, 45.5017]   // Fermer le polygone (= premier point)
    ]
  ]
}
```

### Problème : La carte est lente sur mobile

**Optimisations à appliquer:**
1. **Réduire le nombre de polygones affichés** (pagination, filtres)
2. **Simplifier les polygones complexes** (moins de points)
3. **Désactiver les interactions inutiles** en mode readonly
   ```tsx
   <GoogleMap
     options={{
       gestureHandling: 'cooperative', // Évite le scroll accidentel
       scrollwheel: false,             // Désactive le zoom molette
       disableDefaultUI: true,         // Cache les contrôles inutiles
     }}
   />
   ```

---

## 📚 Ressources utiles

### Documentation officielle
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [API Key Restrictions](https://developers.google.com/maps/api-security-best-practices#api-restriction)
- [@react-google-maps/api](https://react-google-maps-api-docs.netlify.app/)

### Fichiers du projet
- `components/maps/BassinMap.tsx` → Composant carte réutilisable
- `app/admin/batiments/[id]/page.tsx` → Carte multi-polygones
- `app/admin/bassins/[id]/page.tsx` → Édition de polygone
- `lib/utils/map-utils.ts` → Fonctions utilitaires GeoJSON

### Support
- [Google Maps Platform Support](https://developers.google.com/maps/support)
- [Stack Overflow - google-maps](https://stackoverflow.com/questions/tagged/google-maps)

---

## 📝 Checklist finale

Avant de considérer le problème résolu, vérifiez :

- [ ] La clé API Google Maps est valide
- [ ] Les restrictions HTTP Referrers incluent les réseaux locaux (192.168.*, 10.*, 172.16.*)
- [ ] Maps JavaScript API est activé dans Google Cloud Console
- [ ] Les modifications de code ont été commitées (commit 70954c6)
- [ ] Le build Next.js passe sans erreur (`npm run build`)
- [ ] La carte s'affiche sur ordinateur (localhost)
- [ ] La carte s'affiche sur iPhone (après configuration API)
- [ ] Les messages d'erreur sont clairs et informatifs
- [ ] Les polygones s'affichent correctement sur les pages concernées

---

**Date de dernière mise à jour:** 2026-02-06
**Auteur:** Claude (Assistant IA)
**Commit associé:** 70954c6
