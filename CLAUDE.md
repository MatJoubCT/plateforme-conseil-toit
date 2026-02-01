# CLAUDE.md - AI Assistant Guide for Plateforme Conseil-Toit

This document provides comprehensive guidance for AI assistants (like Claude) working on the Plateforme Conseil-Toit codebase.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Codebase Structure](#architecture--codebase-structure)
4. [Database Schema](#database-schema)
5. [Development Workflows](#development-workflows)
6. [Code Conventions & Patterns](#code-conventions--patterns)
7. [Component Patterns](#component-patterns)
8. [Custom Hooks](#custom-hooks)
9. [API Development](#api-development)
10. [Data Validation with Zod](#data-validation-with-zod)
11. [Authentication & Authorization](#authentication--authorization)
12. [Styling Guidelines](#styling-guidelines)
13. [Common Tasks & Examples](#common-tasks--examples)
14. [Testing & Debugging](#testing--debugging)
15. [Important Gotchas](#important-gotchas)

---

## Project Overview

**Plateforme Conseil-Toit** is a building infrastructure management platform focused on roofing/roof basin tracking and lifecycle management. The application is designed for two user types:

- **Admin Users**: Manage clients, buildings, roof basins, users, and configuration
- **Client Users**: View their buildings and basins, access reports and interactive maps

The platform is **bilingual** (French/English) with French as the primary language for UI and data.

### Key Features

- Client & building portfolio management
- Roof basin (bassin) lifecycle tracking with state management
- Interactive Google Maps with polygon overlays
- Role-based access control (admin/client)
- User invitation and management system
- Dynamic color-coded state badges from database
- Material composition tracking
- GeoJSON polygon editing for roof sections
- Warranty management with PDF document upload
- Intervention tracking with multimedia file attachments
- Geolocation support for interventions (GeoJSON Point)

---

## Technology Stack

### Core Framework & Language

- **Framework**: Next.js 16.1 (App Router)
- **Language**: TypeScript 5
- **React**: v19.2.0
- **Node**: v20+ recommended

### Backend & Database

- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, magic links)
- **API**: Next.js API Routes (`/app/api/`)

### Frontend & UI

- **Styling**: Tailwind CSS v4 with custom CSS variables
- **Icons**: Lucide React v0.562
- **Maps**: Google Maps API with `@react-google-maps/api` v2.20
- **Fonts**: Geist (via `next/font`)

### Development Tools

- **Linting**: ESLint 9 with Next.js config
- **TypeScript Config**: Strict mode enabled
- **Package Manager**: npm (default)
- **Schema Validation**: Zod v4.3.5
- **Supabase Helpers**: @supabase/auth-helpers-nextjs v0.10.0

### Testing Tools

- **Test Framework**: Vitest v4.0.18
- **Component Testing**: React Testing Library v16.3.2
- **DOM Matchers**: @testing-library/jest-dom v6.9.1
- **User Interactions**: @testing-library/user-event v14.6.1
- **Test Environment**: jsdom v27.4.0
- **Coverage Tool**: @vitest/coverage-v8 v2.1.8
- **Test Stats**: 553 tests passing across 32 test suites
- **Code Coverage**: 87.82% average (85.82% statements, 80.61% branches, 98.93% functions, 85.93% lines)

---

## Architecture & Codebase Structure

### Directory Structure

```
/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin portal (protected)
│   │   ├── page.tsx              # Admin dashboard
│   │   ├── layout.tsx            # Admin layout with auth check
│   │   ├── error.tsx             # Admin error boundary
│   │   ├── clients/              # Client management
│   │   ├── batiments/            # Building management
│   │   ├── bassins/              # Basin management
│   │   ├── utilisateurs/         # User management
│   │   ├── entreprises/          # Company directory
│   │   ├── materiaux/            # Material catalog
│   │   └── listes/               # Lists/dropdowns config
│   │
│   ├── client/                   # Client portal (protected)
│   │   ├── page.tsx              # Client dashboard
│   │   ├── layout.tsx            # Client layout with auth check
│   │   ├── batiments/[id]/       # Building details
│   │   ├── bassins/[id]/         # Basin details
│   │   ├── interventions/        # Interventions management
│   │   └── carte/                # Interactive map view
│   │
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin API endpoints
│   │   │   ├── users/            # User management
│   │   │   ├── clients/          # Client CRUD
│   │   │   ├── batiments/        # Building CRUD
│   │   │   ├── bassins/          # Basin CRUD
│   │   │   ├── entreprises/      # Company CRUD
│   │   │   ├── materiaux/        # Material CRUD
│   │   │   └── listes/           # List items CRUD
│   │   ├── client/               # Client API endpoints
│   │   │   ├── bassins/          # Basin update/delete
│   │   │   ├── garanties/        # Warranty CRUD + file upload
│   │   │   └── interventions/    # Intervention CRUD + file upload
│   │   └── auth/                 # Authentication endpoints
│   │
│   ├── auth/                     # Auth routes
│   │   ├── callback/page.tsx     # OAuth callback
│   │   └── set-password/page.tsx # Password setup
│   │
│   ├── login/                    # Login page
│   │   └── page.tsx              # Login form
│   │
│   ├── test-supabase/            # Testing utilities
│   │   └── page.tsx              # Supabase connection test
│   │
│   ├── globals.css               # Global styles + Tailwind theme
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
│
├── components/                   # React components
│   ├── ui/                       # UI primitives
│   │   ├── Button.tsx            # Button variants
│   │   ├── Card.tsx              # Card component
│   │   ├── ConfirmDialog.tsx     # Confirmation modal
│   │   ├── DataTable.tsx         # Generic data table
│   │   ├── dialog.tsx            # Modal/dialog
│   │   ├── ErrorState.tsx        # Error display component
│   │   ├── LoadingState.tsx      # Loading spinner component
│   │   ├── Pagination.tsx        # Pagination controls
│   │   ├── SearchInput.tsx       # Search input with debounce
│   │   ├── StateBadge.tsx        # Status badges
│   │   └── Toast.tsx             # Toast notifications
│   ├── admin/                    # Admin-specific components
│   ├── maps/                     # Map components
│   │   ├── BassinMap.tsx
│   │   └── BatimentBassinsMap.tsx
│   └── bassins/                  # Basin-specific components
│
├── lib/                          # Utilities & services
│   ├── supabaseBrowser.ts        # Client-side Supabase
│   ├── supabaseClient.ts         # Server-side Supabase
│   ├── supabaseAdmin.ts          # Admin Supabase (service role)
│   ├── auth-middleware.ts        # Authentication middleware
│   ├── toast-context.tsx         # Toast notification context provider
│   ├── units.ts                  # Unit conversion utilities
│   ├── utils.ts                  # Helper functions (cn, etc.)
│   ├── constants/                # Constants
│   │   └── map-colors.ts         # Color/state mappings
│   ├── hooks/                    # Custom React hooks
│   │   ├── useServerPagination.ts # Server-side pagination hook
│   │   ├── useUsersData.ts       # User data management hook
│   │   └── useValidatedId.ts     # ID validation with redirect
│   ├── schemas/                  # Zod validation schemas
│   │   ├── bassin.schema.ts      # Basin validation (includes interventions)
│   │   ├── batiment.schema.ts    # Building validation
│   │   ├── client.schema.ts      # Client validation
│   │   ├── entreprise.schema.ts  # Company validation
│   │   ├── garantie.schema.ts    # Warranty validation
│   │   ├── liste.schema.ts       # List/dropdown validation
│   │   ├── materiau.schema.ts    # Material validation
│   │   └── user.schema.ts        # User validation
│   └── utils/                    # Utility functions
│       └── map-utils.ts          # Google Maps helpers
│
├── public/                       # Static assets
├── types/                        # TypeScript type definitions
│   └── maps.ts                   # Google Maps type definitions
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── next.config.ts                # Next.js config
├── eslint.config.mjs             # ESLint config
├── postcss.config.mjs            # PostCSS config
└── .env.local                    # Environment variables (gitignored)
```

### Routing Architecture

**Public Routes**
- `/` - Landing page
- `/login` - Login form

**Protected Admin Routes** (`/admin/*`)
- Authentication enforced in `app/admin/layout.tsx`
- Role check: must have `role = 'admin'` in `user_profiles`
- Redirects to `/login` if not authenticated

**Protected Client Routes** (`/client/*`)
- Authentication enforced in `app/client/layout.tsx`
- Role check: must have `role = 'client'` in `user_profiles`
- Active status check: `is_active = true`
- Respects `user_clients` table for access control

**Dynamic Routes**
- `[id]` segments for resource detail pages
- Examples: `/admin/batiments/[id]`, `/client/bassins/[id]`

---

## Database Schema

### Core Tables

#### `clients`
```typescript
{
  id: string (UUID, PK)
  name: string
}
```

#### `batiments` (Buildings)
```typescript
{
  id: string (UUID, PK)
  client_id: string (FK → clients.id)
  name: string
  address: string
  city: string
  postal_code: string
  latitude: number | null    // GPS coordinates
  longitude: number | null
  notes: string | null
}
```

#### `bassins` (Roof Basins/Pools)
```typescript
{
  id: string (UUID, PK)
  batiment_id: string (FK → batiments.id)
  name: string
  surface_m2: number         // Area in square meters
  membrane_type_id: string (FK → listes_choix.id)
  etat_id: string (FK → listes_choix.id)           // Current state
  duree_vie_id: string (FK → listes_choix.id)      // Expected lifespan
  duree_vie_text: string | null                     // Override text
  annee_installation: number | null
  date_derniere_refection: string | null (DATE)
  polygone_geojson: object | null                   // GeoJSON Polygon
  reference_interne: string | null
  notes: string | null
}
```

#### `auth.users` (Supabase managed)
```typescript
{
  id: string (UUID, PK)
  email: string (UNIQUE)
  // Password managed by Supabase Auth
}
```

#### `user_profiles` (Custom user data)
```typescript
{
  id: string (UUID, PK)
  user_id: string (FK → auth.users.id)
  role: 'admin' | 'client'
  client_id: string | null (FK → clients.id)  // Primary client
  full_name: string
  is_active: boolean                           // Suspension flag
  created_at: timestamp
}
```

#### `user_clients` (Many-to-many)
```typescript
{
  user_id: string (FK → auth.users.id)
  client_id: string (FK → clients.id)
  // Allows users to access multiple clients
}
```

#### `listes_choix` (Dynamic dropdowns/enums)
```typescript
{
  id: string (UUID, PK)
  categorie: string          // 'etat_bassin', 'duree_vie', 'type_membrane', etc.
  code: string               // Machine code: 'urgent', 'bon', 'a_surveiller'
  label: string              // Display text (French): 'Urgent', 'Bon', 'À surveiller'
  couleur: string            // HEX color: '#DC3545', '#28A745'
  ordre: number              // Sort order
}
```

#### `garanties` (Warranties)
```typescript
{
  id: string (UUID, PK)
  bassin_id: string (FK → bassins.id)
  type_garantie: string       // Type of warranty
  fournisseur: string         // Provider/supplier
  date_debut: string (DATE)   // Start date
  date_fin: string (DATE)     // End date
  numero_contrat: string | null  // Contract number
  montant: number | null      // Amount
  fichier_url: string | null  // PDF file URL
  notes: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

#### `interventions` (Interventions)
```typescript
{
  id: string (UUID, PK)
  bassin_id: string (FK → bassins.id)
  type_intervention: string   // Type of intervention
  date_intervention: string (DATE)
  entreprise_id: string | null (FK → entreprises.id)
  cout: number | null         // Cost
  description: string | null
  localisation_geojson: object | null  // GeoJSON Point
  created_at: timestamp
  updated_at: timestamp
}
```

#### `intervention_fichiers` (Intervention files)
```typescript
{
  id: string (UUID, PK)
  intervention_id: string (FK → interventions.id)
  fichier_url: string         // File URL (images, PDFs)
  fichier_nom: string         // Original filename
  fichier_type: string        // MIME type
  created_at: timestamp
}
```

### Basin State Categories (from `listes_choix`)

Category: `etat_bassin`

| Code | Label | Color | Meaning |
|------|-------|-------|---------|
| `urgent` | Urgent | `#DC3545` (Red) | Immediate intervention required |
| `a_surveiller` | À surveiller | `#FFC107` (Yellow) | Monitor closely |
| `planifier` | Réfection à planifier | `#FD7E14` (Orange) | Budget within 12-24 months |
| `bon` | Bon | `#28A745` (Green) | Good condition |
| `tres_bon` | Très bon | `#28A745` (Green) | Excellent condition |
| `non_evalue` | Non évalué | `#6C757D` (Gray) | Not yet assessed |

---

## Development Workflows

### Environment Setup

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd plateforme-conseil-toit
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create `.env.local` with:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-maps-api-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

### Git Workflow

**Commit Message Convention**
- Commits are typically in French (matches project language)
- Examples from history:
  - `"modal suppression et carte"`
  - `"Debug"`
  - `"Page entreprises"`
  - `"Harmonisation terminé"`

**Branch Strategy**
- Main branch: (configured in project, typically `main` or `master`)
- Feature branches: Use descriptive names (e.g., `claude/add-claude-documentation-gbPPK`)

---

## Code Conventions & Patterns

### TypeScript

**Strict Mode Enabled**
- All TypeScript errors must be resolved
- No implicit `any` types
- Null checks required

**Type Definitions**
```typescript
// Use explicit types for function parameters and returns
function calculateSurface(bassinId: string): Promise<number> {
  // ...
}

// Define interfaces for complex objects
interface BatimentRow {
  id: string;
  name: string | null;
  client_id: string | null;
  // ...
}

// Use proper null handling
const clientName = batiment.client_name ?? 'Sans client';
```

**Path Aliases**
- Use `@/` for root-level imports
- Example: `import { Button } from '@/components/ui/Button'`

### React Patterns

**Client Components**
- Use `'use client'` directive for interactive components
- Required for: hooks, event handlers, browser APIs

```typescript
'use client';

import { useState } from 'react';

export default function MyComponent() {
  const [state, setState] = useState(false);
  // ...
}
```

**Server Components (default)**
- Use for data fetching, static content
- Can directly use Supabase server client

```typescript
import { createClient } from '@/lib/supabaseClient';

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from('clients').select('*');
  // ...
}
```

### Naming Conventions

**Files**
- Components: PascalCase (`Button.tsx`, `StateBadge.tsx`)
- Utilities: camelCase (`supabaseBrowser.ts`, `map-utils.ts`)
- API routes: lowercase (`route.ts` in named directories)

**Variables & Functions**
- camelCase for variables and functions
- PascalCase for React components and types/interfaces
- UPPERCASE for constants

```typescript
const bassinCount = 10;
const calculateTotal = () => {};
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
```

**Database Fields**
- snake_case (follows PostgreSQL convention)
- Examples: `client_id`, `full_name`, `surface_m2`

### File Organization

**Component Structure**
```typescript
// 1. Imports
import React from 'react';
import { Button } from '@/components/ui/Button';

// 2. Type definitions
interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

// 3. Component
export default function MyComponent({ title, onClick }: MyComponentProps) {
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={onClick}>Click me</Button>
    </div>
  );
}

// 4. Sub-components or helpers (if needed)
```

---

## Component Patterns

### Compound Component Pattern

Used for `Card`, `Dialog`, and other composite UI elements:

```typescript
// Card.tsx exports multiple related components
export function Card({ children, className }: CardProps) { /* ... */ }
export function CardHeader({ children }: CardHeaderProps) { /* ... */ }
export function CardTitle({ children }: CardTitleProps) { /* ... */ }
export function CardContent({ children }: CardContentProps) { /* ... */ }
export function CardFooter({ children }: CardFooterProps) { /* ... */ }

// Usage
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Data Fetching Pattern

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabaseBrowser';

export default function MyComponent() {
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('table_name')
          .select('*');

        if (error) throw error;
        setData(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return <div>{/* Render data */}</div>;
}
```

### Modal/Dialog Pattern

```typescript
const [isOpen, setIsOpen] = useState(false);

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  </DialogContent>
</Dialog>
```

### Loading and Error States

**Use dedicated components for consistent UX:**

```typescript
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';

// In your component
if (loading) return <LoadingState />;
if (error) return <ErrorState message={error} />;
```

### Toast Notifications

**Use the toast context for user feedback:**

```typescript
'use client';

import { useToast } from '@/lib/toast-context';

export default function MyComponent() {
  const { showToast } = useToast();

  const handleAction = async () => {
    try {
      // Perform action
      showToast('Opération réussie!', 'success');
    } catch (error) {
      showToast('Une erreur est survenue', 'error');
    }
  };

  // Toast types: 'success', 'error', 'warning', 'info'
}
```

### Pagination Pattern

**Server-side pagination with custom hook:**

```typescript
'use client';

import { useServerPagination } from '@/lib/hooks/useServerPagination';
import Pagination from '@/components/ui/Pagination';

export default function MyListPage() {
  const { data, loading, error, currentPage, totalPages, goToPage } =
    useServerPagination('table_name', 20); // 20 items per page

  return (
    <>
      {/* Render data */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />
    </>
  );
}
```

### Search Input with Debounce

**Use SearchInput component for optimized search:**

```typescript
import SearchInput from '@/components/ui/SearchInput';

const [searchTerm, setSearchTerm] = useState('');

<SearchInput
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Rechercher..."
  debounceMs={300} // Optional, defaults to 300ms
/>
```

### Confirmation Dialog

**Use ConfirmDialog for destructive actions:**

```typescript
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const [isConfirmOpen, setIsConfirmOpen] = useState(false);

<ConfirmDialog
  open={isConfirmOpen}
  onOpenChange={setIsConfirmOpen}
  title="Confirmer la suppression"
  description="Êtes-vous sûr de vouloir supprimer cet élément?"
  onConfirm={handleDelete}
  confirmText="Supprimer"
  cancelText="Annuler"
/>
```

---

## Custom Hooks

The project provides reusable custom hooks for common patterns. **Always use these hooks instead of duplicating code.**

### useSessionToken

**Location:** `lib/hooks/useSessionToken.ts`

Hook for retrieving the current session token. Provides both reactive and synchronous patterns.

**Usage (Reactive):**
```typescript
import { useSessionToken } from '@/lib/hooks/useSessionToken';

function MyComponent() {
  const token = useSessionToken();

  // Token updates automatically when session changes
  useEffect(() => {
    if (token) {
      console.log('User is authenticated');
    }
  }, [token]);
}
```

**Usage (Synchronous):**
```typescript
import { getSessionToken } from '@/lib/hooks/useSessionToken';

async function handleAction() {
  const token = await getSessionToken();
  if (!token) {
    console.error('No session');
    return;
  }
  // Use token...
}
```

**Note:** If you're using `useApiMutation`, you don't need to use this hook as it handles token management automatically.

---

### useApiMutation

**Location:** `lib/hooks/useApiMutation.ts`

**⭐ RECOMMENDED:** Use this hook for all API mutations (POST, PUT, DELETE) instead of manually calling fetch.

Hook for managing API mutations with automatic state management, error handling, and session token management.

**Features:**
- ✅ Automatic session token management
- ✅ Loading state management
- ✅ Error handling and display
- ✅ Success/error callbacks
- ✅ Reduces boilerplate by 60%

**Basic Usage:**
```typescript
import { useApiMutation } from '@/lib/hooks/useApiMutation';

const {
  mutate: createClient,
  isLoading,
  error,
  resetError
} = useApiMutation({
  method: 'POST',
  endpoint: '/api/admin/clients/create',
  defaultErrorMessage: 'Erreur lors de la création du client',
  onSuccess: async (data) => {
    console.log('Client créé:', data);
    await refreshData();
    setModalOpen(false);
  }
});

// In form submit handler
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  await createClient({ name: formData.name });
};

// In JSX
{error && <div className="text-red-500">{error}</div>}
<button type="submit" disabled={isLoading}>
  {isLoading ? 'Création...' : 'Créer'}
</button>
```

**Update Pattern:**
```typescript
const { mutate: updateClient, isLoading, error } = useApiMutation({
  method: 'PUT',
  endpoint: '/api/admin/clients/update',
  onSuccess: async () => {
    await refreshData();
    setEditModalOpen(false);
  }
});

await updateClient({ id: clientId, name: newName });
```

**Delete Pattern:**
```typescript
const { mutate: deleteClient, isLoading } = useApiMutation({
  method: 'DELETE',
  endpoint: '/api/admin/clients/delete',
  onSuccess: async () => {
    await refreshData();
  }
});

await deleteClient({ id: clientId });
```

**⚠️ IMPORTANT:** Always use `useApiMutation` for mutations. Never manually implement fetch logic with session tokens in component code.

**Migration:** See `/docs/MIGRATION_GUIDE.md` for detailed migration instructions from old patterns.

---

### useServerPagination

**Location:** `lib/hooks/useServerPagination.ts`

Basic hook for managing server-side pagination with Supabase. Use with `.range()` method.

**Usage:**
```typescript
import { useServerPagination } from '@/lib/hooks/useServerPagination';

const pagination = useServerPagination(20); // 20 items per page

// In data fetching
const { data, count } = await supabase
  .from('clients')
  .select('*', { count: 'exact' })
  .range(pagination.startOffset, pagination.endOffset);

pagination.setTotalCount(count || 0);

// In JSX
<Pagination {...pagination.paginationProps} />
```

---

### useSupabasePagination (Advanced)

**Location:** `lib/hooks/useSupabasePagination.ts`

**⭐ RECOMMENDED for new pages:** Advanced hook that combines data fetching and pagination in one.

Hook for managing server-side pagination with automatic data fetching from Supabase.

**Features:**
- ✅ Automatic data fetching with Supabase
- ✅ Built-in loading and error states
- ✅ Filter and sort support
- ✅ Data transformation
- ✅ Pagination controls (next, previous, goToPage)

**Basic Usage:**
```typescript
import { useSupabasePagination } from '@/lib/hooks/useSupabasePagination';

const {
  data: clients,
  loading,
  error,
  currentPage,
  totalPages,
  goToPage,
  refresh
} = useSupabasePagination({
  table: 'clients',
  select: 'id, name',
  orderBy: { column: 'name', ascending: true },
  itemsPerPage: 20
});

if (loading) return <LoadingState />;
if (error) return <ErrorState message={error} />;

return (
  <>
    <ul>
      {clients.map(client => <li key={client.id}>{client.name}</li>)}
    </ul>
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={goToPage}
    />
  </>
);
```

**With Filters:**
```typescript
const {
  data: batiments,
  setFilters
} = useSupabasePagination({
  table: 'batiments',
  select: 'id, name, client:clients(name)',
  filters: { client_id: selectedClientId },
  orderBy: { column: 'created_at', ascending: false }
});

// Update filters dynamically
useEffect(() => {
  setFilters({ client_id: selectedClientId });
}, [selectedClientId]);
```

**With Data Transformation:**
```typescript
const { data } = useSupabasePagination({
  table: 'batiments',
  select: 'id, name, client:clients(name)',
  transform: (row) => ({
    id: row.id,
    name: row.name,
    clientName: row.client?.name || 'Sans client'
  })
});
```

---

### useValidatedId

**Location:** `lib/hooks/useValidatedId.ts`

Hook for validating UUID parameters in dynamic routes with automatic redirect on invalid IDs.

**Usage:**
```typescript
import { useValidatedId } from '@/lib/hooks/useValidatedId';

export default function BassinDetailPage({ params }: { params: { id: string } }) {
  // Validates ID and redirects to /client if invalid
  const validatedId = useValidatedId(params.id, '/client');

  // validatedId is guaranteed to be a valid UUID string
  // Component only renders if ID is valid
}
```

---

### useUsersData

**Location:** `lib/hooks/useUsersData.ts`

Hook for managing user data in admin pages with CRUD operations.

**Usage:**
```typescript
import { useUsersData } from '@/lib/hooks/useUsersData';

const {
  users,
  loading,
  error,
  refresh,
  createUser,
  updateUser,
  deleteUser
} = useUsersData();

// Create a new user
await createUser({
  email: 'user@example.com',
  full_name: 'John Doe',
  role: 'client',
  client_id: 'xxx'
});
```

---

## API Development

### API Route Structure

Located in `app/api/[...path]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // 1. Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify user and role
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parse request body
    const body = await request.json();

    // 4. Perform operation
    const { data, error } = await supabase
      .from('table_name')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    // 5. Return response
    return NextResponse.json({ ok: true, data });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Authentication in API Routes

**Always validate:**
1. Bearer token presence
2. User existence
3. User role/permissions
4. Active status (for client actions)

**Pattern:**
```typescript
// Get token from Authorization header
const authHeader = request.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');

// Verify with Supabase
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser(token);

// Check permissions
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role, is_active')
  .eq('user_id', user.id)
  .single();
```

### Security Features

**All API endpoints include:**

1. **CSRF Protection**: Origin validation ensures requests come from the same domain
2. **Rate Limiting**:
   - General endpoints: 100 requests per minute per user
   - File upload endpoints: 20 requests per minute per user
3. **Authentication Middleware**: Centralized auth checking via `lib/auth-middleware.ts`
4. **Input Validation**: Zod schemas validate all incoming data
5. **Access Control**: Client users can only access their assigned clients' data
6. **Error Logging**: All errors logged with context and metadata

**Using the authentication middleware:**

```typescript
import { requireAdmin, requireClient } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  // For admin-only endpoints
  const { error, user } = await requireAdmin(request);
  if (error) return error;

  // user.id, user.profile.role available
  // ...
}

export async function PUT(request: NextRequest) {
  // For client endpoints
  const { error, user } = await requireClient(request);
  if (error) return error;

  // user.id, user.clientIds (array of accessible client IDs)
  // ...
}
```

---

## Data Validation with Zod

The project uses **Zod** for runtime type checking and validation of data structures. All schemas are located in `lib/schemas/`.

### Available Schemas

- **bassin.schema.ts** - Basin/roof pool validation (includes intervention schemas)
- **batiment.schema.ts** - Building validation
- **client.schema.ts** - Client validation
- **entreprise.schema.ts** - Company validation
- **garantie.schema.ts** - Warranty validation
- **liste.schema.ts** - List/dropdown validation
- **materiau.schema.ts** - Material validation
- **user.schema.ts** - User validation

### Using Schemas

**Server-side validation in API routes:**

```typescript
import { bassinSchema } from '@/lib/schemas/bassin.schema';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validatedData = bassinSchema.parse(body);

    // Use validated data
    const { data, error } = await supabase
      .from('bassins')
      .insert(validatedData);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    // Handle other errors
  }
}
```

**Client-side validation in forms:**

```typescript
import { batimentSchema } from '@/lib/schemas/batiment.schema';

const handleSubmit = async (formData: FormData) => {
  try {
    const data = Object.fromEntries(formData);

    // Validate before sending
    const validatedData = batimentSchema.parse(data);

    // Submit to API
    const response = await fetch('/api/admin/batiments', {
      method: 'POST',
      body: JSON.stringify(validatedData),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      // Display validation errors to user
      console.error('Validation errors:', error.errors);
    }
  }
};
```

### Schema Definition Pattern

**Example schema structure:**

```typescript
import { z } from 'zod';

export const batimentSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  address: z.string().min(1, 'L\'adresse est requise'),
  city: z.string().min(1, 'La ville est requise'),
  postal_code: z.string().regex(/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/, 'Code postal invalide'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  client_id: z.string().uuid('ID client invalide'),
  notes: z.string().optional().nullable(),
});

// Type inference from schema
export type BatimentInput = z.infer<typeof batimentSchema>;
```

---

## Authentication & Authorization

### Supabase Clients

**Three client types:**

1. **Browser Client** (`lib/supabaseBrowser.ts`)
   - Use in client components
   - Respects RLS (Row Level Security)
   - User session management
   ```typescript
   import { createBrowserClient } from '@/lib/supabaseBrowser';
   const supabase = createBrowserClient();
   ```

2. **Server Client** (`lib/supabaseClient.ts`)
   - Use in server components and API routes
   - Respects RLS
   - Cookie-based session
   ```typescript
   import { createClient } from '@/lib/supabaseClient';
   const supabase = await createClient();
   ```

3. **Admin Client** (`lib/supabaseAdmin.ts`)
   - Use for admin operations that bypass RLS
   - Uses service role key
   - **Use with caution!**
   ```typescript
   import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
   const supabase = getSupabaseAdmin();
   ```

### Protected Route Pattern

**Layout-based protection:**

```typescript
// app/admin/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabaseBrowser';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Check role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/client');
        return;
      }

      setLoading(false);
    }

    checkAuth();
  }, [router]);

  if (loading) return <div>Chargement...</div>;

  return <>{children}</>;
}
```

### Role-Based Access

**Roles:**
- `admin`: Full access to all features
- `client`: Limited to assigned client data

**Access Control:**
```typescript
// Check user role
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role, client_id, is_active')
  .eq('user_id', user.id)
  .single();

// Admin check
if (profile?.role !== 'admin') {
  return redirect('/login');
}

// Client check with active status
if (profile?.role !== 'client' || !profile?.is_active) {
  return redirect('/login');
}

// Client data filtering
const { data: batiments } = await supabase
  .from('batiments')
  .select('*')
  .eq('client_id', profile.client_id);
```

### Login & Error Handling

**Login endpoint** (`/api/auth/login`)

The login API provides detailed error messages to help users understand authentication failures:

**Error types:**
- **Email not found**: "Aucun compte associé à cette adresse courriel"
- **Invalid password**: "Mot de passe incorrect"
- **Inactive account**: "Votre compte a été désactivé. Contactez un administrateur."
- **Rate limiting**: "Trop de tentatives de connexion. Veuillez réessayer plus tard."

**Login flow:**
```typescript
// 1. Rate limiting check (5 attempts per 15 minutes per IP)
// 2. Email validation with Zod
// 3. Check if user exists via getUserByEmail
// 4. Attempt authentication with password
// 5. Verify user profile exists
// 6. Check if user is active
// 7. Return session and user data
```

**Login page visual feedback** (`/app/login/page.tsx`)

Error messages are displayed with:
- ✅ Red gradient background (from-red-50 to-red-100/50)
- ✅ Thick red border (border-2 border-red-300)
- ✅ Shake animation (animate-shake) for attention
- ✅ Alert icon in circular background
- ✅ Clear error hierarchy (title + detailed message)

**Example usage:**
```typescript
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    // Display specific error message
    setErrorMsg(data.error);
    return;
  }

  // Set session and redirect based on role
  if (data.session) {
    await supabaseBrowser.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  router.push(data.user.role === 'admin' ? '/admin' : '/client');
} catch (error) {
  setErrorMsg('Une erreur est survenue lors de la connexion');
}
```

**Available animations:**

Custom CSS animations in `app/globals.css`:
- `animate-shake`: Horizontal shake animation (0.5s, 4px movement)
- `slide-in-from-right-full`: Slide-in animation for toast notifications
- `shrink-width`: Progress bar animation

---

## Styling Guidelines

### Tailwind CSS Approach

**Custom CSS Variables** (defined in `app/globals.css`):

```css
:root {
  --color-ct-primary: #1F4E79;
  --color-ct-primaryLight: #C7D6E6;
  --color-ct-grayDark: #2E2E2E;
  --color-ct-gray: #7A7A7A;
  --color-ct-grayLight: #F5F6F7;

  /* State colors */
  --color-ct-stateGood: #28A745;
  --color-ct-stateWatch: #FFC107;
  --color-ct-statePlan: #FD7E14;
  --color-ct-stateUrgent: #DC3545;
  --color-ct-stateUnknown: #6C757D;

  /* Shadows */
  --shadow-ct-card: 0 8px 20px rgba(15, 23, 42, 0.06);
}
```

**Using Custom Colors:**
```typescript
// Via Tailwind class (if configured)
<div className="bg-ct-primary text-white">

// Via inline style for dynamic colors from DB
<span style={{ backgroundColor: bassin.etat_couleur }}>
```

### Component Styling Patterns

**Button Variants:**
```typescript
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
```

**Responsive Design:**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Consistent Spacing:**
- Use Tailwind spacing scale: `p-4`, `mb-6`, `gap-4`
- Card padding: `p-6`
- Section margins: `mb-8`

### Dynamic Styling

**State-based colors from database:**

```typescript
// Fetch color from listes_choix
const { data: etatData } = await supabase
  .from('listes_choix')
  .select('couleur')
  .eq('id', bassin.etat_id)
  .single();

// Apply dynamically
<span
  className="px-2 py-1 rounded-full text-xs font-medium text-white"
  style={{ backgroundColor: etatData?.couleur }}
>
  {etat_label}
</span>
```

### Custom Animations

**Available animations** (defined in `app/globals.css`):

**Shake animation** - Used for error messages and validation feedback:
```typescript
<div className="animate-shake">
  {/* Content that will shake */}
</div>
```
- Duration: 0.5s
- Movement: ±4px horizontal
- Use case: Login errors, form validation failures

**Slide-in animation** - Used for toast notifications:
```typescript
<div className="animate-in slide-in-from-right-full duration-300">
  {/* Toast content */}
</div>
```
- Direction: From right to left
- Duration: 300ms
- Use case: Toast notifications

**Progress bar animation** - Used for auto-dismiss timers:
```css
@keyframes shrink-width {
  from { width: 100%; }
  to { width: 0%; }
}
```
- Use case: Toast notification progress bars

**Creating new animations:**
```css
/* In app/globals.css */
@keyframes my-animation {
  0% { /* initial state */ }
  100% { /* final state */ }
}

.animate-my-animation {
  animation: my-animation 0.3s ease-in-out;
}
```

---

## Common Tasks & Examples

### Migrating to New Hooks and Patterns

**⭐ IMPORTANT:** Before creating new pages or modifying existing ones, **always** check `/docs/MIGRATION_GUIDE.md` for:

- How to use `useApiMutation` instead of manual fetch calls
- How to migrate custom modals to the standardized `Dialog` component
- How to implement server-side pagination with `useSupabasePagination`
- Before/after examples showing code reduction of 40-60%

**Quick Reference:**
- ✅ **DO**: Use `useApiMutation` for all POST/PUT/DELETE operations
- ✅ **DO**: Use `Dialog` component for all modals
- ✅ **DO**: Use `useSupabasePagination` for paginated lists
- ❌ **DON'T**: Create local `getSessionToken()` functions
- ❌ **DON'T**: Manually manage loading/error states for API calls
- ❌ **DON'T**: Create custom inline modals

**Example Pages:**
- `/app/admin/clients/page.tsx` - ✅ Migrated (reference implementation)
- `/app/admin/batiments/page.tsx` - ⏳ To be migrated
- See migration guide for full list

---

### Setting Up Toast Notifications in Layout

**The toast context should be wrapped around the application in the root layout:**

```typescript
// app/layout.tsx
import { ToastProvider } from '@/lib/toast-context';
import Toast from '@/components/ui/Toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider>
          {children}
          <Toast />
        </ToastProvider>
      </body>
    </html>
  );
}
```

---

### Adding a New Page

1. **Create page file:**
   ```typescript
   // app/admin/my-feature/page.tsx
   'use client';

   export default function MyFeaturePage() {
     return (
       <div className="p-6">
         <h1 className="text-2xl font-bold mb-4">My Feature</h1>
         {/* Content */}
       </div>
     );
   }
   ```

2. **Add to navigation** (in layout sidebar):
   ```typescript
   <Link href="/admin/my-feature">
     <MyIcon className="mr-2" />
     My Feature
   </Link>
   ```

### Adding a New Database Table

1. **Create table in Supabase dashboard**
2. **Add TypeScript type:**
   ```typescript
   // In relevant file or types.ts
   interface MyTableRow {
     id: string;
     name: string;
     created_at: string;
   }
   ```

3. **Query the table:**
   ```typescript
   const { data, error } = await supabase
     .from('my_table')
     .select('*');
   ```

### Creating a New API Endpoint

1. **Create route file:**
   ```
   app/api/admin/my-endpoint/route.ts
   ```

2. **Implement handler:**
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { createClient } from '@/lib/supabaseClient';

   export async function POST(request: NextRequest) {
     // See API Development section for full pattern
   }
   ```

3. **Call from frontend:**
   ```typescript
   const response = await fetch('/api/admin/my-endpoint', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${session.access_token}`,
       'Content-Type': 'application/json',
     },
     body: JSON.stringify(data),
   });
   ```

### Using API Endpoints in Admin Pages

**All admin pages use secure API endpoints for mutations (create, update, delete) instead of direct Supabase calls.** This provides:
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Centralized validation with Zod schemas
- ✅ Consistent error handling and logging
- ✅ Authentication and role checks

#### Standard Pattern for API Mutations

**1. Add the session token helper:**
```typescript
import { createBrowserClient } from '@/lib/supabaseBrowser';

async function getSessionToken(): Promise<string | null> {
  const supabase = createBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token || null
}
```

**2. Create operation:**
```typescript
const handleCreate = async (e: FormEvent) => {
  e.preventDefault()
  setSaving(true)
  setError(null)

  try {
    const token = await getSessionToken()
    if (!token) {
      setError('Session expirée. Veuillez vous reconnecter.')
      setSaving(false)
      return
    }

    const res = await fetch('/api/admin/resource/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur lors de la création.')
      setSaving(false)
      return
    }

    // Success - refresh data and close modal
    await fetchData()
    setModalOpen(false)
  } catch (err: any) {
    setError(err.message || 'Erreur inattendue.')
    setSaving(false)
  }
}
```

**3. Update operation:**
```typescript
const handleUpdate = async (e: FormEvent) => {
  e.preventDefault()
  if (!editingId) return

  setSaving(true)
  setError(null)

  try {
    const token = await getSessionToken()
    if (!token) {
      setError('Session expirée. Veuillez vous reconnecter.')
      setSaving(false)
      return
    }

    const payload = { ...formData, id: editingId }

    const res = await fetch('/api/admin/resource/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur lors de la modification.')
      setSaving(false)
      return
    }

    await fetchData()
    setModalOpen(false)
    setEditingId(null)
  } catch (err: any) {
    setError(err.message || 'Erreur inattendue.')
    setSaving(false)
  }
}
```

**4. Delete operation:**
```typescript
const handleDelete = async () => {
  if (!deletingId) return

  setDeleting(true)

  try {
    const token = await getSessionToken()
    if (!token) {
      setError('Session expirée. Veuillez vous reconnecter.')
      setDeleting(false)
      return
    }

    const res = await fetch('/api/admin/resource/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id: deletingId }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur lors de la suppression.')
      setDeleting(false)
      return
    }

    await fetchData()
    setDeleteModalOpen(false)
    setDeletingId(null)
  } catch (err: any) {
    setError(err.message || 'Erreur inattendue.')
    setDeleting(false)
  }
}
```

#### Available Admin API Endpoints

**Users:**
- `POST /api/admin/users/create` - Create user
- `POST /api/admin/users/update` - Update user profile & access
- `POST /api/admin/users/reset-password` - Send password reset email
- `POST /api/admin/users/toggle-active` - Suspend/activate user
- `POST /api/admin/users/update-access` - Update user access rights

**Clients:**
- `POST /api/admin/clients/create` - Create client
- `PUT /api/admin/clients/update` - Update client
- `DELETE /api/admin/clients/delete` - Delete client

**Batiments:**
- `POST /api/admin/batiments/create` - Create building
- `PUT /api/admin/batiments/update` - Update building
- `DELETE /api/admin/batiments/delete` - Delete building

**Bassins:**
- `POST /api/admin/bassins/create` - Create basin
- `PUT /api/admin/bassins/update` - Update basin
- `DELETE /api/admin/bassins/delete` - Delete basin

**Entreprises:**
- `POST /api/admin/entreprises/create` - Create company
- `PUT /api/admin/entreprises/update` - Update company
- `DELETE /api/admin/entreprises/delete` - Delete company

**Materiaux:**
- `POST /api/admin/materiaux/create` - Create material
- `PUT /api/admin/materiaux/update` - Update material
- `DELETE /api/admin/materiaux/delete` - Delete material

**Listes de Choix:**
- `POST /api/admin/listes/create` - Create list item
- `PUT /api/admin/listes/update` - Update list item
- `DELETE /api/admin/listes/delete` - Delete list item

#### Available Client API Endpoints

**Bassins:**
- `PUT /api/client/bassins/update` - Update basin (own clients only)
- `DELETE /api/client/bassins/delete` - Delete basin (own clients only)

**Garanties (Warranties):**
- `POST /api/client/garanties/create` - Create warranty with PDF upload
- `PUT /api/client/garanties/update` - Update warranty
- `DELETE /api/client/garanties/delete` - Delete warranty

**Interventions:**
- `POST /api/client/interventions/create` - Create intervention
- `PUT /api/client/interventions/update` - Update intervention
- `DELETE /api/client/interventions/delete` - Delete intervention
- `POST /api/client/interventions/upload-file` - Upload intervention file (images/PDF, max 10MB)
- `DELETE /api/client/interventions/delete-file` - Delete intervention file

**Note:** All client endpoints verify user access via `user_clients` table and respect client data isolation.

#### Data Fetching vs Mutations

**Important distinction:**
- **Mutations (create, update, delete)**: Use API endpoints (as shown above)
- **Data fetching (SELECT queries)**: Use direct Supabase client calls

```typescript
// ✅ Correct: Data fetching with direct Supabase
const fetchData = async () => {
  const { data, error } = await supabaseBrowser
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    setError(error.message)
    return
  }

  setClients(data || [])
}

// ✅ Correct: Mutations via API endpoints
const handleCreate = async (formData) => {
  const token = await getSessionToken()
  const res = await fetch('/api/admin/clients/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(formData),
  })
  // Handle response...
}

// ❌ Incorrect: Direct Supabase mutation (bypasses security)
const handleCreate = async (formData) => {
  await supabaseBrowser.from('clients').insert(formData)  // DON'T DO THIS
}
```

### Adding a New State to Basin States

1. **Insert into `listes_choix` table:**
   ```sql
   INSERT INTO listes_choix (categorie, code, label, couleur, ordre)
   VALUES ('etat_bassin', 'new_state', 'Nouveau État', '#FF5733', 7);
   ```

2. **State will automatically appear in:**
   - Dropdown menus
   - State badges
   - Map colors
   - Dashboard statistics

### Working with Warranties (Garanties)

**Creating a warranty with file upload:**
```typescript
import { createGarantieSchema } from '@/lib/schemas/garantie.schema';

const handleCreateWarranty = async (formData: FormData) => {
  const token = await getSessionToken();

  // FormData automatically handles file upload
  const res = await fetch('/api/client/garanties/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData, // Don't set Content-Type - browser handles it
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error);
  }
};
```

**Supported file types:** PDF only (max 10MB)

### Working with Interventions

**Creating an intervention with geolocation:**
```typescript
import { createInterventionSchema } from '@/lib/schemas/bassin.schema';

const handleCreateIntervention = async (formData: {
  bassin_id: string;
  type_intervention: string;
  date_intervention: string;
  latitude?: number;
  longitude?: number;
  // ... other fields
}) => {
  const token = await getSessionToken();

  const res = await fetch('/api/client/interventions/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(formData),
  });

  const data = await res.json();
  return data;
};
```

**Uploading intervention files:**
```typescript
const handleUploadFile = async (interventionId: string, file: File) => {
  const token = await getSessionToken();
  const formData = new FormData();
  formData.append('intervention_id', interventionId);
  formData.append('file', file);

  const res = await fetch('/api/client/interventions/upload-file', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  return res.json();
};
```

**Supported file types:** JPEG, PNG, GIF, WebP, PDF (max 10MB per file)

**GeoJSON Point format for interventions:**
```typescript
// If latitude and longitude are provided
const locationGeoJSON = {
  type: 'Point',
  coordinates: [longitude, latitude] // Note: [lng, lat] order!
};
```

### Working with Google Maps

**Display a single polygon:**
```typescript
import { GoogleMap, Polygon } from '@react-google-maps/api';

const coordinates = bassin.polygone_geojson?.coordinates[0].map(
  ([lng, lat]) => ({ lat, lng })
);

<GoogleMap
  mapContainerStyle={{ width: '100%', height: '400px' }}
  center={coordinates[0]}
  zoom={18}
>
  <Polygon
    paths={coordinates}
    options={{
      fillColor: bassin.etat_couleur,
      fillOpacity: 0.5,
      strokeColor: bassin.etat_couleur,
      strokeWeight: 2,
    }}
  />
</GoogleMap>
```

### Using Custom Hooks

**Server-side pagination:**
```typescript
import { useServerPagination } from '@/lib/hooks/useServerPagination';

// In your component
const {
  data,
  loading,
  error,
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  goToPage,
  nextPage,
  previousPage,
  refresh
} = useServerPagination('bassins', 20, {
  orderBy: { column: 'created_at', ascending: false },
  filters: { client_id: 'xxx' }
});
```

**User data management:**
```typescript
import { useUsersData } from '@/lib/hooks/useUsersData';

// In admin user management page
const {
  users,
  loading,
  error,
  refresh,
  createUser,
  updateUser,
  deleteUser
} = useUsersData();

// Create a new user
await createUser({
  email: 'user@example.com',
  full_name: 'John Doe',
  role: 'client',
  client_id: 'xxx'
});
```

**ID validation with redirect:**
```typescript
import { useValidatedId } from '@/lib/hooks/useValidatedId';

// In a page component that requires a valid UUID
export default function BassinDetailPage({ params }: { params: { id: string } }) {
  // Validates ID and redirects to /client if invalid
  const validatedId = useValidatedId(params.id, '/client');

  // validatedId is guaranteed to be a valid UUID string
  // Component continues rendering only if ID is valid
}
```

### Creating Custom Type Definitions

**Add types to `/types/` directory:**

```typescript
// types/database.ts
export interface DatabaseBatiment {
  id: string;
  client_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  created_at: string;
}

// Use in components
import type { DatabaseBatiment } from '@/types/database';
```

---

## Testing & Debugging

### Automated Testing

The project uses **Vitest** with **React Testing Library** for comprehensive test coverage.

**Test Infrastructure:**
- ✅ Zod schema validation tests (including warranties and interventions)
- ✅ UI component tests (100% coverage on all components)
- ✅ API endpoint tests (admin and client endpoints)
- ✅ Utility function tests
- ✅ Authentication middleware tests (100% coverage)
- ✅ Total: 553 tests passing across 32 test suites

**Code Coverage Statistics:**
- **Overall Average**: 87.82%
- **Statements**: 85.82%
- **Branches**: 80.61%
- **Functions**: 98.93%
- **Lines**: 85.93%

**Coverage by Category:**
- **UI Components**: 100% (Button, Card, Dialog, ConfirmDialog, ErrorState, LoadingState, Pagination, SearchInput, StateBadge)
- **Middleware**: 100% (auth-middleware.ts)
- **Schemas**: 92.85% (All Zod validation schemas)
- **Utils**: 99.32% (map-utils, validation, units)
- **API Endpoints**: 65-81% (CRUD operations for clients, buildings, basins, warranties, interventions)

**Running tests:**
```bash
# Run all tests once
npm test
# or
npm run test:run

# Watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npx vitest run components/ui/__tests__/Button.test.tsx
```

**Test locations:**
- `lib/schemas/__tests__/` - Zod schema validation tests (bassin, batiment, client, entreprise, liste, materiau, user)
- `components/ui/__tests__/` - UI component tests (Button, Card, Dialog, ConfirmDialog, ErrorState, LoadingState, Pagination, SearchInput, StateBadge)
- `lib/__tests__/` - Core library tests (auth-middleware, validation, utils, units)
- `lib/utils/__tests__/` - Utility function tests (map-utils, validation)
- `app/api/admin/__tests__/` - Admin API endpoint tests
- `app/api/client/__tests__/` - Client API endpoint tests (bassins, garanties, interventions)
- `app/api/auth/__tests__/` - Authentication endpoint tests

**Writing new tests:**

```typescript
// Schema test example
import { describe, it, expect } from 'vitest';
import { createClientSchema } from '../client.schema';

describe('Schema Validation', () => {
  it('devrait valider des données valides', () => {
    const result = createClientSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
  });
});

// Component test example
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

it('devrait afficher le texte', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

**Advanced Testing Patterns:**

```typescript
// Authentication middleware test example
import { describe, it, expect, vi } from 'vitest';
import { requireAdmin, requireClient } from '../auth-middleware';

describe('Auth Middleware', () => {
  it('devrait valider un utilisateur admin', async () => {
    const req = new Request('http://localhost', {
      headers: { Authorization: 'Bearer valid-token' }
    });

    const { error, user } = await requireAdmin(req);

    expect(error).toBeNull();
    expect(user).toBeDefined();
    expect(user?.profile.role).toBe('admin');
  });
});

// Dialog component test with user events
import userEvent from '@testing-library/user-event';

it('devrait fermer avec Escape', async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();

  render(
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>Test</DialogContent>
    </Dialog>
  );

  await user.keyboard('{Escape}');
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

// API endpoint test with mocked dependencies
vi.mock('@/lib/supabaseAdmin');
vi.mock('@/lib/auth-middleware');

it('devrait créer un bassin', async () => {
  const mockUser = { id: 'user-123', clientIds: ['client-456'] };
  vi.mocked(requireClient).mockResolvedValue({ error: null, user: mockUser });

  const response = await PUT(request);
  expect(response.status).toBe(200);
});
```

**Recently Added Test Suites:**

1. **`lib/__tests__/auth-middleware.test.ts`** (27 tests)
   - Complete coverage of authentication middleware
   - Tests for token extraction, origin validation
   - Admin and client role verification
   - Client access list validation

2. **`components/ui/__tests__/dialog.test.tsx`** (13 tests)
   - Full Dialog component testing
   - Keyboard interactions (Escape key)
   - Click outside to close
   - Accessibility attributes

3. **Extended `lib/schemas/__tests__/batiment.schema.test.ts`** (+12 tests)
   - Boundary value testing (max lengths, coordinate limits)
   - Null/empty value handling
   - Complex validation scenarios

**See `tests/README.md` for detailed testing documentation.**

### Development Testing

**Test Supabase connection:**
- Navigate to `/test-supabase` (if available)
- Check browser console for connection errors

**Common debugging steps:**
1. Check `.env.local` for correct environment variables
2. Verify Supabase project URL and keys
3. Check browser console for errors
4. Use Supabase dashboard to verify data
5. Check Network tab for API call failures

### Logging

**Client-side:**
```typescript
console.log('Debug info:', data);
console.error('Error occurred:', error);
```

**Server-side/API:**
```typescript
console.error('API Error:', error);
// Logs appear in terminal where dev server runs
```

### Interpreting Coverage Reports

**Coverage Metrics Explained:**
- **Statements**: Percentage of executable code lines that were run during tests
- **Branches**: Percentage of conditional branches (if/else, switch, ternary) tested
- **Functions**: Percentage of functions/methods called during tests
- **Lines**: Percentage of source code lines executed

**Coverage Goals:**
- **UI Components**: Aim for 100% - These are critical user-facing elements
- **Core Libraries**: Aim for 95%+ - Essential business logic should be well-tested
- **API Endpoints**: Aim for 80%+ - Cover all happy paths and common error cases
- **Schemas**: Aim for 100% - Validation logic should be exhaustive
- **Utils**: Aim for 95%+ - Pure functions should be easy to test completely

**Understanding Uncovered Lines:**
- Some uncovered lines in API endpoints are acceptable (e.g., database constraint validations that Zod catches first)
- Focus on covering business logic, error handling, and edge cases
- Use integration tests for complex database interactions that are hard to mock

**Best Practices for Writing Tests:**
1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Use descriptive test names** - Write test names in French to match the project language
3. **Arrange-Act-Assert pattern** - Set up, execute, verify
4. **Mock external dependencies** - Supabase, external APIs, file system
5. **Test edge cases** - Null values, empty arrays, boundary values
6. **One assertion per test** - Keep tests focused and easy to debug
7. **Clean up after tests** - Use `beforeEach` and `afterEach` hooks

### Common Issues

**Authentication failures:**
- Check if user session exists: `supabase.auth.getUser()`
- Verify token in Authorization header
- Check `user_profiles` table for role

**Data not loading:**
- Check RLS policies in Supabase
- Verify foreign key relationships
- Check for null values in database

**Map not rendering:**
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- Check if GeoJSON data is valid
- Ensure coordinates are in [longitude, latitude] order

**Tests failing:**
- Run `npm test` to identify failing tests
- Check `tests/README.md` for troubleshooting
- Ensure mocks are properly configured in `tests/setup.ts`
- **Common test issues:**
  - **Mock not working**: Verify mock is defined before imports (`vi.mock()` must be at top)
  - **Async issues**: Use `await` with `waitFor()` for async operations
  - **Portal components**: Dialog/Modal tests need `await waitFor()` for DOM updates
  - **Vitest coverage missing**: Run `npm install -D @vitest/coverage-v8` if coverage command fails
  - **UUID validation errors**: Ensure test UUIDs are valid v4 format (use constants like TEST_IDS)
  - **Type errors in tests**: Import types from schema files, use `vi.mocked()` for type-safe mocks

---

## Important Gotchas

### 1. GeoJSON Coordinate Order

**GeoJSON uses [longitude, latitude], not [latitude, longitude]!**

```typescript
// CORRECT
const geojson = {
  type: 'Polygon',
  coordinates: [[[lng, lat], [lng, lat], ...]]
};

// For Google Maps, convert to { lat, lng }
const googleCoords = coordinates[0].map(([lng, lat]) => ({ lat, lng }));
```

### 2. Supabase Client Types

**Don't mix client types:**
- Use browser client in client components
- Use server client in server components
- Use admin client only when bypassing RLS is necessary

**Wrong:**
```typescript
'use client';
import { createClient } from '@/lib/supabaseClient'; // Server client in client component!
```

**Correct:**
```typescript
'use client';
import { createBrowserClient } from '@/lib/supabaseBrowser';
```

### 3. Environment Variables

**Public vs Private:**
- `NEXT_PUBLIC_*` = Available in browser
- No prefix = Server-only

**Never expose:**
- `SUPABASE_SERVICE_ROLE_KEY` (admin privileges)
- API keys with write access

### 4. French Language

**UI text is primarily in French:**
- Labels, buttons, messages should be in French
- Data labels from `listes_choix` are in French
- Commit messages often in French
- Error messages can be in French or English

### 5. Role Redirects

**Users are redirected based on role after login:**
- Admin → `/admin`
- Client → `/client`

**Don't hardcode redirects** - always check role first.

### 6. Active Status

**Client users can be suspended:**
- Check `user_profiles.is_active` before allowing access
- Suspended users should be redirected to login with message

### 7. Dynamic Colors

**Colors come from database, not hardcoded:**
- Fetch from `listes_choix` table
- Apply via inline styles, not Tailwind classes
- Cache color mappings for performance

### 8. TypeScript Strict Mode

**All nullable fields must be handled:**

```typescript
// WRONG
const name = batiment.name.toUpperCase(); // May be null!

// CORRECT
const name = batiment.name?.toUpperCase() ?? 'Sans nom';
```

### 9. Next.js App Router

**Server components by default:**
- Add `'use client'` only when needed
- Server components can't use hooks or browser APIs
- Client components can't be async

### 10. Database Relationships

**Always join related data:**

```typescript
// Get batiment with client name
const { data } = await supabase
  .from('batiments')
  .select(`
    *,
    clients!inner(name)
  `)
  .eq('id', id)
  .single();

// Access: data.clients.name
```

### 11. Data Validation

**Always validate user input with Zod schemas:**

```typescript
// WRONG - No validation
const body = await request.json();
await supabase.from('bassins').insert(body);

// CORRECT - Use Zod schema
import { bassinSchema } from '@/lib/schemas/bassin.schema';

const body = await request.json();
const validatedData = bassinSchema.parse(body); // Throws if invalid
await supabase.from('bassins').insert(validatedData);
```

**All schemas are in `lib/schemas/`** - use them for both client and server validation.

### 12. Toast Context Setup

**Toast notifications require provider setup:**

The `ToastProvider` must be set up in the root layout (`app/layout.tsx`) for toast notifications to work throughout the application.

```typescript
// app/layout.tsx
import { ToastProvider } from '@/lib/toast-context';
import Toast from '@/components/ui/Toast';

// Wrap children with ToastProvider
<ToastProvider>
  {children}
  <Toast />
</ToastProvider>
```

---

## Quick Reference

### File Locations

| Need | Location |
|------|----------|
| Add admin page | `app/admin/[feature]/page.tsx` |
| Add client page | `app/client/[feature]/page.tsx` |
| Create API endpoint | `app/api/[path]/route.ts` |
| Add UI component | `components/ui/[Component].tsx` |
| Add utility function | `lib/utils.ts` or `lib/utils/[feature].ts` |
| Define type | `types/[feature].ts` |
| Add Zod schema | `lib/schemas/[table].schema.ts` |
| Add custom hook | `lib/hooks/[hookName].ts` |
| Add constant | `lib/constants/[category].ts` |
| Add global styles | `app/globals.css` |
| API documentation | `app/api/[endpoint]/README.md` |

### Useful Commands

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Check types
npx tsc --noEmit
```

### Supabase Query Examples

```typescript
// Select with join
const { data } = await supabase
  .from('bassins')
  .select('*, batiments(name, clients(name))')
  .eq('id', id)
  .single();

// Insert
const { data, error } = await supabase
  .from('clients')
  .insert({ name: 'New Client' })
  .select()
  .single();

// Update
await supabase
  .from('batiments')
  .update({ name: 'Updated Name' })
  .eq('id', id);

// Delete
await supabase
  .from('bassins')
  .delete()
  .eq('id', id);

// Count
const { count } = await supabase
  .from('bassins')
  .select('*', { count: 'exact', head: true });
```

---

## Conclusion

This document should serve as a comprehensive guide for AI assistants working on the Plateforme Conseil-Toit codebase. When in doubt:

1. **Follow existing patterns** - Look at similar components/pages for guidance
2. **Respect the database schema** - Don't assume structure, verify in code
3. **Test authentication** - Always verify role and permissions
4. **Use TypeScript strictly** - Handle nulls, define types
5. **Keep French conventions** - UI text, data labels, commit messages
6. **Ask for clarification** - When requirements are ambiguous

For updates to this document, please ensure changes reflect the current state of the codebase.

---

**Last Updated:** 2026-02-01
**Project Version:** 0.1.0
**Maintainer:** Development Team
