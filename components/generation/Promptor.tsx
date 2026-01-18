import React, { useState } from 'react';
import { refinePrompt } from '../../services/geminiService';
import { Wand2, ArrowRight, Copy, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';

interface PromptorProps {
  onUsePrompt: (prompt: string) => void;
  contextUser?: string;
  contextProduct?: string;
  contextLocation?: string; // NEW: Location/background context
}

export const Promptor: React.FC<PromptorProps> = ({ onUsePrompt, contextUser, contextProduct, contextLocation }) => {
  const [input, setInput] = useState('');
  const [refined, setRefined] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRefine = async () => {
    if (!input.trim()) return;
    setLoading(true);

    // Build comprehensive context with all selected elements
    let contextParts: string[] = [];
    if (contextUser) contextParts.push(`Person/Model: ${contextUser}`);
    if (contextProduct) contextParts.push(`Product: ${contextProduct}`);
    if (contextLocation) contextParts.push(`Location/Background: ${contextLocation}`);

    const context = contextParts.length > 0
      ? contextParts.join('. ')
      : 'General commercial photography';

    const result = await refinePrompt(input, context);
    setRefined(result);
    setLoading(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-blue-400">
        <Wand2 size={20} />
        <h3 className="font-bold">Le Master Prompteur</h3>
      </div>
      <p className="text-xs text-gray-400">
        Transformez vos idées simples en "Master Prompts" professionnels avec un éclairage détaillé, des réglages caméra et une direction artistique.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ex: déjeuner sur mars, heure dorée"
          className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
        />
        <Button onClick={handleRefine} disabled={loading} variant="secondary" className="px-3 py-2">
          {loading ? <Sparkles className="animate-spin" size={16} /> : <ArrowRight size={16} />}
        </Button>
      </div>

      {refined && (
        <div className="bg-gray-800/50 rounded-lg p-3 animate-fade-in border border-blue-500/30">
          <div className="max-h-32 overflow-y-auto custom-scrollbar mb-3">
            <p className="text-xs text-gray-300 leading-relaxed">"{refined}"</p>
          </div>
          <Button
            onClick={() => onUsePrompt(refined)}
            variant="primary"
            className="w-full text-xs py-2 h-auto"
          >
            Utiliser ce Master Prompt
          </Button>
        </div>
      )}
    </div>
  );
};