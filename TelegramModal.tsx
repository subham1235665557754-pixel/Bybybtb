import React from 'react';
import { X, ExternalLink, Send } from 'lucide-react';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const telegramUrl = 'https://t.me/Voidxevra';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#131722] to-[#0c0d14] border border-[#229ED9]/30 rounded-3xl p-6 sm:p-7 max-w-sm w-full relative shadow-[0_20px_60px_rgba(34,158,217,0.15)] overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-44 h-44 bg-[#229ED9]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Telegram Icon */}
        <div className="w-14 h-14 bg-gradient-to-tr from-[#0088cc] to-[#229ED9] rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(34,158,217,0.45)] relative z-10">
          <svg
            className="w-8 h-8 fill-white translate-x-[-1px] translate-y-[-1px]"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.61 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.05-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 3.98-1.73 6.64-2.87 7.97-3.44 3.79-1.62 4.58-1.9 5.09-1.91.11 0 .37.03.54.17.14.12.18.28.2.45-.02.07-.02.21-.04.35z" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight relative z-10">
          Join Voidxevra Community
        </h2>
        <p className="text-xs text-neutral-400 mb-4 relative z-10">
          Get instant updates for new video lectures, notes, tests & batch announcements.
        </p>

        {/* Info Box */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-6 relative z-10">
          <p className="text-xs text-neutral-300 font-medium">
            Join the official <span className="font-bold text-[#229ED9]">Voidxevra</span> Telegram channel:
          </p>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#229ED9] hover:text-white transition-colors break-all text-xs sm:text-sm mt-2 block font-bold"
          >
            t.me/Voidxevra
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 relative z-10">
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0088cc] to-[#229ED9] hover:from-[#0077b5] hover:to-[#1b8bc2] text-white font-bold py-3.5 px-4 rounded-xl transition shadow-[0_4px_20px_rgba(0,136,204,0.35)]"
          >
            <span>Join Telegram</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-4 rounded-xl transition text-sm"
          >
            Continue to App
          </button>
        </div>
      </div>
    </div>
  );
};
