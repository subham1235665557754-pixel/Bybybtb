import React from 'react';
import { Zap, Heart, User, Lock, Key, Clock, Sparkles } from 'lucide-react';
import { ThemeId } from '../utils/theme.ts';
import { playTapSound } from '../utils/sound.ts';

interface NavbarProps {
  onHome: () => void;
  onOpenFavorites: () => void;
  onOpenProfile: () => void;
  onOpenAccessPass: () => void;
  favoritesCount: number;
  currentTheme: ThemeId;
  passExpiry: number | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  onHome,
  onOpenFavorites,
  onOpenProfile,
  onOpenAccessPass,
  favoritesCount,
  currentTheme,
  passExpiry,
}) => {
  const isLight = currentTheme === 'light';
  const isPassActive = passExpiry !== null && passExpiry > Date.now();

  const remainingHours = isPassActive
    ? Math.max(0, Math.floor((passExpiry - Date.now()) / (1000 * 60 * 60)))
    : 0;

  return (
    <nav className={`sticky top-0 z-40 ${isLight ? 'bg-white/85 text-slate-900 border-slate-200' : 'bg-[#08090f]/85 text-white border-white/[0.08]'} backdrop-blur-2xl border-b transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
        {/* Brand Lockup */}
        <button
          onClick={() => {
            playTapSound();
            onHome();
          }}
          className="flex items-center gap-3.5 group text-left cursor-pointer focus:outline-none"
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-white via-neutral-100 to-neutral-300 text-black rounded-2xl flex items-center justify-center group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]">
            <Zap className="w-5 h-5 fill-black stroke-black" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-lg sm:text-xl font-black tracking-widest leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>
                NEXT TOPPER
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-[#229ED9]/20 text-[#229ED9] border border-[#229ED9]/30">
                PRO
              </span>
            </div>
            <span className={`text-[9px] font-extrabold tracking-[0.25em] uppercase leading-none mt-1.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              By SpidyUniverse
            </span>
          </div>
        </button>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* 24-Hour Access Key Button (as seen in screenshot) */}
          <button
            onClick={() => {
              playTapSound();
              onOpenAccessPass();
            }}
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
              isPassActive
                ? isLight
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : isLight
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
            }`}
            title={isPassActive ? `Pass Active (${remainingHours}h remaining)` : 'Get 24-Hour Access Key'}
          >
            {isPassActive ? (
              <>
                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-extrabold">{remainingHours}h Key Active</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-extrabold">24h Access Key</span>
              </>
            )}
          </button>

          {/* Favorites Button */}
          <button
            onClick={() => {
              playTapSound();
              onOpenFavorites();
            }}
            className={`transition-colors group relative p-2 rounded-xl focus:outline-none cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-white/5 text-neutral-400 hover:text-white'
            }`}
            aria-label="Favorites"
          >
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
            {favoritesCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Profile Button (Contains Theme Switcher, Tap Sound, and Voidxevra Telegram) */}
          <button
            onClick={() => {
              playTapSound();
              onOpenProfile();
            }}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all shadow-sm focus:outline-none cursor-pointer ${
              isLight
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:scale-105'
                : 'bg-white/[0.05] border-white/10 text-neutral-300 hover:text-white hover:bg-white/15 hover:border-white/25 hover:scale-105'
            }`}
            aria-label="Profile & Settings"
            title="Profile & Settings"
          >
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};
