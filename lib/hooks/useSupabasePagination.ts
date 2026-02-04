'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabaseBrowser';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PaginationFilters {
  [key: string]: any;
}

export interface PaginationSort {
  column: string;
  ascending?: boolean;
}

export interface UseSupabasePaginationOptions<T = any> {
  /** Nom de la table Supabase */
  table: string;
  /** Colonnes à sélectionner (défaut: '*') */
  select?: string;
  /** Filtres à appliquer */
  filters?: PaginationFilters;
  /** Ordre de tri */
  orderBy?: PaginationSort;
  /** Nombre d'éléments par page */
  itemsPerPage?: number;
  /** Fonction de transformation des données */
  transform?: (data: any) => T;
  /** Fonction personnalisée pour modifier la query avant exécution */
  queryModifier?: (query: any) => any;
}

export interface UseSupabasePaginationResult<T = any> {
  /** Données de la page actuelle */
  data: T[];
  /** Indique si les données sont en cours de chargement */
  loading: boolean;
  /** Message d'erreur s'il y en a une */
  error: string | null;
  /** Page actuelle (1-indexed) */
  currentPage: number;
  /** Nombre total de pages */
  totalPages: number;
  /** Nombre total d'éléments */
  totalItems: number;
  /** Nombre d'éléments par page */
  itemsPerPage: number;
  /** Index du premier élément de la page (1-indexed) */
  startIndex: number;
  /** Index du dernier élément de la page */
  endIndex: number;
  /** Indique s'il y a plusieurs pages */
  hasMultiplePages: boolean;
  /** Aller à une page spécifique */
  goToPage: (page: number) => void;
  /** Aller à la page suivante */
  nextPage: () => void;
  /** Aller à la page précédente */
  previousPage: () => void;
  /** Réinitialiser à la page 1 */
  resetPage: () => void;
  /** Recharger les données */
  refresh: () => Promise<void>;
  /** Mettre à jour les filtres et recharger */
  setFilters: (filters: PaginationFilters) => void;
  /** Mettre à jour l'ordre et recharger */
  setOrderBy: (orderBy: PaginationSort) => void;
}

/**
 * Hook pour gérer la pagination côté serveur avec Supabase et chargement automatique des données
 *
 * @param options Options de configuration
 * @returns Objet contenant les données paginées et les contrôles de pagination
 *
 * @example
 * ```tsx
 * // Exemple basique
 * const {
 *   data: clients,
 *   loading,
 *   error,
 *   currentPage,
 *   totalPages,
 *   goToPage
 * } = useSupabasePagination({
 *   table: 'clients',
 *   select: 'id, name',
 *   orderBy: { column: 'name', ascending: true },
 *   itemsPerPage: 20
 * })
 *
 * // Avec filtres et transformation
 * const {
 *   data: batiments,
 *   setFilters
 * } = useSupabasePagination({
 *   table: 'batiments',
 *   select: 'id, name, client:clients(name)',
 *   filters: { client_id: 'xxx' },
 *   orderBy: { column: 'created_at', ascending: false },
 *   transform: (row) => ({
 *     id: row.id,
 *     name: row.name,
 *     clientName: row.client?.name || 'Sans client'
 *   })
 * })
 *
 * // Utilisation dans le JSX
 * if (loading) return <LoadingState />
 * if (error) return <ErrorState message={error} />
 *
 * return (
 *   <>
 *     <ul>
 *       {clients.map(client => <li key={client.id}>{client.name}</li>)}
 *     </ul>
 *     <Pagination
 *       currentPage={currentPage}
 *       totalPages={totalPages}
 *       onPageChange={goToPage}
 *     />
 *   </>
 * )
 * ```
 */
export function useSupabasePagination<T = any>(
  options: UseSupabasePaginationOptions<T>
): UseSupabasePaginationResult<T> {
  const {
    table,
    select = '*',
    filters: initialFilters = {},
    orderBy: initialOrderBy,
    itemsPerPage = 20,
    transform,
    queryModifier,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<PaginationFilters>(initialFilters);
  const [orderBy, setOrderBy] = useState<PaginationSort | undefined>(initialOrderBy);

  // Calculs dérivés
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);
  const hasMultiplePages = totalPages > 1;

  // Fonction de chargement des données
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();

      // Calculer les offsets pour la pagination
      const startOffset = (currentPage - 1) * itemsPerPage;
      const endOffset = startOffset + itemsPerPage - 1;

      // Construire la query de base
      let query = supabase
        .from(table)
        .select(select, { count: 'exact' })
        .range(startOffset, endOffset);

      // Appliquer les filtres
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query = query.eq(key, value);
        }
      });

      // Appliquer l'ordre
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      // Modifier la query si une fonction est fournie
      if (queryModifier) {
        query = queryModifier(query);
      }

      // Exécuter la query
      const { data: fetchedData, error: fetchError, count } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Transformer les données si nécessaire
      const transformedData = transform && fetchedData
        ? fetchedData.map(transform)
        : (fetchedData as T[]);

      setData(transformedData || []);
      setTotalItems(count || 0);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
      setData([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [table, select, filters, orderBy, itemsPerPage, transform, queryModifier, currentPage]);

  // Charger les données au montage et quand les dépendances changent
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Actions de navigation
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Actions de mise à jour
  const handleSetFilters = useCallback((newFilters: PaginationFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset à la page 1 quand on change les filtres
  }, []);

  const handleSetOrderBy = useCallback((newOrderBy: PaginationSort) => {
    setOrderBy(newOrderBy);
    setCurrentPage(1); // Reset à la page 1 quand on change l'ordre
  }, []);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    startIndex,
    endIndex,
    hasMultiplePages,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    refresh,
    setFilters: handleSetFilters,
    setOrderBy: handleSetOrderBy,
  };
}
