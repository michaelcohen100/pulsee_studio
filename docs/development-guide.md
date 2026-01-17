# Guide de développement - Studio Photo Pulsee

## Prérequis

- **Node.js** 18+ (LTS recommandé)
- **npm** ou **pnpm**
- **Clé API Gemini** depuis [Google AI Studio](https://aistudio.google.com/)

## Installation

```bash
# Clone ou accès au repo
cd pulsee_studio

# Installation des dépendances
npm install
```

## Configuration

Créer un fichier `.env` à la racine:

```env
GEMINI_API_KEY=your_api_key_here
```

> ⚠️ Ne jamais committer ce fichier. Il est dans `.gitignore`.

## Développement

```bash
# Serveur de développement (http://localhost:3000)
npm run dev
```

### Hot Reload
Vite active le HMR automatiquement. Les modifications de fichiers `.tsx` sont reflétées instantanément.

### Accès réseau local
Le serveur écoute sur `0.0.0.0:3000`, accessible depuis d'autres appareils sur le réseau.

## Build

```bash
# Build production
npm run build

# Preview du build
npm run preview
```

## Structure du code

### Conventions

| Type | Convention |
|------|------------|
| Composants | PascalCase (`Dashboard.tsx`) |
| Hooks | camelCase, préfixe `use` |
| Services | camelCase (`geminiService.ts`) |
| Types | PascalCase avec suffixe descriptif |

### Patterns utilisés

1. **Function components** avec hooks
2. **Props drilling** pour état global
3. **Async/await** pour API calls
4. **IndexedDB** pour persistence client

## API Gemini

### Modèles utilisés

| Modèle | Usage |
|--------|-------|
| `gemini-2.5-flash` | Analyse texte/images |
| `gemini-2.5-flash-image` | Génération/édition images |

### Gestion des erreurs

Le service inclut:
- **Timeout** configurable par opération
- **Retry** avec backoff exponentiel
- **Messages utilisateur** traduits en français

### Optimisation des images

Les images sont redimensionnées avant envoi:
- Personnes: 600px max, qualité 60%
- Produits: 1280px max, qualité 90%
- Édition: 1024px max, qualité 80%

## Debugging

### Console logs

Le service Gemini log les erreurs et retries:
```
[Analyse d'image] Tentative 1/3 échouée. Retry dans 3s...
```

### IndexedDB

Inspecter via DevTools > Application > IndexedDB > `GeminiBrandStudioDB`

## Tests

> ⚠️ Tests non implémentés actuellement

Recommandations:
- Jest + React Testing Library pour composants
- MSW pour mock API Gemini
