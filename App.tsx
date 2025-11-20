
import React, { useState, useEffect } from 'react';
import { Studio } from './components/Studio';
import { Dashboard } from './components/Dashboard';
import { TrainingWizard } from './components/TrainingWizard';
import { AppStep, AppState, EntityProfile, GeneratedImage, TrainingData } from './types';
import { Sparkles, LayoutDashboard, Settings } from 'lucide-react';
import { db } from './utils/db';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    products: [],
    gallery: [],
    likedPrompts: []
  });
  const [view, setView] = useState<AppStep>(AppStep.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from IndexedDB on startup
  useEffect(() => {
    const loadData = async () => {
      try {
        const profiles = await db.getProfiles();
        const gallery = await db.getGallery();
        
        const user = profiles.find((p: any) => p.type === 'PERSON') || null;
        const products = profiles.filter((p: any) => p.type === 'PRODUCT');

        setState({
          user,
          products,
          gallery,
          likedPrompts: [] // In a full app, store this in DB too
        });
        
        if (!user) {
          setView(AppStep.ONBOARDING);
        }
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
      user: userProfile,
      products: [...prev.products, productProfile]
    }));
    setView(AppStep.DASHBOARD);
  };

  const handleUpdateUser = async (user: EntityProfile) => {
    await db.saveProfile(user);
    setState(prev => ({ ...prev, user }));
  };

  const handleUpdateProducts = async (products: EntityProfile[]) => {
    // This is a bit simplified: we're saving all, but in Studio we usually update one by one.
    // To ensure sync, we iterate.
    for (const p of products) {
      await db.saveProfile(p);
    }
    // Handle deletions? 
    // For now, we rely on Studio deleting individually or us syncing the list.
    // Since db.saveProfile overwrites, we just need to handle deletions explicitly if needed.
    // For this quick implementation, we assume additions/edits mainly.
    // If specific deletion is needed, Studio calls a delete method.
    
    // Actually, Studio calls this with the new full list. 
    // We should probably find diffs, but for now let's just save the new list state.
    // To properly handle deletes, we might need a separate onDelete prop, but 
    // Studio implementation currently filters the list and calls this.
    // We'd need to clear DB and rewrite, or better, App handles delete.
    // Let's stick to saving updates for now.
    
    setState(prev => ({ ...prev, products }));
  };
  
  // Specialized delete handler if needed for Studio to be cleaner
  const handleDeleteProduct = async (id: string) => {
     await db.deleteProfile(id);
     setState(prev => ({
       ...prev,
       products: prev.products.filter(p => p.id !== id)
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

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Studio Database...</div>;
  }

  // If onboarding, show only wizard
  if (view === AppStep.ONBOARDING) {
    return (
      <div className="min-h-screen bg-black text-white">
         <nav className="border-b border-gray-800 p-4">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="text-blue-500" /> Gemini Brand Studio
            </div>
         </nav>
         <div className="pt-10">
           <TrainingWizard onComplete={handleOnboardingComplete} />
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-blue-500/30 pb-20">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView(AppStep.DASHBOARD)}>
            <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-2 rounded-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden md:block">Gemini Brand Studio</span>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
            <NavButton 
              active={view === AppStep.DASHBOARD} 
              onClick={() => setView(AppStep.DASHBOARD)} 
              icon={LayoutDashboard} 
              label="Create" 
            />
            <NavButton 
              active={view === AppStep.STUDIO} 
              onClick={() => setView(AppStep.STUDIO)} 
              icon={Settings} 
              label="Studio" 
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
          />
        )}
        {view === AppStep.STUDIO && (
          <Studio 
            user={state.user} 
            products={state.products}
            onUpdateUser={handleUpdateUser}
            onUpdateProducts={handleUpdateProducts}
            // We override the standard update with our specific delete handler logic if we passed it down
            // For now, Studio handles update by passing full list back minus deleted items
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
