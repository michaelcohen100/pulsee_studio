import React, { useState } from 'react';
import { EntityProfile, CreativeConcept, MarketingPersona, GeneratedImage, GenerationMode } from '../../types';
import { generateCreativeConcepts, generateBrandVisual } from '../../services/geminiService';
import { Button } from '../common/Button';
import { Lightbulb, Sparkles, Package, User, MapPin, Check, X, Play, RefreshCw } from 'lucide-react';

interface CreativeAssistantProps {
    products: EntityProfile[];
    people: EntityProfile[];
    locations: EntityProfile[];
    selectedPersona?: MarketingPersona | null;
    onImageGenerated: (img: GeneratedImage) => void;
    onShowNotification: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export const CreativeAssistant: React.FC<CreativeAssistantProps> = ({
    products,
    people,
    locations,
    selectedPersona,
    onImageGenerated,
    onShowNotification
}) => {
    const [brief, setBrief] = useState('');
    const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
    const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
    const [generatingConceptId, setGeneratingConceptId] = useState<string | null>(null);

    // Per-concept asset toggles (user can override suggestions)
    const [assetOverrides, setAssetOverrides] = useState<Record<string, {
        useProduct: boolean;
        usePerson: boolean;
        useLocation: boolean;
    }>>({});

    const handleGenerateConcepts = async () => {
        if (!brief.trim()) {
            onShowNotification('warning', "Veuillez entrer un brief.");
            return;
        }

        setIsGeneratingConcepts(true);
        setConcepts([]);
        setAssetOverrides({});

        try {
            const newConcepts = await generateCreativeConcepts(
                brief,
                { products, people, locations },
                selectedPersona || undefined
            );
            setConcepts(newConcepts);

            // Initialize overrides with suggested values
            const overrides: Record<string, any> = {};
            newConcepts.forEach(c => {
                overrides[c.id] = { ...c.suggestedAssets };
            });
            setAssetOverrides(overrides);

            onShowNotification('success', `${newConcepts.length} concepts générés !`);
        } catch (e: any) {
            onShowNotification('error', e.message || "Erreur lors de la génération");
        } finally {
            setIsGeneratingConcepts(false);
        }
    };

    const toggleAsset = (conceptId: string, asset: 'useProduct' | 'usePerson' | 'useLocation') => {
        setAssetOverrides(prev => ({
            ...prev,
            [conceptId]: {
                ...prev[conceptId],
                [asset]: !prev[conceptId]?.[asset]
            }
        }));
    };

    const handleGenerateFromConcept = async (concept: CreativeConcept) => {
        const assets = assetOverrides[concept.id] || concept.suggestedAssets;

        setGeneratingConceptId(concept.id);
        const startTime = Date.now();

        try {
            // Get first available assets based on toggles
            const selectedProducts = assets.useProduct ? products.slice(0, 1) : [];
            const selectedPeople = assets.usePerson ? people.slice(0, 1) : [];
            const selectedLocation = assets.useLocation ? locations[0] : undefined;

            // Determine mode
            let mode = GenerationMode.PRODUCT_ONLY;
            if (selectedPeople.length > 0 && selectedProducts.length > 0) {
                mode = GenerationMode.COMBINED;
            } else if (selectedPeople.length > 0) {
                mode = GenerationMode.USER_ONLY;
            }

            const imageUrl = await generateBrandVisual(
                concept.prompt,
                mode,
                selectedPeople,
                selectedProducts,
                [],
                {
                    prioritizeProductFidelity: true,
                    location: selectedLocation
                }
            );

            const newImage: GeneratedImage = {
                id: `creative_${Date.now()}`,
                url: imageUrl,
                prompt: concept.prompt,
                mode,
                productId: selectedProducts[0]?.id,
                personId: selectedPeople[0]?.id,
                locationId: selectedLocation?.id,
                timestamp: Date.now(),
                generationTime: Date.now() - startTime
            };

            onImageGenerated(newImage);
            onShowNotification('success', `"${concept.title}" généré !`);
        } catch (e: any) {
            onShowNotification('error', e.message || "Erreur de génération");
        } finally {
            setGeneratingConceptId(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Brief Input */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                    <Lightbulb size={20} />
                    <h3 className="font-bold">Assistant Créatif</h3>
                </div>
                <p className="text-xs text-gray-400">
                    Décrivez votre objectif et l'IA vous proposera plusieurs concepts créatifs.
                </p>

                <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Ex: Je veux une pub Pulsee pour les entrepreneurs stressés..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white min-h-[80px] resize-none focus:ring-2 focus:ring-amber-500/50 outline-none text-sm"
                    disabled={isGeneratingConcepts}
                />

                <Button
                    onClick={handleGenerateConcepts}
                    disabled={isGeneratingConcepts || !brief.trim()}
                    isLoading={isGeneratingConcepts}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500"
                >
                    <Lightbulb size={16} />
                    {isGeneratingConcepts ? 'Génération des idées...' : 'Proposer des concepts'}
                </Button>
            </div>

            {/* Concepts Grid */}
            {concepts.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-300">{concepts.length} Concepts proposés</h4>
                        <button
                            onClick={handleGenerateConcepts}
                            disabled={isGeneratingConcepts}
                            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                            <RefreshCw size={12} /> Régénérer
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {concepts.map((concept) => {
                            const assets = assetOverrides[concept.id] || concept.suggestedAssets;
                            const isGenerating = generatingConceptId === concept.id;

                            return (
                                <div
                                    key={concept.id}
                                    className={`bg-gray-900 border rounded-xl p-4 transition-all ${isGenerating
                                        ? 'border-amber-500/50 ring-1 ring-amber-500/30'
                                        : 'border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h5 className="font-bold text-white text-sm">{concept.title}</h5>
                                            <p className="text-xs text-gray-400 line-clamp-2">{concept.description}</p>
                                        </div>
                                    </div>

                                    {/* Asset Toggles */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {products.length > 0 && (
                                            <button
                                                onClick={() => toggleAsset(concept.id, 'useProduct')}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${assets.useProduct
                                                    ? 'bg-blue-900/30 border-blue-500/50 text-blue-300'
                                                    : 'bg-gray-800 border-gray-700 text-gray-500'
                                                    }`}
                                            >
                                                {assets.useProduct ? <Check size={10} /> : <X size={10} />}
                                                <Package size={10} /> Produit
                                            </button>
                                        )}

                                        {people.length > 0 && (
                                            <button
                                                onClick={() => toggleAsset(concept.id, 'usePerson')}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${assets.usePerson
                                                    ? 'bg-purple-900/30 border-purple-500/50 text-purple-300'
                                                    : 'bg-gray-800 border-gray-700 text-gray-500'
                                                    }`}
                                            >
                                                {assets.usePerson ? <Check size={10} /> : <X size={10} />}
                                                <User size={10} /> Personne
                                            </button>
                                        )}

                                        {locations.length > 0 && (
                                            <button
                                                onClick={() => toggleAsset(concept.id, 'useLocation')}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${assets.useLocation
                                                    ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
                                                    : 'bg-gray-800 border-gray-700 text-gray-500'
                                                    }`}
                                            >
                                                {assets.useLocation ? <Check size={10} /> : <X size={10} />}
                                                <MapPin size={10} /> Lieu
                                            </button>
                                        )}
                                    </div>

                                    {/* Generate Button */}
                                    <Button
                                        onClick={() => handleGenerateFromConcept(concept)}
                                        disabled={!!generatingConceptId}
                                        isLoading={isGenerating}
                                        className="w-full py-2 text-xs"
                                        variant="secondary"
                                    >
                                        <Play size={12} />
                                        {isGenerating ? 'Génération...' : 'Générer ce concept'}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
