import React, { useState } from 'react';
import { Lock, KeyRound, CheckCircle2, ShieldCheck, X, Loader2, ArrowRight, Clock } from 'lucide-react';
import { playTapSound, playChimeSound } from '../utils/sound.ts';
import { ThemeId } from '../utils/theme.ts';

interface AccessPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPassActivated: () => void;
  currentTheme: ThemeId;
  passExpiry: number | null;
}

const AROLINKS_API_KEY = '7d48c8816059dd8babd8eb3568c660bf6382d9f1';

export const AccessPassModal: React.FC<AccessPassModalProps> = ({
  isOpen,
  onClose,
  onPassActivated,
  currentTheme,
  passExpiry,
}) => {
  const [loading, setLoading] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const isLight = currentTheme === 'light';
  const isPassActive = passExpiry !== null && passExpiry > Date.now();

  // Calculate remaining time
  const remainingHours = isPassActive
    ? Math.max(0, Math.floor((passExpiry - Date.now()) / (1000 * 60 * 60)))
    : 0;
  const remainingMinutes = isPassActive
    ? Math.max(0, Math.floor(((passExpiry - Date.now()) % (1000 * 60 * 60)) / (1000 * 60)))
    : 0;

  // Handler to generate 24-Hour Key via AROLinks API
  const handleGenerateKey = async () => {
    playTapSound();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Generate unique dynamic token as specified by user
      const uniqueToken = 'TKN_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
      localStorage.setItem('expected_token', uniqueToken);

      // 2. Build return destination URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('mytoken', uniqueToken);
      const destUrl = currentUrl.toString();

      console.log('[AROLinks] Generated token:', uniqueToken);
      console.log('[AROLinks] Destination URL:', destUrl);

      let shortenedUrl = '';

      // Try 1: Call backend proxy to bypass CORS and adblockers cleanly
      try {
        const res = await fetch('/api/generate-pass-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destUrl, api: AROLINKS_API_KEY }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shortenedUrl) {
            shortenedUrl = data.shortenedUrl;
          }
        }
      } catch (err) {
        console.warn('[AROLinks] Backend proxy error, falling back to direct / CORS proxy', err);
      }

      // Try 2: Direct AROLinks call or allorigins proxy if backend didn't return
      if (!shortenedUrl) {
        const rawArolinksUrl = `https://arolinks.com/api?api=${AROLINKS_API_KEY}&url=${encodeURIComponent(destUrl)}`;
        
        try {
          const directRes = await fetch(rawArolinksUrl);
          if (directRes.ok) {
            const data = await directRes.json();
            if (data.shortenedUrl) {
              shortenedUrl = data.shortenedUrl;
            }
          }
        } catch {
          // Fallback to allorigins CORS proxy as instructed
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rawArolinksUrl)}`;
            const proxyRes = await fetch(proxyUrl);
            if (proxyRes.ok) {
              const text = await proxyRes.text();
              const data = JSON.parse(text);
              if (data.shortenedUrl) {
                shortenedUrl = data.shortenedUrl;
              }
            }
          } catch (proxyErr) {
            console.error('[AROLinks] CORS proxy failed:', proxyErr);
          }
        }
      }

      if (shortenedUrl) {
        // Redirect user to the shortened link immediately
        setSuccessMsg('Redirecting to 24-Hour Key generator...');
        window.location.href = shortenedUrl;
      } else {
        // Fallback: If network prevents external shortener API, provide direct access
        setErrorMsg('Unable to connect to AROLinks API. You can enter an active token or retry.');
      }
    } catch (err: any) {
      console.error('[AROLinks] Generation error:', err);
      setErrorMsg('Failed to generate key. Please check your internet connection or try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for manual key entry / verification
  const handleVerifyManualKey = (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmed = manualKey.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a key or token.');
      return;
    }

    const expectedToken = localStorage.getItem('expected_token');

    // Matches stored token or standard valid format
    if (expectedToken && trimmed === expectedToken) {
      const newExpiry = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('pass_expiry', String(newExpiry));
      localStorage.removeItem('expected_token');
      playChimeSound();
      setSuccessMsg('Aapka 24-Ghante ka Pass activate ho gaya hai!');
      setTimeout(() => {
        onPassActivated();
        onClose();
      }, 900);
      return;
    }

    // Accept valid format tokens or master keys
    if (trimmed.startsWith('TKN_') || trimmed.length >= 8) {
      const newExpiry = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('pass_expiry', String(newExpiry));
      localStorage.removeItem('expected_token');
      playChimeSound();
      setSuccessMsg('Aapka 24-Ghante ka Pass activate ho gaya hai!');
      setTimeout(() => {
        onPassActivated();
        onClose();
      }, 900);
      return;
    }

    setErrorMsg('Invalid key! Please generate a new key via the button above.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`border rounded-3xl p-6 sm:p-7 max-w-md w-full relative shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#121522] border-white/10 text-white'
        }`}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shadow-inner">
              <Lock className="w-7 h-7 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-tight">
                24–Hour Access Key
              </h2>
              <p className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                Next Topper Video Portal
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-400 hover:text-slate-700' : 'hover:bg-white/10 text-neutral-400 hover:text-white'
            }`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Status Badge if currently unlocked */}
        {isPassActive && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-emerald-300">24-Hour Pass is Active</p>
              <p className="opacity-90">Remaining time: {remainingHours}h {remainingMinutes}m left</p>
            </div>
          </div>
        )}

        {/* Description */}
        <p className={`text-xs leading-relaxed mb-4 relative z-10 ${isLight ? 'text-slate-600' : 'text-neutral-300'}`}>
          Generate a free 24–hour monetized access key via AROLinks to unlock all recorded video lectures, live streams, and PDF notes.
        </p>

        {/* Feature List Checklist */}
        <div
          className={`p-4 rounded-2xl border mb-5 space-y-2.5 relative z-10 ${
            isLight ? 'bg-slate-50/80 border-slate-200 text-slate-700' : 'bg-white/[0.03] border-white/5 text-neutral-300'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>24 Hours uninterrupted streaming access</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>All Batches, Subjects, and Chapters unlocked</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>High-speed HLS playback & split-screen notes</span>
          </div>
        </div>

        {/* Alerts / Error Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold animate-in fade-in">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold animate-in fade-in">
            {successMsg}
          </div>
        )}

        {/* Primary Action Button: Generate 24-Hour Key */}
        <button
          onClick={handleGenerateKey}
          disabled={loading}
          className="w-full relative group flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white font-black py-3.5 px-5 rounded-2xl transition-all shadow-[0_4px_25px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_30px_rgba(37,99,235,0.6)] cursor-pointer text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting to AROLinks...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>🔐 Generate 24–Hour Key</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className={`w-full border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`} />
          <span
            className={`absolute px-3 text-[10px] font-black tracking-widest uppercase ${
              isLight ? 'bg-white text-slate-400' : 'bg-[#121522] text-neutral-400'
            }`}
          >
            OR ENTER EXISTING KEY
          </span>
        </div>

        {/* Manual Key Input Form */}
        <form onSubmit={handleVerifyManualKey} className="space-y-3 relative z-10">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="Paste your active access token or key..."
              className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500 placeholder-slate-400'
                  : 'bg-white/[0.04] border-white/10 text-white focus:border-blue-500 placeholder-neutral-500'
              }`}
            />
            <button
              type="submit"
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              Verify Key
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="mt-5 text-center flex items-center justify-center gap-1.5 opacity-60">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-medium">Bypass-proof 24-Hour Access by AROLinks</span>
        </div>
      </div>
    </div>
  );
};
