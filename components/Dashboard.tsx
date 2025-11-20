
import React, { useState, useEffect } from 'react';
import { AppState, GenerationMode, GeneratedImage } from '../types';
import { generateBrandVisual, suggestPrompts } from '../services/geminiService';
import { Button } from './Button';
import { Promptor } from './Promptor';
import { Sparkles, User, Package, Users, Download, ThumbsUp, ThumbsDown, CheckCircle2, Circle, AlertTriangle, Layers, Maximize2, X } from 'lucide-react';

interface DashboardProps {
  appState: AppState;
  onImageGenerated: (img: GeneratedImage) => void;
  onFeedback: (id: string, type: 'like' | 'dislike') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ appState, onImageGenerated, onFeedback }) => {
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.COMBINED);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [variationCount, setVariationCount] = useState<number>(1);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    appState.products.length > 0 ? [appState.products[0].id] : []
  );
  const [showPromptor, setShowPromptor] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);

  const user = appState.user;
  const selectedProducts = appState.products.filter(p => selectedProductIds.includes(p.id));
  const primaryProduct = selectedProducts[0] || null;

  useEffect(() => {
    if (user && primaryProduct) {
      suggestPrompts(user.description, primaryProduct.description).then(setSuggestions);
    }
  }, [primaryProduct?.id, user?.id]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) 
        ? prev.filter(pid => pid !== id)
        : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!prompt) {
      alert("Please enter a prompt description.");
      return;
    }
    
    if (mode !== GenerationMode.USER_ONLY && selectedProducts.length === 0) {
      alert("Please select at least one product for this mode.");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(`Initializing...`);
    
    let successCount = 0;
    let errors: string[] = [];

    for (let i = 0; i < variationCount; i++) {
      setGenerationProgress(`Generating visual ${i + 1}/${variationCount}...`);
      
      try {
        const url = await generateBrandVisual(
          prompt, 
          mode, 
          user, 
          selectedProducts, 
          appState.likedPrompts
        );
        
        const newImage: GeneratedImage = {
          id: Date.now().toString() + Math.random().toString().slice(2, 5),
          url,
          prompt,
          mode,
          productId: primaryProduct?.id, 
          timestamp: Date.now()
        };
        
        onImageGenerated(newImage);
        successCount++;
        
      } catch (error: any) {
        console.error(`Variation ${i+1} failed:`, error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        errors.push(msg);
      }
    }

    setIsGenerating(false);
    setGenerationProgress('');

    if (successCount === 0 && errors.length > 0) {
       alert(`Generation failed.\n${errors[0]}`);
    }
  };

  const recentImages = [...appState.gallery].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Mode Selector */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
             <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-lg">
              {[
                { id: GenerationMode.USER_ONLY, icon: User, label: 'Me' },
                { id: GenerationMode.COMBINED, icon: Users, label: 'Combined' },
                { id: GenerationMode.PRODUCT_ONLY, icon: Package, label: 'Product' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-md text-xs font-medium transition-all ${
                    mode === m.id 
                      ? 'bg-gray-800 text-blue-400 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <m.icon size={16} />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Product Selection */}
            {mode !== GenerationMode.USER_ONLY && (
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                   <label className="text-xs font-medium text-gray-400 block">
                     Select Products ({selectedProductIds.length})
                   </label>
                   <span className="text-[10px] text-gray-600">Max 2 references used</span>
                </div>
                {appState.products.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {appState.products.map(p => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <div 
                          key={p.id}
                          onClick={() => toggleProduct(p.id)}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${
                            isSelected 
                              ? 'bg-blue-900/20 border-blue-500/50' 
                              : 'bg-gray-800 border-gray-800 hover:border-gray-700'
                          }`}
                        >
                          <div className={`shrink-0 ${isSelected ? 'text-blue-400' : 'text-gray-600'}`}>
                            {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </div>
                          <img src={p.images[0]} alt={p.name} className="w-8 h-8 rounded object-cover bg-gray-900" />
                          <span className={`text-sm truncate ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                            {p.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900/50 flex items-center gap-2">
                    <AlertTriangle size={14} />
                    No products. Add one in Studio.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompting Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white">Create Visual</h3>
              <button 
                onClick={() => setShowPromptor(!showPromptor)}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Sparkles size={12} />
                {showPromptor ? 'Hide Promptor' : 'Open Promptor'}
              </button>
            </div>

            {showPromptor && (
              <Promptor 
                onUsePrompt={(p) => { setPrompt(p); setShowPromptor(false); }} 
                contextUser={user?.name}
                contextProduct={primaryProduct?.name}
              />
            )}

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === GenerationMode.COMBINED 
                ? `Describe ${user?.name || 'the person'} using the selected products...` 
                : "Describe the scene, lighting, and mood..."}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-white h-32 resize-none focus:ring-2 focus:ring-blue-500/50 outline-none text-sm"
            />
            
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => setPrompt(s)}
                    className="text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-full border border-gray-700 transition-colors truncate max-w-[200px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Variations Slider */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
                  <Layers size={14} className="text-blue-500" />
                  Variations per batch
                </div>
                <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">
                  {variationCount}
                </span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={variationCount}
                onChange={(e) => setVariationCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1 px-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              isLoading={isGenerating} 
              className="w-full" 
              disabled={!prompt.trim() || (mode !== GenerationMode.USER_ONLY && selectedProductIds.length === 0)}
            >
              {isGenerating ? (
                <span className="flex flex-col items-center leading-tight">
                  <span>Processing...</span>
                  <span className="text-[10px] opacity-75 font-normal">{generationProgress}</span>
                </span>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate {variationCount > 1 ? `Batch (${variationCount})` : ''}
                </>
              )}
            </Button>
          </div>

          {appState.likedPrompts.length > 0 && (
            <div className="p-3 bg-blue-900/10 border border-blue-500/10 rounded-lg text-xs text-blue-300/80">
              <span className="font-bold">Memory Active:</span> I'm using your style preferences from previous likes.
            </div>
          )}
        </div>

        {/* Right: Gallery Stream */}
        <div className="lg:col-span-2">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Local History</h2>
              <span className="text-xs text-gray-500">{recentImages.length} items stored locally</span>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {recentImages.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl">
                <Sparkles size={32} className="mb-3 opacity-50" />
                <p>No images yet. Start creating!</p>
              </div>
            ) : (
              recentImages.map((img) => (
                <div 
                  key={img.id} 
                  className="group relative bg-gray-900 rounded-lg overflow-hidden shadow-lg border border-gray-800 hover:border-blue-500/50 transition-all cursor-pointer"
                  onClick={() => setLightboxImage(img)}
                >
                  <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
                  
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Maximize2 className="text-white" size={24} />
                  </div>
                  
                  {img.feedback && (
                     <div className="absolute top-2 right-2">
                        {img.feedback === 'like' ? (
                          <div className="bg-blue-600 p-1 rounded-full shadow-lg"><ThumbsUp size={10} className="text-white" /></div>
                        ) : (
                          <div className="bg-red-600 p-1 rounded-full shadow-lg"><ThumbsDown size={10} className="text-white" /></div>
                        )}
                     </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <button 
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full text-white hover:bg-gray-700"
          >
            <X size={24} />
          </button>

          <div className="max-w-5xl w-full flex flex-col md:flex-row bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl max-h-[90vh]">
            
            {/* Image Area */}
            <div className="flex-1 bg-black flex items-center justify-center p-4 relative">
              <img src={lightboxImage.url} className="max-w-full max-h-[70vh] md:max-h-full object-contain" alt="Generated" />
            </div>

            {/* Details Sidebar */}
            <div className="w-full md:w-80 bg-gray-900 p-6 flex flex-col border-l border-gray-800">
              <h3 className="font-bold text-lg mb-4 text-white">Visual Details</h3>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="mb-4">
                   <label className="text-xs font-mono text-gray-500 uppercase">Prompt</label>
                   <p className="text-sm text-gray-300 leading-relaxed mt-1">{lightboxImage.prompt}</p>
                </div>
                
                <div className="mb-4">
                   <label className="text-xs font-mono text-gray-500 uppercase">Mode</label>
                   <p className="text-sm text-blue-400 mt-1">{lightboxImage.mode}</p>
                </div>

                <div className="mb-4">
                   <label className="text-xs font-mono text-gray-500 uppercase">Date</label>
                   <p className="text-sm text-gray-400 mt-1">{new Date(lightboxImage.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                 <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onFeedback(lightboxImage.id, 'like'); }}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${lightboxImage.feedback === 'like' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      <ThumbsUp size={16} /> Like
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onFeedback(lightboxImage.id, 'dislike'); }}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${lightboxImage.feedback === 'dislike' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      <ThumbsDown size={16} /> Dislike
                    </button>
                 </div>
                 
                 <a 
                   href={lightboxImage.url}
                   download={`gemini-visual-${lightboxImage.id}.png`}
                   className="w-full py-3 bg-white text-black font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                 >
                   <Download size={18} /> Download HD
                 </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
