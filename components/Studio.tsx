
import React, { useState, useEffect } from 'react';
import { EntityProfile } from '../types';
import { ImageUploader } from './ImageUploader';
import { Button } from './Button';
import { analyzeImageForTraining } from '../services/geminiService';
import { Plus, Trash2, Save, RefreshCw, Edit2, Check, Sparkles, User, UserPlus, Ruler, X } from 'lucide-react';

interface StudioProps {
  people: EntityProfile[];
  products: EntityProfile[];
  onUpdatePeople: (people: EntityProfile[]) => void;
  onUpdateProducts: (products: EntityProfile[]) => void;
  onOpenAICreator: () => void;
}

export const Studio: React.FC<StudioProps> = ({ people, products, onUpdatePeople, onUpdateProducts, onOpenAICreator }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [editDimensions, setEditDimensions] = useState('');

  const startEdit = (entity: EntityProfile) => {
    setEditingId(entity.id);
    setEditName(entity.name);
    setEditImages(entity.images);
    setEditDescription(entity.description);
    setEditDimensions(entity.dimensions || '');
  };

  const startNewProduct = () => {
    setEditingId('new_product');
    setEditName('');
    setEditImages([]);
    setEditDescription('');
    setEditDimensions('');
  };

  const startNewPerson = () => {
    setEditingId('new_person');
    setEditName('');
    setEditImages([]);
    setEditDescription('');
    setEditDimensions('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditImages([]);
    setEditDescription('');
    setEditDimensions('');
  };

  const handleAnalyze = async (type: 'PERSON' | 'PRODUCT') => {
    if (editImages.length === 0) {
      alert("Veuillez d'abord télécharger des images.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const desc = await analyzeImageForTraining(editImages, type);
      setEditDescription(desc);
    } catch (error) {
      alert("L'analyse a échoué. Veuillez réessayer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async (type: 'PERSON' | 'PRODUCT') => {
    if (!editName || editImages.length === 0) {
      alert("Veuillez fournir un nom et télécharger au moins une image.");
      return;
    }
    
    setIsSaving(true);
    let finalDescription = editDescription;

    // AUTO-GENERATE Description if missing ("The Truth")
    if (!finalDescription) {
      try {
        finalDescription = await analyzeImageForTraining(editImages, type);
        setEditDescription(finalDescription); 
      } catch (error) {
        alert("Échec de l'auto-génération de la description. Vous pouvez essayer d'enregistrer à nouveau ou écrire manuellement.");
        setIsSaving(false);
        return;
      }
    }
    
    const newEntity: EntityProfile = {
      id: (editingId === 'new_product' || editingId === 'new_person') ? Date.now().toString() : editingId!,
      name: editName,
      description: finalDescription,
      images: editImages,
      dimensions: editDimensions,
      type
    };

    if (type === 'PERSON') {
      if (editingId === 'new_person') {
        onUpdatePeople([...people, newEntity]);
      } else {
        onUpdatePeople(people.map(p => p.id === newEntity.id ? newEntity : p));
      }
    } else {
      if (editingId === 'new_product') {
        onUpdateProducts([...products, newEntity]);
      } else {
        onUpdateProducts(products.map(p => p.id === newEntity.id ? newEntity : p));
      }
    }
    setIsSaving(false);
    setEditingId(null);
  };

  const deleteEntity = (id: string, type: 'PERSON' | 'PRODUCT') => {
    if (confirm('Supprimer cet élément ?')) {
      if (type === 'PERSON') {
         onUpdatePeople(people.filter(p => p.id !== id));
      } else {
         onUpdateProducts(products.filter(p => p.id !== id));
      }
    }
  };

  if (editingId) {
    const isNewPerson = editingId === 'new_person';
    const isNewProduct = editingId === 'new_product';
    
    // Check if existing entity is person or product
    const existingEntity = people.find(p => p.id === editingId) || products.find(p => p.id === editingId);
    const isPerson = isNewPerson || (existingEntity && existingEntity.type === 'PERSON');
    
    const type = isPerson ? 'PERSON' : 'PRODUCT';

    return (
      <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl border border-gray-800 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {(isNewPerson || isNewProduct) ? `Ajouter ${isPerson ? 'Modèle' : 'Produit'}` : `Modifier ${isPerson ? 'Modèle' : 'Produit'}`}
          </h2>
          <button onClick={cancelEdit} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-400 mb-2">Nom</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={isPerson ? "Nom du modèle" : "Nom du Produit"}
                />
              </div>
              <div className="col-span-1">
                 <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-1">
                   <Ruler size={14} /> {isPerson ? 'Taille' : 'Dimensions'}
                 </label>
                 <input
                  value={editDimensions}
                  onChange={(e) => setEditDimensions(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={isPerson ? "ex: 1m75" : "ex: 10cm x 5cm"}
                />
              </div>
            </div>

            <ImageUploader
              label="Photos de Référence"
              description={`Téléchargez jusqu'à 20 photos claires de ${isPerson ? 'ce modèle' : 'ce produit'}.`}
              images={editImages}
              onImagesChange={setEditImages}
              maxImages={20}
            />
          </div>

          <div className="space-y-4 flex flex-col">
             <div className="flex justify-between items-center">
               <label className="block text-sm font-medium text-gray-400">
                 Description IA (La "Vérité")
               </label>
               <button 
                  onClick={() => handleAnalyze(type)}
                  disabled={isAnalyzing || isSaving || editImages.length === 0}
                  className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50"
               >
                 <Sparkles size={12} />
                 {isAnalyzing ? 'Analyse...' : 'Régénérer'}
               </button>
             </div>
             
             <div className="relative flex-1">
               <textarea
                 value={editDescription}
                 onChange={(e) => setEditDescription(e.target.value)}
                 className="w-full h-full min-h-[300px] bg-gray-950 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 focus:ring-2 focus:ring-blue-500/50 outline-none resize-none leading-relaxed"
                 placeholder={isAnalyzing || isSaving ? "Analyse des caractéristiques..." : "Téléchargez des photos. Cette description sera générée automatiquement à l'enregistrement si vous la laissez vide."}
               />
               <div className="absolute bottom-4 right-4 text-[10px] text-gray-500 bg-black/50 px-2 py-1 rounded">
                 Astuce : Modifiez ce texte pour corriger les erreurs.
               </div>
             </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-800 mt-6">
          <Button variant="secondary" onClick={cancelEdit} disabled={isSaving}>Annuler</Button>
          <Button onClick={() => handleSave(type)} disabled={isSaving || !editName} isLoading={isSaving}>
            <Save size={18} />
            {isSaving ? 'Création Identité...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Gestion du Studio</h1>
        <p className="text-gray-400">Gérez vos mannequins (Réels ou IA) et votre catalogue de produits.</p>
      </header>

      {/* People Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-white">Modèles & Personnages</h2>
            <p className="text-sm text-gray-400">Gérez les personnes qui apparaîtront dans vos visuels.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onOpenAICreator} variant="secondary" className="py-2 px-4 border-purple-500/30 text-purple-300 hover:bg-purple-900/20">
              <Sparkles size={18} /> Créer Mannequin IA
            </Button>
            <Button onClick={startNewPerson} className="py-2 px-4">
              <UserPlus size={18} /> Ajouter Personne
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.map(person => (
            <div key={person.id} className={`bg-gray-900 border rounded-xl p-4 hover:border-gray-700 transition-colors flex flex-col ${person.isAI ? 'border-purple-900/50 shadow-purple-900/10 shadow-lg' : 'border-gray-800'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                   <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{person.name}</h3>
                      {person.isAI && <span className="text-[10px] bg-purple-900 text-purple-300 px-1.5 rounded border border-purple-700">IA</span>}
                   </div>
                   {person.dimensions && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Ruler size={10}/> {person.dimensions}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(person)} className="p-2 hover:bg-gray-800 rounded text-blue-400">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteEntity(person.id, 'PERSON')} className="p-2 hover:bg-gray-800 rounded text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex -space-x-2 overflow-hidden mb-3">
                {person.images.slice(0, 4).map((img, i) => (
                  <img key={i} src={img} className="w-12 h-12 rounded-full border-2 border-gray-900 object-cover" />
                ))}
              </div>
              <div className="bg-black/20 p-2 rounded border border-gray-800/50 flex-1">
                 <p className="text-[10px] text-gray-500 line-clamp-3 font-mono leading-relaxed">{person.description}</p>
              </div>
            </div>
          ))}
          
          {people.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
              Aucun modèle. Ajoutez une personne ou créez un mannequin IA.
            </div>
          )}
        </div>
      </section>

      {/* Products Section */}
      <section className="space-y-4 pt-8 border-t border-gray-800">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-white">Produits</h2>
            <p className="text-sm text-gray-400">Votre catalogue d'objets entraînés.</p>
          </div>
          <Button onClick={startNewProduct} className="py-2 px-4">
            <Plus size={18} /> Ajouter Produit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => (
            <div key={product.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <h3 className="font-bold text-white">{product.name}</h3>
                  {product.dimensions && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Ruler size={10}/> {product.dimensions}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(product)} className="p-2 hover:bg-gray-800 rounded text-blue-400">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteEntity(product.id, 'PRODUCT')} className="p-2 hover:bg-gray-800 rounded text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 overflow-hidden h-24 rounded-lg bg-gray-950 mb-3 shrink-0">
                {product.images.slice(0, 3).map((img, i) => (
                  <img key={i} src={img} className="h-full w-auto object-cover" />
                ))}
                 {product.images.length > 3 && (
                  <div className="w-16 h-full bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                    +{product.images.length - 3}
                  </div>
                 )}
              </div>
              <div className="bg-black/20 p-2 rounded border border-gray-800/50 flex-1">
                 <p className="text-[10px] text-gray-500 line-clamp-3 font-mono leading-relaxed">{product.description}</p>
              </div>
            </div>
          ))}
          
          {products.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-800 rounded-xl text-gray-500">
              Aucun produit. Cliquez sur "Ajouter Produit" pour commencer.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
