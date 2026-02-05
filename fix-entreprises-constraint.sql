-- Script pour supprimer définitivement la contrainte CHECK sur entreprises.type
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Vérifier si la contrainte existe
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.entreprises'::regclass
  AND contype = 'c'
  AND conname LIKE '%type%';

-- 2. Supprimer la contrainte (remplacer le nom si différent)
ALTER TABLE public.entreprises
DROP CONSTRAINT IF EXISTS entreprises_type_check;

-- 3. Vérifier qu'elle a bien été supprimée
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.entreprises'::regclass
  AND contype = 'c'
  AND conname LIKE '%type%';

-- 4. Test d'insertion avec les valeurs actuelles
INSERT INTO entreprises (type, nom, actif)
VALUES ('consultant', 'Test Consultant', true)
RETURNING id, type, nom;

-- 5. Nettoyer le test (optionnel - supprimer l'entreprise de test)
-- DELETE FROM entreprises WHERE nom = 'Test Consultant';
