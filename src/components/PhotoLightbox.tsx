import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { strings } from '../strings';

export interface LightboxPhoto {
  id?: string;
  url: string;
  title?: string;
  subtitle?: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  initialIndex?: number;
  onClose: () => void;
  onDeletePhoto?: (photoId: string) => Promise<void> | void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  initialIndex = 0,
  onClose,
  onDeletePhoto,
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, photos.length - 1))
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Touch tracking for swipe / sliding gestures
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const activePhoto = photos[currentIndex];

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  // Keyboard navigation: Left/Right arrows, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, onClose]);

  // Touch gestures for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45; // pixels
    if (diff > minSwipeDistance) {
      handleNext();
    } else if (diff < -minSwipeDistance) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleDelete = async () => {
    if (!activePhoto?.id || !onDeletePhoto) return;
    if (!window.confirm(strings.parcelsList.deletePhotoConfirm)) return;

    try {
      setIsDeleting(true);
      await onDeletePhoto(activePhoto.id);
      if (photos.length <= 1) {
        onClose();
      } else {
        setCurrentIndex((prev) => Math.min(prev, photos.length - 2));
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activePhoto) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Bar: Info, Counter, Optional Delete, Close */}
      <div
        className="w-full px-4 py-3 flex items-center justify-between text-white shrink-0 bg-gradient-to-b from-black/60 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono font-bold bg-white/20 px-2.5 py-1 rounded-full text-white">
            {currentIndex + 1} / {photos.length}
          </span>
          {(activePhoto.title || activePhoto.subtitle) && (
            <div className="min-w-0 truncate">
              {activePhoto.title && (
                <span className="text-xs font-bold text-white truncate block">
                  {activePhoto.title}
                </span>
              )}
              {activePhoto.subtitle && (
                <span className="text-[11px] text-slate-300 truncate block">
                  {activePhoto.subtitle}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onDeletePhoto && activePhoto.id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete this photo"
              className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={strings.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage with Left & Right Arrow Buttons */}
      <div
        className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-6 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-transform hover:scale-110 shadow-lg border border-white/20"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Center Active Image */}
        <div className="relative max-w-4xl max-h-[72vh] flex items-center justify-center">
          <img
            key={activePhoto.url}
            src={activePhoto.url}
            alt={activePhoto.title || `Photo ${currentIndex + 1}`}
            className="max-w-full max-h-[72vh] w-auto h-auto object-contain rounded-2xl shadow-2xl ring-1 ring-white/25 transition-opacity duration-150 animate-in fade-in"
          />
        </div>

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-6 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-transform hover:scale-110 shadow-lg border border-white/20"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div
        className="w-full px-4 py-3 bg-black/60 backdrop-blur-md shrink-0 border-t border-white/10 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 overflow-x-auto py-1 scrollbar-none">
          {photos.map((ph, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={ph.id || idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden transition-all duration-150 ${
                  isActive
                    ? 'ring-2 ring-white scale-105 opacity-100 shadow-md'
                    : 'opacity-50 hover:opacity-90 ring-1 ring-white/20'
                }`}
                title={`Go to photo ${idx + 1}`}
              >
                <img
                  src={ph.url}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

