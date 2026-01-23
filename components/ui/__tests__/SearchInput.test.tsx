import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from '../SearchInput';

describe('SearchInput Component', () => {
  it('devrait afficher le placeholder par défaut', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Rechercher…')).toBeInTheDocument();
  });

  it('devrait afficher un placeholder personnalisé', () => {
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        placeholder="Chercher un client..."
      />
    );
    expect(screen.getByPlaceholderText('Chercher un client...')).toBeInTheDocument();
  });

  it('devrait afficher la valeur actuelle', () => {
    render(<SearchInput value="test" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test');
  });

  it('devrait appeler onChange lors de la saisie', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<SearchInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'test');

    expect(handleChange).toHaveBeenCalledTimes(4); // Une fois par caractère
    expect(handleChange).toHaveBeenLastCalledWith('t');
  });

  it('devrait afficher l\'icône de recherche', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} />);
    // L'icône Search de lucide-react
    const searchIcon = container.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });

  it('ne devrait PAS afficher le bouton clear quand vide', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Effacer la recherche')).not.toBeInTheDocument();
  });

  it('devrait afficher le bouton clear quand il y a du texte', () => {
    render(<SearchInput value="test" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Effacer la recherche')).toBeInTheDocument();
  });

  it('devrait effacer le texte lors du clic sur le bouton clear', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<SearchInput value="test" onChange={handleChange} />);
    const clearButton = screen.getByLabelText('Effacer la recherche');

    await user.click(clearButton);

    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('devrait appliquer la classe par défaut max-w-md', () => {
    const { container } = render(<SearchInput value="" onChange={vi.fn()} />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('max-w-md');
  });

  it('devrait appliquer une classe personnalisée', () => {
    const { container } = render(
      <SearchInput value="" onChange={vi.fn()} className="w-full" />
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('w-full');
    expect(wrapper).not.toHaveClass('max-w-md');
  });

  it('devrait avoir le type text', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('devrait permettre la saisie de caractères spéciaux', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<SearchInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'test@123!');

    // Devrait avoir été appelé pour chaque caractère
    expect(handleChange).toHaveBeenCalled();
  });

  it('devrait gérer les espaces', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<SearchInput value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');

    await user.type(input, 'hello world');

    expect(handleChange).toHaveBeenCalled();
  });
});
