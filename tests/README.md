# Guide des Tests - Plateforme Conseil-Toit

Ce document explique l'infrastructure de tests mise en place pour le projet Plateforme Conseil-Toit.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Technologies utilisées](#technologies-utilisées)
3. [Structure des tests](#structure-des-tests)
4. [Exécuter les tests](#exécuter-les-tests)
5. [Écrire de nouveaux tests](#écrire-de-nouveaux-tests)
6. [Bonnes pratiques](#bonnes-pratiques)

---

## Vue d'ensemble

Le projet utilise **Vitest** comme framework de test, avec **React Testing Library** pour les tests de composants React. L'infrastructure de tests couvre:

- ✅ **Tests unitaires des schémas Zod** (59 tests)
- ✅ **Tests des composants UI critiques** (42 tests)
- ✅ **Configuration complète avec mocks** pour Next.js

**Total: 101 tests**

---

## Technologies utilisées

### Framework de test
- **Vitest 4.0.18** - Framework de test moderne et rapide, optimisé pour Vite/TypeScript
- **jsdom** - Environnement DOM pour les tests

### Tests de composants React
- **@testing-library/react** - Utilitaires pour tester les composants React
- **@testing-library/jest-dom** - Matchers personnalisés pour les assertions DOM
- **@testing-library/user-event** - Simulation d'interactions utilisateur

### Configuration
- **vitest.config.ts** - Configuration Vitest avec support TypeScript et alias de chemins
- **tests/setup.ts** - Configuration globale des tests (mocks, cleanup, etc.)

---

## Structure des tests

```
plateforme-conseil-toit/
├── vitest.config.ts              # Configuration Vitest
├── tests/
│   ├── setup.ts                  # Setup global (mocks Next.js, env vars)
│   └── README.md                 # Ce document
├── lib/
│   └── schemas/
│       └── __tests__/            # Tests des schémas Zod
│           ├── bassin.schema.test.ts
│           ├── batiment.schema.test.ts
│           ├── client.schema.test.ts
│           └── user.schema.test.ts
└── components/
    └── ui/
        └── __tests__/            # Tests des composants UI
            ├── Button.test.tsx
            ├── StateBadge.test.tsx
            └── SearchInput.test.tsx
```

### Convention de nommage

- Les tests sont placés dans un dossier `__tests__/` à côté du code qu'ils testent
- Les fichiers de test se terminent par `.test.ts` ou `.test.tsx`
- Le nom du fichier de test correspond au fichier testé (ex: `Button.tsx` → `Button.test.tsx`)

---

## Exécuter les tests

### Scripts npm disponibles

```bash
# Exécuter tous les tests une fois
npm test
# ou
npm run test:run

# Mode watch (re-exécute les tests automatiquement lors des changements)
npm run test:watch

# Générer un rapport de couverture de code
npm run test:coverage

# Interface utilisateur interactive (nécessite installation séparée de @vitest/ui)
npm run test:ui
```

### Exécuter des tests spécifiques

```bash
# Tous les tests des schémas
npx vitest run lib/schemas/__tests__

# Tous les tests UI
npx vitest run components/ui/__tests__

# Un fichier de test spécifique
npx vitest run components/ui/__tests__/Button.test.tsx

# Tests qui correspondent à un pattern
npx vitest run --grep "devrait valider"
```

### Options utiles

```bash
# Mode verbose (afficher plus de détails)
npx vitest run --reporter=verbose

# Afficher uniquement les tests échoués
npx vitest run --reporter=verbose --hideSkippedTests

# Exécuter en mode watch sur un fichier
npx vitest watch Button.test.tsx
```

---

## Écrire de nouveaux tests

### 1. Tests de schémas Zod

Les schémas Zod valident les données d'entrée. Testez:
- ✅ Validation de données valides
- ✅ Rejet de données invalides
- ✅ Messages d'erreur appropriés
- ✅ Cas limites (valeurs nulles, chaînes vides, etc.)

**Exemple:**

```typescript
import { describe, it, expect } from 'vitest';
import { createClientSchema } from '../client.schema';

describe('Client Schema Validation', () => {
  it('devrait valider un client valide', () => {
    const validClient = {
      name: 'Test Client',
    };

    const result = createClientSchema.safeParse(validClient);
    expect(result.success).toBe(true);
  });

  it('devrait rejeter un nom vide', () => {
    const invalidClient = {
      name: '',
    };

    const result = createClientSchema.safeParse(invalidClient);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('obligatoire');
    }
  });
});
```

### 2. Tests de composants UI

Les composants UI doivent être testés pour leur rendu et interactions. Testez:
- ✅ Rendu correct avec différentes props
- ✅ Interactions utilisateur (clics, saisie, etc.)
- ✅ États conditionnels (disabled, loading, error)
- ✅ Classes CSS appliquées
- ✅ Accessibilité (ARIA labels, rôles)

**Exemple:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button Component', () => {
  it('devrait afficher le texte du bouton', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('devrait appeler onClick quand cliqué', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button');

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 3. Matchers disponibles

**Jest-DOM matchers (via @testing-library/jest-dom):**
- `toBeInTheDocument()` - Élément présent dans le DOM
- `toHaveClass(className)` - Élément a une classe CSS
- `toHaveAttribute(attr, value)` - Élément a un attribut
- `toBeDisabled()` - Élément est désactivé
- `toHaveValue(value)` - Input a une valeur
- `toHaveStyle(styles)` - Élément a des styles inline

**Vitest matchers:**
- `toBe(value)` - Égalité stricte (===)
- `toEqual(value)` - Égalité profonde
- `toContain(item)` - Tableau/chaîne contient un élément
- `toHaveBeenCalled()` - Fonction mock appelée
- `toHaveBeenCalledTimes(n)` - Fonction mock appelée n fois
- `toHaveBeenCalledWith(args)` - Fonction mock appelée avec certains arguments

---

## Bonnes pratiques

### 1. Tests isolation

Chaque test doit être indépendant et ne pas dépendre des autres tests.

```typescript
// ✅ BON
describe('MyComponent', () => {
  it('devrait afficher le titre', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('devrait gérer le clic', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    // Test indépendant
  });
});

// ❌ MAUVAIS - dépendance entre tests
let component;
it('devrait rendre', () => {
  component = render(<MyComponent />);
});
it('devrait avoir un titre', () => {
  expect(component.getByText('Title')).toBeInTheDocument(); // Dépend du test précédent
});
```

### 2. Cleanup automatique

Le cleanup est géré automatiquement par `tests/setup.ts`. Pas besoin de nettoyer manuellement.

### 3. User events vs fireEvent

**Préférez `userEvent`** (plus réaliste) à `fireEvent` (bas niveau):

```typescript
// ✅ BON
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.click(button);
await user.type(input, 'hello');

// ❌ À éviter
import { fireEvent } from '@testing-library/react';
fireEvent.click(button);
```

### 4. Queries sémantiques

Utilisez les queries dans cet ordre de préférence:
1. `getByRole` (accessibilité)
2. `getByLabelText` (formulaires)
3. `getByPlaceholderText`
4. `getByText`
5. `getByTestId` (en dernier recours)

```typescript
// ✅ BON
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email');

// ❌ À éviter
screen.getByTestId('submit-button');
```

### 5. Assertions claires

Écrivez des assertions spécifiques et descriptives:

```typescript
// ✅ BON
expect(button).toHaveClass('bg-ct-primary');
expect(input).toHaveValue('test@example.com');

// ❌ Moins clair
expect(button.className).toContain('primary');
```

### 6. Tests asynchrones

Utilisez `async/await` pour les opérations asynchrones:

```typescript
// ✅ BON
it('devrait charger les données', async () => {
  render(<MyComponent />);

  // Attendre l'apparition d'un élément
  const element = await screen.findByText('Loaded');
  expect(element).toBeInTheDocument();
});

// Ou utiliser waitFor pour des conditions complexes
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

### 7. Mocking

Utilisez `vi.fn()` pour créer des fonctions mock:

```typescript
import { vi } from 'vitest';

const mockCallback = vi.fn();
render(<Button onClick={mockCallback} />);

expect(mockCallback).toHaveBeenCalled();
expect(mockCallback).toHaveBeenCalledWith(expectedArg);
```

### 8. Tests descriptifs

Écrivez des descriptions de tests claires en français (convention du projet):

```typescript
// ✅ BON
it('devrait afficher un message d\'erreur quand l\'email est invalide', () => {
  // ...
});

// ❌ Moins descriptif
it('should work', () => {
  // ...
});
```

---

## Couverture de code

Pour générer un rapport de couverture:

```bash
npm run test:coverage
```

Le rapport est généré dans `coverage/` et inclut:
- **Lignes** couvertes
- **Branches** couvertes
- **Fonctions** couvertes
- **Fichiers HTML** pour visualisation détaillée

---

## Résolution de problèmes

### Erreur: Cannot find module '@/...'

Vérifiez que `vitest.config.ts` a le bon alias de chemin:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
}
```

### Tests qui ne se terminent pas

Assurez-vous que tous les timers/promises sont résolus. Utilisez `await` pour les opérations asynchrones.

### Erreurs de type TypeScript

Les types sont automatiquement importés via `vitest/globals` dans `vitest.config.ts`:

```typescript
test: {
  globals: true, // Active describe, it, expect sans import
}
```

---

## Ressources

- [Documentation Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Jest-DOM matchers](https://github.com/testing-library/jest-dom)
- [User Event](https://testing-library.com/docs/user-event/intro/)
- [Zod Documentation](https://zod.dev/)

---

**Dernière mise à jour:** 2026-01-23
