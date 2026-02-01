# Guide de Réactivation des Utilisateurs

Ce guide explique comment réactiver les utilisateurs après une mise en pause de la base de données Supabase.

## Problème

Lorsque la base de données Supabase est mise en pause pour cause d'inactivité, les utilisateurs peuvent être marqués comme inactifs (`is_active = false`) dans la table `user_profiles`. Cela empêche la connexion avec l'erreur:

```
"Votre compte a été désactivé. Contactez un administrateur."
```

## Solutions

### Solution 1: Interface Web (Recommandée)

1. **Démarrez le serveur de développement** (si ce n'est pas déjà fait):
   ```bash
   npm run dev
   ```

2. **Accédez à la page de réactivation**:
   ```
   http://localhost:3000/admin/reactivate-users
   ```

3. **Visualisez les statistiques**:
   - Nombre total d'utilisateurs
   - Utilisateurs actifs
   - Utilisateurs inactifs

4. **Réactivez les utilisateurs**:
   - **Option A**: Cliquez sur "Réactiver Tous" pour réactiver tous les utilisateurs inactifs en un clic
   - **Option B**: Cliquez sur "Réactiver" pour chaque utilisateur individuellement

### Solution 2: SQL Direct (Alternative)

Si vous préférez utiliser l'éditeur SQL de Supabase:

1. **Connectez-vous à votre tableau de bord Supabase**
2. **Allez dans SQL Editor**
3. **Exécutez les requêtes du fichier** `/docs/REACTIVATE_USERS.sql`

#### Exemple de requêtes:

**Vérifier les utilisateurs inactifs:**
```sql
SELECT user_id, full_name, role, is_active
FROM user_profiles
WHERE is_active = false;
```

**Réactiver tous les utilisateurs:**
```sql
UPDATE user_profiles
SET is_active = true
WHERE is_active = false;
```

**Réactiver un utilisateur spécifique:**
```sql
UPDATE user_profiles
SET is_active = true
WHERE user_id = 'user-id-ici';
```

## Après la Réactivation

1. **Testez la connexion** sur la page de login:
   ```
   http://localhost:3000/login
   ```

2. **Vérifiez les logs dans la console** (F12) pour voir le processus de connexion:
   - 🔄 Tentative de connexion
   - 📡 Envoi de la requête
   - ✅ Réponse reçue
   - 🔐 Configuration de la session
   - 🚀 Redirection

3. **Si la connexion réussit**, vous serez redirigé vers:
   - `/admin` pour les administrateurs
   - `/client` pour les utilisateurs clients

## Logs de Débogage

La page de login affiche maintenant des logs détaillés dans la console du navigateur:

- ✅ : Opération réussie
- ❌ : Erreur
- ⏱️ : Timeout
- 🔄 : En cours
- 📡 : Requête réseau
- 🔐 : Session
- 🚀 : Redirection

## Endpoints API Utilisés

- `GET /api/admin/users/list` - Liste tous les utilisateurs avec leurs emails
- `POST /api/admin/users/reactivate` - Réactive un ou plusieurs utilisateurs

## Sécurité

- ⚠️ La page `/admin/reactivate-users` devrait être protégée par l'authentification admin
- ⚠️ Les endpoints API utilisent le client Supabase Admin pour accéder aux données auth
- ⚠️ N'exposez jamais cette page publiquement en production

## Prévention Future

Pour éviter que Supabase ne se mette en pause:

1. **Configurez un ping automatique** dans votre CI/CD
2. **Utilisez un service de monitoring** (UptimeRobot, etc.)
3. **Activez les notifications** Supabase pour être alerté avant la mise en pause
4. **Passez à un plan payant** si c'est un projet de production

## Support

Si vous rencontrez des problèmes:

1. Vérifiez que Supabase est bien actif (pas en pause)
2. Vérifiez les variables d'environnement dans `.env.local`
3. Consultez les logs dans la console du navigateur
4. Vérifiez les logs du serveur Next.js dans le terminal

---

**Dernière mise à jour:** 2026-02-01
