
import React, { useState } from 'react';
import { generateAIModelDescription, generateAIModelImages } from '../services/geminiService';
import { Button } from './Button';
import { EntityProfile } from '../types';
import { Sparkles, Save, RefreshCw, User, ArrowLeft } from 'lucide-react';

interface AICharacterCreatorProps {
  onSave: (profile: EntityProfile) => void;
  onCancel: () => void;
}

export const AICharacterCreator: React.FC<AICharacterCreatorProps> = ({ onSave, onCancel }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [idea, setIdea] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [description, setDescription] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [name, setName] = useState('');

  const handleGenerateDescription = async () => {
    if (!idea.trim()) return;
    setIsProcessing(true);
    try {
      const desc = await generateAIModelDescription(idea);
      setDescription(desc);
      setStep(2);
    } catch (e) {
      alert("Erreur lors de la génération de la description.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!description) return;
    setIsProcessing(true);
    try {
      const images = await generateAIModelImages(description);
      setGeneratedImages(images);
    } catch (e) {
      alert("Erreur lors de la génération des images.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (!name || generatedImages.length === 0) return;
    
    const newProfile: EntityProfile = {
      id: `ai_${Date.now()}`,
      name: name,
      description: description,
      images: generatedImages,
      type: 'PERSON',
      isAI: true
    };
    onSave(newProfile);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
           <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Sparkles className="text-purple-500" /> Créateur de Mannequin IA
          </h1>
          <p className="text-gray-400">Inventez un personnage virtuel réaliste pour vos shootings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Controls */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 text-white">1. Le Concept</h3>
            <textarea 
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="ex: Une femme scandinave d'environ 25 ans, cheveux blonds courts, style minimaliste, yeux bleus, expression confiante..."
              className="w-full h-32 bg-gray-950 border border-gray-800 rounded-lg p-3 text-white resize-none focus:ring-2 focus:ring-purple-500 outline-none mb-4"
            />
            <Button 
              onClick={handleGenerateDescription} 
              isLoading={isProcessing && step === 1}
              disabled={!idea.trim() || isProcessing}
              className="w-full"
            >
              Générer la Description Physique
            </Button>
          </div>

          {step >= 2 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-fade-in">
              <h3 className="font-bold text-lg mb-4 text-white">2. Identité Visuelle</h3>
              <div className="mb-4">
                 <label className="text-xs text-gray-500 uppercase">Description Technique (Générée)</label>
                 <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full h-40 bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 resize-none outline-none mt-1"
                 />
              </div>
              <Button 
                onClick={handleGenerateImages} 
                isLoading={isProcessing && step === 2 && generatedImages.length === 0}
                disabled={!description || isProcessing}
                variant="secondary"
                className="w-full"
              >
                <RefreshCw size={18} className={isProcessing ? "animate-spin" : ""} /> 
                {generatedImages.length > 0 ? "Régénérer les Photos" : "Générer les Photos de Référence"}
              </Button>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 flex flex-col">
           <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
             <User /> Aperçu du Mannequin
           </h3>
           
           {generatedImages.length > 0 ? (
             <div className="grid grid-cols-2 gap-4 mb-6">
               {generatedImages.map((img, i) => (
                 <img key={i} src={img} className="w-full aspect-square object-cover rounded-lg border border-gray-700 shadow-lg" alt={`AI Ref ${i}`} />
               ))}
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl min-h-[300px] text-gray-600">
               {isProcessing ? (
                 <Sparkles className="animate-spin mb-2" size={32} />
               ) : (
                 <User size={48} className="mb-2 opacity-50" />
               )}
               <p className="text-sm">{isProcessing ? "Création en cours..." : "Les photos apparaîtront ici"}</p>
             </div>
           )}

           {generatedImages.length > 0 && (
             <div className="mt-auto pt-6 border-t border-gray-800 space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nom du Personnage</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ex: Clara (AI)"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <Button onClick={handleSave} disabled={!name} className="w-full bg-purple-600 hover:bg-purple-500">
                  <Save size={18} /> Enregistrer dans le Studio
                </Button>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};
