'use client'

import { createBrowserClient as createClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Creates a new Supabase browser client instance with automatic cookie management
 * Use this in client components for optimal session management with Next.js SSR
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Export a singleton instance for convenience
export const supabaseBrowser = createBrowserClient()
