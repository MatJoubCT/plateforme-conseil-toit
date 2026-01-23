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
8. [API Development](#api-development)
9. [Data Validation with Zod](#data-validation-with-zod)
10. [Authentication & Authorization](#authentication--authorization)
11. [Styling Guidelines](#styling-guidelines)
12. [Common Tasks & Examples](#common-tasks--examples)
13. [Testing & Debugging](#testing--debugging)
14. [Important Gotchas](#important-gotchas)

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
- **Coverage**: 101 tests (59 schema tests, 42 UI tests)

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
│   │   └── carte/                # Interactive map view
│   │
│   ├── api/                      # API routes
│   │   └── admin/users/          # User management endpoints
│   │       ├── create/route.ts
│   │       ├── update/route.ts
│   │       ├── reset-password/route.ts
│   │       ├── toggle-active/route.ts
│   │       └── update-access/route.ts
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
│   │   └── useUsersData.ts       # User data management hook
│   ├── schemas/                  # Zod validation schemas
│   │   ├── bassin.schema.ts      # Basin validation
│   │   ├── batiment.schema.ts    # Building validation
│   │   ├── client.schema.ts      # Client validation
│   │   ├── entreprise.schema.ts  # Company validation
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

---

## Data Validation with Zod

The project uses **Zod** for runtime type checking and validation of data structures. All schemas are located in `lib/schemas/`.

### Available Schemas

- **bassin.schema.ts** - Basin/roof pool validation
- **batiment.schema.ts** - Building validation
- **client.schema.ts** - Client validation
- **entreprise.schema.ts** - Company validation
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

---

## Common Tasks & Examples

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
- ✅ 59 tests for Zod schemas (data validation)
- ✅ 42 tests for UI components
- ✅ Total: 101 tests passing

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
- `lib/schemas/__tests__/` - Zod schema validation tests
- `components/ui/__tests__/` - UI component tests

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

**Last Updated:** 2026-01-23
**Project Version:** 0.1.0
**Maintainer:** Development Team
