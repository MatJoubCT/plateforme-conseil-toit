import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast } from '../Toast'

describe('Toast', () => {
  const onClose = vi.fn()

  beforeEach(() => {
    onClose.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('devrait afficher le message', () => {
    render(<Toast type="success" message="Opération réussie" onClose={onClose} />)
    expect(screen.getByText('Opération réussie')).toBeInTheDocument()
  })

  it('devrait avoir le rôle alert', () => {
    render(<Toast type="info" message="Info" onClose={onClose} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('devrait auto-dismiss après la durée', () => {
    render(<Toast type="success" message="Test" duration={3000} onClose={onClose} />)
    expect(onClose).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(3000) })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('devrait utiliser la durée par défaut de 5000ms', () => {
    render(<Toast type="success" message="Test" onClose={onClose} />)

    act(() => { vi.advanceTimersByTime(4999) })
    expect(onClose).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(1) })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('devrait appeler onClose au clic sur le bouton fermer', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()

    render(<Toast type="error" message="Erreur" onClose={onClose} />)
    const closeBtn = screen.getByLabelText('Fermer')
    await user.click(closeBtn)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('devrait afficher une barre de progression si duration > 0', () => {
    const { container } = render(
      <Toast type="success" message="Test" duration={5000} onClose={onClose} />
    )
    const progressBar = container.querySelector('[style*="shrink-width"]')
    expect(progressBar).not.toBeNull()
  })

  it('ne devrait PAS afficher de barre de progression si duration = 0', () => {
    const { container } = render(
      <Toast type="success" message="Test" duration={0} onClose={onClose} />
    )
    const progressBar = container.querySelector('[style*="shrink-width"]')
    expect(progressBar).toBeNull()
  })

  it.each(['success', 'error', 'warning', 'info'] as const)(
    'devrait rendre le type %s sans erreur',
    (type) => {
      const { container } = render(
        <Toast type={type} message={`Toast ${type}`} onClose={onClose} />
      )
      expect(container.firstChild).toBeTruthy()
      expect(screen.getByText(`Toast ${type}`)).toBeInTheDocument()
    }
  )
})
