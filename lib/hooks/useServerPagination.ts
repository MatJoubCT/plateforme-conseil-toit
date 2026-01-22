import { useState, useMemo } from 'react'

/**
 * Hook pour gérer la pagination côté serveur
 * Encapsule toute la logique de pagination pour éviter la duplication
 *
 * @param itemsPerPage - Nombre d'éléments par page (défaut: 20)
 * @returns Objet contenant l'état et les helpers de pagination
 *
 * @example
 * const pagination = useServerPagination(20)
 *
 * // Dans le fetch:
 * query = query.range(pagination.startOffset, pagination.endOffset)
 *
 * // Après le fetch:
 * pagination.setTotalCount(count || 0)
 *
 * // Pour réinitialiser la page:
 * pagination.resetPage()
 *
 * // Dans le JSX:
 * <Pagination {...pagination.paginationProps} />
 */
export function useServerPagination(itemsPerPage: number = 20) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Calculs dérivés
  const totalPages = useMemo(
    () => Math.ceil(totalCount / itemsPerPage),
    [totalCount, itemsPerPage]
  )

  const startOffset = useMemo(
    () => (currentPage - 1) * itemsPerPage,
    [currentPage, itemsPerPage]
  )

  const endOffset = useMemo(
    () => startOffset + itemsPerPage - 1,
    [startOffset, itemsPerPage]
  )

  const startIndex = useMemo(
    () => (currentPage - 1) * itemsPerPage + 1,
    [currentPage, itemsPerPage]
  )

  const endIndex = useMemo(
    () => Math.min(currentPage * itemsPerPage, totalCount),
    [currentPage, itemsPerPage, totalCount]
  )

  const hasMultiplePages = totalPages > 1

  // Actions
  const resetPage = () => setCurrentPage(1)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Props pour le composant Pagination
  const paginationProps = {
    currentPage,
    totalPages,
    onPageChange: setCurrentPage
  }

  return {
    // État
    currentPage,
    totalCount,
    totalPages,
    hasMultiplePages,

    // Pour Supabase .range()
    startOffset,
    endOffset,

    // Pour affichage "X à Y sur Z"
    startIndex,
    endIndex,

    // Actions
    setCurrentPage,
    setTotalCount,
    resetPage,
    goToPage,

    // Props pour composant Pagination
    paginationProps,

    // Constante
    itemsPerPage
  }
}
