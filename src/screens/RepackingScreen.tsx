import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Trash2,
  X,
  Loader2,
  Layers,
  Truck,
  ArrowLeft,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Camera,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { useRepository, BoxWithDetails, ParcelWithDetails, ParcelItemWithDetails } from '../data';
import { useAuth } from '../context/AuthContext';
import { useDateFilter } from '../context/DateFilterContext';
import { strings } from '../strings';
import { PhotoLightbox, LightboxPhoto } from '../components/PhotoLightbox';
import { compressPhoto } from '../utils/imageCompression';
import { formatLocalDate, formatDisplayDate } from '../utils/date';

const getCourierBadgeStyle = (status?: string) => {
  switch (status) {
    case 'draft':
      return 'bg-amber-50 text-[#ED7D24] border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
    case 'in_transit':
      return 'bg-blue-50 text-[#1E75BB] border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50';
    case 'delivered':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

export const RepackingScreen: React.FC = () => {
  const repository = useRepository();
  const { user } = useAuth();

  const [boxes, setBoxes] = useState<BoxWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sticky Date Bar from Context
  const { selectedDate, setSelectedDate, stepDate, todayIso } = useDateFilter();
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Lightbox State
  const [lightboxPhotos, setLightboxPhotos] = useState<LightboxPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleOpenLightbox = (photos: LightboxPhoto[], index: number = 0) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  // Selected Box for Manage Modal
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [activeBox, setActiveBox] = useState<BoxWithDetails | null>(null);

  // Modal View: 'details' or 'add_parcels'
  const [modalView, setModalView] = useState<'details' | 'add_parcels'>('details');

  // Stored parcels available to pack
  const [storedParcels, setStoredParcels] = useState<ParcelWithDetails[]>([]);
  const [loadingStoredParcels, setLoadingStoredParcels] = useState(false);
  const [packQtyMap, setPackQtyMap] = useState<Record<string, number>>({});
  const [isAddingToBox, setIsAddingToBox] = useState(false);

  // Repacked Box Photos upload
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const boxFileInputRef = useRef<HTMLInputElement>(null);

  const isBoxLocked = useMemo(() => {
    if (!activeBox) return false;
    return (
      activeBox.status === 'in_transit' ||
      activeBox.status === 'delivered' ||
      (activeBox.courier && activeBox.courier.status !== 'draft')
    );
  }, [activeBox]);

  const isBoxDelivered = useMemo(() => {
    if (!activeBox) return false;
    return activeBox.status === 'delivered' || activeBox.courier?.status === 'delivered';
  }, [activeBox]);

  const handleUploadBoxPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeBox) return;
    if (isBoxLocked) {
      alert(`⚠️ Big Box is ${isBoxDelivered ? 'delivered' : 'in transit'}. Adding photos is not permitted.`);
      return;
    }
    try {
      setIsUploadingPhoto(true);
      const blobs: Blob[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressPhoto(files[i]);
        blobs.push(compressed);
      }
      await repository.addBoxPhotos(activeBox.id, blobs);
      await loadBoxDetails(activeBox.id);
      await loadBoxes();
    } catch (err: unknown) {
      console.error('Failed to upload box photo:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upload photo. Please retry.';
      alert(msg);
    } finally {
      setIsUploadingPhoto(false);
      if (boxFileInputRef.current) boxFileInputRef.current.value = '';
    }
  };

  const handleDeleteBoxPhoto = async (photoId: string) => {
    if (!activeBox) return;
    if (isBoxLocked) {
      alert(`⚠️ Big Box is ${isBoxDelivered ? 'delivered' : 'in transit'}. Modifying photos is not permitted.`);
      return;
    }
    try {
      await repository.deleteBoxPhoto(photoId);
      await loadBoxDetails(activeBox.id);
      await loadBoxes();
    } catch (err: unknown) {
      console.error('Failed to delete photo:', err);
      alert('Failed to delete photo.');
    }
  };

  const loadBoxes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await repository.getBoxes();
      setBoxes(data);
    } catch (err) {
      console.error('Failed to load boxes:', err);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadBoxes();
  }, [loadBoxes]);

  // Load detailed box when selected
  const loadBoxDetails = useCallback(async (boxId: string) => {
    try {
      const box = await repository.getBoxById(boxId);
      setActiveBox(box);
    } catch (err) {
      console.error('Failed to load box details:', err);
    }
  }, [repository]);

  useEffect(() => {
    if (selectedBoxId) {
      loadBoxDetails(selectedBoxId);
      setModalView('details');
    } else {
      setActiveBox(null);
    }
  }, [selectedBoxId, loadBoxDetails]);

  // Load available stored parcels to pack
  const loadAvailableStoredParcels = useCallback(async () => {
    try {
      setLoadingStoredParcels(true);
      const all = await repository.getParcels({ status: 'stored' });
      // Only parcels that have pieces remaining in warehouse storage
      const available = all.filter((p) => p.breakdown.stored_qty > 0);
      setStoredParcels(available);

      // Initialize default quantities to pack per item
      const qMap: Record<string, number> = {};
      available.forEach((p) => {
        p.items.forEach((it) => {
          if (it.stored_qty > 0) {
            qMap[it.id] = it.stored_qty;
          }
        });
      });
      setPackQtyMap(qMap);
    } catch (err) {
      console.error('Failed to load stored parcels:', err);
    } finally {
      setLoadingStoredParcels(false);
    }
  }, [repository]);

  const handleOpenAddParcelsView = () => {
    if (isBoxLocked) {
      alert(`⚠️ Big Box is ${isBoxDelivered ? 'delivered' : 'in transit'}. Modifying cargo pieces or adding parcels is not permitted.`);
      return;
    }
    setModalView('add_parcels');
    loadAvailableStoredParcels();
  };

  // Create new box
  const handleCreateBox = async () => {
    try {
      const userId = user?.id || crypto.randomUUID();
      const newBox = await repository.createBox(userId);
      await loadBoxes();
      setSelectedBoxId(newBox.id);
    } catch (err) {
      console.error('Failed to create box:', err);
      alert('Could not create box. Please retry.');
    }
  };

  // Execute packing pieces from a specific package item into box
  const handleAddPiecesToBox = async (parcel: ParcelWithDetails, item: ParcelItemWithDetails) => {
    if (!activeBox) return;
    if (isBoxLocked) {
      alert(`⚠️ Big Box is ${isBoxDelivered ? 'delivered' : 'in transit'}. Modifying cargo pieces or adding parcels is not permitted.`);
      return;
    }
    const qtyToTake = packQtyMap[item.id] || item.stored_qty;
    if (qtyToTake <= 0 || qtyToTake > item.stored_qty) {
      alert(`Please enter a quantity between 1 and ${item.stored_qty}`);
      return;
    }

    setIsAddingToBox(true);
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.addParcelItemPiecesToBox(activeBox.id, parcel.id, item.id, qtyToTake, userId);

      // Refresh box and switch back to details view
      await loadBoxDetails(activeBox.id);
      await loadBoxes();
      setModalView('details');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to pack parcel';
      alert(msg);
    } finally {
      setIsAddingToBox(false);
    }
  };

  // Remove parcel piece entry from box
  const handleRemoveFromBox = async (boxItemId: string) => {
    if (!activeBox) return;
    if (isBoxLocked) {
      alert(`⚠️ Big Box is ${isBoxDelivered ? 'delivered' : 'in transit'}. Modifying cargo pieces or removing items is not permitted.`);
      return;
    }
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.removeParcelItemPiecesFromBox(activeBox.id, boxItemId, userId);
      await loadBoxDetails(activeBox.id);
      await loadBoxes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove from box';
      alert(msg);
    }
  };

  // Delete box
  const handleDeleteBox = async () => {
    if (!activeBox) return;
    if (activeBox.courier_id || activeBox.courier || activeBox.status !== 'active') {
      alert(
        `Cannot delete this big box while loaded on a courier truck (${activeBox.courier?.truck_no || activeBox.courier?.courier_code || 'in transit'}). Please unload it from the courier run first.`
      );
      return;
    }

    if (!confirm('Are you sure you want to delete this big box? Any items inside will return to stored warehouse inventory.')) {
      return;
    }

    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.deleteBox(activeBox.id, userId);
      setSelectedBoxId(null);
      await loadBoxes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete box';
      alert(msg);
    }
  };

  // Group box parcels by customer
  const groupedContents = useMemo(() => {
    if (!activeBox?.items) return [];
    const map = new Map<
      string,
      {
        customerName: string;
        customerCode: string;
        items: typeof activeBox.items;
        totalPieces: number;
        totalWeight: number;
      }
    >();

    for (const it of activeBox.items) {
      const p = it.parcel;
      const custId = p.customer_id;
      const custName = p.customer?.name || 'Unknown';
      const custCode = p.customer?.code || '';

      if (!map.has(custId)) {
        map.set(custId, {
          customerName: custName,
          customerCode: custCode,
          items: [],
          totalPieces: 0,
          totalWeight: 0,
        });
      }

      const entry = map.get(custId)!;
      entry.items.push(it);
      entry.totalPieces += it.qty;
      entry.totalWeight += it.weight_kg;
    }

    return Array.from(map.values());
  }, [activeBox?.items]);

  // Filter boxes list with date and similarity / deep item search
  const filteredBoxes = useMemo(() => {
    return boxes.filter((b) => {
      // Search query filter (searches across ALL dates when query present)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = b.box_code.toLowerCase().includes(q);
        const matchesCourier =
          b.courier?.truck_no?.toLowerCase().includes(q) ||
          b.courier?.courier_code?.toLowerCase().includes(q);

        const matchesItem = (b.items || []).some((it) => {
          const pCode = it.parcel?.parcel_code?.toLowerCase() || '';
          const cName = it.parcel?.customer?.name?.toLowerCase() || '';
          const cCode = it.parcel?.customer?.code?.toLowerCase() || '';
          const itName = it.item?.item_name?.toLowerCase() || '';
          const rName = it.item?.name_on_parcel?.toLowerCase() || '';
          return (
            pCode.includes(q) ||
            cName.includes(q) ||
            cCode.includes(q) ||
            itName.includes(q) ||
            rName.includes(q)
          );
        });

        if (!matchesCode && !matchesCourier && !matchesItem) return false;
      } else if (selectedDate !== 'all') {
        const boxDate = formatLocalDate(b.created_at);
        if (boxDate !== selectedDate) return false;
      }

      return true;
    });
  }, [boxes, selectedDate, searchQuery]);

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-2.5 sm:space-y-3.5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-[#1E75BB] dark:text-[#2D8AD1] flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#1E75BB] dark:text-[#2D8AD1]" />
            <span>{strings.repacking.title}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {strings.repacking.subtitle}
          </p>
        </div>

        <button
          onClick={handleCreateBox}
          className="px-3.5 py-2 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 min-h-[38px]"
        >
          <Plus className="w-4 h-4" />
          <span>{strings.repacking.createNewBoxButton}</span>
        </button>
      </div>

      {/* Sticky Date Navigation Bar - Fixed at top when scrolling */}
      <div className="sticky top-0 z-20 bg-[#FAF9F6]/95 dark:bg-slate-950/95 backdrop-blur-xs py-1 -mx-3 px-3 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
        <div className="bg-white dark:bg-slate-900 p-1 sm:p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-1 w-full select-none transition-colors">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              title="Previous Day"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center shrink-0 min-h-[34px] min-w-[34px]"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker?.();
                  } catch {
                    dateInputRef.current?.focus();
                  }
                }}
                title="Click to choose a date"
                className="w-full px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] sm:text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1] flex items-center justify-center gap-1 min-h-[34px] truncate transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1] shrink-0" />
                <span className="truncate">
                  {selectedDate === 'all' ? (
                    strings.parcelsList.allDates
                  ) : (
                    <>
                      <span>{formatDisplayDate(selectedDate)}</span>
                      {selectedDate === todayIso && (
                        <span className="ml-1 text-[9px] sm:text-[10px] font-extrabold text-[#ED7D24] bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-900/50 shrink-0">
                          Today
                        </span>
                      )}
                    </>
                  )}
                </span>
              </button>

              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate === 'all' ? '' : selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            <button
              type="button"
              onClick={() => stepDate(1)}
              title="Next Day"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center shrink-0 min-h-[34px] min-w-[34px]"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(selectedDate === 'all' ? todayIso : 'all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold border transition-colors shrink-0 min-h-[34px] ${
              selectedDate === 'all'
                ? 'bg-[#1E75BB] text-white border-[#1E75BB]'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {strings.parcelsList.allDates}
          </button>
        </div>
      </div>

      {/* Search Bar - Below Date Bar, scrolls naturally with content */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={strings.repacking.searchPlaceholder}
          className="w-full pl-9 pr-9 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E75BB] focus:ring-2 focus:ring-[#1E75BB]/20 shadow-xs min-h-[40px] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Big Boxes List - Responsive Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#1E75BB]" />
          <span>{strings.common.loading}</span>
        </div>
      ) : filteredBoxes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors">
          <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
            {strings.repacking.emptyBoxes}
          </p>
          <button
            onClick={handleCreateBox}
            className="px-4 py-2 bg-[#1E75BB] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#165B94]"
          >
            {strings.repacking.createNewBoxButton}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredBoxes.map((box) => {
            const boxPhotos: LightboxPhoto[] = [];
            // 1. Repacked Master Box's own photos first
            (box.photos || []).forEach((bp, pi) => {
              boxPhotos.push({
                id: bp.id,
                url: bp.url,
                title: `${box.box_code} • Repacked Master Box`,
                subtitle: `Box Photo ${pi + 1}`,
              });
            });
            // 2. Contents photos
            (box.items || []).forEach((it) => {
              (it.item?.photo_urls || []).forEach((u, pi) => {
                boxPhotos.push({
                  url: u,
                  title: `${box.box_code} • ${it.parcel?.customer?.name || 'Customer'}`,
                  subtitle: `${it.item?.item_name || it.item?.name_on_parcel || 'Package'} #${it.item?.item_index || pi + 1}`,
                });
              });
            });

            return (
              <div
                key={box.id}
                onClick={() => setSelectedBoxId(box.id)}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-2.5 hover:border-[#1E75BB] dark:hover:border-[#2D8AD1] transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-base text-slate-900 dark:text-white group-hover:text-[#1E75BB] dark:group-hover:text-[#2D8AD1] transition-colors">
                      {box.box_code}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBoxId(box.id);
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors min-h-[36px]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{strings.common.edit}</span>
                    </button>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                      <Layers className="w-4 h-4 text-[#1E75BB] dark:text-[#2D8AD1]" />
                      <span>{box.total_pieces} pieces</span>
                      <span className="text-slate-400 dark:text-slate-500 font-normal">({box.parcels_count} packages)</span>
                    </div>
                    <div className="font-extrabold text-[#1E75BB] dark:text-[#2D8AD1]">
                      {(box.total_weight_kg || 0).toFixed(2)} kg total
                    </div>
                  </div>

                  {/* Photo Thumbnails */}
                  {boxPhotos.length > 0 && (
                    <div
                      className="flex items-center gap-1.5 pt-0.5 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {boxPhotos.slice(0, 3).map((ph, pi) => {
                        const isBoxPhoto = pi < (box.photos || []).length;
                        return (
                          <div
                            key={pi}
                            onClick={() => handleOpenLightbox(boxPhotos, pi)}
                            className={`relative w-11 h-11 rounded-lg border overflow-hidden bg-slate-50 dark:bg-slate-800 cursor-pointer hover:opacity-90 shrink-0 shadow-2xs ${
                              isBoxPhoto ? 'border-[#1E75BB] ring-1 ring-[#1E75BB]/30' : 'border-slate-200 dark:border-slate-700'
                            }`}
                            title={isBoxPhoto ? 'Repacked Master Box Photo' : 'Contents Photo'}
                          >
                            <img
                              src={ph.url}
                              alt={ph.title || `Box photo ${pi + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {isBoxPhoto && (
                              <span className="absolute bottom-0 inset-x-0 bg-[#1E75BB]/90 text-[7px] text-white font-black text-center py-0.5 tracking-tighter uppercase leading-none">
                                Box
                              </span>
                            )}
                            {pi === 2 && boxPhotos.length > 3 && (
                              <div className="absolute inset-0 bg-black/60 text-white font-black text-[10px] flex items-center justify-center">
                                +{boxPhotos.length - 3}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Created {formatLocalDate(box.created_at)}</span>
                  {box.courier && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCourierBadgeStyle(
                        box.courier.status
                      )}`}
                    >
                      <Truck className="w-3 h-3" />
                      <span>{box.courier.truck_no || box.courier.courier_code}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manage Box Modal */}
      {selectedBoxId && activeBox && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-5 max-h-[92vh] flex flex-col animate-in zoom-in-95 text-slate-800 dark:text-slate-100">
            
            {/* View 1: Box Details & Contents */}
            {modalView === 'details' ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg text-[#1E75BB] dark:text-[#2D8AD1]">
                      {activeBox.box_code}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      (Created {activeBox.created_at?.split('T')[0]})
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedBoxId(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Warning message if Box is In Transit or Delivered */}
                {isBoxLocked && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      ⚠️ Big box is {isBoxDelivered ? 'delivered' : `in transit on truck (${activeBox.courier?.truck_no || 'dispatched'})`}. Modifying cargo pieces, adding parcels, or removing items is not permitted.
                    </span>
                  </div>
                )}

                {/* Quick Box Stats */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0 font-bold text-[#1E75BB] dark:text-[#2D8AD1]">
                  <div>
                    Total Cargo: <span className="text-[#1E75BB] dark:text-[#2D8AD1]">{activeBox.total_pieces || 0} pcs</span> ({activeBox.parcels_count || 0} packages)
                  </div>
                  <div>
                    Weight: <span className="text-[#1E75BB] dark:text-[#2D8AD1]">{(activeBox.total_weight_kg || 0).toFixed(2)} kg</span>
                  </div>
                </div>

                {/* Repacked Master Box Photos Section */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1]" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Repacked Box Photos ({(activeBox.photos || []).length})
                      </span>
                    </div>
                    {!isBoxLocked && (
                      <div>
                        <input
                          ref={boxFileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          className="hidden"
                          onChange={handleUploadBoxPhoto}
                        />
                        <button
                          type="button"
                          onClick={() => boxFileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-[#1E75BB] dark:text-[#2D8AD1] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors min-h-[32px] shadow-2xs"
                        >
                          {isUploadingPhoto ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>Add Box Photo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {(activeBox.photos || []).length === 0 ? (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      No photos of the repacked master box yet. Tap &quot;+ Add Box Photo&quot; to upload carton photos.
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {(activeBox.photos || []).map((p, pIdx) => (
                        <div
                          key={p.id}
                          className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 group bg-white dark:bg-slate-800 shadow-2xs"
                        >
                          <img
                            src={p.url}
                            alt="Repacked box"
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              const allPhotos: LightboxPhoto[] = [
                                ...(activeBox.photos || []).map((bp, i) => ({
                                  id: bp.id,
                                  url: bp.url,
                                  title: `${activeBox.box_code} • Repacked Master Box`,
                                  subtitle: `Box Photo ${i + 1}`,
                                })),
                                ...((activeBox.items || []).flatMap((it) =>
                                  (it.item?.photo_urls || []).map((u, i) => ({
                                    id: undefined,
                                    url: u,
                                    title: `${activeBox.box_code} • ${it.parcel?.customer?.name || 'Customer'}`,
                                    subtitle: `${it.item?.item_name || it.item?.name_on_parcel || 'Package'} #${it.item?.item_index || i + 1}`,
                                  }))
                                )),
                              ];
                              handleOpenLightbox(allPhotos, pIdx);
                            }}
                          />
                          {!isBoxLocked && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this photo of the repacked box?')) {
                                  handleDeleteBoxPhoto(p.id);
                                }
                              }}
                              className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-md transition-colors"
                              title="Delete photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Parcels Button or Locked Indicator */}
                {isBoxLocked ? (
                  <div className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] shrink-0 border border-slate-200 dark:border-slate-700 select-none">
                    <Lock className="w-4 h-4 text-amber-500" />
                    <span>Packing Locked ({isBoxDelivered ? 'Delivered' : 'In Transit'})</span>
                  </div>
                ) : (
                  <button
                    onClick={handleOpenAddParcelsView}
                    className="w-full py-2.5 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center min-h-[44px] shrink-0 transition-colors"
                  >
                    <span>{strings.repacking.addParcelsTitle}</span>
                  </button>
                )}

                {/* Grouped Contents By Customer */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {strings.repacking.groupedByCustomer}
                  </h4>

                  {groupedContents.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                      This big box is empty. Tap &quot;+ Add Stored Parcels&quot; above to pack warehouse inventory into this box.
                    </div>
                  ) : (
                    groupedContents.map((group, gIdx) => (
                      <div
                        key={gIdx}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs"
                      >
                        <div className="bg-slate-100/80 dark:bg-slate-800 px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                          <div>
                            <span>{group.customerName}</span>{' '}
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                              ({group.customerCode})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300">
                            {group.totalPieces} pcs • {(group.totalWeight || 0).toFixed(2)} kg
                          </div>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
                          {group.items.map((it) => {
                            const itemPhotos = (it.item?.photo_urls || []).map((u, pi) => ({
                              url: u,
                              title: `${it.parcel.parcel_code} • ${it.item?.item_name || it.item?.name_on_parcel}`,
                              subtitle: `Photo ${pi + 1}`,
                            }));

                            return (
                              <div
                                key={it.id}
                                className="flex items-center justify-between py-2 px-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg gap-2 transition-colors"
                              >
                                <div className="flex items-start gap-2 min-w-0">
                                  {itemPhotos.length > 0 && (
                                    <img
                                      src={itemPhotos[0].url}
                                      alt="Item thumbnail"
                                      onClick={() => handleOpenLightbox(itemPhotos, 0)}
                                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 shrink-0 mt-0.5 shadow-2xs"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 font-bold text-[#1E75BB] dark:text-[#2D8AD1] flex-wrap">
                                      <span>{it.parcel.parcel_code}</span>
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                                        (Pkg #{it.item?.item_index || 1}: {it.item?.item_name || it.item?.name_on_parcel || 'Item'})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {it.qty} pcs • {it.item?.weight_per_piece_kg || 0} kg/pc ({(it.weight_kg || 0).toFixed(2)} kg)
                                    </div>
                                  </div>
                                </div>

                                {isBoxLocked ? (
                                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0 px-2 py-1">
                                    <Lock className="w-3 h-3 text-amber-500" />
                                    <span>Locked</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleRemoveFromBox(it.id)}
                                    title={strings.repacking.removeParcelFromBox}
                                    className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-semibold shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Actions: Delete Big Box Guard */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
                  {activeBox.courier_id || activeBox.courier || activeBox.status !== 'active' ? (
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                      <Truck className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1] shrink-0" />
                      <span>
                        Loaded on truck ({activeBox.courier?.truck_no || activeBox.courier?.courier_code || 'In transit'}) — Cannot delete
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDeleteBox}
                      className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-xl transition-colors min-h-[44px]"
                    >
                      {strings.repacking.deleteBoxButton}
                    </button>
                  )}
                </div>
              </>
            ) : (
              /* View 2: Add Stored Parcels View */
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    onClick={() => setModalView('details')}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1] hover:underline min-h-[36px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{strings.repacking.backToBox}</span>
                  </button>

                  <h3 className="font-extrabold text-sm text-[#1E75BB] dark:text-[#2D8AD1]">
                    Pack into {activeBox.box_code}
                  </h3>

                  <button
                    onClick={() => setSelectedBoxId(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  Select available stored packages to pack into {activeBox.box_code}:
                </p>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {loadingStoredParcels ? (
                    <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#1E75BB]" />
                      <span>Loading stored parcels...</span>
                    </div>
                  ) : storedParcels.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                      {strings.repacking.noStoredParcelsAvailable}
                    </div>
                  ) : (
                    storedParcels.map((p) => {
                      const availableItems = p.items.filter((it) => it.stored_qty > 0);
                      if (availableItems.length === 0) return null;

                      return (
                        <div
                          key={p.id}
                          className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 p-3 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
                                {p.parcel_code}
                              </span>
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {p.customer?.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {p.breakdown.stored_qty} pcs stored total
                            </span>
                          </div>

                          {/* List of items in this parcel lot */}
                          <div className="space-y-2">
                            {availableItems.map((it) => {
                              const selectedQty = packQtyMap[it.id] ?? it.stored_qty;

                              return (
                                <div
                                  key={it.id}
                                  className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg flex items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 py-0.5 rounded font-mono">
                                        #{it.item_index}
                                      </span>
                                      <span>{it.item_name || it.name_on_parcel}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      Available: <strong>{it.stored_qty} pcs</strong> ({it.weight_per_piece_kg} kg/pc)
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      max={it.stored_qty}
                                      value={selectedQty}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10) || 0;
                                        setPackQtyMap((prev) => ({
                                          ...prev,
                                          [it.id]: Math.min(it.stored_qty, Math.max(1, val)),
                                        }));
                                      }}
                                      className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 text-center bg-white dark:bg-slate-900"
                                    />

                                    <button
                                      type="button"
                                      onClick={() => handleAddPiecesToBox(p, it)}
                                      disabled={isAddingToBox}
                                      className="px-3.5 py-1.5 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 min-h-[34px]"
                                    >
                                      {isAddingToBox && <Loader2 className="w-3 h-3 animate-spin" />}
                                      <span>Pack</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {isLightboxOpen && (
        <PhotoLightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
          onDeletePhoto={async (photoId) => {
            await handleDeleteBoxPhoto(photoId);
            setIsLightboxOpen(false);
          }}
        />
      )}
    </div>
  );
};
