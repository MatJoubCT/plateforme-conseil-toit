'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabaseBrowser';

/**
 * Hook pour récupérer le token de session actuel
 *
 * @returns {string | null} Le token d'accès ou null si pas de session
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const token = useSessionToken();
 *
 *   const handleApiCall = async () => {
 *     if (!token) {
 *       console.error('Pas de session');
 *       return;
 *     }
 *
 *     const response = await fetch('/api/endpoint', {
 *       headers: {
 *         'Authorization': `Bearer ${token}`
 *       }
 *     });
 *   };
 * };
 * ```
 */
export function useSessionToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    // Récupérer le token initial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token || null);
    });

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return token;
}

/**
 * Fonction utilitaire pour récupérer le token de session de manière synchrone
 * Utile pour les composants qui n'ont pas besoin de réactivité
 *
 * @returns {Promise<string | null>} Le token d'accès ou null
 *
 * @example
 * ```tsx
 * const handleSubmit = async () => {
 *   const token = await getSessionToken();
 *   if (!token) return;
 *
 *   await fetch('/api/endpoint', {
 *     headers: { 'Authorization': `Bearer ${token}` }
 *   });
 * };
 * ```
 */
export async function getSessionToken(): Promise<string | null> {
  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}
