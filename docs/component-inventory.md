# Inventaire des composants - Studio Photo Pulsee

## Composants par catégorie

### 🏠 Application

| Composant | Fichier | Lignes | Description |
|-----------|---------|--------|-------------|
| `App` | `App.tsx` | 251 | Root component, state global, navigation |

### 📊 Feature Components

| Composant | Fichier | Lignes | Description |
|-----------|---------|--------|-------------|
| `Dashboard` | `components/Dashboard.tsx` | 672 | Interface de génération d'images |
| `Studio` | `components/Studio.tsx` | ~400 | Gestion des profils |
| `TrainingWizard` | `components/TrainingWizard.tsx` | ~200 | Onboarding |
| `AICharacterCreator` | `components/AICharacterCreator.tsx` | ~280 | Création mannequins IA |

### 🎨 UI Components

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `Button` | `components/Button.tsx` | Bouton avec loading state |
| `ImageUploader` | `components/ImageUploader.tsx` | Upload drag & drop |
| `Promptor` | `components/Promptor.tsx` | Assistant prompts |
| `NavButton` | `App.tsx` (inline) | Bouton navigation |

---

## Détail Dashboard.tsx

Le composant le plus complexe (672 lignes). Sous-composants inline:

### State Management
- `prompt`, `selectedStyle`, `variationCount` - Form state
- `selectedProductIds`, `selectedPersonIds` - Sélection
- `isGenerating`, `queueProgress` - Queue state
- `lightboxImage`, `activeTab` - Lightbox state
- `comparisonIds`, `showComparisonModal` - Comparaison

### Handlers principaux
- `handleGenerate()` - Lance la queue de génération
- `handleMagicEdit()` - Édition IA
- `handleRepairProduct()` - Restauration produit
- `handleExport()` - Expansion format
- `handleQuickAICreation()` - Création mannequin rapide

### UI Sections
1. **Configuration panel** - Sélection sujets/produits
2. **Style selector** - 7 styles prédéfinis
3. **Prompt input** - Textarea + assistant
4. **Generation button** - Avec progress bar
5. **Gallery grid** - Images générées
6. **Lightbox modal** - Édition/export
7. **Comparison modal** - A/B testing

---

## Styles visuels (ART_STYLES)

| ID | Label | Catégorie |
|----|-------|-----------|
| `none` | Naturel | studio |
| `pulsee_cold` | Pulsee Signature ⭐ | brand |
| `studio` | Studio Pro | studio |
| `luxury` | Luxe & Élégant | mood |
| `neon` | Cyber / Néon | artistic |
| `nature` | Organique | mood |
| `minimal` | Minimaliste | studio |
