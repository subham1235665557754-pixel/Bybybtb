import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1500);

    const finishTimer = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, 2200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center transition-opacity duration-700 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center animate-pulse">
        <div className="w-24 h-24 bg-white text-black rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(255,255,255,0.2)]">
          <Zap className="w-12 h-12 fill-black stroke-black" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-widest mb-2">
          NEXT TOPPER
        </h1>
        <p className="text-xs sm:text-sm font-medium tracking-[0.3em] text-neutral-500 uppercase">
          Powered by <span className="text-white font-bold">SPIDYUNIVERSE</span>
        </p>
      </div>
    </div>
  );
};
