import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination, usePagination } from '../Pagination';

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne devrait rien afficher avec une seule page', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={1} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('ne devrait rien afficher avec zéro page', () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={0} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('devrait afficher les boutons Précédent et Suivant', () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByLabelText('Page précédente')).toBeInTheDocument();
    expect(screen.getByLabelText('Page suivante')).toBeInTheDocument();
  });

  it('devrait désactiver le bouton Précédent sur la première page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    const prevButton = screen.getByLabelText('Page précédente');
    expect(prevButton).toBeDisabled();
  });

  it('devrait désactiver le bouton Suivant sur la dernière page', () => {
    render(<Pagination {...defaultProps} currentPage={10} totalPages={10} />);

    const nextButton = screen.getByLabelText('Page suivante');
    expect(nextButton).toBeDisabled();
  });

  it('devrait appeler onPageChange quand on clique sur Précédent', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

    const prevButton = screen.getByLabelText('Page précédente');
    await user.click(prevButton);

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('devrait appeler onPageChange quand on clique sur Suivant', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

    const nextButton = screen.getByLabelText('Page suivante');
    await user.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(6);
  });

  it('devrait afficher tous les numéros de pages si totalPages <= 7', () => {
    render(<Pagination {...defaultProps} totalPages={5} />);

    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
  });

  it('devrait appeler onPageChange quand on clique sur un numéro de page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(<Pagination {...defaultProps} totalPages={5} onPageChange={onPageChange} />);

    const page3Button = screen.getByLabelText('Page 3');
    await user.click(page3Button);

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('devrait mettre en évidence la page courante', () => {
    render(<Pagination {...defaultProps} currentPage={3} totalPages={5} />);

    const currentPageButton = screen.getByLabelText('Page 3');
    expect(currentPageButton).toHaveClass('bg-ct-primary');
    expect(currentPageButton).toHaveClass('text-white');
    expect(currentPageButton).toHaveAttribute('aria-current', 'page');
  });

  it('devrait afficher les ellipsis au début (pages 1-3)', () => {
    render(<Pagination {...defaultProps} currentPage={2} totalPages={10} />);

    // Pattern: 1 2 3 4 5 ... 10
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('devrait afficher les ellipsis à la fin (pages >= totalPages - 2)', () => {
    render(<Pagination {...defaultProps} currentPage={8} totalPages={10} />);

    // Pattern: 1 ... 6 7 8 9 10
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 6')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 10')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('devrait afficher deux ellipsis au milieu', () => {
    render(<Pagination {...defaultProps} currentPage={5} totalPages={10} />);

    // Pattern: 1 ... 4 5 6 ... 10
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 6')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 10')).toBeInTheDocument();

    const ellipsis = screen.getAllByText('...');
    expect(ellipsis).toHaveLength(2);
  });

  it('devrait accepter une classe personnalisée', () => {
    const { container } = render(
      <Pagination {...defaultProps} className="custom-pagination" />
    );

    const paginationDiv = container.querySelector('.custom-pagination');
    expect(paginationDiv).toBeInTheDocument();
  });

  it('devrait avoir les icônes ChevronLeft et ChevronRight', () => {
    const { container } = render(<Pagination {...defaultProps} />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('devrait gérer une pagination avec exactement 7 pages', () => {
    render(<Pagination {...defaultProps} totalPages={7} />);

    // Devrait afficher toutes les pages sans ellipsis
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByLabelText(`Page ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText('...')).not.toBeInTheDocument();
  });

  it('devrait gérer une pagination avec exactement 8 pages', () => {
    render(<Pagination {...defaultProps} currentPage={1} totalPages={8} />);

    // Devrait afficher des ellipsis car totalPages > 7
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('devrait afficher correctement la transition page 3 -> 4', () => {
    const { rerender } = render(
      <Pagination {...defaultProps} currentPage={3} totalPages={10} />
    );

    // Page 3: 1 2 3 4 5 ... 10
    expect(screen.getByLabelText('Page 5')).toBeInTheDocument();

    rerender(
      <Pagination {...defaultProps} currentPage={4} totalPages={10} />
    );

    // Page 4: 1 ... 3 4 5 ... 10
    const ellipsis = screen.getAllByText('...');
    expect(ellipsis).toHaveLength(2);
  });
});

describe('usePagination Hook', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('devrait initialiser avec la page 1', () => {
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.currentPage).toBe(1);
  });

  it('devrait calculer le nombre total de pages', () => {
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.totalPages).toBe(10); // 100 items / 10 per page
  });

  it('devrait retourner les items de la page courante', () => {
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.currentItems).toHaveLength(10);
    expect(result.current.currentItems[0].id).toBe(1);
    expect(result.current.currentItems[9].id).toBe(10);
  });

  it('devrait retourner le nombre total d\'items', () => {
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.totalItems).toBe(100);
  });

  it('devrait calculer correctement startIndex et endIndex', () => {
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.startIndex).toBe(1);
    expect(result.current.endIndex).toBe(10);
  });

  it('devrait changer de page correctement', () => {
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => {
      result.current.setCurrentPage(2);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentItems[0].id).toBe(11);
    expect(result.current.currentItems[9].id).toBe(20);
    expect(result.current.startIndex).toBe(11);
    expect(result.current.endIndex).toBe(20);
  });

  it('devrait gérer la dernière page avec moins d\'items', () => {
    const { result } = renderHook(() => usePagination(items, 15));

    act(() => {
      result.current.setCurrentPage(7); // Dernière page
    });

    // Pages: 7 * 15 = 105, mais on a seulement 100 items
    // Page 7: items 91-100 (10 items)
    expect(result.current.currentItems).toHaveLength(10);
    expect(result.current.startIndex).toBe(91);
    expect(result.current.endIndex).toBe(100);
  });

  it('devrait utiliser 50 items par page par défaut', () => {
    const { result } = renderHook(() => usePagination(items));

    expect(result.current.totalPages).toBe(2); // 100 / 50 = 2
    expect(result.current.currentItems).toHaveLength(50);
  });

  it('devrait réinitialiser à la page 1 quand les items changent', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePagination(items, 10),
      { initialProps: { items } }
    );

    act(() => {
      result.current.setCurrentPage(5);
    });

    expect(result.current.currentPage).toBe(5);

    const newItems = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
    rerender({ items: newItems });

    expect(result.current.currentPage).toBe(1);
  });

  it('devrait gérer un tableau vide', () => {
    const { result } = renderHook(() => usePagination([], 10));

    expect(result.current.totalPages).toBe(0);
    expect(result.current.currentItems).toHaveLength(0);
    expect(result.current.totalItems).toBe(0);
  });

  it('devrait gérer moins d\'items que itemsPerPage', () => {
    const fewItems = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const { result } = renderHook(() => usePagination(fewItems, 10));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.currentItems).toHaveLength(3);
    expect(result.current.endIndex).toBe(3);
  });

  it('devrait calculer correctement avec un nombre exact de pages', () => {
    const exactItems = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    const { result } = renderHook(() => usePagination(exactItems, 10));

    expect(result.current.totalPages).toBe(10);

    act(() => {
      result.current.setCurrentPage(10);
    });

    expect(result.current.currentItems).toHaveLength(10);
    expect(result.current.endIndex).toBe(100);
  });
});
