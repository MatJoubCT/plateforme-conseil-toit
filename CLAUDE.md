# CLAUDE.md - AI Assistant Guide for Plateforme Conseil-Toit

## Project Overview

**Plateforme Conseil-Toit** is a professional building and roofing management platform built for managing roof basins, buildings, and clients. It provides separate portals for administrators (full management capabilities) and clients (view-only access to their buildings).

### Technology Stack
- **Framework:** Next.js 16.1.1 (App Router) with React 19.2.0
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth with role-based access control
- **Maps:** Google Maps API with @react-google-maps/api
- **Icons:** Lucide React

### Project Context
- French-language application with bilingual code (French UI, English code)
- Multi-tenant architecture (clients, buildings, basins hierarchy)
- Geospatial focus: manages building locations and roof basin polygons
- Role-based access: Admin (full access) vs Client (restricted to assigned buildings)

---

## Directory Structure

```
plateforme-conseil-toit/
├── app/                      # Next.js App Router (pages & layouts)
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   ├── login/                # Login page
│   ├── auth/                 # Auth flows (callback, set-password)
│   ├── admin/                # Admin portal (role: admin)
│   │   ├── page.tsx          # Dashboard with KPIs
│   │   ├── layout.tsx        # Admin sidebar layout
│   │   ├── utilisateurs/     # User management CRUD
│   │   ├── clients/          # Client management
│   │   ├── batiments/        # Building management (list & detail)
│   │   ├── bassins/          # Basin management (list & detail)
│   │   └── listes/           # Configuration lists (states, durations)
│   ├── client/               # Client portal (role: client)
│   │   ├── page.tsx          # Client dashboard (placeholder)
│   │   ├── layout.tsx        # Client sidebar layout
│   │   ├── batiments/        # Building list & detail
│   │   ├── bassins/          # Basin detail view
│   │   └── carte/            # Map view of client's buildings
│   ├── api/                  # API routes (server-side)
│   │   └── admin/users/      # User management endpoints
│   └── test-supabase/        # Supabase connection test page
├── components/
│   ├── ui/                   # Reusable UI components
│   │   ├── StateBadge.tsx    # State badge for basins
│   │   ├── Card.tsx, Button.tsx, dialog.tsx
│   │   └── DataTable.tsx
│   ├── maps/                 # Map components
│   │   ├── BatimentBassinsMap.tsx  # Building basins map
│   │   └── BassinMap.tsx           # Individual basin map
│   └── admin/users/          # Admin-specific components
│       ├── CreateUserModal.tsx
│       └── EditUserModal.tsx
├── lib/                      # Utilities and helpers
│   ├── supabaseBrowser.ts    # Client-side Supabase instance
│   ├── supabaseAdmin.ts      # Server-side admin instance
│   ├── supabaseClient.ts     # Alternative client instance
│   ├── units.ts              # Unit conversions (m² to ft²)
│   ├── utils.ts              # CSS classname utility (cn)
│   ├── utils/
│   │   └── map-utils.ts      # Map geometry calculations
│   └── constants/
│       └── map-colors.ts     # Color constants
└── public/                   # Static assets
    └── brand/                # Logo and brand images
```

---

## Database Schema

### Core Tables

**user_profiles**
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `full_name` (text)
- `role` (text: 'admin' | 'client')
- `client_id` (uuid, references clients) - for client users
- `is_active` (boolean)
- `created_at`, `updated_at` (timestamp)

**clients**
- `id` (uuid, primary key)
- `name` (text)
- `created_at`, `updated_at` (timestamp)

**batiments** (buildings)
- `id` (uuid, primary key)
- `client_id` (uuid, references clients)
- `name` (text)
- `address` (text)
- `city` (text)
- `postal_code` (text)
- `latitude`, `longitude` (numeric) - GPS coordinates
- `notes` (text)
- `created_at`, `updated_at` (timestamp)

**bassins** (roof basins)
- `id` (uuid, primary key)
- `batiment_id` (uuid, references batiments)
- `name` (text)
- `surface_m2` (numeric) - surface area in square meters
- `etat_id` (uuid, references listes_choix) - current state
- `duree_vie_id` (uuid, references listes_choix) - lifespan category
- `duree_vie_text` (text) - custom lifespan text
- `polygon_geojson` (jsonb) - GeoJSON polygon coordinates
- `created_at`, `updated_at` (timestamp)

**listes_choix** (configuration lists)
- `id` (uuid, primary key)
- `categorie` (text: 'etat' | 'duree_vie' | etc.)
- `code` (text: unique identifier)
- `label` (text: display name)
- `couleur` (text: hex color code)
- `ordre` (integer: display order)
- `actif` (boolean)

**user_clients** (many-to-many access mapping)
- `user_id` (uuid, references auth.users)
- `client_id` (uuid, references clients)

**user_batiments_access** (many-to-many access mapping)
- `user_id` (uuid, references auth.users)
- `batiment_id` (uuid, references batiments)

### Key Relationships
- Clients → Batiments (one-to-many)
- Batiments → Bassins (one-to-many)
- Users → Clients (many-to-many via user_clients)
- Users → Batiments (many-to-many via user_batiments_access)
- Bassins → listes_choix (for state and duration)

---

## Authentication & Authorization

### Authentication Flow
1. **Login:** Email/password via Supabase Auth (`app/login/page.tsx`)
2. **Session:** Managed by Supabase with automatic token refresh
3. **Invitation:** Admin creates user → Supabase sends invitation email
4. **Set Password:** User clicks link → `/auth/set-password` → sets password
5. **Redirect:** Based on role (admin → `/admin`, client → `/client`)

### User Invitation Process (Detailed)
The user invitation system handles both new users and re-invitations:

1. **Initial Invitation:**
   - Admin calls `/api/admin/users/create` with email, fullName, role, clientId
   - System calls `supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo })`
   - Supabase sends invitation email to user
   - User ID is captured from the response

2. **Re-invitation (User Already Exists):**
   - If user already exists in auth.users, the standard invitation fails
   - System searches for existing user by email using `listUsers()`
   - Calls `generateLink({ type: 'invite', email })` to create new invitation link
   - User receives new invitation email

3. **Profile Creation:**
   - After successful invitation, upsert into `user_profiles` table
   - If clientId provided, also insert into `user_clients` junction table
   - All operations use `supabaseAdmin` for bypassing RLS

### Authorization Model
- **Roles:** `admin` and `client` (stored in `user_profiles.role`)
- **Admin Access:** Full CRUD on all entities
- **Client Access:** Read-only access to assigned clients and buildings only
- **Route Protection:** Layout components check role and redirect unauthorized users
- **API Protection:** Server-side routes verify session and role

### Supabase Client Instances

**supabaseBrowser.ts** (Client-side)
```typescript
'use client'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey)
```
- Use in client components (with `'use client'` directive)
- Uses anonymous key (safe for browser)
- Respects Row Level Security policies

**supabaseAdmin.ts** (Server-side)
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,  // Important for server context
    },
  }
)
```
- Use in API routes and server components ONLY
- Uses service role key (bypasses RLS)
- Never expose in browser code
- persistSession: false prevents session management overhead

**IMPORTANT:** Always use `supabaseAdmin` in API routes and server components for privileged operations. Use `supabaseBrowser` in client components.

---

## Key Conventions & Patterns

### 1. File Naming & Organization
- **Pages:** `page.tsx` (Next.js convention)
- **Layouts:** `layout.tsx` (Next.js convention)
- **Components:** PascalCase (e.g., `StateBadge.tsx`)
- **Utilities:** camelCase (e.g., `map-utils.ts`)
- **Constants:** UPPER_SNAKE_CASE in code

### 2. React Patterns
- **Client Components:** Use `'use client'` directive at top of file
- **Server Components:** Default in Next.js App Router (no directive)
- **State Management:** React hooks (`useState`, `useEffect`, `useMemo`)
- **Async Operations:** `useEffect` with async functions inside
- **Error Handling:** Try-catch blocks with user-facing error messages

### 3. TypeScript Conventions
- **Strict Mode:** Enabled (no implicit any)
- **Path Alias:** `@/*` maps to project root
- **Type Imports:** Use `import type` for type-only imports when possible
- **Interfaces:** Prefer interfaces for object shapes
- **Enums:** Use string literal unions instead

### 4. Styling Conventions
- **Tailwind:** Primary styling method with utility classes
- **Colors:** Use Conseil-Toit palette (see Design System section)
- **Responsive:** Mobile-first approach
- **CSS Variables:** Defined in `globals.css`
- **Custom Classes:** Avoid unless absolutely necessary

### 5. Data Fetching Patterns
```typescript
// Standard pattern for data loading
useEffect(() => {
  const fetchData = async () => {
    try {
      const { data, error } = await supabase.from('table').select('*')
      if (error) throw error
      setData(data)
    } catch (error) {
      console.error('Error:', error)
      setError('User-friendly message')
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])
```

### 6. API Route Pattern
```typescript
// app/api/[route]/route.ts
export async function POST(request: Request) {
  try {
    // 1. Verify authentication
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return new Response('Unauthorized', { status: 401 })

    // 2. Verify authorization (if needed)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()
    if (profile?.role !== 'admin') {
      return new Response('Forbidden', { status: 403 })
    }

    // 3. Parse request body
    const body = await request.json()

    // 4. Perform operation with supabaseAdmin
    const { data, error } = await supabaseAdmin
      .from('table')
      .insert(body)

    // 5. Return response
    return Response.json({ data, error })
  } catch (error) {
    console.error('Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

### 7. Component Structure Pattern
```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseBrowser'

interface Props {
  // Define props
}

export default function ComponentName({ prop }: Props) {
  // 1. State declarations
  const [data, setData] = useState<Type[]>([])
  const [loading, setLoading] = useState(true)

  // 2. Memoized values
  const computed = useMemo(() => {
    return data.filter(...)
  }, [data])

  // 3. Effects
  useEffect(() => {
    // Load data
  }, [])

  // 4. Event handlers
  const handleAction = async () => {
    // Handle events
  }

  // 5. Conditional rendering (loading, error)
  if (loading) return <div>Chargement...</div>

  // 6. Main render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

---

## Design System

### Color Palette
```typescript
// Primary Brand Colors
const COLORS = {
  primary: '#1F4E79',        // Dark Blue (main brand)
  primaryLight: '#C7D6E6',   // Light Blue
  grayDark: '#2E2E2E',       // Dark Gray
  gray: '#7A7A7A',           // Medium Gray
  grayLight: '#F5F6F7',      // Light Gray
  white: '#FFFFFF',          // White
}

// Basin State Colors
const STATE_COLORS = {
  bon: '#28A745',            // Green (Good)
  a_surveiller: '#FFC107',   // Yellow (To Watch)
  planifier: '#FD7E14',      // Orange (To Plan)
  urgent: '#DC3545',         // Red (Urgent)
  non_evalue: '#6C757D',     // Gray (Not Evaluated)
}
```

### Basin States
The system uses five states for roof basins:
1. **Bon** (Good) - Green - No action needed
2. **À surveiller** (To Watch) - Yellow - Monitor regularly
3. **Planifier** (To Plan) - Orange - Schedule maintenance
4. **Urgent** - Red - Immediate action required
5. **Non évalué** (Not Evaluated) - Gray - Not yet assessed

**Priority Order:** Urgent > Planifier > À surveiller > Non évalué > Bon

### UI Components
- **StateBadge:** Visual indicator for basin states (`components/ui/StateBadge.tsx`)
- **Card:** Container component with consistent styling
- **Button:** Styled button with variants (primary, secondary)
- **Dialog:** Modal component for forms and confirmations
- **DataTable:** Reusable table with sorting and filtering

---

## API Endpoints Reference

All API routes are located in `app/api/` and require authentication unless otherwise noted.

### User Management Endpoints (`/api/admin/users/`)

#### POST `/api/admin/users/create`
Creates a new user with Supabase Auth invitation.

**Request Body:**
```typescript
{
  email: string          // User's email (required)
  fullName: string       // Full name (optional)
  role: 'admin' | 'client'  // Default: 'client'
  clientId?: string      // UUID of client (for client role)
}
```

**Response:**
```typescript
{
  ok: true,
  profile: {
    id: string,
    user_id: string,
    full_name: string,
    role: string,
    client_id: string | null,
    is_active: boolean
  }
}
```

**Error Responses:**
- 400: Missing email or validation error
- 500: Profile creation failed

**Implementation Notes:**
- Handles both new users and re-invitations
- For existing users, uses `generateLink()` instead of `inviteUserByEmail()`
- Automatically creates entry in `user_clients` if clientId provided
- Determines origin for redirectTo URL from request headers

#### POST `/api/admin/users/update`
Updates user profile, role, and access permissions.

**Request Body:**
```typescript
{
  profileId: string      // UUID of user_profile
  userId: string         // UUID of auth user
  fullName: string
  role: 'admin' | 'client'
  selectedClientIds: string[]     // Array of client UUIDs
  selectedBatimentIds: string[]   // Array of building UUIDs
}
```

#### POST `/api/admin/users/toggle-active`
Activates or deactivates a user account.

**Request Body:**
```typescript
{
  profileId: string
  isActive: boolean
}
```

#### POST `/api/admin/users/reset-password`
Initiates password reset flow for a user.

**Request Body:**
```typescript
{
  userId: string
}
```

**Authentication:** Requires Bearer token in Authorization header

#### POST `/api/admin/users/update-access`
Updates user's access to clients and buildings.

**Request Body:**
```typescript
{
  userId: string
  selectedClientIds: string[]
  selectedBatimentIds: string[]
}
```

**Response:**
```typescript
{
  ok: true,
  clientCount: number,
  batimentCount: number
}
```

---

## Map Integration

### GeoJSON Format
Basins are stored as GeoJSON Polygon objects in `polygon_geojson` field:
```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [longitude1, latitude1],
      [longitude2, latitude2],
      [longitude3, latitude3],
      [longitude1, latitude1]  // Must close the polygon
    ]
  ]
}
```

**Important:**
- Coordinates are in `[longitude, latitude]` order (NOT lat, lng)
- First and last coordinate must be identical to close the polygon
- Minimum 3 unique points required (4 coordinates including closing point)

### Map Utilities (`lib/utils/map-utils.ts`)
Key functions for working with maps:
- `geoJsonToLatLngPath()` - Convert GeoJSON to Google Maps path
- `calculatePolygonCenter()` - Find centroid for labels
- `calculatePolygonArea()` - Calculate area using Shoelace formula
- `isPointInPolygon()` - Ray casting for click detection
- `calculateBounds()` - Get bounding box for multiple polygons
- `simplifyPolygon()` - Douglas-Peucker simplification

### Map Constants (`lib/constants/map-colors.ts`)

**State Colors:**
```typescript
export const ETAT_COLORS = {
  bon: '#28A745',           // Green
  surveiller: '#FFC107',    // Yellow
  planifier: '#FD7E14',     // Orange
  urgent: '#DC3545',        // Red
  non_evalue: '#6C757D',    // Gray
}

export const ETAT_LABELS = {
  bon: 'Bon',
  surveiller: 'À surveiller',
  planifier: 'Réfection à planifier',
  urgent: 'Urgent',
  non_evalue: 'Non évalué',
}
```

**Polygon Configuration:**
```typescript
export const DEFAULT_POLYGON_CONFIG = {
  fillOpacity: 0.4,
  strokeOpacity: 1,
  strokeWeight: 2,
  clickable: true,
  editable: false,
  draggable: false,
}

export const POLYGON_OPACITY = {
  default: 0.4,
  hover: 0.6,      // Hover effect
  selected: 0.7,   // Selected state
  dimmed: 0.2,     // Non-selected when another is selected
}
```

**Map Options:**
```typescript
export const MAP_DEFAULT_OPTIONS = {
  mapTypeId: 'satellite',
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  mapTypeControl: true,
  rotateControl: false,
  tilt: 0,                  // Disable 3D buildings
  heading: 0,
  gestureHandling: 'greedy', // No Ctrl+scroll requirement
}

export const MAP_ZOOM_LEVELS = {
  building: 18,    // Single building view
  bassin: 19,      // Single basin detail
  overview: 15,    // Multiple buildings
  city: 12,        // City-wide view
}
```

### Google Maps Configuration
```typescript
const mapOptions = {
  mapTypeId: 'satellite',
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  tilt: 0,  // Disable 3D buildings for flat roofs
  styles: [/* Custom styles */]
}
```

---

## TypeScript Types & Interfaces

### Common Database Types

```typescript
// User Profile
interface UserProfile {
  id: string
  user_id: string
  full_name: string | null
  role: 'admin' | 'client'
  client_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Client
interface Client {
  id: string
  name: string
  created_at: string
  updated_at: string
}

// Building (Batiment)
interface Batiment {
  id: string
  client_id: string
  name: string
  address: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// Basin (Bassin)
interface Bassin {
  id: string
  batiment_id: string
  name: string
  surface_m2: number | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
  polygon_geojson: GeoJSONPolygon | null
  created_at: string
  updated_at: string
}

// Configuration List Item
interface ListeChoix {
  id: string
  categorie: string
  code: string
  label: string
  couleur: string | null
  ordre: number
  actif: boolean
}

// GeoJSON Types
interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]  // [[[lng, lat], [lng, lat], ...]]
}

interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number]  // [lng, lat]
}
```

### Component Props Types

```typescript
// Map component props
interface BatimentBassinsMapProps {
  batimentId: string
  bassins: Bassin[]
  selectedBassinId?: string | null
  onBassinClick?: (bassinId: string) => void
  hoveredBassinId?: string | null
}

// Badge component props
interface StateBadgeProps {
  code: string      // État code (bon, surveiller, planifier, urgent, non_evalue)
  label?: string    // Optional custom label
  size?: 'sm' | 'md' | 'lg'
}

// Modal component props
interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clients: Client[]
}
```

### API Response Types

```typescript
// Standard success response
interface ApiSuccessResponse<T = any> {
  ok: true
  data?: T
  profile?: UserProfile
  clientCount?: number
  batimentCount?: number
}

// Standard error response
interface ApiErrorResponse {
  error: string
  details?: any
}

// Type guard for error responses
function isErrorResponse(response: any): response is ApiErrorResponse {
  return 'error' in response
}
```

---

## Common Development Tasks

### Adding a New Feature

1. **Plan the changes:**
   - Identify affected files (pages, components, API routes)
   - Determine database changes if needed
   - Check authorization requirements
   - Define TypeScript interfaces for new data structures

2. **Make changes systematically:**
   - Start with database/types if schema changes
   - Define TypeScript interfaces for new entities
   - Update API routes if new endpoints needed
   - Build UI components with proper typing
   - Update layouts/pages
   - Test thoroughly (admin and client roles)

3. **Follow conventions:**
   - Use existing patterns from similar features
   - Maintain consistent error handling
   - Add loading states
   - Include proper TypeScript types
   - Keep UI text in French

### Modifying the Database

1. **DO NOT create migrations directly in code**
2. Changes should be made through Supabase Dashboard or SQL
3. Update TypeScript interfaces to match schema
4. Test queries in Supabase SQL editor first
5. Consider Row Level Security (RLS) policies

### Adding a New Page

1. Create `page.tsx` in appropriate directory under `app/`
2. Determine if it needs admin or client protection
3. Use appropriate layout (admin or client)
4. Follow existing page patterns for data fetching
5. Add navigation link to layout sidebar if needed

Example:
```typescript
// app/admin/nouvelle-page/page.tsx
'use client'

export default function NouvellePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Nouvelle Page
      </h1>
      {/* Content */}
    </div>
  )
}
```

### Adding an API Endpoint

1. Create route handler in `app/api/[path]/route.ts`
2. Implement authentication check
3. Verify authorization (role check if needed)
4. Use `supabaseAdmin` for database operations
5. Return proper error codes (401, 403, 500)
6. Log errors for debugging

### Working with Forms

1. Use controlled components with `useState`
2. Add validation before submission
3. Show loading state during async operations
4. Display error messages clearly
5. Reset form on successful submission
6. Use modals for create/edit operations

Example:
```typescript
const [formData, setFormData] = useState({ name: '', email: '' })
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    if (!response.ok) throw new Error('Failed')

    // Success handling
  } catch (err) {
    setError('Une erreur est survenue')
  } finally {
    setLoading(false)
  }
}
```

---

## Testing Guidelines

### Manual Testing Checklist
When making changes, test:
1. **Authentication:** Login/logout flow
2. **Authorization:** Role-based access restrictions
3. **Data Loading:** Loading states and error states
4. **Forms:** Validation, submission, error handling
5. **Responsive:** Mobile and desktop layouts
6. **Browser Console:** No errors or warnings

### Testing User Roles
- **Admin testing:** Create/edit/delete operations
- **Client testing:** Read-only access, no admin features visible
- **Unauthorized:** Redirect to login when not authenticated

### Database Testing
- Test with empty states (no data)
- Test with large datasets (performance)
- Verify foreign key constraints
- Check cascade deletes if applicable

---

## Git Workflow

### Branch Naming
- Feature branches: `claude/feature-name-{sessionId}`
- Always develop on the designated branch
- NEVER push to main/master without permission

### Commit Messages
- Use clear, descriptive messages in English or French
- Format: `Action: description`
- Examples:
  - `Add: User profile editing feature`
  - `Fix: Basin map polygon rendering`
  - `Update: Dashboard KPI calculations`
  - `Refactor: Extract user access logic`

### Making Commits
```bash
# Stage changes
git add <files>

# Commit with descriptive message
git commit -m "Add: basin surface area calculation"

# Push to feature branch
git push -u origin claude/feature-name-{sessionId}
```

### Pull Requests
- Title: Clear description of changes
- Body: Summary of changes and testing done
- Link related issues if applicable
- Request review from team

---

## Important Files Reference

### Critical Configuration Files
- `lib/supabaseBrowser.ts` - Client-side Supabase instance
- `lib/supabaseAdmin.ts` - Server-side admin instance
- `app/admin/layout.tsx` - Admin layout with navigation
- `app/client/layout.tsx` - Client layout with navigation
- `components/ui/StateBadge.tsx` - Basin state visualization

### Large Files (Handle Carefully)
- `app/admin/utilisateurs/page.tsx` (1236 lines) - User management
- `app/admin/listes/page.tsx` (859 lines) - Configuration lists
- Consider refactoring if making significant changes

### Environment Variables
Required environment variables (typically in `.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=xxx
```

---

## Common Pitfalls & Solutions

### 1. Supabase Client Confusion
**Problem:** Using wrong Supabase client for context
**Solution:**
- Use `supabaseBrowser` in client components
- Use `supabaseAdmin` in API routes and server components
- Never use service role key in browser code

### 2. Authorization Bypass
**Problem:** Forgetting to check user role in API routes
**Solution:** Always verify session AND role in protected endpoints

### 3. State Management Issues
**Problem:** Stale data after mutations
**Solution:** Refetch data after create/update/delete operations

### 4. GeoJSON Format Errors
**Problem:** Invalid polygon coordinates
**Solution:**
- Ensure first and last coordinate are identical (closed polygon)
- Use [longitude, latitude] order (not lat, lng)
- Validate with `map-utils.ts` functions

### 5. TypeScript Errors
**Problem:** Type mismatches with Supabase data
**Solution:**
- Use explicit typing: `const { data } = await supabase.from('table').select<Type>('*')`
- Check for null/undefined before accessing properties

### 6. Loading States
**Problem:** UI flickers or shows errors before data loads
**Solution:** Always show loading state while fetching data

### 7. French vs English
**Problem:** Mixing languages inconsistently
**Solution:**
- Code (variables, functions): English
- UI text: French
- Database fields: French naming acceptable
- Comments: Either language, but be consistent

### 8. API Origin Detection
**Problem:** redirectTo URL doesn't work in different environments
**Solution:**
- Use `getOrigin()` helper to detect origin from request headers
- Check in order: origin header, x-forwarded-proto + host, env variable, localhost fallback
- Example implementation in `/api/admin/users/create/route.ts`

### 9. Duplicate Key Errors
**Problem:** Inserting into junction tables (user_clients, user_batiments_access) fails on re-invite
**Solution:**
- Check error message for 'duplicate' keyword
- Ignore duplicate key errors for junction table inserts
- Use upsert with onConflict when appropriate

### 10. Environment Variables Missing
**Problem:** Supabase clients fail to initialize
**Solution:**
- Ensure all required env vars are set in `.env.local`
- Use non-null assertions (!) only after validation
- Add helpful error messages in supabaseAdmin.ts for missing vars

---

## Supabase Best Practices

### Query Optimization

**Select Specific Columns:**
```typescript
// ❌ Avoid - fetches all columns
const { data } = await supabase.from('batiments').select('*')

// ✅ Better - only fetch what you need
const { data } = await supabase
  .from('batiments')
  .select('id, name, address, city, client_id')
```

**Use Joins Instead of Multiple Queries:**
```typescript
// ❌ Avoid - multiple round trips
const { data: batiments } = await supabase.from('batiments').select('*')
const { data: clients } = await supabase.from('clients').select('*')

// ✅ Better - single query with join
const { data } = await supabase
  .from('batiments')
  .select(`
    *,
    clients:client_id (
      id,
      name
    )
  `)
```

**Filter on Database Side:**
```typescript
// ❌ Avoid - filtering in JavaScript
const { data } = await supabase.from('bassins').select('*')
const urgent = data?.filter(b => b.etat_id === 'urgent-uuid')

// ✅ Better - filter in database
const { data: urgent } = await supabase
  .from('bassins')
  .select('*')
  .eq('etat_id', 'urgent-uuid')
```

### Error Handling Pattern

```typescript
const fetchData = async () => {
  try {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('table')
      .select('*')

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Aucune donnée retournée')
    }

    setData(data)
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Une erreur est survenue'
    setError(message)
    console.error('Error fetching data:', err)
  } finally {
    setLoading(false)
  }
}
```

### Using Promise.all for Parallel Queries

```typescript
// ✅ Fetch multiple independent resources in parallel
const fetchDashboardData = async () => {
  setLoading(true)

  try {
    const [clientsRes, batimentsRes, bassinsRes, listesRes] = await Promise.all([
      supabase.from('clients').select('id, name'),
      supabase.from('batiments').select('id, name, client_id'),
      supabase.from('bassins').select('id, name, surface_m2, etat_id'),
      supabase.from('listes_choix').select('*').eq('categorie', 'etat'),
    ])

    // Check each result for errors
    if (clientsRes.error) throw clientsRes.error
    if (batimentsRes.error) throw batimentsRes.error
    if (bassinsRes.error) throw bassinsRes.error
    if (listesRes.error) throw listesRes.error

    setClients(clientsRes.data)
    setBatiments(batimentsRes.data)
    setBassins(bassinsRes.data)
    setListesChoix(listesRes.data)
  } catch (error) {
    console.error('Error loading dashboard:', error)
    setError('Erreur lors du chargement des données')
  } finally {
    setLoading(false)
  }
}
```

### Real-time Subscriptions (If Needed)

```typescript
useEffect(() => {
  // Subscribe to changes
  const channel = supabase
    .channel('bassins-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bassins',
      },
      (payload) => {
        console.log('Change received!', payload)
        // Refetch data or update state
        fetchBassins()
      }
    )
    .subscribe()

  // Cleanup subscription
  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

---

## Modal & Form Patterns

### Standard Modal Pattern

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface CreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateModal({ isOpen, onClose, onSuccess }: CreateModalProps) {
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Erreur lors de la création')
      }

      // Success
      setFormData({ name: '', description: '' })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouvel élément</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### Using the Modal

```typescript
'use client'

import { useState } from 'react'
import CreateModal from './CreateModal'

export default function MyPage() {
  const [modalOpen, setModalOpen] = useState(false)

  const handleSuccess = () => {
    // Refetch data
    fetchData()
    // Show success toast (if you have a toast system)
  }

  return (
    <div>
      <button onClick={() => setModalOpen(true)}>
        Créer
      </button>

      <CreateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
```

---

## Performance Considerations

### Data Fetching
- Use `select()` to limit columns (avoid `select('*')` when not needed)
- Filter data on database side with `.eq()`, `.in()`, etc.
- Use joins instead of multiple queries
- Add pagination for large lists with `.range()`
- Consider caching with React Query or SWR for production
- Use Promise.all for parallel independent queries

### Map Rendering
- Simplify complex polygons with `simplifyPolygon()`
- Limit number of polygons rendered simultaneously
- Use memoization for calculated values (centers, areas)
- Debounce map interactions (pan, zoom)
- Load maps lazily with dynamic imports

### Component Optimization
- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers passed as props
- Consider React.memo for pure components
- Avoid inline object/array creation in render
- Use key prop correctly for list rendering

---

## Resources & Documentation

### Next.js
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Supabase
- [Supabase Documentation](https://supabase.com/docs)
- [Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

### Google Maps
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
- [Google Maps Documentation](https://developers.google.com/maps/documentation)

### Tailwind CSS
- [Tailwind Documentation](https://tailwindcss.com/docs)
- [Tailwind v4 Changes](https://tailwindcss.com/docs/v4-beta)

---

## AI Assistant Guidelines

### When Working on This Project:

1. **Read Before Modifying:** Always read files before making changes
2. **Follow Patterns:** Match existing code style and patterns
3. **Verify Types:** Ensure TypeScript types are correct
4. **Test Thoroughly:** Check both admin and client views
5. **Consider Security:** Never expose sensitive data to client
6. **Maintain Conventions:** Follow naming and organization standards
7. **Ask When Uncertain:** Better to clarify than make wrong assumptions
8. **Document Changes:** Add comments for complex logic
9. **Respect Boundaries:** Don't modify files outside the task scope
10. **French UI Text:** Maintain French language for user-facing text

### Code Quality Standards:
- No `any` types (use proper TypeScript types)
- No console.logs in production code (use proper error handling)
- No hardcoded values (use constants or config)
- No unused imports or variables
- Proper error messages in French for users
- Loading states for all async operations
- Responsive design (test mobile view)

### Before Committing:
- [ ] Code compiles without errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] Tested in browser (both admin and client if applicable)
- [ ] Follows existing patterns
- [ ] No sensitive data exposed
- [ ] UI text in French
- [ ] Responsive design works

---

## Quick Reference Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm start            # Run production server
npm run lint         # Run ESLint

# Git
git status           # Check current status
git add .            # Stage all changes
git commit -m "msg"  # Commit with message
git push -u origin branch-name  # Push to branch

# Common paths
app/admin/           # Admin portal pages
app/client/          # Client portal pages
components/          # Reusable components
lib/                 # Utilities and helpers
```

---

## Version Information

- **Last Updated:** 2026-01-13 (Enhanced with detailed API docs, TypeScript types, and best practices)
- **Project Version:** 0.1.0
- **Next.js:** 16.1.1
- **React:** 19.2.0
- **TypeScript:** 5
- **Tailwind CSS:** 4

## Changelog

### 2026-01-13 - Enhanced Documentation
- ✅ Added comprehensive API endpoints documentation with request/response examples
- ✅ Added detailed TypeScript types and interfaces for all major entities
- ✅ Added Supabase best practices section with query optimization
- ✅ Added modal and form patterns with complete examples
- ✅ Enhanced map constants documentation with all configuration options
- ✅ Added user invitation flow details (new users and re-invitations)
- ✅ Added 10 common pitfalls and solutions
- ✅ Added real-time subscription examples
- ✅ Added Promise.all patterns for parallel queries
- ✅ Added performance considerations for data fetching and maps

---

## Contact & Support

For questions about this codebase:
1. Review this documentation first
2. Check existing code for similar implementations
3. Review Supabase dashboard for database schema
4. Check browser console for client-side errors
5. Check server logs for API errors

**Remember:** This is a production application managing real building data. Always prioritize data integrity and security.
