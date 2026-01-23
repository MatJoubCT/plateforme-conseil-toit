import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirmer l\'action',
    description: 'Êtes-vous sûr de vouloir continuer ?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait afficher le titre', async () => {
    render(<ConfirmDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Confirmer l\'action')).toBeInTheDocument();
    });
  });

  it('devrait afficher la description', async () => {
    render(<ConfirmDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Êtes-vous sûr de vouloir continuer ?')).toBeInTheDocument();
    });
  });

  it('devrait afficher les boutons Annuler et Confirmer par défaut', async () => {
    render(<ConfirmDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument();
    });
  });

  it('devrait afficher un texte de confirmation personnalisé', async () => {
    render(<ConfirmDialog {...defaultProps} confirmText="Supprimer" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
    });
  });

  it('devrait appeler onOpenChange avec false quand on clique sur Annuler', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Annuler' });
    await user.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('devrait appeler onConfirm quand on clique sur Confirmer', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Confirmer' });
    await user.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('ne devrait pas afficher le dialog quand open est false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Confirmer l\'action')).not.toBeInTheDocument();
  });

  it('devrait utiliser le variant "danger" pour le bouton de confirmation', async () => {
    render(<ConfirmDialog {...defaultProps} confirmVariant="danger" />);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'Confirmer' });
      expect(confirmButton).toHaveClass('bg-red-600');
      expect(confirmButton).toHaveClass('hover:bg-red-700');
    });
  });

  it('devrait utiliser le variant "primary" par défaut pour le bouton de confirmation', async () => {
    render(<ConfirmDialog {...defaultProps} confirmVariant="primary" />);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'Confirmer' });
      expect(confirmButton).toHaveClass('bg-ct-primary');
    });
  });

  it('devrait désactiver les boutons pendant le chargement', async () => {
    render(<ConfirmDialog {...defaultProps} loading={true} />);

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: 'Annuler' });
      const confirmButton = screen.getByRole('button', { name: 'Traitement...' });

      expect(cancelButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });
  });

  it('devrait afficher "Traitement..." pendant le chargement', async () => {
    render(<ConfirmDialog {...defaultProps} loading={true} confirmText="Supprimer" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Traitement...' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument();
    });
  });

  it('devrait avoir les classes d\'accessibilité appropriées', async () => {
    render(<ConfirmDialog {...defaultProps} />);

    await waitFor(() => {
      // Le dialog est rendu dans un portal à document.body
      const dialog = document.querySelector('[role="dialog"]');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  it('devrait permettre de fermer avec le bouton Annuler même sans confirmText personnalisé', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        title="Test"
        description="Description"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Annuler' });
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('devrait afficher correctement plusieurs dialogues avec des variantes différentes', async () => {
    const { rerender } = render(
      <ConfirmDialog {...defaultProps} confirmVariant="danger" confirmText="Supprimer" />
    );

    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: 'Supprimer' });
      expect(deleteButton).toHaveClass('bg-red-600');
    });

    rerender(<ConfirmDialog {...defaultProps} confirmVariant="primary" confirmText="Confirmer" />);

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: 'Confirmer' });
      expect(confirmButton).toHaveClass('bg-ct-primary');
    });
  });

  it('devrait gérer des descriptions longues', async () => {
    const longDescription =
      'Ceci est une très longue description qui pourrait s\'étendre sur plusieurs lignes et devrait être affichée correctement dans le dialogue de confirmation sans problème de mise en page.';

    render(<ConfirmDialog {...defaultProps} description={longDescription} />);

    await waitFor(() => {
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });
  });

  it('devrait empêcher les clics sur le dialog de le fermer', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const { container } = render(
      <ConfirmDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    await user.click(dialog);

    // Le dialog ne devrait pas se fermer en cliquant dessus
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
