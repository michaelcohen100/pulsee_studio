
import React, { useState } from 'react';
import { generateAIModelDescription, generateAIModelImages } from '../services/geminiService';
import { Button } from './Button';
import { EntityProfile } from '../types';
import { Sparkles, Save, RefreshCw, User, ArrowLeft, Camera, Ruler } from 'lucide-react';

interface AICharacterCreatorProps {
  onSave: (profile: EntityProfile) => void;
  onCancel: () => void;
}

export const AICharacterCreator: React.FC<AICharacterCreatorProps> = ({ onSave, onCancel }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [idea, setIdea] = useState('');
  const [height, setHeight] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [description, setDescription] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [name, setName] = useState('');

  const handleGenerateDescription = async () => {
    if (!idea.trim()) return;
    setIsProcessing(true);
    try {
      // Include height in the prompt if provided
      const fullConcept = `${idea} ${height ? `. The character is ${height} tall.` : ''}`;
      const desc = await generateAIModelDescription(fullConcept);
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
    setGeneratedImages([]); // Clear previous
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
      dimensions: height,
      type: 'PERSON',
      isAI: true
    };
    onSave(newProfile);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
           <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Sparkles className="text-purple-500" /> Créateur de Mannequin IA
          </h1>
          <p className="text-gray-400">Inventez un personnage virtuel cohérent avec planche de référence complète.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 text-white">1. Le Concept</h3>
            
            <div className="mb-4">
              <label className="text-xs text-gray-500 uppercase font-medium mb-1 block">Taille (cm)</label>
              <div className="relative">
                <Ruler size={14} className="absolute top-3 left-3 text-gray-500" />
                <input 
                  type="text" 
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="ex: 1m75"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            <label className="text-xs text-gray-500 uppercase font-medium mb-1 block">Description</label>
            <textarea 
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="ex: Une femme scandinave d'environ 25 ans, cheveux blonds courts, style minimaliste, yeux bleus..."
              className="w-full h-32 bg-gray-950 border border-gray-800 rounded-lg p-3 text-white resize-none focus:ring-2 focus:ring-purple-500 outline-none mb-4 text-sm"
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
                 <label className="text-xs text-gray-500 uppercase">Description Technique</label>
                 <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full h-40 bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 resize-none outline-none mt-1"
                 />
              </div>
              <Button 
                onClick={handleGenerateImages} 
                isLoading={isProcessing && step === 2 && generatedImages.length === 0}
                disabled={!description || isProcessing}
                variant="secondary"
                className="w-full text-xs"
              >
                <Camera size={16} className={isProcessing ? "animate-spin" : ""} /> 
                {generatedImages.length > 0 ? "Régénérer le Shooting" : "Lancer le Shooting (6 Photos)"}
              </Button>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6 flex flex-col">
           <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2">
             <User /> Planche Contact du Mannequin
           </h3>
           
           {generatedImages.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
               {generatedImages.map((img, i) => {
                 const labels = ["Face Neutre", "Face Souriant", "Face Triste", "Profil", "Plein Pied", "Plan Américain"];
                 return (
                   <div key={i} className="space-y-2">
                      <div className="aspect-square rounded-lg border border-gray-700 shadow-lg overflow-hidden relative group">
                        <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={`AI Ref ${i}`} />
                      </div>
                      <p className="text-xs text-center text-gray-400 font-mono">{labels[i] || `Pose ${i+1}`}</p>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl min-h-[400px] text-gray-600">
               {isProcessing ? (
                 <div className="flex flex-col items-center gap-4">
                    <Sparkles className="animate-spin text-purple-500" size={48} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-white mb-1">Séance photo IA en cours...</p>
                      <p className="text-xs text-gray-400">Génération des vues: Face, Profil, Expressions, Plein pied.</p>
                    </div>
                 </div>
               ) : (
                 <>
                   <Camera size={48} className="mb-2 opacity-50" />
                   <p className="text-sm">Les 6 photos de référence apparaîtront ici</p>
                 </>
               )}
             </div>
           )}

           {generatedImages.length > 0 && (
             <div className="mt-auto pt-6 border-t border-gray-800 space-y-4 animate-fade-in bg-gray-900/80 p-4 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nommer ce Mannequin</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ex: Clara (Mannequin IA)"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <Button onClick={handleSave} disabled={!name} className="w-full bg-purple-600 hover:bg-purple-500">
                  <Save size={18} /> Enregistrer le Profil Complet
                </Button>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};
