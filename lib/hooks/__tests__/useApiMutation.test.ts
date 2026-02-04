import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useApiMutation } from '../useApiMutation';

// Mock getSessionToken
const mockGetSessionToken = vi.fn();

vi.mock('../useSessionToken', () => ({
  getSessionToken: () => mockGetSessionToken(),
}));

// Mock fetch
global.fetch = vi.fn();

describe('useApiMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Initialiser CSRF token
    document.cookie = 'csrf-token=test-csrf-token-123; path=/';
  });

  it('devrait initialiser avec l\'état correct', () => {
    const { result } = renderHook(() =>
      useApiMutation({
        method: 'POST',
        endpoint: '/api/test',
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.resetError).toBe('function');
  });

  it('devrait gérer une mutation réussie', async () => {
    const mockToken = 'test-token';
    const mockResponseData = { id: '123', name: 'Test' };

    mockGetSessionToken.mockResolvedValue(mockToken);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockResponseData }),
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useApiMutation({
        method: 'POST',
        endpoint: '/api/admin/clients/create',
        onSuccess,
      })
    );

    const mutationResult = await result.current.mutate({ name: 'Test' });

    expect(mutationResult.success).toBe(true);
    expect(mutationResult.data).toEqual(mockResponseData);
    expect(onSuccess).toHaveBeenCalledWith(mockResponseData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('devrait gérer une erreur de session expirée', async () => {
    mockGetSessionToken.mockResolvedValue(null);

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useApiMutation({
        method: 'POST',
        endpoint: '/api/test',
        onError,
      })
    );

    const mutationResult = await result.current.mutate({ test: 'data' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mutationResult.success).toBe(false);
    expect(mutationResult.error).toBe('Session expirée. Veuillez vous reconnecter.');
    expect(onError).toHaveBeenCalledWith('Session expirée. Veuillez vous reconnecter.');
  });

  it('devrait gérer une erreur de l\'API', async () => {
    const mockToken = 'test-token';
    const errorMessage = 'Erreur de validation';

    mockGetSessionToken.mockResolvedValue(mockToken);
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: errorMessage }),
    });

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useApiMutation({
        method: 'POST',
        endpoint: '/api/test',
        defaultErrorMessage: 'Erreur par défaut',
        onError,
      })
    );

    const mutationResult = await result.current.mutate({ test: 'data' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mutationResult.success).toBe(false);
    expect(mutationResult.error).toBe(errorMessage);
    expect(onError).toHaveBeenCalledWith(errorMessage);
  });

  it('devrait utiliser le message d\'erreur par défaut si l\'API ne retourne pas de message', async () => {
    const mockToken = 'test-token';
    const defaultErrorMessage = 'Erreur par défaut';

    mockGetSessionToken.mockResolvedValue(mockToken);
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { result } = renderHook(() =>
      useApiMutation({
        method: 'DELETE',
        endpoint: '/api/test',
        defaultErrorMessage,
      })
    );

    const mutationResult = await result.current.mutate({ id: '123' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mutationResult.error).toBe(defaultErrorMessage);
  });

  it('devrait gérer une exception réseau', async () => {
    const mockToken = 'test-token';
    const networkError = new Error('Network error');

    mockGetSessionToken.mockResolvedValue(mockToken);
    (global.fetch as any).mockRejectedValue(networkError);

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useApiMutation({
        method: 'POST',
        endpoint: '/api/test',
        onError,
      })
    );

    const mutationResult = await result.current.mutate({ test: 'data' });

    expect(mutationResult.success).toBe(false);
    expect(mutationResult.error).toBe('Network error');
    expect(onError).toHaveBeenCalledWith('Network error');
  });

  it('devrait réinitialiser l\'erreur avec resetError', async () => {
    mockGetSessionToken.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useApiMutation({
        method: 'POST',
        endpoint: '/api/test',
      })
    );

    // Déclencher une erreur
    await result.current.mutate({ test: 'data' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    // Réinitialiser
    result.current.resetError();

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('devrait passer les bonnes en-têtes à fetch', async () => {
    const mockToken = 'test-token';
    const endpoint = '/api/admin/clients/create';
    const testData = { name: 'Test Client' };

    mockGetSessionToken.mockResolvedValue(mockToken);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });

    const { result } = renderHook(() =>
      useApiMutation({
        method: 'POST',
        endpoint,
      })
    );

    await result.current.mutate(testData);

    expect(global.fetch).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
          'x-csrf-token': 'test-csrf-token-123',
        },
        body: JSON.stringify(testData),
      })
    );
  });
});
