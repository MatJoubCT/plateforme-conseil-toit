# Troubleshooting Guide: Entreprises Type Constraint Error

## Error Message

```
Erreur lors de la création de l'entreprise: new row for relation "entreprises" violates check constraint "entreprises_type_check"
```

## Root Cause

The PostgreSQL database has a CHECK constraint on the `entreprises.type` column that only accepts these **exact lowercase values**:

✅ **Valid Values:**
- `consultant` (lowercase)
- `couvreur`
- `fournisseur`
- `entrepreneur_general`
- `sous_traitant`
- `autre`

❌ **Invalid Values:**
- `Consultant` (uppercase C)
- `CONSULTANT` (all caps)
- `entrepreneur general` (space instead of underscore)
- Any other value

## Solution

### Quick Fix (Most Common)

1. **Restart the development server:**
   ```bash
   npm run dev
   ```

2. **Hard reload your browser:**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)

3. **Clear browser cache:**
   - Open DevTools (F12)
   - Network tab → Check "Disable cache"
   - Reload the page

### Code Reference

The valid types are defined in `/lib/schemas/entreprise.schema.ts`:

```typescript
export const ENTREPRISE_TYPES_OPTIONS = [
  { value: 'couvreur', label: 'Couvreur' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'entrepreneur_general', label: 'Entrepreneur général' },
  { value: 'sous_traitant', label: 'Sous-traitant' },
  { value: 'autre', label: 'Autre' },
] as const
```

**Important:** The `value` field (lowercase) is what gets sent to the database, not the `label` field (capitalized).

### Debug Logs

After the fix, you should see these logs in your browser console when submitting the form:

```
🔍 DEBUG - Payload envoyé: { type: "consultant", nom: "Conseil-Toit", ... }
🔍 DEBUG - Type envoyé: consultant (longueur: 10)
```

And these logs in the API server console:

```
🔍 DEBUG API - dbData: { type: "consultant", nom: "Conseil-Toit", ... }
🔍 DEBUG API - Type à insérer: consultant
```

If you don't see these logs:
- Your dev server might not have picked up the latest code (restart it)
- Your browser cache might be serving old JavaScript (hard reload)

## Verification

### Test the Fix

1. Navigate to `/admin/entreprises`
2. Click "Ajouter"
3. Select any type from the dropdown
4. Fill in the company name
5. Click "Enregistrer"

The form should submit successfully without the constraint error.

### Verify Database Constraint

You can check the actual database constraint in Supabase SQL Editor:

```sql
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'entreprises_type_check';
```

Expected result:
```sql
CHECK (type IN ('couvreur', 'fournisseur', 'consultant', 'entrepreneur_general', 'sous_traitant', 'autre'))
```

### Check Existing Data

Query existing entreprises to see what values are currently stored:

```sql
SELECT DISTINCT type FROM entreprises ORDER BY type;
```

All values should be lowercase and match the valid list above.

## Related Commits

- `77585ac` - Fix: Validation stricte des types d'entreprises avec enum
- `a3901bd` - Debug: Ajout de logs pour diagnostiquer l'erreur de contrainte CHECK
- `39a53ba` - Fix: Correction des types d'entreprises pour respecter la contrainte CHECK de la BD

## Files Involved

- `/lib/schemas/entreprise.schema.ts` - Schema validation with Zod enum
- `/app/admin/entreprises/page.tsx` - Form component with dropdown
- `/app/api/admin/entreprises/create/route.ts` - API endpoint with validation
- `/lib/schemas/__tests__/entreprise.schema.test.ts` - Tests verifying valid types

## Prevention

To prevent this issue in the future:

1. **Always use the `ENTREPRISE_TYPES_OPTIONS` constant** when creating dropdowns
2. **Never hardcode type values** - import from the schema
3. **Run tests** before deploying: `npm test`
4. **Check schema validation** aligns with database constraints

## Still Having Issues?

If the problem persists after following all steps above:

1. Check the browser console for any JavaScript errors
2. Check the server console for detailed error messages
3. Verify environment variables are correctly set in `.env.local`
4. Try creating a new entreprise with minimal data (just type + name)
5. Check the investigation report at `/scripts/CONSTRAINT_INVESTIGATION_REPORT.md`

## Support

For further assistance:
- Review the complete codebase documentation in `/CLAUDE.md`
- Check test files in `/lib/schemas/__tests__/`
- Review the migration guide in `/docs/MIGRATION_GUIDE.md`
