import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, GenerationMode, GeneratedImage, ArtStyle, EditorTab, ExportFormat, EntityProfile, MarketingPersona } from '../types';
import { generateBrandVisual, suggestPrompts, editGeneratedVisual, expandImageForFormat, generateAIModelDescription, generateAIModelImages, repairProductIdentity } from '../services/geminiService';
import { GenerationQueue, QueueProgress } from '../utils/generationQueue';
import { Button } from './Button';
import { Promptor } from './Promptor';
import { PersonaSelector } from './PersonaSelector';
import { ArrowRight, Sparkles, User, Package, Download, ThumbsUp, ThumbsDown, CheckCircle2, Circle, AlertTriangle, Layers, Maximize2, X, Palette, Wand2, SplitSquareHorizontal, Crop, Check, Wrench, Play, Square, Clock, Zap, Star, AlertCircle, Settings, ChevronDown, Camera } from 'lucide-react';

// ============================================
// ART STYLES - Avec style Pulsee Signature
// ============================================
const ART_STYLES: ArtStyle[] = [
  {
    id: 'none',
    label: 'Naturel',
    promptModifier: 'Natural lighting, realistic photography, neutral tones.',
    icon: '📷',
    color: 'from-gray-700 to-gray-600',
    category: 'studio'
  },
  {
    id: 'pulsee_cold',
    label: 'Pulsee Signature',
    promptModifier: 'Deep navy blue (#0A1628) dominant color, electric cyan (#00D4FF) accents, cold icy atmosphere evoking polar mint sensation, premium pharmaceutical aesthetic, subtle lightning/energy effects, high contrast, professional.',
    icon: '❄️',
    color: 'from-blue-900 to-cyan-600',
    category: 'brand'
  },
  {
    id: 'studio',
    label: 'Studio Pro',
    promptModifier: 'Professional studio photography, softbox lighting, solid clean background, high detail product shot, 8k resolution, sharp focus.',
    icon: '💡',
    color: 'from-blue-600 to-indigo-600',
    category: 'studio'
  },
  {
    id: 'luxury',
    label: 'Luxe & Élégant',
    promptModifier: 'Luxury editorial style, golden hour warm lighting, bokeh depth of field, expensive atmosphere, vogue magazine aesthetic, rich textures.',
    icon: '💎',
    color: 'from-amber-600 to-yellow-600',
    category: 'mood'
  },
  {
    id: 'neon',
    label: 'Cyber / Néon',
    promptModifier: 'Cyberpunk aesthetic, neon blue and pink lighting, dark moody atmosphere, wet reflection, futuristic city vibe, high contrast.',
    icon: '🌃',
    color: 'from-purple-600 to-pink-600',
    category: 'artistic'
  },
  {
    id: 'nature',
    label: 'Organique',
    promptModifier: 'Outdoor nature photography, sunlight dappled through leaves, soft organic tones, fresh atmosphere, botanical elements, morning light.',
    icon: '🌿',
    color: 'from-green-600 to-emerald-600',
    category: 'mood'
  },
  {
    id: 'minimal',
    label: 'Minimaliste',
    promptModifier: 'Minimalist design, pastel colors, bright high-key lighting, plenty of negative space, clean lines, apple design aesthetic.',
    icon: '⚪',
    color: 'from-gray-200 to-white text-black',
    category: 'studio'
  }
];

interface DashboardProps {
  appState: AppState;
  onImageGenerated: (img: GeneratedImage) => void;
  onFeedback: (id: string, type: 'like' | 'dislike') => void;
  onQuickAI: (profile: EntityProfile) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ appState, onImageGenerated, onFeedback, onQuickAI }) => {
  // === FORM STATE ===
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>(ART_STYLES[1]); // Default: Pulsee Signature
  const [variationCount, setVariationCount] = useState<number>(1);
  const [selectedPersona, setSelectedPersona] = useState<MarketingPersona | null>(null);
  const [isUltraRealistic, setIsUltraRealistic] = useState(false);
  const [isPackshot, setIsPackshot] = useState(false); // NEW: Packshot Mode

  // === SELECTION STATE ===
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  // === GENERATION QUEUE STATE ===
  const [isGenerating, setIsGenerating] = useState(false);
  const [queueProgress, setQueueProgress] = useState<QueueProgress | null>(null);
  const queueRef = useRef<GenerationQueue | null>(null);

  // === QUICK AI STATE ===
  const [showQuickAI, setShowQuickAI] = useState(false);
  const [quickAIInput, setQuickAIInput] = useState('');
  const [isCreatingQuickAI, setIsCreatingQuickAI] = useState(false);

  // === UI STATE ===
  const [showPromptor, setShowPromptor] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(true); // NEW: Mobile UI State

  // === LIGHTBOX STATE ===
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('details');
  const [editInstruction, setEditInstruction] = useState('');
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);

  // === COMPARISON STATE ===
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // === DERIVED STATE ===
  const selectedProducts = (appState.products || []).filter(p => selectedProductIds.includes(p.id));
  const selectedPeople = (appState.people || []).filter(p => selectedPersonIds.includes(p.id));
  const primaryProduct = selectedProducts[0] || null;
  const activePerson = selectedPeople[0] || null;

  const mode = (selectedPeople.length > 0 && selectedProducts.length > 0) ? GenerationMode.COMBINED
    : (selectedPeople.length > 0) ? GenerationMode.USER_ONLY
      : (selectedProducts.length > 0) ? GenerationMode.PRODUCT_ONLY
        : GenerationMode.USER_ONLY;

  // === EFFECTS ===
  useEffect(() => {
    if (activePerson && primaryProduct) {
      suggestPrompts(activePerson.description, primaryProduct.description).then(setSuggestions);
    }
  }, [primaryProduct?.id, activePerson?.id]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // === HANDLERS ===
  const showNotification = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
  }, []);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const togglePerson = (id: string) => {
    if (isPackshot) setIsPackshot(false); // Disable packshot if adding a person
    setSelectedPersonIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const toggleComparisonSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (comparisonIds.includes(id)) {
      setComparisonIds(prev => prev.filter(cid => cid !== id));
    } else {
      setComparisonIds(prev => prev.length < 2 ? [...prev, id] : [prev[1], id]);
    }
  };

  const handleQuickAICreation = async () => {
    if (!quickAIInput.trim()) return;
    setIsCreatingQuickAI(true);
    try {
      const desc = await generateAIModelDescription(quickAIInput);
      const images = await generateAIModelImages(desc);

      const newProfile: EntityProfile = {
        id: `quick_ai_${Date.now()}`,
        name: `IA: ${quickAIInput.substring(0, 20)}${quickAIInput.length > 20 ? '...' : ''}`,
        description: desc,
        images: images,
        type: 'PERSON',
        isAI: true,
        createdAt: Date.now()
      };

      onQuickAI(newProfile);
      setSelectedPersonIds(prev => [...prev, newProfile.id]);
      setShowQuickAI(false);
      setQuickAIInput('');
      showNotification('success', `Mannequin IA "${newProfile.name}" créé !`);
    } catch (e: any) {
      showNotification('error', e.message || "Erreur lors de la création.");
    } finally {
      setIsCreatingQuickAI(false);
    }
  };

  // === MAIN GENERATION WITH QUEUE ===
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showNotification('warning', "Veuillez entrer une description.");
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();

    // Build prompt with persona keywords if selected
    let personaContext = '';
    if (selectedPersona) {
      personaContext = `\n\nTARGET AUDIENCE: ${selectedPersona.name} (${selectedPersona.ageRange} ans, ${selectedPersona.occupation})
CONTEXT: ${selectedPersona.energyNeed}
VISUAL KEYWORDS: ${selectedPersona.visualKeywords.join(', ')}`;
    }

    const finalPrompt = `${prompt}.${personaContext}\n\nSTYLE: ${selectedStyle.promptModifier}`;

    const generateOne = async (): Promise<string> => {
      return generateBrandVisual(
        finalPrompt, mode, selectedPeople, selectedProducts, appState.likedPrompts,
        {
          injectPulseeBranding: selectedStyle.id === 'pulsee_cold',
          prioritizeProductFidelity: true,
          ultraRealistic: isUltraRealistic,
          isPackshot: isPackshot // NEW
        }
      );
    };

    const queue = new GenerationQueue(generateOne, {
      maxConsecutiveFailures: 3,
      delayBetweenItems: 2500,
      maxRetries: 2,
      onProgress: setQueueProgress,
      onItemComplete: (item) => {
        if (item.status === 'completed' && item.result) {
          const newImage: GeneratedImage = {
            id: item.id, url: item.result, prompt: finalPrompt, mode,
            productId: primaryProduct?.id, personId: activePerson?.id,
            styleId: selectedStyle.id, timestamp: Date.now(),
            generationTime: item.completedAt && item.startedAt ? item.completedAt - item.startedAt : undefined
          };
          onImageGenerated(newImage);
        }
      },
      onQueueComplete: (results) => {
        const completed = results.filter(r => r.status === 'completed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const totalTime = Math.round((Date.now() - startTime) / 1000);

        if (completed > 0) showNotification('success', `${completed} image(s) générée(s) en ${totalTime}s`);
        else if (failed > 0) showNotification('error', `Échec: ${results[0]?.error || 'Erreur'}`);

        setIsGenerating(false);
        setQueueProgress(null);
        queueRef.current = null;
      },
      onError: (error) => showNotification('error', error)
    });

    queueRef.current = queue;
    queue.addItems(Array(variationCount).fill(finalPrompt));
    await queue.start();
  };

  const handleCancelGeneration = () => {
    queueRef.current?.cancel();
    showNotification('warning', 'Génération annulée');
  };

  // === EDITOR HANDLERS ===
  const handleMagicEdit = async () => {
    if (!lightboxImage || !editInstruction) return;
    setIsProcessingEdit(true);
    try {
      const newUrl = await editGeneratedVisual(lightboxImage.url, editInstruction);
      const newImage: GeneratedImage = {
        ...lightboxImage, id: Date.now().toString(), url: newUrl, timestamp: Date.now(),
        prompt: `${lightboxImage.prompt} [Edit: ${editInstruction}]`, parentId: lightboxImage.id
      };
      onImageGenerated(newImage);
      setLightboxImage(newImage);
      setEditInstruction('');
      setActiveTab('details');
      showNotification('success', 'Édition appliquée !');
    } catch (e: any) {
      showNotification('error', e.message);
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!lightboxImage) return;
    setIsProcessingEdit(true);
    try {
      const newUrl = await expandImageForFormat(lightboxImage.url, format);
      const newImage: GeneratedImage = {
        ...lightboxImage, id: Date.now().toString(), url: newUrl, timestamp: Date.now(),
        prompt: `${lightboxImage.prompt} [Export: ${format}]`, parentId: lightboxImage.id
      };
      onImageGenerated(newImage);
      setLightboxImage(newImage);
      setActiveTab('details');
      showNotification('success', `Export ${format} créé !`);
    } catch (e: any) {
      showNotification('error', e.message);
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const handleRepairProduct = async () => {
    if (!lightboxImage?.productId) return showNotification('warning', "Aucun produit associé.");
    const product = appState.products.find(p => p.id === lightboxImage.productId);
    if (!product?.images.length) return showNotification('error', "Produit introuvable.");

    setIsProcessingEdit(true);
    try {
      const newUrl = await repairProductIdentity(lightboxImage.url, product.images[0]);
      const newImage: GeneratedImage = {
        ...lightboxImage, id: Date.now().toString(), url: newUrl, timestamp: Date.now(),
        prompt: `${lightboxImage.prompt} [Repair]`, parentId: lightboxImage.id
      };
      onImageGenerated(newImage);
      setLightboxImage(newImage);
      setActiveTab('details');
      showNotification('success', 'Produit restauré !');
    } catch (e: any) {
      showNotification('error', e.message);
    } finally {
      setIsProcessingEdit(false);
    }
  };

  const recentImages = [...(appState.gallery || [])].sort((a, b) => b.timestamp - a.timestamp);
  const lightboxProduct = lightboxImage?.productId ? appState.products.find(p => p.id === lightboxImage.productId) : null;
  const progressPercentage = queueProgress ? Math.round(((queueProgress.completed + queueProgress.failed) / queueProgress.total) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">

      {/* NOTIFICATION */}
      {notification && (
        <div className="fixed top-20 right-4 z-[200] animate-fade-in max-w-[90vw] sm:max-w-sm">
          <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 ${notification.type === 'success' ? 'bg-green-900/90 border-green-500 text-green-100' :
            notification.type === 'error' ? 'bg-red-900/90 border-red-500 text-red-100' :
              'bg-yellow-900/90 border-yellow-500 text-yellow-100'
            }`}>
            {notification.type === 'success' && <CheckCircle2 size={20} className="shrink-0" />}
            {notification.type === 'error' && <AlertCircle size={20} className="shrink-0" />}
            {notification.type === 'warning' && <AlertTriangle size={20} className="shrink-0" />}
            <p className="text-sm flex-1">{notification.message}</p>
            <button onClick={() => setNotification(null)}><X size={16} /></button>
          </div>
        </div>
      )}

      {/* MOBILE FILTER TOGGLE */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="w-full flex items-center justify-between bg-gray-900 border border-gray-800 p-3 rounded-lg text-sm font-medium"
        >
          <span className="flex items-center gap-2"><Settings size={16} className="text-cyan-500" /> Configuration</span>
          <ChevronDown size={16} className={`transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

        {/* LEFT: CONTROLS */}
        <div className={`lg:col-span-1 space-y-6 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>

          {/* ULTRA REALISTIC TOGGLE */}
          <div
            onClick={() => setIsUltraRealistic(!isUltraRealistic)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${isUltraRealistic
              ? 'bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/50 relative overflow-hidden'
              : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              }`}
          >
            {isUltraRealistic && <div className="absolute inset-0 bg-amber-500/5 blur-xl"></div>}
            <div className={`p-2 rounded-lg ${isUltraRealistic ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'}`}>
              <Camera size={20} />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isUltraRealistic ? 'text-amber-400' : 'text-gray-300'}`}>Mode Ultra-Réaliste</h3>
              <p className="text-[10px] text-gray-500 leading-tight">Photos 8K photoréalistes, grain naturel, sans effet "lissé".</p>
            </div>
            <div className={`ml-auto w-10 h-6 rounded-full p-1 transition-colors ${isUltraRealistic ? 'bg-amber-500' : 'bg-gray-800'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isUltraRealistic ? 'translate-x-4' : ''}`} />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Configuration</h3>
            </div>

            {/* Person Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-xs font-medium text-gray-400">Sujets ({selectedPersonIds.length})</label>
                <button onClick={() => setShowQuickAI(true)} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-900/20 px-2 py-1 rounded">
                  <Sparkles size={10} /> IA Rapide
                </button>
              </div>

              {showQuickAI && (
                <div className="bg-gray-950 border border-purple-800/50 p-3 rounded-lg animate-fade-in space-y-2">
                  <p className="text-[10px] text-gray-400">Décrivez un personnage</p>
                  <input value={quickAIInput} onChange={(e) => setQuickAIInput(e.target.value)}
                    className="w-full text-xs bg-gray-900 border border-gray-700 rounded p-2 text-white focus:border-purple-500 outline-none"
                    placeholder="Ex: Femme blonde, 30 ans..." onKeyDown={(e) => e.key === 'Enter' && handleQuickAICreation()} />
                  <div className="flex gap-2">
                    <button onClick={() => setShowQuickAI(false)} className="flex-1 text-xs py-1.5 bg-gray-800 rounded text-gray-400">Annuler</button>
                    <button onClick={handleQuickAICreation} disabled={isCreatingQuickAI || !quickAIInput.trim()}
                      className="flex-1 text-xs py-1.5 bg-purple-600 rounded text-white flex items-center justify-center gap-1 disabled:opacity-50">
                      {isCreatingQuickAI ? <Sparkles size={12} className="animate-spin" /> : <Zap size={12} />}
                      {isCreatingQuickAI ? '...' : 'Créer'}
                    </button>
                  </div>
                </div>
              )}

              {(appState.people || []).length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {appState.people.map(p => {
                    const isSelected = selectedPersonIds.includes(p.id);
                    return (
                      <div key={p.id} onClick={() => togglePerson(p.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-purple-900/20 border-purple-500/50' : 'bg-gray-800 border-gray-800 hover:border-gray-700'}`}>
                        <div className={isSelected ? 'text-purple-400' : 'text-gray-600'}>{isSelected ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                        {p.images.length > 0 ? <img src={p.images[0]} alt={p.name} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><User size={12} /></div>}
                        <div className="flex flex-col min-w-0">
                          <span className={`text-sm truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>{p.name}</span>
                          {p.isAI && <span className="text-[8px] text-purple-400 bg-purple-900/30 px-1 rounded w-fit">IA</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-gray-500 text-xs italic p-2 border border-gray-800 rounded bg-gray-800/50 text-center">Aucun modèle.</div>}
            </div>

            {/* Product Selection */}
            <div className="space-y-2 pt-3 border-t border-gray-800">
              <label className="text-xs font-medium text-gray-400">Produits ({selectedProductIds.length})</label>
              {(appState.products || []).length > 0 ? (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {appState.products.map(p => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <div key={p.id} onClick={() => toggleProduct(p.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-blue-900/20 border-blue-500/50' : 'bg-gray-800 border-gray-800 hover:border-gray-700'}`}>
                        <div className={isSelected ? 'text-blue-400' : 'text-gray-600'}>{isSelected ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                        {p.images.length > 0 ? <img src={p.images[0]} alt={p.name} className="w-8 h-8 object-contain bg-white rounded-lg p-0.5" /> : <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center"><Package size={12} /></div>}
                        <span className={`text-sm flex-1 truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>{p.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="text-gray-500 text-xs italic p-2 border border-gray-800 rounded bg-gray-800/50 text-center">Aucun produit.</div>}

              {/* PACKSHOT MODE TOGGLE */}
              {selectedProductIds.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div
                    onClick={() => {
                      const newValue = !isPackshot;
                      setIsPackshot(newValue);
                      if (newValue) setSelectedPersonIds([]); // Clear people if packshot enabled
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${isPackshot
                      ? 'bg-blue-900/30 border-blue-500/50'
                      : 'bg-gray-800/50 border-gray-800 hover:border-gray-700'
                      }`}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isPackshot ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                      {isPackshot && <Check size={10} className="text-black" />}
                    </div>
                    <span className={`text-sm font-medium flex-1 ${isPackshot ? 'text-blue-200' : 'text-gray-400'}`}>Mode Packshot (Produit Seul)</span>
                    <Package size={14} className={isPackshot ? 'text-blue-400' : 'text-gray-600'} />
                  </div>
                  {isPackshot && <p className="text-[10px] text-gray-500 mt-1 pl-1">Photo produit studio, sans personnage.</p>}
                </div>
              )}
            </div>
          </div>
        </div>   {/* PERSONA SELECTOR */}
        <PersonaSelector
          selectedPersona={selectedPersona}
          onSelectPersona={setSelectedPersona}
        />

        {/* STYLE SELECTOR */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold"><Palette size={16} className="text-cyan-500" /><h3>Style</h3></div>
          <div className="grid grid-cols-3 gap-2">
            {ART_STYLES.map((style) => (
              <button key={style.id} onClick={() => setSelectedStyle(style)}
                className={`relative p-2 rounded-lg border text-left transition-all overflow-hidden ${selectedStyle.id === style.id ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${style.color} opacity-10 pointer-events-none`}></div>
                <div className="text-lg mb-1">{style.icon}</div>
                <div className={`text-[10px] font-bold leading-tight ${selectedStyle.id === style.id ? 'text-cyan-400' : 'text-gray-400'}`}>{style.label}</div>
                {style.category === 'brand' && <div className="absolute top-1 right-1"><Star size={8} className="text-cyan-400 fill-cyan-400" /></div>}
              </button>
            ))}
          </div>
        </div>

        {/* PROMPT */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white">Description</h3>
            <button onClick={() => setShowPromptor(!showPromptor)} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              <Wand2 size={12} />{showPromptor ? 'Masquer' : 'Assistant'}
            </button>
          </div>

          {showPromptor && <Promptor onUsePrompt={(p) => { setPrompt(p); setShowPromptor(false); }} contextUser={activePerson?.name} contextProduct={primaryProduct?.name} />}

          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Décrivez la scène..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-white h-28 resize-none focus:ring-2 focus:ring-cyan-500/50 outline-none text-sm" disabled={isGenerating} />

          {/* VARIATIONS */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-300"><Layers size={14} className="text-cyan-500" />Variantes</div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded-full">{variationCount}</span>
            </div>
            <input type="range" min="1" max="10" value={variationCount} onChange={(e) => setVariationCount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" disabled={isGenerating} />
          </div>

          {/* GENERATION BUTTON / PROGRESS */}
          {isGenerating && queueProgress ? (
            <div className="space-y-3 bg-gray-900 border border-cyan-800/50 rounded-xl p-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2"><Sparkles className="text-cyan-400 animate-pulse" size={18} /><span className="text-sm font-medium text-white">Génération...</span></div>
                <button onClick={handleCancelGeneration} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded">
                  <Square size={12} /> Stop
                </button>
              </div>
              <div className="space-y-1">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{queueProgress.completed + queueProgress.failed} / {queueProgress.total}</span>
                  <span>{progressPercentage}%</span>
                </div>
              </div>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1 text-green-400"><CheckCircle2 size={12} />{queueProgress.completed} OK</div>
                {queueProgress.failed > 0 && <div className="flex items-center gap-1 text-red-400"><AlertCircle size={12} />{queueProgress.failed} échec(s)</div>}
              </div>
              {queueProgress.consecutiveFailures >= 2 && (
                <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 p-2 rounded">
                  <AlertTriangle size={14} />{queueProgress.consecutiveFailures} échecs consécutifs
                </div>
              )}
            </div>
          ) : (
            <Button onClick={handleGenerate} className="w-full" disabled={!prompt.trim() || isGenerating}>
              <Play size={18} />Générer {variationCount > 1 ? `(${variationCount})` : ''}
            </Button>
          )}
        </div>
      </div>

      {/* RIGHT: GALLERY */}
      <div className="lg:col-span-2">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Galerie</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full">{recentImages.length}</span>
          </div>
          <button onClick={() => { setIsComparisonMode(!isComparisonMode); setComparisonIds([]); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isComparisonMode ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
            <SplitSquareHorizontal size={14} />{isComparisonMode ? 'Actif' : 'Comparer'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {recentImages.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl">
              <Sparkles size={32} className="mb-3 opacity-50" /><p className="text-sm">Aucune image.</p>
            </div>
          ) : recentImages.map((img) => {
            const styleUsed = ART_STYLES.find(s => s.id === img.styleId);
            const isSelected = comparisonIds.includes(img.id);
            return (
              <div key={img.id} onClick={(e) => isComparisonMode ? toggleComparisonSelection(img.id, e) : setLightboxImage(img)}
                className={`group relative bg-gray-900 rounded-lg overflow-hidden shadow-lg border cursor-pointer ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/50' : 'border-gray-800 hover:border-cyan-500/30'}`}>
                <img src={img.url} alt="" className="w-full aspect-square object-cover" />
                {!isComparisonMode && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Maximize2 className="text-white" size={24} /></div>}
                {isComparisonMode && <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-black/50 border-white/50'}`}>{isSelected && <Check size={14} />}</div>}
                {styleUsed && styleUsed.id !== 'none' && <div className="absolute bottom-2 left-2 bg-black/70 text-[10px] text-white px-2 py-1 rounded-full">{styleUsed.icon}</div>}
                {img.feedback && <div className={`absolute top-2 left-2 p-1 rounded-full ${img.feedback === 'like' ? 'bg-green-500' : 'bg-red-500'}`}>{img.feedback === 'like' ? <ThumbsUp size={10} /> : <ThumbsDown size={10} />}</div>}
              </div>
            );
          })}

          {isComparisonMode && comparisonIds.length === 2 && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
              <button onClick={() => setShowComparisonModal(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2">
                <SplitSquareHorizontal size={18} />Comparer
              </button>
            </div>
          )}
        </div>
      </div>


      {/* COMPARISON MODAL */}
      {
        showComparisonModal && comparisonIds.length === 2 && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><SplitSquareHorizontal className="text-cyan-500" />Comparateur</h2>
              <button onClick={() => setShowComparisonModal(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"><X size={20} /></button>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
              {comparisonIds.map((id, idx) => {
                const img = recentImages.find(i => i.id === id);
                if (!img) return null;
                return (
                  <div key={id} className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="flex-1 relative"><img src={img.url} className="w-full h-full object-contain bg-black" /><div className="absolute top-4 left-4 bg-black/70 px-3 py-1 rounded-full font-bold">{idx === 0 ? 'A' : 'B'}</div></div>
                    <div className="p-4 border-t border-gray-800 flex justify-between items-center">
                      <p className="text-xs text-gray-400 truncate flex-1">{new Date(img.timestamp).toLocaleDateString()}</p>
                      <div className="flex gap-2">
                        <button onClick={() => onFeedback(img.id, 'like')} className={`p-2 rounded-lg ${img.feedback === 'like' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'}`}><ThumbsUp size={18} /></button>
                        <a href={img.url} download className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700"><Download size={18} /></a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      {/* LIGHTBOX */}
      {
        lightboxImage && (
          <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in">
            <button onClick={() => { setLightboxImage(null); setActiveTab('details'); setEditInstruction(''); }} className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700 z-10"><X size={24} /></button>

            <div className="max-w-6xl w-full flex flex-col md:flex-row bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl h-[85vh]">
              <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
                <img src={lightboxImage.url} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
                {isProcessingEdit && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
                    <Sparkles className="animate-spin text-cyan-500 mb-4" size={48} /><p className="text-xl font-bold">L'IA travaille...</p>
                  </div>
                )}
              </div>

              <div className="w-full md:w-96 bg-gray-900 flex flex-col border-l border-gray-800">
                <div className="flex border-b border-gray-800">
                  {(['details', 'edit', 'repair', 'export'] as EditorTab[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 text-xs font-bold border-b-2 ${activeTab === tab ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-white'}`}>
                      {tab === 'details' && 'Détails'}
                      {tab === 'edit' && <><Wand2 size={12} className="inline mr-1" />Retouche</>}
                      {tab === 'repair' && <><Wrench size={12} className="inline mr-1" />Réparer</>}
                      {tab === 'export' && <><Crop size={12} className="inline mr-1" />Export</>}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === 'details' && (
                    <div className="space-y-6 animate-fade-in">
                      <div><label className="text-xs text-gray-500 uppercase">Prompt</label><p className="text-sm text-gray-300 mt-1 bg-gray-950 p-3 rounded-lg border border-gray-800 max-h-32 overflow-y-auto">{lightboxImage.prompt}</p></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-gray-500 uppercase">Mode</label><p className="text-sm text-cyan-400 mt-1">{lightboxImage.mode}</p></div>
                        {lightboxImage.styleId && <div><label className="text-xs text-gray-500 uppercase">Style</label><p className="text-sm text-gray-300 mt-1">{ART_STYLES.find(s => s.id === lightboxImage.styleId)?.icon} {ART_STYLES.find(s => s.id === lightboxImage.styleId)?.label}</p></div>}
                      </div>
                      <div className="pt-6 border-t border-gray-800 space-y-3">
                        <div className="flex gap-2">
                          <button onClick={() => onFeedback(lightboxImage.id, 'like')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${lightboxImage.feedback === 'like' ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'}`}><ThumbsUp size={16} />J'aime</button>
                          <button onClick={() => onFeedback(lightboxImage.id, 'dislike')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 ${lightboxImage.feedback === 'dislike' ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}><ThumbsDown size={16} /></button>
                        </div>
                        <a href={lightboxImage.url} download={`pulsee-${lightboxImage.id}.png`} className="w-full py-3 bg-white text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200"><Download size={18} />Télécharger HD</a>
                      </div>
                    </div>
                  )}

                  {activeTab === 'edit' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="bg-purple-900/20 border border-purple-500/20 p-4 rounded-xl">
                        <h4 className="font-bold text-purple-300 mb-2 flex items-center gap-2"><Wand2 size={16} />Éditeur Magique</h4>
                        <p className="text-xs text-purple-200/70 mb-4">Décrivez les modifications souhaitées.</p>
                        <textarea value={editInstruction} onChange={(e) => setEditInstruction(e.target.value)} placeholder="Ex: Ajoute des lunettes, change le fond..."
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white min-h-[100px] focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                        <Button onClick={handleMagicEdit} disabled={!editInstruction.trim() || isProcessingEdit} isLoading={isProcessingEdit} className="w-full mt-4 bg-purple-600 hover:bg-purple-500">
                          <Sparkles size={16} />Appliquer
                        </Button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'repair' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="bg-red-900/20 border border-red-500/20 p-4 rounded-xl">
                        <h4 className="font-bold text-red-300 mb-2 flex items-center gap-2"><Wrench size={16} />Réparation Produit</h4>
                        <p className="text-xs text-red-200/70 mb-4">Restaure les détails du produit (texte, logo).</p>
                        {lightboxProduct ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                              <img src={lightboxProduct.images[0]} className="w-12 h-12 object-cover rounded" />
                              <div><p className="text-sm text-white font-bold">{lightboxProduct.name}</p><p className="text-[10px] text-gray-500">Référence</p></div>
                            </div>
                            <Button onClick={handleRepairProduct} disabled={isProcessingEdit} isLoading={isProcessingEdit} className="w-full bg-red-600 hover:bg-red-500">
                              <Sparkles size={16} />Restaurer
                            </Button>
                          </div>
                        ) : <div className="text-xs text-gray-400 italic text-center p-4 border border-dashed border-gray-700 rounded">Aucun produit lié.</div>}
                      </div>
                    </div>
                  )}

                  {activeTab === 'export' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="bg-green-900/20 border border-green-500/20 p-4 rounded-xl">
                        <h4 className="font-bold text-green-300 mb-2 flex items-center gap-2"><Crop size={16} />Export</h4>
                        <p className="text-xs text-green-200/70 mb-4">Étendez l'image pour les réseaux sociaux.</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleExport('9:16')} disabled={isProcessingEdit}
                            className="flex flex-col items-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 disabled:opacity-50">
                            <div className="w-6 h-10 border-2 border-green-400 rounded-sm bg-green-900/30"></div>
                            <span className="text-xs font-bold text-gray-300">Story 9:16</span>
                          </button>
                          <button onClick={() => handleExport('16:9')} disabled={isProcessingEdit}
                            className="flex flex-col items-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 disabled:opacity-50">
                            <div className="w-10 h-6 border-2 border-green-400 rounded-sm bg-green-900/30"></div>
                            <span className="text-xs font-bold text-gray-300">Banner 16:9</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};
