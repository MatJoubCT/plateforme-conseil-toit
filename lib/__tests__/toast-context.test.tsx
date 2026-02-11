import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { ToastProvider, useToast } from '../toast-context'

// Wrapper pour les hooks
function Wrapper({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}

describe('useToast', () => {
  it('devrait lever une erreur en dehors du provider', () => {
    // Supprimer console.error pour ce test
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within a ToastProvider'
    )
    vi.restoreAllMocks()
  })

  it('devrait fournir les méthodes showToast, success, error, warning, info', () => {
    const { result } = renderHook(() => useToast(), { wrapper: Wrapper })
    expect(result.current.showToast).toBeTypeOf('function')
    expect(result.current.success).toBeTypeOf('function')
    expect(result.current.error).toBeTypeOf('function')
    expect(result.current.warning).toBeTypeOf('function')
    expect(result.current.info).toBeTypeOf('function')
  })
})

describe('ToastProvider', () => {
  it('devrait afficher un toast success', () => {
    function TestComponent() {
      const toast = useToast()
      return (
        <button onClick={() => toast.success('Bravo !')}>Déclencher</button>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Déclencher').click()
    })

    expect(screen.getByText('Bravo !')).toBeInTheDocument()
  })

  it('devrait afficher un toast error', () => {
    function TestComponent() {
      const toast = useToast()
      return (
        <button onClick={() => toast.error('Erreur !')}>Déclencher</button>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Déclencher').click()
    })

    expect(screen.getByText('Erreur !')).toBeInTheDocument()
  })

  it('devrait limiter à 3 toasts simultanés', () => {
    function TestComponent() {
      const toast = useToast()
      return (
        <button onClick={() => {
          toast.info('Message 1')
          toast.info('Message 2')
          toast.info('Message 3')
          toast.info('Message 4')
        }}>Déclencher</button>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Déclencher').click()
    })

    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeLessThanOrEqual(3)
  })

  it('devrait fermer un toast au clic', async () => {
    const user = userEvent.setup()

    function TestComponent() {
      const toast = useToast()
      return (
        <button onClick={() => toast.success('À fermer')}>Déclencher</button>
      )
    }

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    act(() => {
      screen.getByText('Déclencher').click()
    })

    expect(screen.getByText('À fermer')).toBeInTheDocument()

    const closeBtn = screen.getByLabelText('Fermer')
    await user.click(closeBtn)

    expect(screen.queryByText('À fermer')).not.toBeInTheDocument()
  })

  it('devrait avoir le container aria-live polite', () => {
    render(
      <ToastProvider>
        <div>Test</div>
      </ToastProvider>
    )

    const container = document.querySelector('[aria-live="polite"]')
    expect(container).not.toBeNull()
  })
})
