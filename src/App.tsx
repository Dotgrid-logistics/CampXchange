/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Loader2, Info, AlertTriangle, Search as SearchIcon } from 'lucide-react';

import { db, auth } from './lib/firebase';
import { cn } from './lib/utils';
import { Item, Category, UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { CategoryFilter } from './components/CategoryFilter';
import { ItemCard } from './components/ItemCard';
import { PostItemModal } from './components/PostItemModal';
import { AuthModal } from './components/AuthModal';
import { ProfilePage } from './components/ProfilePage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'feed' | 'profile'>('feed');
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Theme effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { doc, getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'items', 'connection-test'));
      } catch (error: any) {
        if (error.message?.includes('offline')) {
          console.error("Firebase is offline. Check configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Items Listener
  useEffect(() => {
    setLoading(true);
    let q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));

    if (category !== "All") {
      q = query(collection(db, 'items'), where('category', '==', category), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Item[];
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category]);

  const handleLogin = () => {
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handlePostItem = async (data: any) => {
    try {
      await addDoc(collection(db, 'items'), {
        ...data,
        sellerType: userProfile?.accountType || 'Individual',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Posting failed:", error);
      throw error;
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.campus.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      isDark ? "bg-charcoal text-white dark" : "bg-white text-charcoal"
    )}>
      <Navbar 
        onPostClick={() => setIsModalOpen(true)}
        onSearchChange={setSearchQuery} 
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onProfileClick={() => setCurrentView('profile')}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {currentView === 'feed' ? (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Hero & Search Section */}
              <div className="mb-16">
                <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8">
                  <div className="max-w-2xl">
                    <div className="inline-block bg-brand-blue text-white text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1 rounded-full shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#ffffff20] mb-6">
                      Official Marketplace Hub
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black leading-[0.85] uppercase tracking-tighter mb-8 dark:text-white">
                      Buy. Sell. <br/><span className="text-brand-blue">CampX</span>change.
                    </h1>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 max-w-lg mb-8 uppercase tracking-widest leading-relaxed">
                      The exclusive marketplace for students & local residents. Trade textbooks, home essentials, and support community businesses.
                    </p>
                    <div className="relative group">
                      <input 
                        type="text" 
                        placeholder="Search textbooks, hostel kits, fans..." 
                        className={cn(
                          "w-full border-4 py-5 px-8 text-sm font-black uppercase tracking-widest rounded-3xl focus:outline-none transition-all placeholder-gray-400 focus:shadow-[8px_8px_0px_#2E5BFF]",
                          isDark ? "border-white bg-white/5 text-white placeholder-gray-500" : "border-charcoal bg-white text-charcoal"
                        )}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className={cn(
                        "absolute right-5 top-1/2 -translate-y-1/2 bg-brand-blue p-3 border-2 shadow-[4px_4px_0px_#121212] rounded-xl",
                        isDark ? "border-white/20 shadow-[4px_4px_0px_#ffffff20]" : "border-charcoal shadow-[4px_4px_0px_#121212]"
                      )}>
                        <SearchIcon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden lg:flex flex-col items-end">
                    {/* Activity indicator removed as per user request */}
                  </div>
                </div>
              </div>

              {/* Listings Section */}
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b-4 border-charcoal dark:border-white/10">
                  <h2 className="text-4xl font-black tracking-tighter uppercase dark:text-white">
                    Field <span className="text-brand-blue">Exclusives</span>
                  </h2>
                  <CategoryFilter selected={category} onChange={setCategory} />
                </div>

                <AnimatePresence mode="popLayout">
                  {loading ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-32 space-y-4"
                    >
                      <div className="w-12 h-12 border-4 border-charcoal dark:border-white/20 border-t-brand-blue animate-spin" />
                      <p className="text-charcoal dark:text-white font-black uppercase tracking-widest text-xs">Syncing Data...</p>
                    </motion.div>
                  ) : filteredItems.length > 0 ? (
                    <motion.div 
                      key="grid"
                      layout
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16"
                    >
                      {filteredItems.map((item) => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-32 text-center"
                    >
                      <div className={cn(
                        "w-20 h-20 border-4 flex items-center justify-center mb-6 shadow-[6px_6px_0px_#2E5BFF] transition-all duration-300",
                        isDark ? "border-white text-white bg-white/5" : "border-charcoal text-charcoal bg-white"
                      )}>
                        <ShoppingBag className="w-10 h-10" strokeWidth={3} />
                      </div>
                      <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter dark:text-white">Inventory Dry</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Nothing matches your search criteria.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <ProfilePage 
              key="profile"
              user={user}
              userProfile={userProfile}
              onBack={() => setCurrentView('feed')}
              onLogout={() => {
                handleLogout();
                setCurrentView('feed');
              }}
              isDark={isDark}
            />
          )}
        </AnimatePresence>
      </main>


      {/* Footer */}
      <footer className="bg-charcoal dark:bg-black/40 text-white py-12 mt-20 border-t-2 border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-brand-blue border-2 border-white flex items-center justify-center text-white text-xs font-black italic">X</div>
               <span className="font-display font-black text-xl uppercase tracking-tighter">CampXchange</span>
            </div>
            
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
              <span className="text-green-500">Data Saver: ON</span>
              <a href="#" className="hover:text-white transition-colors">Safety</a>
              <a href="#" className="hover:text-white transition-colors">Ambassadors</a>
              <span className="text-gray-600">© 2026</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Post Item Modal */}
      <AnimatePresence>
        {isModalOpen && user && (
          <PostItemModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSubmit={handlePostItem}
            user={user}
            userProfile={userProfile}
          />
        )}
      </AnimatePresence>

      {/* Auth Warning for Posting */}
      <AnimatePresence>
        {isModalOpen && !user && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" 
            />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "relative p-8 rounded-3xl shadow-2xl max-w-sm text-center border-4",
                  isDark ? "bg-charcoal border-white" : "bg-white border-charcoal"
                )}
              >
                <div className="w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black mb-4 tracking-tight uppercase dark:text-white">Login Required</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 text-xs font-bold uppercase tracking-widest leading-relaxed">You need to sign in to your TASFUED account to post an item on CampXchange.</p>
                <button 
                  onClick={() => {
                    handleLogin();
                    setIsModalOpen(false);
                  }}
                  className="w-full py-4 bg-brand-blue text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-brand-blue/20"
                >
                  Sign In Now
                </button>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
