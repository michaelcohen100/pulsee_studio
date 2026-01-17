# Architecture - Studio Photo Pulsee

## Vue d'ensemble

Architecture **monolithique frontend** avec:
- Composants React fonctionnels
- Service centralisé pour l'IA
- Persistence IndexedDB
- Pas de backend (tout côté client)

```
┌─────────────────────────────────────────────────────┐
│                    App.tsx                          │
│   (State global, routing, handlers CRUD)            │
├─────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Dashboard   │  │    Studio    │  │ Wizards   │ │
│  │ (Génération) │  │  (Profils)   │  │           │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
├─────────────────────────────────────────────────────┤
│                   Services                          │
│  ┌──────────────────────────────────────────────┐  │
│  │            geminiService.ts                   │  │
│  │  (API Gemini, optimisation images, retry)     │  │
│  └──────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│                    Utils                            │
│  ┌─────────────────┐  ┌──────────────────────────┐ │
│  │     db.ts       │  │   generationQueue.ts     │ │
│  │  (IndexedDB)    │  │  (Queue + Cache)         │ │
│  └─────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Composants

### Niveau Application

| Composant | Rôle | Lignes |
|-----------|------|--------|
| `App.tsx` | Root, state global, routing | 251 |

### Niveau Feature

| Composant | Rôle | Lignes |
|-----------|------|--------|
| `Dashboard.tsx` | Interface génération, galerie, lightbox | 672 |
| `Studio.tsx` | Gestion profils personnes/produits | ~400 |
| `TrainingWizard.tsx` | Onboarding nouveaux utilisateurs | 200 |
| `AICharacterCreator.tsx` | Création mannequins IA | 280 |

### Niveau UI

| Composant | Rôle |
|-----------|------|
| `Button.tsx` | Bouton réutilisable avec loading |
| `ImageUploader.tsx` | Upload drag & drop |
| `Promptor.tsx` | Assistant de prompts |

## Service Gemini (940 lignes)

### Fonctions principales

| Fonction | Usage | Timeout |
|----------|-------|---------|
| `analyzeImageForTraining` | Analyse photos → description | 45s |
| `generateBrandVisual` | Génération image principale | 120s |
| `generateAIModelDescription` | Description mannequin IA | 30s |
| `generateAIModelImages` | 6 photos mannequin IA | 90s/image |
| `editGeneratedVisual` | Retouche IA | 90s |
| `repairProductIdentity` | Restauration produit | 90s |
| `expandImageForFormat` | Extension canvas | 90s |

### Optimisation images

```typescript
const ImageOptimizationPresets = {
  PERSON:  { maxDimension: 600,  quality: 0.6 },
  PRODUCT: { maxDimension: 1280, quality: 0.9 },
  EDIT:    { maxDimension: 1024, quality: 0.8 },
  REPAIR:  { maxDimension: 1400, quality: 0.95 }
};
```

## Persistence (IndexedDB)

### Stores

| Store | Clé | Index | Contenu |
|-------|-----|-------|---------|
| `profiles` | `id` | - | Personnes + Produits |
| `gallery` | `id` | `timestamp` | Images générées |

### Opérations

- `saveProfile(profile)` - Upsert profil
- `getProfiles()` - Liste tous profils
- `deleteProfile(id)` - Suppression
- `saveImage(image)` - Sauvegarde image
- `getGallery()` - Liste images triées par date

## Queue de génération

Gestion des générations batch avec:
- **Retry intelligent** - Backoff exponentiel
- **Limite d'échecs** - Arrêt après 3 échecs consécutifs
- **Cache descriptions** - Évite recalculs (24h TTL)
- **Annulation** - Support cancel mid-queue

```typescript
const queue = new GenerationQueue(generateFn, {
  maxConsecutiveFailures: 3,
  delayBetweenItems: 2500,
  maxRetries: 2
});
```

## Gestion d'état

**Pattern:** État local React avec lifting
- `App.tsx` détient l'état global (`AppState`)
- Handlers passés en props aux enfants
- Synchronisation IndexedDB à chaque mutation
