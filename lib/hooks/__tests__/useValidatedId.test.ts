import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock Next.js navigation
const mockPush = vi.fn()
let mockParams: Record<string, string> = {}

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush }),
}))

import { useValidatedId, useValidatedIdSync } from '../useValidatedId'

describe('useValidatedId', () => {
  beforeEach(() => {
    mockPush.mockClear()
    mockParams = {}
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('devrait retourner un UUID valide', () => {
    mockParams = { id: '550e8400-e29b-41d4-a716-446655440000' }
    const { result } = renderHook(() => useValidatedId())
    expect(result.current).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('devrait retourner null pour un UUID invalide', () => {
    mockParams = { id: 'not-a-uuid' }
    const { result } = renderHook(() => useValidatedId('/fallback'))
    expect(result.current).toBeNull()
  })

  it('devrait rediriger vers redirectPath si UUID invalide', () => {
    mockParams = { id: 'invalid' }
    renderHook(() => useValidatedId('/admin'))
    expect(mockPush).toHaveBeenCalledWith('/admin')
  })

  it('devrait retourner null si id est manquant', () => {
    mockParams = {}
    const { result } = renderHook(() => useValidatedId('/fallback'))
    expect(result.current).toBeNull()
  })
})

describe('useValidatedIdSync', () => {
  beforeEach(() => {
    mockParams = {}
  })

  it('devrait retourner success pour un UUID valide', () => {
    mockParams = { id: '550e8400-e29b-41d4-a716-446655440000' }
    const { result } = renderHook(() => useValidatedIdSync())
    expect(result.current).toEqual({
      success: true,
      data: '550e8400-e29b-41d4-a716-446655440000',
    })
  })

  it('devrait retourner une erreur pour un UUID invalide', () => {
    mockParams = { id: 'bad-id' }
    const { result } = renderHook(() => useValidatedIdSync())
    expect(result.current.success).toBe(false)
    if (!result.current.success) {
      expect(result.current.error).toBeTruthy()
    }
  })
})
