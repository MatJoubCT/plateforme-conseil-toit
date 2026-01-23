import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateBadge } from '../StateBadge';

describe('StateBadge Component', () => {
  it('devrait afficher le label par défaut pour "urgent"', () => {
    render(<StateBadge state="urgent" />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('devrait afficher le label par défaut pour "bon"', () => {
    render(<StateBadge state="bon" />);
    expect(screen.getByText('Bon')).toBeInTheDocument();
  });

  it('devrait afficher le label par défaut pour "tres_bon"', () => {
    render(<StateBadge state="tres_bon" />);
    expect(screen.getByText('Très bon')).toBeInTheDocument();
  });

  it('devrait afficher le label par défaut pour "a_surveille"', () => {
    render(<StateBadge state="a_surveille" />);
    expect(screen.getByText('À surveiller')).toBeInTheDocument();
  });

  it('devrait afficher le label par défaut pour "planifier"', () => {
    render(<StateBadge state="planifier" />);
    expect(screen.getByText('Planifier')).toBeInTheDocument();
  });

  it('devrait afficher le label par défaut pour "non_evalue"', () => {
    render(<StateBadge state="non_evalue" />);
    expect(screen.getByText('Non évalué')).toBeInTheDocument();
  });

  it('devrait afficher un label personnalisé', () => {
    render(<StateBadge state="urgent" label="Très urgent" />);
    expect(screen.getByText('Très urgent')).toBeInTheDocument();
    expect(screen.queryByText('Urgent')).not.toBeInTheDocument();
  });

  it('devrait appliquer les classes CSS correctes pour "urgent"', () => {
    const { container } = render(<StateBadge state="urgent" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-ct-stateUrgent/10');
    expect(badge).toHaveClass('text-ct-stateUrgent');
    expect(badge).toHaveClass('border-ct-stateUrgent/40');
  });

  it('devrait appliquer les classes CSS correctes pour "bon"', () => {
    const { container } = render(<StateBadge state="bon" />);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-ct-stateGood/10');
    expect(badge).toHaveClass('text-ct-stateGood');
  });

  it('devrait utiliser une couleur dynamique HEX', () => {
    const { container } = render(
      <StateBadge state="urgent" color="#FF5733" />
    );
    const badge = container.querySelector('span');

    // Vérifie que le style inline est appliqué
    expect(badge).toHaveStyle({ color: '#FF5733' });
  });

  it('devrait ignorer une couleur invalide', () => {
    const { container } = render(
      <StateBadge state="urgent" color="invalid-color" />
    );
    const badge = container.querySelector('span');

    // Devrait utiliser les classes CSS par défaut
    expect(badge).toHaveClass('bg-ct-stateUrgent/10');
  });

  it('devrait afficher un point de couleur', () => {
    const { container } = render(<StateBadge state="bon" />);
    const dots = container.querySelectorAll('.rounded-full');

    // Il y a 2 éléments rounded-full: le badge et le point
    expect(dots.length).toBe(2);
  });

  it('devrait accepter des classes personnalisées', () => {
    const { container } = render(
      <StateBadge state="bon" className="custom-class" />
    );
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('custom-class');
  });

  it('devrait passer des props HTML natifs', () => {
    render(<StateBadge state="bon" data-testid="badge-test" />);
    expect(screen.getByTestId('badge-test')).toBeInTheDocument();
  });

  it('devrait gérer une couleur HEX avec 3 caractères', () => {
    const { container } = render(
      <StateBadge state="urgent" color="#F00" />
    );
    const badge = container.querySelector('span');
    expect(badge).toHaveStyle({ color: '#F00' });
  });

  it('devrait gérer une couleur HEX avec 6 caractères', () => {
    const { container } = render(
      <StateBadge state="urgent" color="#FF0000" />
    );
    const badge = container.querySelector('span');
    expect(badge).toHaveStyle({ color: '#FF0000' });
  });
});
