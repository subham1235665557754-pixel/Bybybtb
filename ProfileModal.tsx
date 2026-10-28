import React from 'react';
import { X, ExternalLink, Send, BookOpen, Heart, Palette, Volume2, VolumeX, Check } from 'lucide-react';
import { ThemeId, THEMES } from '../utils/theme.ts';
import { playTapSound } from '../utils/sound.ts';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalBatches: number;
  favoritesCount: number;
  currentTheme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  totalBatches,
  favoritesCount,
  currentTheme,
  onSelectTheme,
  soundEnabled,
  onToggleSound,
}) => {
  if (!isOpen) return null;

  const telegramUrl = 'https://t.me/Voidxevra';
  const isLight = currentTheme === 'light';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`border rounded-3xl p-6 sm:p-7 max-w-md w-full relative shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-gradient-to-b from-[#121522] to-[#0a0c13] border-white/10 text-white'
        }`}
      >
        {/* Subtle Ambient Light */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className={`flex items-center justify-between pb-4 border-b mb-6 relative z-10 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              NT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black">Next Topper Student</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-[#229ED9]/20 text-[#229ED9] border border-[#229ED9]/30">
                  PRO
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>Voidxevra Edition</p>
            </div>
          </div>
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className={`p-1.5 rounded-full transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-neutral-400 hover:text-white'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
          <div className={`p-4 rounded-2xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                Batches
              </span>
              <BookOpen className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black mt-2 tabular-nums">
              {totalBatches}
            </p>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>7,300+ Video Lectures</p>
          </div>

          <div className={`p-4 rounded-2xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                Favorites
              </span>
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-500 mt-2 tabular-nums">
              {favoritesCount}
            </p>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>Bookmarked Batches</p>
          </div>
        </div>

        {/* Theme Preference Option */}
        <div className={`p-4 rounded-2xl border mb-4 relative z-10 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#229ED9]" />
              <span className="text-xs font-bold uppercase tracking-wider">App Theme</span>
            </div>
            <span className={`text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
              {THEMES.find((t) => t.id === currentTheme)?.name}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {THEMES.map((theme) => {
              const active = currentTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    onSelectTheme(theme.id);
                    playTapSound();
                  }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'border-[#229ED9] bg-[#229ED9]/10 shadow-sm scale-105'
                      : isLight
                      ? 'border-slate-200 hover:border-slate-300 bg-white'
                      : 'border-white/10 hover:border-white/20 bg-black/40'
                  }`}
                  title={theme.name}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-black/20 shadow-xs"
                    style={{ backgroundColor: theme.dotColor }}
                  />
                  <span className="text-[10px] font-bold truncate max-w-full">
                    {theme.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sound Effects Option */}
        <div className={`p-4 rounded-2xl border mb-6 relative z-10 flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/5'}`}>
          <div className="flex items-center gap-2.5">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#229ED9]" />
            ) : (
              <VolumeX className="w-4 h-4 text-neutral-400" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Tap Sounds</p>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>Tactile audio feedback on click</p>
            </div>
          </div>
          <button
            onClick={() => {
              onToggleSound();
              playTapSound();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-[#229ED9] text-white shadow-sm'
                : isLight
                ? 'bg-slate-200 text-slate-600'
                : 'bg-white/10 text-neutral-400'
            }`}
          >
            {soundEnabled ? 'Enabled' : 'Muted'}
          </button>
        </div>

        {/* Telegram Community Button */}
        <div className="space-y-3 relative z-10">
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playTapSound()}
            className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#0088cc] to-[#229ED9] hover:from-[#0077b5] hover:to-[#1b8bc2] text-white font-bold py-3.5 px-4 rounded-xl transition text-sm shadow-[0_4px_20px_rgba(34,158,217,0.35)]"
          >
            <Send className="w-4 h-4" />
            <span>Join Voidxevra Telegram Channel</span>
            <ExternalLink className="w-4 h-4 ml-auto" />
          </a>
        </div>
      </div>
    </div>
  );
};
