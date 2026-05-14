import React from 'react';
import { Search as SearchIcon, Plus, ShoppingBag, LogIn, User as UserIcon, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface NavbarProps {
  onPostClick: () => void;
  onSearchChange: (query: string) => void;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
  onProfileClick: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export function Navbar({ onPostClick, onSearchChange, user, onLogin, onLogout, onProfileClick, isDark, toggleTheme }: NavbarProps) {
  return (
    <nav className={cn(
      "sticky top-0 z-40 backdrop-blur-md border-b-2 transition-colors duration-300",
      isDark ? "bg-charcoal/80 border-white/5" : "bg-white/80 border-gray-100"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className={cn(
              "w-8 h-8 bg-brand-blue flex items-center justify-center rounded-lg rotate-0 shadow-[2px_2px_0px_#121212]",
              isDark ? "shadow-white/20" : "shadow-charcoal"
            )}>
              <span className="text-white font-black text-xl italic uppercase">X</span>
            </div>
            <span className={cn(
              "font-display font-black text-2xl tracking-tighter uppercase hidden sm:block",
              isDark ? "text-white" : "text-charcoal"
            )}>
              Camp<span className="text-brand-blue">X</span>change
            </span>
          </div>

          {/* Search Social - Minimalist */}
          <div className="flex-1 max-w-sm mx-6 hidden md:block">
            <div className="relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Marketplace..."
                className={cn(
                  "w-full border-2 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:border-brand-blue transition-all outline-none",
                  isDark ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-charcoal/5 text-charcoal"
                )}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "p-3 border-2 rounded-xl transition-all",
                isDark ? "border-white/10 hover:bg-white/5 text-white" : "border-charcoal/5 hover:bg-gray-50 text-charcoal"
              )}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user ? (
              <>
                <button
                  onClick={onPostClick}
                  className="brutalist-button px-5 dark:bg-white/5 dark:text-white dark:border-white/20 dark:hover:bg-white/10"
                >
                  Post Item
                </button>
                <div 
                  onClick={onProfileClick}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 overflow-hidden cursor-pointer active:scale-95 transition-all shadow-sm group relative",
                    isDark ? "border-white/20" : "border-charcoal"
                  )}
                  title="View Profile Settings"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-brand-blue text-white group-hover:opacity-50 transition-opacity">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className={cn(
                      "text-[8px] font-black uppercase px-1",
                      isDark ? "text-white bg-charcoal/80" : "text-charcoal bg-white/80"
                    )}>SET</span>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={onLogin}
                className="brutalist-button-primary px-6"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
