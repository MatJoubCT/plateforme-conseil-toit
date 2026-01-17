'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Creates a new Supabase browser client instance
 * Use this in client components for optimal session management
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}
