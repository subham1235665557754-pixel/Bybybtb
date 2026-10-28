import { X, Heart, Play, BookOpen, Trash2 } from 'lucide-react';
import { Batch } from '../types.ts';
import { playTapSound, playOpenSound } from '../utils/sound.ts';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favoriteBatches: Batch[];
  onSelectBatch: (batch: Batch) => void;
  onRemoveFavorite: (batchId: number) => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favoriteBatches,
  onSelectBatch,
  onRemoveFavorite,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0c0c0f] border border-white/10 rounded-3xl p-6 sm:p-7 max-w-lg w-full relative shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <h2 className="text-xl font-black text-white">Your Favorites</h2>
          </div>
          <button
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Favorites */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {favoriteBatches.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <Heart className="w-12 h-12 stroke-1 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-neutral-400">No favorites yet</p>
              <p className="text-xs text-neutral-600 mt-1">
                Tap the heart icon on any batch to save it here for quick access.
              </p>
            </div>
          ) : (
            favoriteBatches.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 transition-all group"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-900 shrink-0 relative">
                  <img
                    src={batch.thumbnail}
                    alt={batch.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">
                    {batch.title}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    ₹{batch.price} · {batch.class_tag}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      playOpenSound();
                      onSelectBatch(batch);
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                    title="Open Batch"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      playTapSound();
                      onRemoveFavorite(batch.id);
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
