# Studio Photo Pulsee - Documentation

> Documentation générée par BMad Method v6 - Deep Scan  
> Date: 2026-01-17

## Vue d'ensemble

**Studio Photo Pulsee** est une application web React permettant de générer des visuels marketing professionnels pour la marque Pulsee en utilisant l'IA Gemini de Google.

| Attribut | Valeur |
|----------|--------|
| **Type** | Application Web (SPA) |
| **Framework** | React 19 + Vite 6 |
| **Langage** | TypeScript |
| **Architecture** | Monolith Frontend |
| **IA** | Google Gemini API (genai) |
| **Stockage** | IndexedDB (client-side) |

---

## Documentation générée

### Core

- [Vue d'ensemble du projet](./project-overview.md)
- [Architecture](./architecture.md)
- [Arbre source](./source-tree-analysis.md)

### Développement

- [Guide de développement](./development-guide.md)
- [Inventaire des composants](./component-inventory.md)

### API & Services

- [Service Gemini](./api-gemini-service.md)
- [Système de Queue](./queue-system.md)

---

## Démarrage rapide

```bash
# Installation
npm install

# Développement local
npm run dev    # http://localhost:3000

# Build production
npm run build
```

**Prérequis:**
- Node.js 18+
- Clé API Gemini (`GEMINI_API_KEY` dans `.env`)

---

## Structure du projet

```
pulsee_studio/
├── App.tsx              # Composant racine, routage
├── index.tsx            # Point d'entrée React
├── types.ts             # Types TypeScript
├── components/          # Composants UI React
│   ├── Dashboard.tsx    # Interface principale de génération
│   ├── Studio.tsx       # Gestion des profils
│   ├── TrainingWizard.tsx
│   ├── AICharacterCreator.tsx
│   └── ...
├── services/
│   └── geminiService.ts # Intégration API Gemini
└── utils/
    ├── db.ts            # Persistence IndexedDB
    └── generationQueue.ts
```

---

## Fonctionnalités principales

1. **Génération d'images IA** - Création de visuels marketing via Gemini
2. **Profils entités** - Gestion de personnes et produits avec descriptions générées
3. **Styles visuels** - 7 styles prédéfinis dont "Pulsee Signature"
4. **Queue de génération** - Génération batch avec retry intelligent
5. **Éditeur magique** - Retouche IA des images générées
6. **Export multi-format** - Story (9:16), Banner (16:9)
7. **Réparation produit** - Restauration de l'identité visuelle du produit
