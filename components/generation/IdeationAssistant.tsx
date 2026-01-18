
import React, { useState } from 'react';
import { Sparkles, Lightbulb, ArrowRight, User, Package, MapPin, CheckCircle2, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '../common/Button';
import { CreativeConcept, generateCreativeConcepts } from '../../services/geminiService';
import { EntityProfile } from '../../types';

interface IdeationAssistantProps {
    onConceptSelected: (concept: CreativeConcept) => void;
    products: EntityProfile[];
    people: EntityProfile[];
    locations: EntityProfile[];
}

export const IdeationAssistant: React.FC<IdeationAssistantProps> = ({
    onConceptSelected, products, people, locations
}) => {
    const [brief, setBrief] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateValues = async () => {
        if (!brief.trim()) return;

        setIsGenerating(true);
        setError(null);
        setConcepts([]);

        try {
            const results = await generateCreativeConcepts(brief, people, products, locations);
            if (results.length === 0) {
                setError("L'IA n'a pas pu générer de concepts. Essayez de reformuler votre demande.");
            } else {
                setConcepts(results);
            }
        } catch (err) {
            setError("Une erreur est survenue lors de la génération.");
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in bg-gray-900/50 p-6 rounded-2xl border border-gray-800">

            {/* HEADER */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                    <Lightbulb className="text-purple-400" size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Assistant Idéation</h2>
                    <p className="text-sm text-gray-400">Décrivez votre besoin, l'IA imagine la campagne.</p>
                </div>
            </div>

            {/* INPUT BRIEF */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Votre Brief</label>
                <div className="relative">
                    <textarea
                        value={brief}
                        onChange={(e) => setBrief(e.target.value)}
                        placeholder="Ex: Une ambiance fraîche et sportive pour le lancement du nouveau booster menthe..."
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[100px] resize-none"
                    />
                    <MessageSquare className="absolute top-4 right-4 text-gray-600" size={16} />
                </div>
                <Button
                    onClick={handleGenerateValues}
                    disabled={!brief.trim() || isGenerating}
                    isLoading={isGenerating}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4"
                >
                    <Sparkles size={18} className="mr-2" />
                    {isGenerating ? 'L\'IA réfléchit...' : 'Imaginer des concepts'}
                </Button>
            </div>

            {/* ERROR */}
            {error && (
                <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-xl text-red-300 text-sm flex items-center gap-2">
                    <span className="text-lg">⚠️</span> {error}
                </div>
            )}

            {/* RESULTS GRID */}
            {concepts.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-gray-800">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        Concepts Générés <span className="bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded-full text-[10px]">{concepts.length}</span>
                    </label>

                    <div className="grid grid-cols-1 gap-4">
                        {concepts.map((concept) => (
                            <div
                                key={concept.id}
                                className="group bg-gray-950 border border-gray-800 hover:border-purple-500/50 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-purple-900/10 cursor-pointer relative overflow-hidden"
                                onClick={() => onConceptSelected(concept)}
                            >
                                {/* Visual Feedback on Hover */}
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-purple-600/20 text-purple-400 p-2 rounded-full backdrop-blur-sm">
                                        <ArrowRight size={20} />
                                    </div>
                                </div>

                                <div className="pr-12">
                                    <h3 className="font-bold text-white text-lg mb-1 group-hover:text-purple-300 transition-colors">{concept.title}</h3>
                                    <p className="text-gray-400 text-sm mb-3 leading-relaxed">{concept.description}</p>

                                    {/* Rationale */}
                                    <div className="bg-gray-900/50 rounded-lg p-3 mb-4 border border-gray-800/50">
                                        <p className="text-xs text-gray-500 italic">"{concept.rationale}"</p>
                                    </div>

                                    {/* Assets Suggestions Pill */}
                                    <div className="flex gap-2 text-xs">
                                        {concept.suggestedAssets?.personId && <span className="flex items-center gap-1 bg-blue-900/20 text-blue-400 px-2 py-1 rounded-md"><User size={12} /> Modèle</span>}
                                        {concept.suggestedAssets?.productId && <span className="flex items-center gap-1 bg-emerald-900/20 text-emerald-400 px-2 py-1 rounded-md"><Package size={12} /> Produit</span>}
                                        {concept.suggestedAssets?.locationId && <span className="flex items-center gap-1 bg-amber-900/20 text-amber-400 px-2 py-1 rounded-md"><MapPin size={12} /> Lieu</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
