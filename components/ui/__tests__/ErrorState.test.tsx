import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorState } from '../ErrorState';

describe('ErrorState', () => {
  it('devrait afficher le message d\'erreur', () => {
    render(<ErrorState message="Une erreur est survenue" />);

    expect(screen.getByText(/Erreur :/)).toBeInTheDocument();
    expect(screen.getByText(/Une erreur est survenue/)).toBeInTheDocument();
  });

  it('devrait afficher l\'icône d\'alerte', () => {
    const { container } = render(<ErrorState message="Test error" />);

    // L'icône AlertTriangle de lucide-react a une classe svg
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('devrait utiliser la hauteur minimale par défaut', () => {
    const { container } = render(<ErrorState message="Test error" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ minHeight: '40vh' });
  });

  it('devrait accepter une hauteur minimale personnalisée', () => {
    const { container } = render(<ErrorState message="Test error" minHeight="100vh" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ minHeight: '100vh' });
  });

  it('devrait centrer le contenu', () => {
    const { container } = render(<ErrorState message="Test error" />);

    const wrapper = container.querySelector('.flex.items-center.justify-center');
    expect(wrapper).toBeInTheDocument();
  });

  it('devrait utiliser des couleurs d\'erreur (rouge)', () => {
    const { container } = render(<ErrorState message="Test error" />);

    const errorBox = container.querySelector('.bg-red-50');
    expect(errorBox).toBeInTheDocument();
    expect(errorBox).toHaveClass('border-red-200');
  });

  it('devrait afficher le texte en rouge', () => {
    const { container } = render(<ErrorState message="Test error" />);

    const text = container.querySelector('.text-red-700');
    expect(text).toBeInTheDocument();
  });

  it('devrait formater le message avec le préfixe "Erreur : "', () => {
    render(<ErrorState message="Connexion échouée" />);

    expect(screen.getByText('Erreur : Connexion échouée')).toBeInTheDocument();
  });

  it('devrait gérer des messages longs', () => {
    const longMessage = 'Ceci est un très long message d\'erreur qui pourrait s\'étendre sur plusieurs lignes et devrait être affiché correctement dans le composant';

    render(<ErrorState message={longMessage} />);

    expect(screen.getByText(new RegExp(longMessage))).toBeInTheDocument();
  });

  it('devrait avoir un design arrondi', () => {
    const { container } = render(<ErrorState message="Test error" />);

    const errorBox = container.querySelector('.rounded-2xl');
    expect(errorBox).toBeInTheDocument();
  });
});
