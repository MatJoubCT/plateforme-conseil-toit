-- ========================================
-- Script de Réactivation des Utilisateurs
-- ========================================
-- Utilisez ce script dans Supabase SQL Editor si nécessaire

-- 1. Vérifier les utilisateurs inactifs
SELECT
  user_id,
  full_name,
  role,
  is_active,
  created_at
FROM user_profiles
WHERE is_active = false
ORDER BY full_name;

-- 2. Réactiver TOUS les utilisateurs inactifs
-- ⚠️ ATTENTION: Ceci réactivera tous les comptes désactivés
UPDATE user_profiles
SET is_active = true
WHERE is_active = false;

-- 3. Réactiver un utilisateur spécifique par son user_id
-- Remplacez 'USER_ID_ICI' par l'ID de l'utilisateur
-- UPDATE user_profiles
-- SET is_active = true
-- WHERE user_id = 'USER_ID_ICI';

-- 4. Vérifier que tous les utilisateurs sont actifs
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active = true) as active_users,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_users
FROM user_profiles;
