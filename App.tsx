
import React, { useState, useEffect } from 'react';
import { Studio } from './components/Studio';
import { Dashboard } from './components/Dashboard';
import { TrainingWizard } from './components/TrainingWizard';
import { AICharacterCreator } from './components/AICharacterCreator';
import { AppStep, AppState, EntityProfile, GeneratedImage, TrainingData } from './types';
import { Sparkles, LayoutDashboard, Settings } from 'lucide-react';
import { db } from './utils/db';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    people: [],
    products: [],
    gallery: [],
    likedPrompts: []
  });
  const [view, setView] = useState<AppStep>(AppStep.STUDIO); // Default to STUDIO
  const [isLoading, setIsLoading] = useState(true);

  // Load data from IndexedDB on startup
  useEffect(() => {
    const loadData = async () => {
      try {
        const profiles = await db.getProfiles();
        const gallery = await db.getGallery();
        
        const people = profiles.filter((p: any) => p.type === 'PERSON');
        const products = profiles.filter((p: any) => p.type === 'PRODUCT');

        setState({
          people,
          products,
          gallery,
          likedPrompts: []
        });
        
        // Removed forced redirection to Onboarding
      } catch (e) {
        console.error("Failed to load DB", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Handlers for State Updates (also sync to DB)

  const handleOnboardingComplete = async (data: TrainingData) => {
    const userProfile: EntityProfile = {
      id: 'user_main',
      name: data.userName,
      description: data.userDescription,
      images: data.userImages,
      type: 'PERSON'
    };

    const productProfile: EntityProfile = {
      id: Date.now().toString(),
      name: data.productName,
      description: data.productDescription,
      images: data.productImages,
      type: 'PRODUCT'
    };

    await db.saveProfile(userProfile);
    await db.saveProfile(productProfile);

    setState(prev => ({
      ...prev,
      people: [...prev.people, userProfile],
      products: [...prev.products, productProfile]
    }));
    setView(AppStep.DASHBOARD);
  };

  const handleUpdatePeople = async (newPeopleList: EntityProfile[]) => {
    // 1. Determine deletions based on current state vs new list
    const deleted = state.people.filter(p => !newPeopleList.find(newP => newP.id === p.id));
    
    // 2. Perform DB operations outside of setState
    await Promise.all([
      ...deleted.map(d => db.deleteProfile(d.id)),
      ...newPeopleList.map(p => db.saveProfile(p))
    ]);

    // 3. Update UI State
    setState(prev => ({
       ...prev, 
       people: newPeopleList 
    }));
  };

  const handleUpdateProducts = async (newProductList: EntityProfile[]) => {
    // 1. Determine deletions
    const deleted = state.products.filter(p => !newProductList.find(newP => newP.id === p.id));
    
    // 2. Perform DB operations
    await Promise.all([
      ...deleted.map(d => db.deleteProfile(d.id)),
      ...newProductList.map(p => db.saveProfile(p))
    ]);

    // 3. Update UI State
    setState(prev => ({
       ...prev, 
       products: newProductList 
    }));
  };

  const handleImageGenerated = async (img: GeneratedImage) => {
    await db.saveImage(img);
    setState(prev => ({
      ...prev,
      gallery: [img, ...prev.gallery]
    }));
  };

  const handleFeedback = async (id: string, type: 'like' | 'dislike') => {
    const targetImg = state.gallery.find(g => g.id === id);
    if (targetImg) {
      const updatedImg = { ...targetImg, feedback: type };
      await db.updateImage(updatedImg); // Update DB
      
      setState(prev => {
        let newLikedPrompts = [...prev.likedPrompts];
        if (type === 'like' && !newLikedPrompts.includes(targetImg.prompt)) {
          newLikedPrompts.push(targetImg.prompt);
        } else if (type === 'dislike') {
          newLikedPrompts = newLikedPrompts.filter(p => p !== targetImg.prompt);
        }
        
        return {
          ...prev,
          gallery: prev.gallery.map(g => g.id === id ? updatedImg : g),
          likedPrompts: newLikedPrompts
        };
      });
    }
  };

  const handleSaveAIProfile = async (profile: EntityProfile) => {
    await db.saveProfile(profile);
    setState(prev => ({
      ...prev,
      people: [...prev.people, profile]
    }));
    setView(AppStep.STUDIO);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Chargement de Studio Photo Pulsee...</div>;
  }

  // If onboarding, show only wizard
  if (view === AppStep.ONBOARDING) {
    return (
      <div className="min-h-screen bg-black text-white">
         <nav className="border-b border-gray-800 p-4">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="text-blue-500" /> Studio Photo Pulsee
            </div>
         </nav>
         <div className="pt-10">
           <TrainingWizard onComplete={handleOnboardingComplete} />
         </div>
      </div>
    );
  }

  if (view === AppStep.AI_CREATOR) {
    return (
       <div className="min-h-screen bg-black text-white">
          <AICharacterCreator 
            onSave={handleSaveAIProfile} 
            onCancel={() => setView(AppStep.STUDIO)} 
          />
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-blue-500/30 pb-20">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(AppStep.STUDIO)}>
            <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-2 rounded-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden md:block">Studio Photo Pulsee</span>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
            <NavButton 
              active={view === AppStep.STUDIO} 
              onClick={() => setView(AppStep.STUDIO)} 
              icon={Settings} 
              label="Studio" 
            />
            <NavButton 
              active={view === AppStep.DASHBOARD} 
              onClick={() => setView(AppStep.DASHBOARD)} 
              icon={LayoutDashboard} 
              label="Créer" 
            />
          </div>
        </div>
      </nav>

      <main>
        {view === AppStep.DASHBOARD && (
          <Dashboard 
            appState={state} 
            onImageGenerated={handleImageGenerated} 
            onFeedback={handleFeedback}
            onQuickAI={(profile) => {
              handleSaveAIProfile(profile);
            }}
          />
        )}
        {view === AppStep.STUDIO && (
          <Studio 
            people={state.people}
            products={state.products}
            onUpdatePeople={handleUpdatePeople}
            onUpdateProducts={handleUpdateProducts}
            onOpenAICreator={() => setView(AppStep.AI_CREATOR)}
          />
        )}
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: any; label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
      active ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
    }`}
  >
    <Icon size={16} />
    {label}
  </button>
);

export default App;
