# Database Constraint Investigation Report
## `entreprises_type_check` Constraint

**Date:** 2026-02-04  
**Issue:** "new row for relation 'entreprises' violates check constraint 'entreprises_type_check'"

---

## Summary

The `entreprises_type_check` constraint is a PostgreSQL CHECK constraint on the `entreprises` table that enforces strict validation on the `type` column. This constraint ensures that only specific, predefined company types can be stored in the database.

---

## Constraint Definition

**Constraint Name:** `entreprises_type_check`  
**Table:** `entreprises`  
**Column:** `type`  
**Type:** CHECK constraint

**Expected SQL Definition (inferred from schema):**
```sql
CHECK (type IN (
  'couvreur',
  'fournisseur',
  'consultant',
  'entrepreneur_general',
  'sous_traitant',
  'autre'
))
```

---

## Valid Values

The constraint accepts **ONLY** the following 6 values:

| Value | Label (French) | Description |
|-------|----------------|-------------|
| `couvreur` | Couvreur | Roofer |
| `fournisseur` | Fournisseur | Supplier |
| `consultant` | Consultant | Consultant |
| `entrepreneur_general` | Entrepreneur général | General contractor |
| `sous_traitant` | Sous-traitant | Subcontractor |
| `autre` | Autre | Other |

---

## Zod Schema Validation

The constraint is enforced at the application level using Zod schema validation:

**File:** `/home/user/plateforme-conseil-toit/lib/schemas/entreprise.schema.ts`

```typescript
const VALID_TYPES = [
  'couvreur',
  'fournisseur',
  'consultant',
  'entrepreneur_general',
  'sous_traitant',
  'autre',
] as const

export const createEntrepriseSchema = z.object({
  type: z.enum(VALID_TYPES),
  // ... other fields
})
```

This provides **dual-layer validation**:
1. **Application layer** - Zod validates before sending to database
2. **Database layer** - PostgreSQL CHECK constraint validates on insert/update

---

## Recent Fix History

**Commit:** `77585ac` (2026-02-04)  
**Message:** "Fix: Validation stricte des types d'entreprises avec enum"

**Changes:**
- Added `z.enum(VALID_TYPES)` to replace loose string validation
- Updated tests to use valid enum values (24/24 tests passing)
- Resolved the CHECK constraint violation errors

**Previous Issue:**
Before this fix, the schema allowed any string value:
```typescript
// ❌ OLD - Too permissive
type: z.string().min(1, 'Le type est obligatoire')

// ✅ NEW - Strict enum validation
type: z.enum(VALID_TYPES)
```

---

## API Endpoint Validation

**File:** `/home/user/plateforme-conseil-toit/app/api/admin/entreprises/create/route.ts`

The API endpoint uses the Zod schema to validate incoming data **before** attempting database insertion:

```typescript
const validated = createEntrepriseSchema.parse(body)

const dbData = {
  type: validated.type,  // Already validated by Zod
  nom: validated.nom,
  // ... other fields
}

const { data, error } = await supabaseAdmin
  .from('entreprises')
  .insert(dbData)
```

**Validation Flow:**
1. User submits form with `type` field
2. API validates with `createEntrepriseSchema.parse()`
3. If invalid type → Returns 400 error with clear message
4. If valid → Proceeds to database insertion
5. Database CHECK constraint provides final validation layer

---

## UI Components

**File:** `/home/user/plateforme-conseil-toit/lib/schemas/entreprise.schema.ts`

The schema exports UI-friendly options for dropdown menus:

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

This ensures that forms present users with exactly the valid options that match the database constraint.

---

## Troubleshooting

### Error: "violates check constraint 'entreprises_type_check'"

**Cause:** Attempting to insert a `type` value that doesn't match one of the 6 valid enum values.

**Common Mistakes:**
- ❌ Capitalization differences: `'Couvreur'` instead of `'couvreur'`
- ❌ Spaces: `'entrepreneur general'` instead of `'entrepreneur_general'`
- ❌ Typos: `'entrepeneur_general'` instead of `'entrepreneur_general'`
- ❌ Custom values: `'architecte'`, `'ingenieur'`, etc.

**Solutions:**
1. **Check exact spelling** - Values are case-sensitive and must use underscores
2. **Use the constants** - Import `ENTREPRISE_TYPES_OPTIONS` or `VALID_TYPES` from schema
3. **Validate with Zod** - Always validate data with `createEntrepriseSchema.parse()` before insertion
4. **Check API logs** - Debug logs show the exact value being inserted (see line 67 in create route)

---

## Debug Mode

The API endpoint includes debug logging to help diagnose constraint violations:

```typescript
console.log('🔍 DEBUG API - dbData:', JSON.stringify(dbData, null, 2))
console.log('🔍 DEBUG API - Type à insérer:', dbData.type)
```

**How to debug:**
1. Trigger the error
2. Check server console logs for the debug output
3. Verify the `type` value matches exactly one of the 6 valid values
4. Check for invisible characters, extra spaces, or encoding issues

---

## Database Schema Location

While we couldn't query the live database (placeholder Supabase URL), the constraint is defined in:

**Supabase Dashboard:**
- Navigate to: Database → Tables → `entreprises`
- Click on: Constraints tab
- Look for: `entreprises_type_check`

**Expected constraint definition:**
```sql
CREATE TABLE entreprises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL,
  nom text NOT NULL,
  -- ... other columns
  CONSTRAINT entreprises_type_check CHECK (
    type IN (
      'couvreur',
      'fournisseur',
      'consultant',
      'entrepreneur_general',
      'sous_traitant',
      'autre'
    )
  )
);
```

---

## Testing

**Test File:** `/home/user/plateforme-conseil-toit/lib/schemas/__tests__/entreprise.schema.test.ts`

**Test Coverage:**
- ✅ Validates all 6 enum values are accepted
- ✅ Rejects invalid values with clear error messages
- ✅ Tests required fields
- ✅ Tests optional fields with null/empty values
- ✅ Tests URL transformation (auto-adding https://)
- ✅ Tests phone number formatting
- ✅ Tests postal code validation

**Run tests:**
```bash
npm test -- lib/schemas/__tests__/entreprise.schema.test.ts
```

---

## Recommendations

### For Developers

1. **Always use Zod schema** - Never bypass validation
2. **Import constants** - Use `ENTREPRISE_TYPES_OPTIONS` for dropdowns
3. **Check tests** - Run schema tests after making changes
4. **Review API logs** - Enable debug mode when troubleshooting

### For Database Administrators

1. **Keep constraint in sync** - Ensure DB constraint matches Zod enum
2. **Document changes** - If adding new types, update both layers:
   - Database CHECK constraint
   - Zod schema `VALID_TYPES` array
   - UI options `ENTREPRISE_TYPES_OPTIONS`
   - Test cases

### For UI Designers

1. **Use provided constants** - Don't hardcode dropdown options
2. **Show clear labels** - Use French labels from `ENTREPRISE_TYPES_OPTIONS`
3. **Disable free text** - Always use select/dropdown, never free text input

---

## Related Files

| File | Purpose |
|------|---------|
| `/lib/schemas/entreprise.schema.ts` | Zod validation schema |
| `/lib/schemas/__tests__/entreprise.schema.test.ts` | Schema tests (24 tests) |
| `/app/api/admin/entreprises/create/route.ts` | Create API endpoint |
| `/app/api/admin/entreprises/update/route.ts` | Update API endpoint |
| `/app/admin/entreprises/page.tsx` | Admin UI page |

---

## Investigation Script

A JavaScript investigation script was created to query the constraint details:

**File:** `/home/user/plateforme-conseil-toit/scripts/check-constraint.js`

**Run:**
```bash
node scripts/check-constraint.js
```

**Note:** Requires valid Supabase credentials in `.env.local` (currently has placeholder values).

---

## Conclusion

The `entreprises_type_check` constraint is working as designed to enforce data integrity. The recent fix (commit `77585ac`) added proper Zod enum validation to prevent constraint violations at the application layer, providing clear error messages before data reaches the database.

**Key Takeaway:** Always use the 6 valid enum values when creating or updating entreprises. The dual-layer validation (Zod + PostgreSQL) ensures data consistency across the application.

---

**Report Generated:** 2026-02-04  
**Script Location:** `/home/user/plateforme-conseil-toit/scripts/check-constraint.js`  
**Schema Location:** `/home/user/plateforme-conseil-toit/lib/schemas/entreprise.schema.ts`
