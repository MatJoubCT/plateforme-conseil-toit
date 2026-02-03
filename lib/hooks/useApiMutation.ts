'use client';

import { useState } from 'react';
import { getSessionToken } from './useSessionToken';
import { getCsrfTokenFromCookies } from '@/lib/csrf';

export type ApiMutationMethod = 'POST' | 'PUT' | 'DELETE';

export interface ApiMutationOptions {
  /** Méthode HTTP (POST, PUT, DELETE) */
  method: ApiMutationMethod;
  /** Endpoint de l'API (ex: '/api/admin/clients/create') */
  endpoint: string;
  /** Message d'erreur par défaut si l'API ne retourne pas de message */
  defaultErrorMessage?: string;
  /** Callback appelé en cas de succès */
  onSuccess?: (data: any) => void | Promise<void>;
  /** Callback appelé en cas d'erreur */
  onError?: (error: string) => void | Promise<void>;
}

export interface ApiMutationResult<TData = any> {
  /** Fonction pour exécuter la mutation */
  mutate: (data: any) => Promise<{ success: boolean; data?: TData; error?: string }>;
  /** Indique si la mutation est en cours */
  isLoading: boolean;
  /** Message d'erreur si la mutation a échoué */
  error: string | null;
  /** Réinitialise l'état d'erreur */
  resetError: () => void;
}

/**
 * Hook pour gérer les mutations API (create, update, delete) avec gestion d'état standardisée
 *
 * @param options Options de configuration de la mutation
 * @returns Objet contenant la fonction mutate, l'état de chargement et les erreurs
 *
 * @example
 * ```tsx
 * // Exemple d'utilisation pour créer un client
 * const CreateClientModal = ({ onSuccess }: { onSuccess: () => void }) => {
 *   const { mutate, isLoading, error } = useApiMutation({
 *     method: 'POST',
 *     endpoint: '/api/admin/clients/create',
 *     defaultErrorMessage: 'Erreur lors de la création du client',
 *     onSuccess: async (data) => {
 *       console.log('Client créé:', data);
 *       onSuccess();
 *     }
 *   });
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     const formData = new FormData(e.currentTarget);
 *     const clientData = {
 *       name: formData.get('name') as string,
 *     };
 *
 *     await mutate(clientData);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <div className="text-red-500">{error}</div>}
 *       <input name="name" required />
 *       <button type="submit" disabled={isLoading}>
 *         {isLoading ? 'Création...' : 'Créer'}
 *       </button>
 *     </form>
 *   );
 * };
 * ```
 *
 * @example
 * ```tsx
 * // Exemple d'utilisation pour supprimer un élément
 * const DeleteButton = ({ id, onDeleted }: { id: string; onDeleted: () => void }) => {
 *   const { mutate, isLoading } = useApiMutation({
 *     method: 'DELETE',
 *     endpoint: '/api/admin/clients/delete',
 *     onSuccess: onDeleted
 *   });
 *
 *   const handleDelete = () => mutate({ id });
 *
 *   return (
 *     <button onClick={handleDelete} disabled={isLoading}>
 *       {isLoading ? 'Suppression...' : 'Supprimer'}
 *     </button>
 *   );
 * };
 * ```
 */
export function useApiMutation<TData = any>(
  options: ApiMutationOptions
): ApiMutationResult<TData> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (
    data: any
  ): Promise<{ success: boolean; data?: TData; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Récupérer le token de session
      const token = await getSessionToken();

      if (!token) {
        const errorMsg = 'Session expirée. Veuillez vous reconnecter.';
        setError(errorMsg);
        if (options.onError) {
          await options.onError(errorMsg);
        }
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      // Récupérer le token CSRF
      const csrfToken = getCsrfTokenFromCookies();

      if (!csrfToken) {
        const errorMsg = 'Token CSRF manquant. Veuillez rafraîchir la page.';
        setError(errorMsg);
        if (options.onError) {
          await options.onError(errorMsg);
        }
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      // Faire l'appel API
      const response = await fetch(options.endpoint, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMsg =
          responseData.error || options.defaultErrorMessage || 'Une erreur est survenue';
        setError(errorMsg);
        if (options.onError) {
          await options.onError(errorMsg);
        }
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      // Succès
      if (options.onSuccess) {
        await options.onSuccess(responseData.data || responseData);
      }

      setIsLoading(false);
      return { success: true, data: responseData.data || responseData };
    } catch (err: any) {
      const errorMsg = err.message || options.defaultErrorMessage || 'Erreur inattendue';
      setError(errorMsg);
      if (options.onError) {
        await options.onError(errorMsg);
      }
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const resetError = () => setError(null);

  return {
    mutate,
    isLoading,
    error,
    resetError,
  };
}
