import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState } from '../LoadingState';

describe('LoadingState', () => {
  it('devrait afficher le message par défaut', () => {
    render(<LoadingState />);

    expect(screen.getByText('Chargement…')).toBeInTheDocument();
  });

  it('devrait afficher un message personnalisé', () => {
    render(<LoadingState message="Chargement des données..." />);

    expect(screen.getByText('Chargement des données...')).toBeInTheDocument();
  });

  it('devrait utiliser la hauteur minimale par défaut', () => {
    const { container } = render(<LoadingState />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ minHeight: '60vh' });
  });

  it('devrait accepter une hauteur minimale personnalisée', () => {
    const { container } = render(<LoadingState minHeight="100vh" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ minHeight: '100vh' });
  });

  it('devrait afficher un élément animé', () => {
    const { container } = render(<LoadingState />);

    const animatedElement = container.querySelector('.animate-pulse');
    expect(animatedElement).toBeInTheDocument();
  });

  it('devrait centrer le contenu', () => {
    const { container } = render(<LoadingState />);

    const wrapper = container.querySelector('.flex.items-center.justify-center');
    expect(wrapper).toBeInTheDocument();
  });

  it('devrait afficher le gradient de couleur CT primary', () => {
    const { container } = render(<LoadingState />);

    const gradientBox = container.querySelector('.bg-gradient-to-br');
    expect(gradientBox).toBeInTheDocument();
    expect(gradientBox).toHaveClass('from-[#1F4E79]');
    expect(gradientBox).toHaveClass('to-[#2d6ba8]');
  });
});
