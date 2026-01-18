import React from 'react';
import { MarketingPersona } from '../../types';
import { MARKETING_PERSONAS } from '../../data/personas';
import { Users, Sparkles } from 'lucide-react';

interface PersonaSelectorProps {
    selectedPersona: MarketingPersona | null;
    onSelectPersona: (persona: MarketingPersona | null) => void;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
    selectedPersona,
    onSelectPersona
}) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold">
                    <Users size={16} className="text-purple-500" />
                    <h3>Persona Cible</h3>
                </div>
                {selectedPersona && (
                    <button
                        onClick={() => onSelectPersona(null)}
                        className="text-[10px] text-gray-400 hover:text-white px-2 py-1 bg-gray-800 rounded"
                    >
                        Effacer
                    </button>
                )}
            </div>

            <p className="text-[10px] text-gray-500">
                Optionnel : sélectionnez une audience cible pour guider le style des visuels
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {MARKETING_PERSONAS.map((persona) => {
                    const isSelected = selectedPersona?.id === persona.id;
                    return (
                        <button
                            key={persona.id}
                            onClick={() => onSelectPersona(isSelected ? null : persona)}
                            className={`relative p-3 rounded-lg border text-left transition-all overflow-hidden group ${isSelected
                                ? 'border-purple-500 ring-1 ring-purple-500/50 bg-purple-900/20'
                                : 'border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-800/50'
                                }`}
                        >
                            {/* Gradient background */}
                            <div
                                className={`absolute inset-0 bg-gradient-to-br ${persona.color} opacity-5 group-hover:opacity-10 pointer-events-none transition-opacity`}
                            />

                            {/* Content */}
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{persona.icon}</span>
                                    <span
                                        className={`text-xs font-bold ${isSelected ? 'text-purple-300' : 'text-gray-300'
                                            }`}
                                    >
                                        {persona.name}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 line-clamp-2">
                                    {persona.description}
                                </p>
                            </div>

                            {/* Selected indicator */}
                            {isSelected && (
                                <div className="absolute top-2 right-2">
                                    <Sparkles size={12} className="text-purple-400" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Selected persona keywords */}
            {selectedPersona && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{selectedPersona.icon}</span>
                        <span className="text-sm font-bold text-purple-300">
                            {selectedPersona.name}
                        </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">
                        {selectedPersona.energyNeed}
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {selectedPersona.visualKeywords.slice(0, 4).map((keyword, idx) => (
                            <span
                                key={idx}
                                className="text-[9px] bg-purple-800/30 text-purple-300 px-2 py-0.5 rounded-full"
                            >
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
