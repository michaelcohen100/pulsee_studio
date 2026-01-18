import React from 'react';
import { EntityProfile } from '../../types';
import { User, Package, CheckCircle2, Circle, Zap, Sparkles, MapPin, Check, UserPlus } from 'lucide-react';

// ============================================
// ASSET SELECTION SECTION
// ============================================

interface AssetListItemProps {
    item: EntityProfile;
    isSelected: boolean;
    onToggle: (id: string) => void;
    color: 'purple' | 'blue' | 'emerald';
    showAIBadge?: boolean;
}

const AssetListItem: React.FC<AssetListItemProps> = ({
    item,
    isSelected,
    onToggle,
    color,
    showAIBadge = false
}) => {
    const colorClasses = {
        purple: {
            bg: 'bg-purple-900/20 border-purple-500/50',
            check: 'text-purple-400',
            text: 'text-white'
        },
        blue: {
            bg: 'bg-blue-900/20 border-blue-500/50',
            check: 'text-blue-400',
            text: 'text-white'
        },
        emerald: {
            bg: 'bg-emerald-900/20 border-emerald-500/50',
            check: 'text-emerald-400',
            text: 'text-white'
        }
    };

    const c = colorClasses[color];

    const getIcon = () => {
        if (item.type === 'PERSON') return <User size={12} />;
        if (item.type === 'PRODUCT') return <Package size={12} />;
        return <MapPin size={12} />;
    };

    const getImageClass = () => {
        if (item.type === 'PERSON') return 'w-8 h-8 rounded-full object-cover';
        if (item.type === 'PRODUCT') return 'w-8 h-8 object-contain bg-white rounded-lg p-0.5';
        return 'w-8 h-8 object-cover rounded-lg';
    };

    return (
        <div
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${isSelected ? c.bg : 'bg-gray-800 border-gray-800 hover:border-gray-700'
                }`}
        >
            <div className={isSelected ? c.check : 'text-gray-600'}>
                {isSelected ? <CheckCircle2 size={16} /> : <Circle size={16} />}
            </div>
            {item.images.length > 0 ? (
                <img src={item.images[0]} alt={item.name} className={getImageClass()} />
            ) : (
                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                    {getIcon()}
                </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-sm truncate ${isSelected ? c.text : 'text-gray-400'}`}>
                    {item.name}
                </span>
                {showAIBadge && item.isAI && (
                    <span className="text-[8px] text-purple-400 bg-purple-900/30 px-1 rounded w-fit">IA</span>
                )}
            </div>
        </div>
    );
};

// ============================================
// ASSET SELECTOR PROPS
// ============================================

interface AssetSelectorProps {
    // Data
    people: EntityProfile[];
    products: EntityProfile[];
    locations: EntityProfile[];

    // Selection state
    selectedPersonIds: string[];
    selectedProductIds: string[];
    selectedLocationId: string | null;

    // Handlers
    onTogglePerson: (id: string) => void;
    onToggleProduct: (id: string) => void;
    onToggleLocation: (id: string) => void;

    // Packshot mode
    isPackshot: boolean;
    onTogglePackshot: () => void;

    // Quick AI feature
    showQuickAI: boolean;
    quickAIInput: string;
    isCreatingQuickAI: boolean;
    onShowQuickAI: (show: boolean) => void;
    onQuickAIInputChange: (value: string) => void;
    onCreateQuickAI: () => void;

    // UI state
    disabled?: boolean;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({
    people,
    products,
    locations,
    selectedPersonIds,
    selectedProductIds,
    selectedLocationId,
    onTogglePerson,
    onToggleProduct,
    onToggleLocation,
    isPackshot,
    onTogglePackshot,
    showQuickAI,
    quickAIInput,
    isCreatingQuickAI,
    onShowQuickAI,
    onQuickAIInputChange,
    onCreateQuickAI,
    disabled = false
}) => {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">

            {/* PEOPLE SECTION */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-400 flex items-center gap-1">
                        <User size={12} /> Personnes ({selectedPersonIds.length})
                    </label>
                    <button
                        onClick={() => onShowQuickAI(!showQuickAI)}
                        className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-900/20 px-1.5 py-0.5 rounded"
                        disabled={disabled}
                    >
                        <UserPlus size={10} /> + IA Rapide
                    </button>
                </div>

                {/* Quick AI Creator */}
                {showQuickAI && (
                    <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-2 space-y-2 animate-fade-in">
                        <input
                            type="text"
                            value={quickAIInput}
                            onChange={(e) => onQuickAIInputChange(e.target.value)}
                            placeholder="Décrivez le personnage IA..."
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                            disabled={isCreatingQuickAI}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => onShowQuickAI(false)}
                                className="flex-1 text-xs py-1.5 bg-gray-800 rounded text-gray-400"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={onCreateQuickAI}
                                disabled={isCreatingQuickAI || !quickAIInput.trim()}
                                className="flex-1 text-xs py-1.5 bg-purple-600 rounded text-white flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                                {isCreatingQuickAI ? <Sparkles size={12} className="animate-spin" /> : <Zap size={12} />}
                                {isCreatingQuickAI ? '...' : 'Créer'}
                            </button>
                        </div>
                    </div>
                )}

                {/* People List */}
                {people.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {people.map(p => (
                            <AssetListItem
                                key={p.id}
                                item={p}
                                isSelected={selectedPersonIds.includes(p.id)}
                                onToggle={onTogglePerson}
                                color="purple"
                                showAIBadge
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-500 text-xs italic p-2 border border-gray-800 rounded bg-gray-800/50 text-center">
                        Aucun modèle.
                    </div>
                )}
            </div>

            {/* PRODUCTS SECTION */}
            <div className="space-y-2 pt-3 border-t border-gray-800">
                <label className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <Package size={12} /> Produits ({selectedProductIds.length})
                </label>

                {products.length > 0 ? (
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {products.map(p => (
                            <AssetListItem
                                key={p.id}
                                item={p}
                                isSelected={selectedProductIds.includes(p.id)}
                                onToggle={onToggleProduct}
                                color="blue"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-500 text-xs italic p-2 border border-gray-800 rounded bg-gray-800/50 text-center">
                        Aucun produit.
                    </div>
                )}

                {/* Packshot Mode Toggle */}
                <div className="mt-3 pt-3 border-t border-gray-800">
                    <div
                        onClick={onTogglePackshot}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${isPackshot
                                ? 'bg-blue-900/30 border-blue-500/50'
                                : selectedProductIds.length === 0
                                    ? 'bg-gray-800/30 border-gray-800 opacity-50 cursor-not-allowed'
                                    : 'bg-gray-800/50 border-gray-800 hover:border-gray-700'
                            }`}
                    >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isPackshot ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}`}>
                            {isPackshot && <Check size={10} className="text-black" />}
                        </div>
                        <div className="flex-1">
                            <span className={`text-sm font-medium ${isPackshot ? 'text-blue-200' : 'text-gray-400'}`}>Mode Packshot</span>
                            <p className="text-[10px] text-gray-500 leading-tight">Produit seul, sans personnage.</p>
                        </div>
                        <Package size={14} className={isPackshot ? 'text-blue-400' : 'text-gray-600'} />
                    </div>
                </div>
            </div>

            {/* LOCATIONS SECTION */}
            <div className="space-y-2 pt-3 border-t border-gray-800">
                <label className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <MapPin size={12} /> Lieux ({selectedLocationId ? 1 : 0})
                </label>

                {locations.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {locations.map(l => (
                            <AssetListItem
                                key={l.id}
                                item={l}
                                isSelected={selectedLocationId === l.id}
                                onToggle={onToggleLocation}
                                color="emerald"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-500 text-xs italic p-2 border border-gray-800 rounded bg-gray-800/50 text-center">
                        Aucun lieu. La description sera utilisée.
                    </div>
                )}
            </div>
        </div>
    );
};
