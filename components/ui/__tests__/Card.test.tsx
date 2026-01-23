import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../Card';

describe('Card Components', () => {
  describe('Card', () => {
    it('devrait afficher le contenu enfant', () => {
      render(<Card>Contenu de la carte</Card>);

      expect(screen.getByText('Contenu de la carte')).toBeInTheDocument();
    });

    it('devrait appliquer les classes par défaut', () => {
      const { container } = render(<Card>Test</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('bg-ct-white');
      expect(card).toHaveClass('shadow-ct-card');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-ct-grayLight');
    });

    it('devrait accepter des classes personnalisées', () => {
      const { container } = render(<Card className="custom-class">Test</Card>);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-xl'); // Classes par défaut conservées
    });

    it('devrait transmettre les props HTML natives', () => {
      render(<Card data-testid="test-card">Test</Card>);

      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });

    it('devrait gérer les événements onClick', async () => {
      const user = userEvent.setup();
      let clicked = false;
      const { container } = render(<Card onClick={() => (clicked = true)}>Test</Card>);

      const card = container.firstChild as HTMLElement;
      await user.click(card);

      expect(clicked).toBe(true);
    });
  });

  describe('CardHeader', () => {
    it('devrait afficher le contenu enfant', () => {
      render(
        <Card>
          <CardHeader>En-tête</CardHeader>
        </Card>
      );

      expect(screen.getByText('En-tête')).toBeInTheDocument();
    });

    it('devrait appliquer les classes par défaut', () => {
      const { container } = render(
        <Card>
          <CardHeader>Test</CardHeader>
        </Card>
      );

      const header = container.querySelector('.border-b.border-ct-grayLight') as HTMLElement;
      expect(header).toHaveClass('px-4');
      expect(header).toHaveClass('py-3');
      expect(header).toHaveClass('border-b');
      expect(header).toHaveClass('border-ct-grayLight');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('items-center');
      expect(header).toHaveClass('justify-between');
    });

    it('devrait accepter des classes personnalisées', () => {
      const { container } = render(
        <Card>
          <CardHeader className="custom-header">Test</CardHeader>
        </Card>
      );

      const header = container.querySelector('.custom-header') as HTMLElement;
      expect(header).toHaveClass('custom-header');
      expect(header).toHaveClass('border-b'); // Should also have default classes
    });
  });

  describe('CardTitle', () => {
    it('devrait afficher le titre', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Mon Titre</CardTitle>
          </CardHeader>
        </Card>
      );

      expect(screen.getByText('Mon Titre')).toBeInTheDocument();
    });

    it('devrait utiliser une balise h3', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test</CardTitle>
          </CardHeader>
        </Card>
      );

      const title = screen.getByText('Test');
      expect(title.tagName).toBe('H3');
    });

    it('devrait appliquer les classes par défaut', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test</CardTitle>
          </CardHeader>
        </Card>
      );

      const title = screen.getByText('Test');
      expect(title).toHaveClass('text-base');
      expect(title).toHaveClass('md:text-lg');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('text-ct-grayDark');
    });

    it('devrait accepter des classes personnalisées', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle className="custom-title">Test</CardTitle>
          </CardHeader>
        </Card>
      );

      const title = screen.getByText('Test');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('devrait afficher la description', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Description du contenu</CardDescription>
          </CardHeader>
        </Card>
      );

      expect(screen.getByText('Description du contenu')).toBeInTheDocument();
    });

    it('devrait utiliser une balise p', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Test</CardDescription>
          </CardHeader>
        </Card>
      );

      const description = screen.getByText('Test');
      expect(description.tagName).toBe('P');
    });

    it('devrait appliquer les classes par défaut', () => {
      render(
        <Card>
          <CardHeader>
            <CardDescription>Test</CardDescription>
          </CardHeader>
        </Card>
      );

      const description = screen.getByText('Test');
      expect(description).toHaveClass('text-xs');
      expect(description).toHaveClass('md:text-sm');
      expect(description).toHaveClass('text-ct-gray');
    });
  });

  describe('CardContent', () => {
    it('devrait afficher le contenu', () => {
      render(
        <Card>
          <CardContent>Contenu principal</CardContent>
        </Card>
      );

      expect(screen.getByText('Contenu principal')).toBeInTheDocument();
    });

    it('devrait appliquer les classes par défaut', () => {
      const { container } = render(
        <Card>
          <CardContent>Test</CardContent>
        </Card>
      );

      // CardContent has px-4 py-4 which are unique to it
      const content = container.querySelector('.px-4.py-4') as HTMLElement;
      expect(content).toHaveClass('px-4');
      expect(content).toHaveClass('py-4');
      expect(content).toHaveClass('md:px-5');
      expect(content).toHaveClass('md:py-5');
    });

    it('devrait accepter des classes personnalisées', () => {
      const { container } = render(
        <Card>
          <CardContent className="custom-content">Test</CardContent>
        </Card>
      );

      const content = container.querySelector('.custom-content') as HTMLElement;
      expect(content).toHaveClass('custom-content');
      expect(content).toHaveClass('px-4'); // Should also have default classes
    });
  });

  describe('CardFooter', () => {
    it('devrait afficher le pied de page', () => {
      render(
        <Card>
          <CardFooter>Actions</CardFooter>
        </Card>
      );

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('devrait appliquer les classes par défaut', () => {
      const { container } = render(
        <Card>
          <CardFooter>Test</CardFooter>
        </Card>
      );

      // CardFooter has border-t and justify-end which are unique
      const footer = container.querySelector('.border-t.justify-end') as HTMLElement;
      expect(footer).toHaveClass('px-4');
      expect(footer).toHaveClass('py-3');
      expect(footer).toHaveClass('border-t');
      expect(footer).toHaveClass('border-ct-grayLight');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
      expect(footer).toHaveClass('justify-end');
    });

    it('devrait accepter des classes personnalisées', () => {
      const { container } = render(
        <Card>
          <CardFooter className="custom-footer">Test</CardFooter>
        </Card>
      );

      const footer = container.querySelector('.custom-footer') as HTMLElement;
      expect(footer).toHaveClass('custom-footer');
      expect(footer).toHaveClass('border-t'); // Should also have default classes
    });
  });

  describe('Composition complète', () => {
    it('devrait permettre l\'utilisation de tous les composants ensemble', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Titre Principal</CardTitle>
            <CardDescription>Sous-titre</CardDescription>
          </CardHeader>
          <CardContent>Contenu de la carte</CardContent>
          <CardFooter>Boutons d\'action</CardFooter>
        </Card>
      );

      expect(screen.getByText('Titre Principal')).toBeInTheDocument();
      expect(screen.getByText('Sous-titre')).toBeInTheDocument();
      expect(screen.getByText('Contenu de la carte')).toBeInTheDocument();
      expect(screen.getByText(/Boutons.*action/)).toBeInTheDocument();
    });

    it('devrait fonctionner avec seulement certains composants', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Titre</CardTitle>
          </CardHeader>
          <CardContent>Contenu</CardContent>
        </Card>
      );

      expect(screen.getByText('Titre')).toBeInTheDocument();
      expect(screen.getByText('Contenu')).toBeInTheDocument();
      expect(screen.queryByText('Boutons')).not.toBeInTheDocument();
    });

    it('devrait permettre plusieurs éléments dans le header', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Titre</CardTitle>
            <button>Action</button>
          </CardHeader>
        </Card>
      );

      expect(screen.getByText('Titre')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });
});
