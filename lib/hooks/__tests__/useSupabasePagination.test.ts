import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSupabasePagination } from '../useSupabasePagination';

// Mock Supabase client
const mockSelect = vi.fn();
const mockRange = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabaseBrowser', () => ({
  createBrowserClient: () => ({
    from: mockFrom,
  }),
}));

describe('useSupabasePagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Configuration par défaut de la chaîne de méthodes
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ range: mockRange });
    mockRange.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });
    mockOrder.mockReturnValue({ eq: mockEq, order: mockOrder });
  });

  it('devrait initialiser avec l\'état de chargement', () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
      })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.currentPage).toBe(1);
  });

  it('devrait charger les données avec succès', async () => {
    const mockData = [
      { id: '1', name: 'Client 1' },
      { id: '2', name: 'Client 2' },
    ];

    mockOrder.mockResolvedValue({
      data: mockData,
      error: null,
      count: 2,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
        select: 'id, name',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('devrait gérer les erreurs', async () => {
    const errorMessage = 'Database error';
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: errorMessage },
      count: null,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toEqual([]);
  });

  it('devrait appliquer la pagination correctement', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 50,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
        itemsPerPage: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPages).toBe(5);
    expect(result.current.startIndex).toBe(1);
    expect(result.current.endIndex).toBe(10);

    // Vérifier que range() a été appelé avec les bons paramètres
    expect(mockRange).toHaveBeenCalledWith(0, 9);
  });

  it('devrait naviguer entre les pages', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 50,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
        itemsPerPage: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Aller à la page 2
    result.current.goToPage(2);

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2);
    });

    // Vérifier les indices
    expect(result.current.startIndex).toBe(11);
    expect(result.current.endIndex).toBe(20);
  });

  it('devrait appliquer les filtres', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    });

    const filters = { client_id: 'xxx', is_active: true };

    renderHook(() =>
      useSupabasePagination({
        table: 'batiments',
        filters,
      })
    );

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalledWith('client_id', 'xxx');
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });
  });

  it('devrait appliquer l\'ordre de tri', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    });

    renderHook(() =>
      useSupabasePagination({
        table: 'clients',
        orderBy: { column: 'name', ascending: false },
      })
    );

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('name', { ascending: false });
    });
  });

  it('devrait transformer les données', async () => {
    const mockData = [{ id: '1', name: 'Client 1' }];

    mockOrder.mockResolvedValue({
      data: mockData,
      error: null,
      count: 1,
    });

    const transform = (row: any) => ({
      ...row,
      displayName: row.name.toUpperCase(),
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
        transform,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([
      { id: '1', name: 'Client 1', displayName: 'CLIENT 1' },
    ]);
  });

  it('devrait calculer hasMultiplePages correctement', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 25,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
        itemsPerPage: 20,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMultiplePages).toBe(true);
    expect(result.current.totalPages).toBe(2);
  });

  it('devrait réinitialiser à la page 1 avec resetPage', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 50,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
        itemsPerPage: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Aller à la page 3
    result.current.goToPage(3);

    await waitFor(() => {
      expect(result.current.currentPage).toBe(3);
    });

    // Réinitialiser
    result.current.resetPage();

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
    });
  });

  it('devrait mettre à jour les filtres et retourner à la page 1', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 50,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'batiments',
        filters: {},
        itemsPerPage: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Aller à la page 2
    result.current.goToPage(2);

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2);
    });

    // Mettre à jour les filtres
    result.current.setFilters({ client_id: 'new-id' });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1); // Doit retourner à la page 1
    });
  });

  it('ne devrait pas permettre de naviguer au-delà des limites', async () => {
    mockOrder.mockResolvedValue({
      data: [],
      error: null,
      count: 30,
    });

    const { result } = renderHook(() =>
      useSupabasePagination({
        table: 'clients',
        itemsPerPage: 10,
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPages).toBe(3);

    // Essayer d'aller à la page 0
    result.current.goToPage(0);
    expect(result.current.currentPage).toBe(1); // Doit rester à 1

    // Essayer d'aller à la page 5 (au-delà du maximum)
    result.current.goToPage(5);
    expect(result.current.currentPage).toBe(1); // Doit rester à 1
  });
});
