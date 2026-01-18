import React from 'react';
import { ArtStyle } from '../../types';
import { Palette } from 'lucide-react';

// ============================================
// ART STYLES DATA
// ============================================
export const ART_STYLES: ArtStyle[] = [
    {
        id: 'none',
        label: 'Naturel',
        promptModifier: 'Natural lighting, realistic photography, neutral tones.',
        icon: '📷',
        color: 'from-gray-700 to-gray-600',
        category: 'studio'
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

// ============================================
// STYLE SELECTOR COMPONENT
// ============================================
interface StyleSelectorProps {
    selectedStyle: ArtStyle;
    onSelectStyle: (style: ArtStyle) => void;
    disabled?: boolean;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({
    selectedStyle,
    onSelectStyle,
    disabled = false
}) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold">
                <Palette size={16} className="text-cyan-500" />
                <h3>Style</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {ART_STYLES.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => onSelectStyle(style)}
                        disabled={disabled}
                        className={`relative p-2 rounded-lg border text-xs font-medium transition-all ${selectedStyle.id === style.id
                                ? `bg-gradient-to-br ${style.color} border-white/30 shadow-lg scale-105`
                                : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <span className="text-lg">{style.icon}</span>
                        <span className={`block mt-1 ${selectedStyle.id === style.id ? 'text-white' : 'text-gray-400'}`}>
                            {style.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
