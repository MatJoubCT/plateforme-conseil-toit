-- Fix entreprises_type_check constraint to accept all valid types
-- Date: 2026-02-05
-- Issue: Constraint rejects valid "consultant" type

-- Step 1: Drop the existing constraint
ALTER TABLE entreprises
DROP CONSTRAINT IF EXISTS entreprises_type_check;

-- Step 2: Recreate the constraint with ALL valid types
ALTER TABLE entreprises
ADD CONSTRAINT entreprises_type_check
CHECK (
  type IN (
    'couvreur',
    'fournisseur',
    'consultant',
    'entrepreneur_general',
    'sous_traitant',
    'autre'
  )
);

-- Step 3: Verify the constraint was created correctly
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'entreprises_type_check';

-- Step 4: Test with a sample row (will be rolled back)
BEGIN;
  INSERT INTO entreprises (type, nom, actif)
  VALUES ('consultant', 'Test Consultant', true);
  SELECT 'Test PASSED: consultant type accepted' AS result;
ROLLBACK;

-- Expected output:
-- constraint_name       | constraint_definition
-- ----------------------|--------------------------------------------------
-- entreprises_type_check| CHECK (type = ANY (ARRAY['couvreur'::text, ...]))
-- result                | Test PASSED: consultant type accepted
