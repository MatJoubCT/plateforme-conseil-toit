import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSessionToken, getSessionToken } from '../useSessionToken';

// Mock Supabase client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/lib/supabaseBrowser', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

describe('useSessionToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner null si aucune session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => useSessionToken());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it('devrait retourner le token si session existe', async () => {
    const mockToken = 'test-access-token-123';
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: mockToken,
        },
      },
    });

    const { result } = renderHook(() => useSessionToken());

    await waitFor(() => {
      expect(result.current).toBe(mockToken);
    });
  });

  it('devrait mettre à jour le token lors des changements de session', async () => {
    const initialToken = 'initial-token';
    const newToken = 'new-token';

    // Configuration initiale
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: initialToken,
        },
      },
    });

    // Simuler le callback onAuthStateChange
    let authCallback: ((event: string, session: any) => void) | undefined;
    mockOnAuthStateChange.mockImplementation((callback: (event: string, session: any) => void) => {
      authCallback = callback;
      return {
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      };
    });

    const { result } = renderHook(() => useSessionToken());

    // Vérifier le token initial
    await waitFor(() => {
      expect(result.current).toBe(initialToken);
    });

    // Simuler un changement de session
    if (authCallback) {
      authCallback('SIGNED_IN', { access_token: newToken });
    }

    // Vérifier le nouveau token
    await waitFor(() => {
      expect(result.current).toBe(newToken);
    });
  });

  it('devrait se désabonner lors du démontage', () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    const { unmount } = renderHook(() => useSessionToken());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('getSessionToken (utilitaire)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner null si aucune session', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    const token = await getSessionToken();

    expect(token).toBeNull();
  });

  it('devrait retourner le token si session existe', async () => {
    const mockToken = 'test-token-456';
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: mockToken,
        },
      },
    });

    const token = await getSessionToken();

    expect(token).toBe(mockToken);
  });
});
