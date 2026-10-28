import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Heart,
  ChevronRight,
  ArrowLeft,
  Folder,
  PlayCircle,
  FileText,
  Sparkles,
  ExternalLink,
  Send,
} from 'lucide-react';
import { Batch, BatchDetail, FolderItem, FileDetail, BreadcrumbStep } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { TelegramModal } from './components/TelegramModal.tsx';
import { VideoPlayer } from './components/VideoPlayer.tsx';
import { PdfModal } from './components/PdfModal.tsx';
import { FavoritesModal } from './components/FavoritesModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { AccessPassModal } from './components/AccessPassModal.tsx';
import { ThemeId, THEMES, getSavedTheme, saveTheme } from './utils/theme.ts';
import {
  playTapSound,
  playOpenSound,
  playChimeSound,
  playBackSound,
  isSoundEnabled,
  setSoundEnabled,
} from './utils/sound.ts';

// Fallback local dataset for instant render
import localData from './data/batches.json';

export default function App() {
  // Navigation State: 'home' | 'batch' | 'folder' | 'video'
  const [currentView, setCurrentView] = useState<'home' | 'batch' | 'folder' | 'video'>('home');

  // Theme & Sound State
  const [theme, setTheme] = useState<ThemeId>(getSavedTheme);
  const [soundActive, setSoundActive] = useState<boolean>(isSoundEnabled);

  // Batches Data
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);

  // Folder Directory Navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolderTitle, setCurrentFolderTitle] = useState<string>('');
  const [folderItems, setFolderItems] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbStep[]>([]);
  const [isFolderLoading, setIsFolderLoading] = useState<boolean>(false);

  // Active Video / File (100% preserved)
  const [activeFile, setActiveFile] = useState<FileDetail | null>(null);
  const [activePdf, setActivePdf] = useState<FileDetail | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeClassFilter, setActiveClassFilter] = useState<string>('All');

  // Modals & UI State
  const [isSplashDone, setIsSplashDone] = useState<boolean>(false);
  const [isTelegramOpen, setIsTelegramOpen] = useState<boolean>(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState<boolean>(false);
  const [passAlertMessage, setPassAlertMessage] = useState<string | null>(null);

  // 24-Hour Pass Expiry State
  const [passExpiry, setPassExpiry] = useState<number | null>(() => {
    try {
      const exp = localStorage.getItem('pass_expiry');
      if (exp && Number(exp) > Date.now()) {
        return Number(exp);
      }
      return null;
    } catch {
      return null;
    }
  });

  // URL Verification for AROLinks return redirect (?mytoken=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const myToken = urlParams.get('mytoken');
      const expectedToken = localStorage.getItem('expected_token');

      if (myToken) {
        if ((expectedToken && myToken === expectedToken) || myToken.startsWith('TKN_')) {
          const newExpiry = Date.now() + 24 * 60 * 60 * 1000;
          localStorage.setItem('pass_expiry', String(newExpiry));
          localStorage.removeItem('expected_token');
          setPassExpiry(newExpiry);

          // Clean URL without refresh
          window.history.replaceState({}, document.title, window.location.pathname);

          playChimeSound();
          setPassAlertMessage('Aapka 24-Ghante ka Pass activate ho gaya hai!');
          setTimeout(() => {
            setPassAlertMessage(null);
          }, 8000);
        }
      }
    } catch (e) {
      console.error('[Pass] Token verification error:', e);
    }
  }, []);

  // Auto-Lock: Check pass expiry every 10 seconds. When expired, access is blocked
  useEffect(() => {
    const checkExpiry = () => {
      try {
        const stored = localStorage.getItem('pass_expiry');
        if (stored) {
          const expNum = Number(stored);
          if (Date.now() > expNum) {
            localStorage.removeItem('pass_expiry');
            setPassExpiry(null);
          } else {
            setPassExpiry(expNum);
          }
        } else {
          setPassExpiry(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 10000);
    return () => clearInterval(interval);
  }, []);

  // Favorites in LocalStorage
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('nt_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Current theme config
  const themeConfig = useMemo(() => {
    return THEMES.find((t) => t.id === theme) || THEMES[0];
  }, [theme]);

  const isLight = theme === 'light';

  const handleSelectTheme = (newTheme: ThemeId) => {
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const handleToggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundEnabled(next);
  };

  // Save favorites to storage
  useEffect(() => {
    try {
      localStorage.setItem('nt_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  // Initial Fetch of Batches
  const loadBatches = async () => {
    try {
      const res = await fetch('/api/batches');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBatches(data);
          return;
        }
      }
    } catch (err) {
      console.warn('API fetch failed, falling back to local dataset', err);
    }

    // Fallback: parse local dataset
    if (localData && Array.isArray((localData as any).jc)) {
      const fallbackList: Batch[] = (localData as any).jc.map((b: any) => ({
        id: b.batch_id,
        title: b.details?.title || 'Batch',
        thumbnail: b.details?.thumbnail || '',
        price: b.details?.price || '3000.00',
        description: b.details?.description || '',
        class_tag: /12th/i.test(b.details?.title)
          ? '12th'
          : /11th/i.test(b.details?.title)
          ? '11th'
          : /10th/i.test(b.details?.title)
          ? '10th'
          : /9th/i.test(b.details?.title)
          ? '9th'
          : 'Batch',
        subjects_count: b.subjects?.length || 0,
      }));
      setBatches(fallbackList);
    }
  };

  useEffect(() => {
    loadBatches();

    // Show Telegram popup after a slight delay for first-time visitors
    const seenModal = sessionStorage.getItem('telegram_shown');
    if (!seenModal) {
      const timer = setTimeout(() => {
        setIsTelegramOpen(true);
        sessionStorage.setItem('telegram_shown', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Toggle Favorite
  const toggleFavorite = (batchId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playChimeSound();
    setFavorites((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  // Select a Batch -> Directly show Study Material (Batch Overview REMOVED as requested)
  const handleSelectBatch = async (batch: Batch) => {
    playOpenSound();
    setSelectedBatch({ ...batch, subjects: [] });
    setCurrentView('batch');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await fetch(`/api/batch/${batch.id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedBatch(detail);
        return;
      }
    } catch (err) {
      console.warn('API error fetching batch details, extracting locally', err);
    }

    // Local extraction fallback
    const rawBatch = (localData as any).jc?.find(
      (b: any) => String(b.batch_id) === String(batch.id)
    );
    if (rawBatch) {
      const subjects = (rawBatch.subjects || []).map((s: any) => ({
        type: 'folder' as const,
        entity_id: s.subject_id,
        title: s.subject_name,
        data: { thumbnail: s.thumbnail || '' },
      }));
      setSelectedBatch({
        ...batch,
        title: rawBatch.details?.title,
        thumbnail: rawBatch.details?.thumbnail,
        description: rawBatch.details?.description,
        subjects,
      });
    }
  };

  // Open Subject or Folder
  const handleOpenFolder = async (folderId: string | number, folderTitle: string) => {
    if (!selectedBatch) return;
    playOpenSound();
    setIsFolderLoading(true);
    setCurrentFolderId(String(folderId));
    setCurrentFolderTitle(folderTitle);
    setCurrentView('folder');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update breadcrumbs
    setBreadcrumbs((prev) => {
      const idx = prev.findIndex((b) => String(b.id) === String(folderId));
      if (idx !== -1) {
        return prev.slice(0, idx + 1);
      }
      return [...prev, { id: folderId, title: folderTitle }];
    });

    try {
      const res = await fetch(`/api/folder/${selectedBatch.id}/${folderId}`);
      if (res.ok) {
        const data = await res.json();
        setFolderItems(data.items || []);
        setIsFolderLoading(false);
        return;
      }
    } catch (err) {
      console.warn('Error fetching folder from API, extracting locally', err);
    }

    // Local fallback extraction
    const rawBatch = (localData as any).jc?.find(
      (b: any) => String(b.batch_id) === String(selectedBatch.id)
    );
    if (rawBatch) {
      // Check if folder is subject
      const sub = rawBatch.subjects?.find((s: any) => String(s.subject_id) === String(folderId));
      if (sub) {
        const items: FolderItem[] = (sub.chapters || []).map((ch: any) => ({
          type: 'folder',
          entity_id: ch.folder_id,
          title: ch.title,
          data: { thumbnail: ch.thumbnail },
        }));
        setFolderItems(items);
        setIsFolderLoading(false);
        return;
      }

      // Search subfolders
      function findFolder(chapters: any[]): any {
        for (const item of chapters) {
          if (item.type === 'folder' && String(item.folder_id) === String(folderId)) {
            return item;
          }
          if (item.type === 'folder' && item.contents) {
            const found = findFolder(item.contents);
            if (found) return found;
          }
        }
        return null;
      }

      for (const s of rawBatch.subjects || []) {
        const found = findFolder(s.chapters || []);
        if (found && found.contents) {
          const items: FolderItem[] = found.contents.map((t: any) => ({
            type: t.type === 'folder' ? 'folder' : 'file',
            entity_id: t.type === 'folder' ? t.folder_id : t.file_id,
            title: t.title,
            data: {
              thumbnail: t.thumbnail,
              url: t.stream_url,
              file_type: t.stream_url?.toLowerCase().includes('.pdf') ? 1 : 2,
              duration: t.duration || 0,
            },
          }));
          setFolderItems(items);
          setIsFolderLoading(false);
          return;
        }
      }
    }

    setFolderItems([]);
    setIsFolderLoading(false);
  };

  // Open Video or PDF File (Preserves exact functionality with 24-Hour Pass protection)
  const handleOpenFile = async (item: FolderItem) => {
    if (!selectedBatch) return;

    // Check 24-Hour Access Pass
    const storedExpiry = localStorage.getItem('pass_expiry');
    const isPassUnlocked = storedExpiry && Number(storedExpiry) > Date.now();
    if (!isPassUnlocked) {
      playTapSound();
      setIsPassModalOpen(true);
      return;
    }

    playOpenSound();

    try {
      const res = await fetch(`/api/file/${selectedBatch.id}/${item.entity_id}`);
      if (res.ok) {
        const fileData = await res.json();
        if (fileData.file_type === 1) {
          setActivePdf(fileData);
        } else {
          setActiveFile(fileData);
          setCurrentView('video');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
    } catch (err) {
      console.warn('API error fetching file, using item data', err);
    }

    // Direct fallback from item data
    const isPdf = item.data?.file_type === 1 || Boolean(item.data?.url?.includes('.pdf'));
    const fileObj: FileDetail = {
      id: item.entity_id,
      title: item.title,
      file_url: item.data?.url || '',
      file_type: isPdf ? 1 : 2,
      thumbnail: item.data?.thumbnail,
    };

    if (isPdf) {
      setActivePdf(fileObj);
    } else {
      setActiveFile(fileObj);
      setCurrentView('video');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Back from Folder
  const handleBackFolder = () => {
    playBackSound();
    if (breadcrumbs.length <= 1) {
      setBreadcrumbs([]);
      setCurrentFolderId(null);
      setCurrentView('batch');
    } else {
      const parentStep = breadcrumbs[breadcrumbs.length - 2];
      setBreadcrumbs((prev) => prev.slice(0, -1));
      handleOpenFolder(parentStep.id, parentStep.title);
    }
  };

  // Filtered Batches List
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        searchQuery === '' ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.class_tag.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass =
        activeClassFilter === 'All'
          ? true
          : activeClassFilter === 'Free'
          ? /free/i.test(b.title) || b.price === '0' || b.price === '0.00'
          : b.class_tag.toLowerCase() === activeClassFilter.toLowerCase();

      return matchesSearch && matchesClass;
    });
  }, [batches, searchQuery, activeClassFilter]);

  // Favorite Batches List
  const favoriteBatchObjects = useMemo(() => {
    return batches.filter((b) => favorites.includes(b.id));
  }, [batches, favorites]);

  // Color theme helper for class badges
  const getClassBadgeStyle = (tag: string) => {
    switch (tag) {
      case '12th':
        return 'from-purple-500 to-indigo-500 text-white shadow-purple-500/25';
      case '11th':
        return 'from-blue-500 to-cyan-500 text-white shadow-blue-500/25';
      case '10th':
        return 'from-amber-400 to-orange-500 text-black shadow-amber-500/25';
      case '9th':
        return 'from-emerald-400 to-teal-500 text-black shadow-emerald-500/25';
      default:
        return 'from-neutral-700 to-neutral-800 text-white shadow-black/40';
    }
  };

  return (
    <div
      className={`min-h-screen ${themeConfig.bgClass} ${themeConfig.textClass} flex flex-col selection:bg-[#229ED9]/30 selection:text-white antialiased relative overflow-x-hidden font-sans transition-colors duration-300`}
    >
      {/* Dynamic Ambient Top Light Glow */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b ${themeConfig.heroGlow} blur-3xl pointer-events-none`}
      />

      {/* 1. Splash Screen */}
      <SplashScreen onFinish={() => setIsSplashDone(true)} />

      {/* 2. Top Navigation Bar (Cleaned up, 24h Access Key badge added) */}
      <Navbar
        onHome={() => {
          playBackSound();
          setCurrentView('home');
          setSelectedBatch(null);
          setBreadcrumbs([]);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAccessPass={() => {
          playTapSound();
          setIsPassModalOpen(true);
        }}
        favoritesCount={favorites.length}
        currentTheme={theme}
        passExpiry={passExpiry}
      />

      {/* 24-Hour Pass Activation Banner / Alert */}
      {passAlertMessage && (
        <div className="sticky top-[69px] z-30 px-4 py-2.5 bg-emerald-500 text-white font-bold text-center text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
          <span>🎉 {passAlertMessage}</span>
          <button
            onClick={() => setPassAlertMessage(null)}
            className="ml-3 px-2 py-0.5 rounded bg-black/20 hover:bg-black/30 text-white text-xs cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {/* 3. Main Content Router */}
      <main className="flex-grow w-full relative z-10">
        {/* VIEW A: HOME - EXPLORE BATCHES */}
        {currentView === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            {/* Elevated Hero Banner with Stats Strip */}
            <div
              className={`mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b ${
                isLight ? 'border-slate-200' : 'border-white/[0.08]'
              }`}
            >
              <div>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider mb-4 shadow-sm ${themeConfig.badgeBg}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Voidxevra Educational Network</span>
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none">
                  Explore{' '}
                  <span
                    className={`bg-gradient-to-r ${themeConfig.accentGradient} bg-clip-text text-transparent`}
                  >
                    Batches
                  </span>
                </h1>
                <p
                  className={`text-sm sm:text-base mt-3 font-medium max-w-2xl leading-relaxed ${
                    isLight ? 'text-slate-600' : 'text-neutral-400'
                  }`}
                >
                  Interactive video courses, chapter modules, and DPP notes for Classes 9th, 10th,
                  11th & 12th. Stream directly without interruptions.
                </p>
              </div>

              {/* Quick Stat Capsules */}
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <div
                  className={`px-4 py-2.5 rounded-2xl border shadow-md ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#0f111a] border-white/[0.08]'
                  }`}
                >
                  <span
                    className={`block text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-slate-500' : 'text-neutral-400'
                    }`}
                  >
                    Batches
                  </span>
                  <span className="text-lg font-black tabular-nums">20 Active</span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl border shadow-md ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#0f111a] border-white/[0.08]'
                  }`}
                >
                  <span
                    className={`block text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-slate-500' : 'text-neutral-400'
                    }`}
                  >
                    Lectures
                  </span>
                  <span className={`text-lg font-black tabular-nums ${themeConfig.accentText}`}>
                    7,300+ HLS
                  </span>
                </div>
                <div
                  className={`px-4 py-2.5 rounded-2xl border shadow-md ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#0f111a] border-white/[0.08]'
                  }`}
                >
                  <span
                    className={`block text-[10px] font-bold uppercase tracking-wider ${
                      isLight ? 'text-slate-500' : 'text-neutral-400'
                    }`}
                  >
                    Community
                  </span>
                  <a
                    href="https://t.me/Voidxevra"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playTapSound()}
                    className={`text-lg font-black transition-colors flex items-center gap-1 hover:underline ${themeConfig.accentText}`}
                  >
                    <span>Voidxevra</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Modern Search Input */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
                <Search
                  className={`w-5 h-5 ${isLight ? 'text-slate-400' : 'text-neutral-400'}`}
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your future batches or subjects..."
                className={`w-full rounded-2xl py-4 pl-12 sm:pl-13 pr-10 text-sm sm:text-base focus:outline-none transition-all shadow-xl backdrop-blur-md border ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200'
                    : 'bg-[#0d0f17]/90 border-white/[0.08] text-white placeholder-neutral-500 focus:border-[#229ED9]/60 focus:ring-2 focus:ring-[#229ED9]/20'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    playTapSound();
                    setSearchQuery('');
                  }}
                  className={`absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold ${
                    isLight ? 'text-slate-500 hover:text-slate-900' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Class Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
              {['All', '12th', '11th', '10th', '9th', 'Free'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    playTapSound();
                    setActiveClassFilter(tag);
                  }}
                  className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                    activeClassFilter === tag
                      ? `bg-gradient-to-r ${themeConfig.accentGradient} text-white shadow-lg scale-105`
                      : isLight
                      ? 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
                      : 'bg-[#0f111a] text-neutral-400 hover:text-white hover:bg-white/10 border border-white/[0.06]'
                  }`}
                >
                  {tag === 'All' ? 'All Batches' : `Class ${tag}`}
                </button>
              ))}
            </div>

            {/* Elevated Batches Grid */}
            {filteredBatches.length === 0 ? (
              <div
                className={`text-center py-20 rounded-3xl border shadow-xl ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0e1017] border-white/[0.06]'
                }`}
              >
                <p className="text-lg font-bold opacity-60">No batches matched your search query</p>
                <button
                  onClick={() => {
                    playTapSound();
                    setSearchQuery('');
                    setActiveClassFilter('All');
                  }}
                  className={`mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {filteredBatches.map((batch) => {
                  const isFav = favorites.includes(batch.id);
                  const isFree =
                    batch.price === '0' || batch.price === '0.00' || /free/i.test(batch.title);

                  return (
                    <div
                      key={batch.id}
                      onClick={() => handleSelectBatch(batch)}
                      className={`group border rounded-3xl overflow-hidden transition-all duration-300 shadow-md hover:shadow-2xl flex flex-col cursor-pointer hover:-translate-y-1.5 backdrop-blur-sm relative ${themeConfig.cardBg} ${themeConfig.cardBorder}`}
                    >
                      {/* Top Accent Line */}
                      <div
                        className={`h-1 w-full bg-gradient-to-r ${themeConfig.accentGradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                      />

                      {/* Image Thumbnail Container */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-900">
                        <img
                          src={batch.thumbnail}
                          alt={batch.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />

                        {/* Class Badge */}
                        <div className="absolute top-4 left-4 z-10">
                          <span
                            className={`px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r shadow-lg uppercase tracking-wider ${getClassBadgeStyle(
                              batch.class_tag
                            )}`}
                          >
                            {batch.class_tag}
                          </span>
                        </div>

                        {/* Favorite Button */}
                        <button
                          onClick={(e) => toggleFavorite(batch.id, e)}
                          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/65 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg cursor-pointer"
                          aria-label="Add to favorites"
                        >
                          <Heart
                            className={`w-5 h-5 ${
                              isFav ? 'fill-rose-500 text-rose-500' : 'text-neutral-300'
                            }`}
                          />
                        </button>

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                      </div>

                      {/* Card Body */}
                      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h2
                            className={`text-xl sm:text-2xl font-black tracking-tight leading-snug transition-colors group-hover:${themeConfig.accentText}`}
                          >
                            {batch.title}
                          </h2>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-lg font-black tabular-nums">
                              {isFree ? (
                                <span className="text-emerald-500 font-extrabold tracking-wide">
                                  FREE ACCESS
                                </span>
                              ) : (
                                <span className="font-extrabold">₹{batch.price}</span>
                              )}
                            </span>
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                                isLight
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-white/[0.04] text-neutral-400 border-white/5'
                              }`}
                            >
                              {batch.subjects_count || 9} Subjects
                            </span>
                          </div>
                        </div>

                        {/* Start Learning Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectBatch(batch);
                          }}
                          className={`mt-5 w-full font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer text-sm sm:text-base group/btn ${
                            isLight
                              ? 'bg-slate-900 hover:bg-slate-800 text-white'
                              : 'bg-gradient-to-r from-white via-neutral-100 to-neutral-200 hover:from-white hover:to-white text-black group-hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]'
                          }`}
                        >
                          <span>Start Learning</span>
                          <ChevronRight className="w-5 h-5 stroke-[3] group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW B: BATCH DETAIL -> DIRECT STUDY MATERIAL (Batch Overview REMOVED) */}
        {currentView === 'batch' && selectedBatch && (
          <div className="min-h-screen">
            {/* Top Back Navigation Bar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
              <button
                onClick={() => {
                  playBackSound();
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all backdrop-blur-md border cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm'
                    : 'bg-white/[0.06] hover:bg-white/15 border-white/10 text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Batches</span>
              </button>
            </div>

            {/* Elevated Hero Header Banner */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div
                className={`relative rounded-3xl overflow-hidden min-h-[220px] md:min-h-[280px] flex items-end p-6 md:p-10 shadow-2xl border ${
                  isLight ? 'bg-slate-900 border-slate-200 text-white' : 'bg-neutral-900 border-white/10 text-white'
                }`}
              >
                {selectedBatch.thumbnail && (
                  <img
                    src={selectedBatch.thumbnail}
                    alt={selectedBatch.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-35 blur-xs"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

                <div className="relative z-10 max-w-3xl">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider mb-3 inline-block bg-gradient-to-r ${getClassBadgeStyle(
                      selectedBatch.class_tag
                    )}`}
                  >
                    {selectedBatch.class_tag}
                  </span>
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
                    {selectedBatch.title}
                  </h1>
                  <p className="text-base sm:text-lg font-bold text-neutral-300 mt-2">
                    {selectedBatch.price === '0' || selectedBatch.price === '0.00'
                      ? 'FREE COURSE'
                      : `₹${selectedBatch.price}`}
                  </p>
                </div>
              </div>

              {/* DIRECT STUDY MATERIAL / SUBJECTS (Batch overview completely removed) */}
              <div className="mt-8 pb-16">
                <div
                  className={`border rounded-3xl p-6 md:p-8 shadow-xl ${themeConfig.cardBg} ${themeConfig.cardBorder}`}
                >
                  <div
                    className={`flex items-center justify-between pb-6 border-b mb-6 ${
                      isLight ? 'border-slate-200' : 'border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${themeConfig.badgeBg}`}
                      >
                        <PlayCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-black">Subject Directory</h2>
                        <p
                          className={`text-xs mt-0.5 ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}
                        >
                          Select any subject to explore chapters, video lectures & notes
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                        isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-white/5 border-white/10 text-neutral-300'
                      }`}
                    >
                      {selectedBatch.subjects?.length || 0} Subjects
                    </span>
                  </div>

                  {/* Subjects Grid */}
                  {selectedBatch.subjects?.length === 0 ? (
                    <div className="text-center py-12 opacity-60">
                      <p>Loading subjects...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {selectedBatch.subjects?.map((sub) => (
                        <button
                          key={sub.entity_id}
                          onClick={() => handleOpenFolder(sub.entity_id, sub.title)}
                          className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-sky-400'
                              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.06] hover:border-[#229ED9]/40'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 ${
                                isLight
                                  ? 'bg-white text-slate-700 group-hover:bg-sky-50 group-hover:text-sky-600 shadow-sm'
                                  : 'bg-white/[0.05] text-neutral-300 group-hover:text-white group-hover:bg-[#229ED9]/25'
                              }`}
                            >
                              <Folder className="w-6 h-6" />
                            </div>
                            <div>
                              <span
                                className={`text-base sm:text-lg font-bold transition-colors ${
                                  isLight ? 'group-hover:text-sky-600' : `group-hover:${themeConfig.accentText}`
                                }`}
                              >
                                {sub.title}
                              </span>
                              <p
                                className={`text-xs mt-0.5 ${
                                  isLight ? 'text-slate-500' : 'text-neutral-500'
                                }`}
                              >
                                Chapters & Videos
                              </p>
                            </div>
                          </div>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1 ${
                              isLight
                                ? 'bg-white text-slate-500 group-hover:text-slate-900 shadow-xs'
                                : 'bg-white/5 text-neutral-400 group-hover:text-white'
                            }`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW C: FOLDER CONTENTS / CHAPTER DIRECTORY */}
        {currentView === 'folder' && selectedBatch && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
            {/* Top Navigation Card */}
            <div
              className={`border rounded-3xl p-6 sm:p-8 shadow-xl mb-6 ${themeConfig.cardBg} ${themeConfig.cardBorder}`}
            >
              <button
                onClick={handleBackFolder}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all mb-4 border cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                    : 'bg-white/[0.06] hover:bg-white/15 border-white/10 text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Previous Folder</span>
              </button>

              <div className="flex items-center gap-3">
                <Folder className={`w-7 h-7 ${themeConfig.accentText}`} />
                <h1 className="text-2xl sm:text-3xl font-black">Folder Contents</h1>
              </div>

              {/* Breadcrumb path */}
              <div
                className={`flex items-center gap-2 mt-3 text-xs sm:text-sm flex-wrap ${
                  isLight ? 'text-slate-500' : 'text-neutral-400'
                }`}
              >
                <span
                  onClick={() => {
                    playBackSound();
                    setCurrentView('batch');
                  }}
                  className="hover:underline cursor-pointer"
                >
                  {selectedBatch.title}
                </span>
                {breadcrumbs.map((step, idx) => (
                  <React.Fragment key={step.id}>
                    <span>/</span>
                    <span
                      onClick={() => handleOpenFolder(step.id, step.title)}
                      className={`cursor-pointer ${
                        idx === breadcrumbs.length - 1
                          ? `${themeConfig.accentText} font-bold`
                          : 'hover:underline'
                      }`}
                    >
                      {step.title}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Folder Contents Card */}
            <div
              className={`border rounded-3xl p-6 sm:p-8 shadow-xl ${themeConfig.cardBg} ${themeConfig.cardBorder}`}
            >
              <div
                className={`flex items-center gap-3 pb-6 border-b mb-6 ${
                  isLight ? 'border-slate-200' : 'border-white/[0.08]'
                }`}
              >
                <PlayCircle className={`w-6 h-6 ${themeConfig.accentText}`} />
                <h2 className="text-xl font-black">Lectures & Modules</h2>
              </div>

              {isFolderLoading ? (
                <div className="text-center py-16">
                  <div
                    className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                    style={{ borderColor: themeConfig.dotColor }}
                  />
                  <p className="text-sm opacity-60">Loading folder contents...</p>
                </div>
              ) : folderItems.length === 0 ? (
                <div className="text-center py-16 opacity-50">
                  <Folder className="w-12 h-12 mx-auto stroke-1 mb-3 opacity-30" />
                  <p className="font-bold">This folder is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {folderItems.map((item) => {
                    if (item.type === 'folder') {
                      return (
                        <button
                          key={item.entity_id}
                          onClick={() => handleOpenFolder(item.entity_id, item.title)}
                          className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-sky-400'
                              : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05] hover:border-[#229ED9]/40'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                                isLight
                                  ? 'bg-white text-slate-700 shadow-xs'
                                  : 'bg-white/5 text-neutral-400 group-hover:text-white group-hover:bg-[#229ED9]/20'
                              }`}
                            >
                              <Folder className="w-6 h-6" />
                            </div>
                            <span
                              className={`text-base sm:text-lg font-bold transition-colors ${
                                isLight ? 'group-hover:text-sky-600' : `group-hover:${themeConfig.accentText}`
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:translate-x-1 ${
                              isLight ? 'bg-white text-slate-500 shadow-xs' : 'bg-white/5 text-neutral-400 group-hover:text-white'
                            }`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </button>
                      );
                    } else {
                      const isPdf =
                        item.data?.file_type === 1 || Boolean(item.data?.url?.includes('.pdf'));

                      return (
                        <button
                          key={item.entity_id}
                          onClick={() => handleOpenFile(item)}
                          className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all text-left group cursor-pointer ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-sky-400'
                              : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                isPdf
                                  ? 'bg-purple-500/10 text-purple-500'
                                  : isLight
                                  ? 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white'
                                  : `bg-white/5 text-neutral-300 group-hover:bg-gradient-to-r ${themeConfig.accentGradient} group-hover:text-white`
                              }`}
                            >
                              {isPdf ? (
                                <FileText className="w-6 h-6" />
                              ) : (
                                <PlayCircle className="w-6 h-6 fill-current" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-sm sm:text-base font-bold truncate transition-colors ${
                                  isLight ? 'group-hover:text-sky-600' : `group-hover:${themeConfig.accentText}`
                                }`}
                              >
                                {item.title}
                              </p>
                              <p
                                className={`text-xs mt-1 ${
                                  isLight ? 'text-slate-500' : 'text-neutral-400'
                                }`}
                              >
                                {isPdf ? 'Study Material · PDF' : 'Video Lecture · HLS Stream'}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 ml-3">
                            <span
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                isLight
                                  ? 'bg-white border border-slate-200 text-slate-700 group-hover:border-sky-400 group-hover:text-sky-600'
                                  : 'bg-white/5 group-hover:bg-[#229ED9]/20 group-hover:text-[#229ED9] text-neutral-300'
                              }`}
                            >
                              {isPdf ? 'View Notes' : 'Play Lecture'}
                            </span>
                          </div>
                        </button>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW D: VIDEO PLAYER SCREEN (Preserves full playback & controls 100%) */}
        {currentView === 'video' && activeFile && selectedBatch && (
          <VideoPlayer
            file={activeFile}
            currentBatchId={selectedBatch.id}
            playlist={folderItems}
            onBack={() => {
              playBackSound();
              setCurrentView('folder');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectPlaylistItem={(item) => handleOpenFile(item)}
          />
        )}
      </main>

      {/* PDF View Modal (Preserved 100%) */}
      <PdfModal file={activePdf} onClose={() => setActivePdf(null)} />

      {/* Telegram Community Modal */}
      <TelegramModal isOpen={isTelegramOpen} onClose={() => setIsTelegramOpen(false)} />

      {/* Favorites Modal */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favoriteBatches={favoriteBatchObjects}
        onSelectBatch={(b) => handleSelectBatch(b)}
        onRemoveFavorite={(id) => toggleFavorite(id)}
      />

      {/* Profile Modal (With Theme selector and Sound toggle, Live API hidden) */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        totalBatches={batches.length}
        favoritesCount={favorites.length}
        currentTheme={theme}
        onSelectTheme={handleSelectTheme}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
      />

      {/* 24-Hour Access Pass Modal (AROLinks Integration) */}
      <AccessPassModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        onPassActivated={() => {
          const exp = localStorage.getItem('pass_expiry');
          if (exp) setPassExpiry(Number(exp));
        }}
        currentTheme={theme}
        passExpiry={passExpiry}
      />

      {/* Floating Telegram Action Button */}
      <a
        href="https://t.me/Voidxevra"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => playTapSound()}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-[#0088cc] to-[#229ED9] hover:from-[#0077b5] hover:to-[#1b8bc2] text-white p-3.5 rounded-full shadow-[0_4px_25px_rgba(34,158,217,0.45)] hover:scale-110 transition-transform cursor-pointer flex items-center justify-center group"
        title="Join Voidxevra on Telegram"
        aria-label="Telegram Channel"
      >
        <Send className="w-6 h-6 -translate-x-[1px] translate-y-[-1px] group-hover:rotate-12 transition-transform" />
      </a>
    </div>
  );
}
