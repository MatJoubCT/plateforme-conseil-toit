import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '../dialog';

describe('Dialog Component', () => {
  it('devrait afficher le contenu quand open est true', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Test Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('ne devrait pas afficher le contenu quand open est false', () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
  });

  it('devrait fermer le dialog en appuyant sur Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Appuyer sur Escape
    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('devrait fermer le dialog en cliquant sur l\'overlay', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Trouver l'overlay (le div avec bg-black/40)
    const overlay = document.querySelector('.bg-black\\/40');
    expect(overlay).toBeInTheDocument();

    // Cliquer sur l'overlay
    if (overlay) {
      await user.click(overlay as HTMLElement);
    }

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('ne devrait pas fermer le dialog en cliquant sur le contenu', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    await user.click(dialog);

    // Ne devrait pas appeler onOpenChange
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('devrait avoir les attributs d\'accessibilité appropriés', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  it('devrait appliquer les classes personnalisées au DialogContent', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent className="custom-class">
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('custom-class');
    });
  });

  it('devrait afficher DialogHeader avec les bonnes classes', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const header = screen.getByText('Test Dialog').parentElement;
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5');
    });
  });

  it('devrait afficher DialogFooter avec les bonnes classes', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogFooter>
            <button>Action</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const footer = screen.getByText('Action').parentElement;
      expect(footer).toHaveClass('mt-6', 'flex');
    });
  });

  it('devrait appliquer les classes personnalisées au DialogHeader', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader className="custom-header">
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const header = screen.getByText('Test Dialog').parentElement;
      expect(header).toHaveClass('custom-header');
    });
  });

  it('devrait appliquer les classes personnalisées au DialogTitle', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle className="custom-title">Test Dialog</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const title = screen.getByText('Test Dialog');
      expect(title).toHaveClass('custom-title');
    });
  });

  it('devrait appliquer les classes personnalisées au DialogDescription', async () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open={true} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogDescription className="custom-desc">Test Description</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    await waitFor(() => {
      const desc = screen.getByText('Test Description');
      expect(desc).toHaveClass('custom-desc');
    });
  });

  it('devrait lancer une erreur si DialogContent est utilisé sans Dialog', () => {
    // Désactiver les erreurs console pour ce test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <DialogContent>
          <DialogTitle>Test Dialog</DialogTitle>
        </DialogContent>
      );
    }).toThrow('Dialog components must be used within <Dialog>.');

    consoleError.mockRestore();
  });
});
