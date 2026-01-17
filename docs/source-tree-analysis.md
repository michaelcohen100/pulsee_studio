# Arbre source - Studio Photo Pulsee

```
pulsee_studio/
│
├── 📄 index.html              # Page HTML racine
├── 📄 index.tsx               # Point d'entrée React (ReactDOM.createRoot)
├── 📄 App.tsx                 # Composant racine, state global, routing
├── 📄 types.ts                # Types TypeScript partagés
├── 📄 package.json            # Dépendances npm
├── 📄 tsconfig.json           # Configuration TypeScript
├── 📄 vite.config.ts          # Configuration Vite + env variables
│
├── 📁 components/             # Composants React UI
│   ├── Dashboard.tsx          # ⭐ Interface principale génération (672 lignes)
│   │                          #    - Sélection personnes/produits
│   │                          #    - Choix style visuel
│   │                          #    - Saisie prompt + variations
│   │                          #    - Galerie d'images
│   │                          #    - Lightbox avec éditeur/export
│   │
│   ├── Studio.tsx             # Gestion des profils (personnes + produits)
│   │                          #    - Liste des entités
│   │                          #    - Ajout/modification/suppression
│   │                          #    - Upload images
│   │
│   ├── TrainingWizard.tsx     # Assistant onboarding
│   │                          #    - Création profil utilisateur
│   │                          #    - Ajout premier produit
│   │
│   ├── AICharacterCreator.tsx # Création mannequins IA
│   │                          #    - Saisie description textuelle
│   │                          #    - Génération 6 photos via Gemini
│   │
│   ├── ImageUploader.tsx      # Composant upload images
│   ├── Promptor.tsx           # Assistant de prompts créatifs
│   └── Button.tsx             # Bouton UI réutilisable
│
├── 📁 services/               # Services métier
│   └── geminiService.ts       # ⭐ Intégration API Gemini (940 lignes)
│                              #    - analyzeImageForTraining()
│                              #    - generateBrandVisual()
│                              #    - generateAIModelImages()
│                              #    - editGeneratedVisual()
│                              #    - repairProductIdentity()
│                              #    - expandImageForFormat()
│                              #    + Optimisation images
│                              #    + Retry avec backoff
│                              #    + Timeout handling
│
├── 📁 utils/                  # Utilitaires
│   ├── db.ts                  # Persistence IndexedDB
│   │                          #    - LocalDB class
│   │                          #    - Stores: profiles, gallery
│   │
│   └── generationQueue.ts     # Système de queue
│                              #    - GenerationQueue class
│                              #    - DescriptionCache class
│                              #    - Retry + annulation
│
├── 📁 _bmad/                  # BMad Method framework (installé)
├── 📁 _bmad-output/           # Artéfacts BMad
└── 📁 docs/                   # Documentation générée
```

## Points d'entrée

| Fichier | Rôle |
|---------|------|
| `index.html` | HTML de base avec `<div id="root">` |
| `index.tsx` | Bootstrap React avec StrictMode |
| `App.tsx` | Composant racine avec routing |

## Fichiers critiques

| Fichier | Importance | Raison |
|---------|------------|--------|
| `geminiService.ts` | ⭐⭐⭐ | Toute l'intégration IA |
| `Dashboard.tsx` | ⭐⭐⭐ | Interface principale utilisateur |
| `types.ts` | ⭐⭐ | Contrats de données |
| `db.ts` | ⭐⭐ | Persistence |
