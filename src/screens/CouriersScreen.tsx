import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Boxes,
  PackageSearch,
  Trash2,
  X,
  Loader2,
  Layers,
  Send,
  RotateCcw,
  ArrowLeft,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Camera,
  Check,
} from 'lucide-react';
import { useRepository, CourierWithDetails, BoxWithDetails, ParcelWithDetails, ParcelItemWithDetails } from '../data';
import { useAuth } from '../context/AuthContext';
import { useDateFilter } from '../context/DateFilterContext';
import { strings } from '../strings';
import { formatLocalDate, formatDisplayDate } from '../utils/date';
import { CourierStatus } from '../types';
import { PhotoLightbox, LightboxPhoto } from '../components/PhotoLightbox';
import { compressPhoto } from '../utils/imageCompression';

export const CouriersScreen: React.FC = () => {
  const repository = useRepository();
  const { user } = useAuth();

  const [couriers, setCouriers] = useState<CourierWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CourierStatus>('all');

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

  // Create Courier Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTruckNo, setNewTruckNo] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Manage Courier Modal
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [activeCourier, setActiveCourier] = useState<CourierWithDetails | null>(null);

  // Edit Truck Number State
  const [isEditingTruckNo, setIsEditingTruckNo] = useState(false);
  const [editedTruckNo, setEditedTruckNo] = useState('');
  const [isSavingTruckNo, setIsSavingTruckNo] = useState(false);

  // Manage Modal View State: 'details' | 'load_box' | 'load_parcel'
  const [modalView, setModalView] = useState<'details' | 'load_box' | 'load_parcel'>('details');

  // Load Boxes list
  const [availableBoxes, setAvailableBoxes] = useState<BoxWithDetails[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(false);

  // Load Loose Parcels list
  const [availableParcels, setAvailableParcels] = useState<ParcelWithDetails[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);
  const [looseQtyMap, setLooseQtyMap] = useState<Record<string, number>>({});
  const [isLoadingCargo, setIsLoadingCargo] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Courier / Truck Photos upload
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const courierFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadCourierPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeCourier) return;
    try {
      setIsUploadingPhoto(true);
      const blobs: Blob[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressPhoto(files[i]);
        blobs.push(compressed);
      }
      await repository.addCourierPhotos(activeCourier.id, blobs);
      await loadCourierDetails(activeCourier.id);
      await loadCouriers();
    } catch (err: unknown) {
      console.error('Failed to upload truck photo:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upload photo. Please retry.';
      alert(msg);
    } finally {
      setIsUploadingPhoto(false);
      if (courierFileInputRef.current) courierFileInputRef.current.value = '';
    }
  };

  const handleDeleteCourierPhoto = async (photoId: string) => {
    if (!activeCourier) return;
    try {
      await repository.deleteCourierPhoto(photoId);
      await loadCourierDetails(activeCourier.id);
      await loadCouriers();
    } catch (err: unknown) {
      console.error('Failed to delete photo:', err);
      alert('Failed to delete photo.');
    }
  };

  const loadCouriers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await repository.getCouriers();
      setCouriers(data);
    } catch (err) {
      console.error('Failed to load couriers:', err);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  // Load detailed courier when selected
  const loadCourierDetails = useCallback(async (courierId: string) => {
    try {
      const c = await repository.getCourierById(courierId);
      setActiveCourier(c);
    } catch (err) {
      console.error('Failed to load courier details:', err);
    }
  }, [repository]);

  useEffect(() => {
    if (selectedCourierId) {
      loadCourierDetails(selectedCourierId);
      setModalView('details');
    } else {
      setActiveCourier(null);
    }
  }, [selectedCourierId, loadCourierDetails]);

  // Handle Create Courier Run
  const handleCreateCourier = async () => {
    const trimmedTruck = newTruckNo.trim();
    if (!trimmedTruck) {
      setCreateError('Please enter a truck number or vehicle identifier.');
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const userId = user?.id || crypto.randomUUID();
      const created = await repository.createCourier(
        {
          truck_no: trimmedTruck,
        },
        userId
      );

      setIsCreateModalOpen(false);
      setNewTruckNo('');
      await loadCouriers();
      setSelectedCourierId(created.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create courier';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // Edit Truck Number Handler (Allowed across all stages)
  const handleSaveTruckNo = async () => {
    if (!activeCourier) return;
    const trimmed = editedTruckNo.trim();
    if (!trimmed) {
      alert('Please enter a valid truck number.');
      return;
    }
    setIsSavingTruckNo(true);
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.updateCourierTruckNo(activeCourier.id, trimmed, userId);
      await loadCourierDetails(activeCourier.id);
      await loadCouriers();
      setIsEditingTruckNo(false);
      setActionSuccess(`Updated truck number to "${trimmed}"`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update truck number';
      alert(msg);
    } finally {
      setIsSavingTruckNo(false);
    }
  };

  // Delete Courier Run Handler (Allowed ONLY when in draft / loading stage)
  const handleDeleteCourierRun = async () => {
    if (!activeCourier) return;
    if (activeCourier.status !== 'draft') {
      alert('Cannot delete courier while in transit or delivered.');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to delete courier truck "${activeCourier.truck_no}"? Any loaded boxes and loose cargo will return to warehouse storage.`
      )
    ) {
      return;
    }
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.deleteCourier(activeCourier.id, userId);
      setSelectedCourierId(null);
      await loadCouriers();
      setActionSuccess(`Deleted truck run "${activeCourier.truck_no}"`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete courier';
      alert(msg);
    }
  };

  // Switch to Load Boxes View
  const handleOpenLoadBoxView = async () => {
    setModalView('load_box');
    setLoadingBoxes(true);
    try {
      const all = await repository.getBoxes();
      const unassigned = all.filter((b) => !b.courier_id);
      setAvailableBoxes(unassigned);
    } catch (err) {
      console.error('Failed to load unassigned boxes:', err);
    } finally {
      setLoadingBoxes(false);
    }
  };

  // Execute loading box
  const handleLoadBox = async (boxId: string) => {
    if (!activeCourier) return;
    setIsLoadingCargo(true);
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.addBoxToCourier(activeCourier.id, boxId, userId);
      await loadCourierDetails(activeCourier.id);
      await loadCouriers();
      setModalView('details');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load box';
      alert(msg);
    } finally {
      setIsLoadingCargo(false);
    }
  };

  // Unload box from courier
  const handleUnloadBox = async (boxId: string) => {
    if (!activeCourier) return;
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.removeBoxFromCourier(activeCourier.id, boxId, userId);
      await loadCourierDetails(activeCourier.id);
      await loadCouriers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove box';
      alert(msg);
    }
  };

  // Switch to Load Loose Parcels View
  const handleOpenLoadParcelView = async () => {
    setModalView('load_parcel');
    setLoadingParcels(true);
    try {
      const all = await repository.getParcels({ status: 'stored' });
      const available = all.filter((p) => p.breakdown.stored_qty > 0);
      setAvailableParcels(available);

      const qMap: Record<string, number> = {};
      available.forEach((p) => {
        p.items.forEach((it) => {
          if (it.stored_qty > 0) {
            qMap[it.id] = it.stored_qty;
          }
        });
      });
      setLooseQtyMap(qMap);
    } catch (err) {
      console.error('Failed to load loose parcels:', err);
    } finally {
      setLoadingParcels(false);
    }
  };

  // Execute load loose parcel item
  const handleLoadLooseParcel = async (parcel: ParcelWithDetails, item: ParcelItemWithDetails) => {
    if (!activeCourier) return;
    const qtyToLoad = looseQtyMap[item.id] || item.stored_qty;
    if (qtyToLoad <= 0 || qtyToLoad > item.stored_qty) {
      alert(`Please enter a quantity between 1 and ${item.stored_qty}`);
      return;
    }

    setIsLoadingCargo(true);
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.addLooseParcelItemPiecesToCourier(activeCourier.id, parcel.id, item.id, qtyToLoad, userId);
      await loadCourierDetails(activeCourier.id);
      await loadCouriers();
      setModalView('details');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load parcel';
      alert(msg);
    } finally {
      setIsLoadingCargo(false);
    }
  };

  // Unload loose parcel item
  const handleUnloadParcel = async (itemId: string) => {
    if (!activeCourier) return;
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.removeLooseParcelItemPiecesFromCourier(activeCourier.id, itemId, userId);
      await loadCourierDetails(activeCourier.id);
      await loadCouriers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove parcel';
      alert(msg);
    }
  };

  // Status transitions
  const handleUpdateStatus = async (toStatus: CourierStatus) => {
    if (!activeCourier) return;

    if (toStatus === 'delivered') {
      const confirmMsg = `Mark truck ${activeCourier.truck_no} (${activeCourier.courier_code}) as DELIVERED?\n\nThis will mark all ${activeCourier.total_pieces_count || 0} cargo pieces on this truck as Delivered.`;
      if (!window.confirm(confirmMsg)) return;
    } else if (toStatus === 'in_transit' && activeCourier.status === 'delivered') {
      const confirmMsg = `Revert truck ${activeCourier.truck_no} back to IN TRANSIT?\n\nThis will restore all cargo contents back to In Transit status.`;
      if (!window.confirm(confirmMsg)) return;
    } else if (toStatus === 'draft') {
      const confirmMsg = `Revert truck ${activeCourier.truck_no} back to LOADING (Draft)?\n\nThis will allow adding or removing cargo again.`;
      if (!window.confirm(confirmMsg)) return;
    }

    const userId = user?.id || crypto.randomUUID();
    try {
      await repository.updateCourierStatus(activeCourier.id, toStatus, userId);
      await loadCourierDetails(activeCourier.id);
      await loadCouriers();
      setActionSuccess(`Courier status updated to ${strings.statuses[toStatus] || toStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update courier status';
      alert(msg);
    }
  };

  const getStatusBadge = (status: CourierStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-amber-50 text-[#ED7D24] border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
      case 'in_transit':
        return 'bg-blue-50 text-[#1E75BB] border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50';
      case 'delivered':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  // Filter couriers with date and deep search
  const filteredCouriers = useMemo(() => {
    return couriers.filter((c) => {
      // Status filter pill (Web/Desktop)
      if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }

      // Deep search (matches courier code, truck, status, boxes, customers, item names across ALL dates)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = c.courier_code?.toLowerCase().includes(q);
        const matchesTruck = c.truck_no?.toLowerCase().includes(q);

        // Status keywords matching (supports typing status in mobile view where pills are hidden)
        const statusLabel = (strings.statuses[c.status] || c.status).toLowerCase();
        const isDraft = c.status === 'draft';
        const isTransit = c.status === 'in_transit';
        const isDelivered = c.status === 'delivered';

        const matchesStatus =
          statusLabel.includes(q) ||
          c.status.toLowerCase().includes(q) ||
          (isDraft && (q === 'loading' || q === 'load' || q === 'draft')) ||
          (isTransit && (q === 'transit' || q === 'in transit' || q === 'in_transit' || q === 'on the road')) ||
          (isDelivered && (q === 'delivered' || q === 'deliver'));

        const matchesBox = (c.boxes || []).some((b) => {
          if (b.box_code?.toLowerCase().includes(q)) return true;
          return (b.items || []).some((bi) => {
            const pCode = bi.parcel?.parcel_code?.toLowerCase() || '';
            const cName = bi.parcel?.customer?.name?.toLowerCase() || '';
            const cCode = bi.parcel?.customer?.code?.toLowerCase() || '';
            const itName = bi.item?.item_name?.toLowerCase() || '';
            const rName = bi.item?.name_on_parcel?.toLowerCase() || '';
            return (
              pCode.includes(q) ||
              cName.includes(q) ||
              cCode.includes(q) ||
              itName.includes(q) ||
              rName.includes(q)
            );
          });
        });

        const matchesLoose = (c.loose_items || []).some((li) => {
          const pCode = li.parcel?.parcel_code?.toLowerCase() || '';
          const cName = li.parcel?.customer?.name?.toLowerCase() || '';
          const cCode = li.parcel?.customer?.code?.toLowerCase() || '';
          const itName = li.item?.item_name?.toLowerCase() || '';
          const rName = li.item?.name_on_parcel?.toLowerCase() || '';
          return (
            pCode.includes(q) ||
            cName.includes(q) ||
            cCode.includes(q) ||
            itName.includes(q) ||
            rName.includes(q)
          );
        });

        if (!matchesCode && !matchesTruck && !matchesStatus && !matchesBox && !matchesLoose) {
          return false;
        }
      } else if (selectedDate !== 'all') {
        // Date filter only when search query is empty
        const effectiveDate = formatLocalDate(c.dispatch_date || c.created_at);
        if (effectiveDate !== selectedDate) return false;
      }

      return true;
    });
  }, [couriers, statusFilter, selectedDate, searchQuery]);

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-2.5 sm:space-y-3.5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-[#1E75BB] dark:text-[#2D8AD1] flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#1E75BB] dark:text-[#2D8AD1]" />
            <span>{strings.couriers.title}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {strings.couriers.subtitle}
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 min-h-[38px]"
        >
          <Plus className="w-4 h-4" />
          <span>{strings.couriers.createCourierButton}</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

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

      {/* Search Bar & Desktop Status Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={strings.couriers.searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1E75BB] shadow-xs min-h-[40px] transition-colors"
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

        {/* Status Filter Tabs (Desktop / Web view only - Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-xs select-none">
          {[
            { id: 'all', label: strings.couriers.filterAll },
            { id: 'draft', label: strings.couriers.filterLoading },
            { id: 'in_transit', label: strings.couriers.filterInTransit },
            { id: 'delivered', label: strings.couriers.filterDelivered },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as 'all' | CourierStatus)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs ${
                  active
                    ? 'bg-[#1E75BB] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Couriers List - Responsive Grid on Laptop */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#1E75BB]" />
          <span>{strings.common.loading}</span>
        </div>
      ) : filteredCouriers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors">
          <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
            {strings.couriers.emptyCouriers}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-[#1E75BB] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#165B94]"
          >
            {strings.couriers.createCourierButton}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredCouriers.map((c) => {
            const courierPhotos: LightboxPhoto[] = [];
            // 1. Truck Run / Courier's own photos first
            (c.photos || []).forEach((cp, pi) => {
              courierPhotos.push({
                id: cp.id,
                url: cp.url,
                title: `${c.truck_no || c.courier_code} • Truck Photo`,
                subtitle: `Truck Photo ${pi + 1}`,
              });
            });
            // 2. Big box photos and box contents photos
            (c.boxes || []).forEach((b) => {
              (b.photos || []).forEach((bp, pi) => {
                courierPhotos.push({
                  id: bp.id,
                  url: bp.url,
                  title: `${c.courier_code} • Box ${b.box_code} • Master Carton`,
                  subtitle: `Box Photo ${pi + 1}`,
                });
              });
              (b.items || []).forEach((bi) => {
                (bi.item?.photo_urls || []).forEach((u, pi) => {
                  courierPhotos.push({
                    url: u,
                    title: `${c.courier_code} • ${b.box_code} • ${bi.parcel?.customer?.name || 'Customer'}`,
                    subtitle: `${bi.item?.item_name || bi.item?.name_on_parcel || 'Package'} #${bi.item?.item_index || pi + 1}`,
                  });
                });
              });
            });
            // 3. Loose cargo items photos
            (c.loose_items || []).forEach((li) => {
              (li.item?.photo_urls || []).forEach((u, pi) => {
                courierPhotos.push({
                  url: u,
                  title: `${c.courier_code} • Loose Cargo • ${li.parcel?.customer?.name || 'Customer'}`,
                  subtitle: `${li.item?.item_name || li.item?.name_on_parcel || 'Package'} #${li.item?.item_index || pi + 1}`,
                });
              });
            });

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCourierId(c.id)}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-2.5 hover:border-[#1E75BB] dark:hover:border-[#2D8AD1] transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-900 dark:text-white group-hover:text-[#1E75BB] dark:group-hover:text-[#2D8AD1] transition-colors">
                        {c.courier_code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {strings.statuses[c.status] || c.status}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourierId(c.id);
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors min-h-[36px]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{strings.common.view}</span>
                    </button>
                  </div>

                  {/* Truck Info */}
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#1E75BB] dark:text-[#2D8AD1]" />
                    <span>{c.truck_no}</span>
                  </div>

                  {/* Cargo Summary Bar */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                      <span className="flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5 text-[#ED7D24]" />
                        <span>{c.total_boxes_count} boxes</span>
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1]" />
                        <span>{c.total_pieces_count} pieces</span>
                      </span>
                    </div>

                    <div className="font-extrabold text-[#1E75BB] dark:text-[#2D8AD1]">
                      {(c.total_weight_kg || 0).toFixed(2)} kg total
                    </div>
                  </div>

                  {/* Photo Thumbnails */}
                  {courierPhotos.length > 0 && (
                    <div
                      className="flex items-center gap-1.5 pt-0.5 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {courierPhotos.slice(0, 3).map((ph, pi) => {
                        const isTruckPhoto = pi < (c.photos || []).length;
                        return (
                          <div
                            key={pi}
                            onClick={() => handleOpenLightbox(courierPhotos, pi)}
                            className={`relative w-11 h-11 rounded-lg border overflow-hidden bg-slate-50 dark:bg-slate-800 cursor-pointer hover:opacity-90 shrink-0 shadow-2xs ${
                              isTruckPhoto ? 'border-[#1E75BB] ring-1 ring-[#1E75BB]/30' : 'border-slate-200 dark:border-slate-700'
                            }`}
                            title={isTruckPhoto ? 'Truck / Dispatch Photo' : 'Cargo Photo'}
                          >
                            <img
                              src={ph.url}
                              alt={ph.title || `Courier photo ${pi + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {isTruckPhoto && (
                              <span className="absolute bottom-0 inset-x-0 bg-[#1E75BB]/90 text-[7px] text-white font-black text-center py-0.5 tracking-tighter uppercase leading-none">
                                Truck
                              </span>
                            )}
                            {pi === 2 && courierPhotos.length > 3 && (
                              <div className="absolute inset-0 bg-black/60 text-white font-black text-[10px] flex items-center justify-center">
                                +{courierPhotos.length - 3}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>
                    {c.status !== 'draft' && c.dispatch_date
                      ? `Dispatched ${formatLocalDate(c.dispatch_date)}`
                      : 'Status: Loading'}
                  </span>
                  <span>Created {formatLocalDate(c.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Courier Modal - Prompt only Truck Number */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#1E75BB] dark:text-[#2D8AD1]" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {strings.couriers.createCourierButton}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium">
                {createError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  {strings.couriers.truckNoLabel}
                </label>
                <input
                  type="text"
                  value={newTruckNo}
                  onChange={(e) => setNewTruckNo(e.target.value)}
                  placeholder={strings.couriers.truckNoPlaceholder}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB] focus:ring-2 focus:ring-[#1E75BB]/20 min-h-[44px]"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[44px]"
              >
                {strings.common.cancel}
              </button>

              <button
                type="button"
                onClick={handleCreateCourier}
                disabled={isCreating}
                className="px-4 py-2 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-xl text-xs font-bold shadow-sm transition-all min-h-[44px] flex items-center gap-1.5"
              >
                {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{strings.couriers.saveCourierButton}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Courier Details Modal */}
      {selectedCourierId && activeCourier && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4 p-5 max-h-[92vh] flex flex-col animate-in zoom-in-95">
            
            {/* View 1: Main Courier Manifest View */}
            {modalView === 'details' ? (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-slate-900 dark:text-white">
                      {activeCourier.courier_code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                        activeCourier.status
                      )}`}
                    >
                      {strings.statuses[activeCourier.status]}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCourierId(null);
                      setIsEditingTruckNo(false);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Truck Info Banner with Edit Truck Number (All stages) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between shrink-0">
                  <div className="flex-1 min-w-0 mr-2">
                    {isEditingTruckNo ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="text"
                          value={editedTruckNo}
                          onChange={(e) => setEditedTruckNo(e.target.value)}
                          placeholder="Truck No"
                          className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB] w-40"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveTruckNo}
                          disabled={isSavingTruckNo}
                          className="px-2.5 py-1 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-lg text-xs font-bold flex items-center gap-1 min-h-[30px]"
                        >
                          {isSavingTruckNo ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingTruckNo(false)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold min-h-[30px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {activeCourier.truck_no}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingTruckNo(true);
                            setEditedTruckNo(activeCourier.truck_no);
                          }}
                          className="p-1 text-slate-400 hover:text-[#1E75BB] dark:hover:text-[#2D8AD1] transition-colors rounded"
                          title="Edit Truck Number"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeCourier.status !== 'draft' && activeCourier.dispatch_date ? (
                        <span>Dispatch Date: {formatLocalDate(activeCourier.dispatch_date)}</span>
                      ) : (
                        <span className="italic">Status: Loading (Dispatch date set upon dispatch)</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-extrabold text-[#1E75BB] dark:text-[#2D8AD1]">
                      {activeCourier.total_pieces_count || 0} pieces ({(activeCourier.total_weight_kg || 0).toFixed(2)} kg)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {activeCourier.total_boxes_count || 0} boxes • {(activeCourier.loose_items || []).length} loose packages
                    </div>
                  </div>
                </div>

                {/* Truck / Dispatch Photos Section */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1]" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Truck / Dispatch Photos ({(activeCourier.photos || []).length})
                      </span>
                    </div>
                    <div>
                      <input
                        ref={courierFileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={handleUploadCourierPhoto}
                      />
                      <button
                        type="button"
                        onClick={() => courierFileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[#1E75BB] dark:text-[#2D8AD1] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors min-h-[32px] shadow-2xs"
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>Add Photo</span>
                      </button>
                    </div>
                  </div>

                  {(activeCourier.photos || []).length === 0 ? (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                      No photos of the truck or dispatch load yet. Tap &quot;+ Add Photo&quot; to upload vehicle or cargo photos.
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {(activeCourier.photos || []).map((p, pIdx) => (
                        <div
                          key={p.id}
                          className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 group bg-white dark:bg-slate-800 shadow-2xs"
                        >
                          <img
                            src={p.url}
                            alt="Truck photo"
                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              const allPhotos: LightboxPhoto[] = [
                                ...(activeCourier.photos || []).map((cp, i) => ({
                                  id: cp.id,
                                  url: cp.url,
                                  title: `${activeCourier.truck_no || activeCourier.courier_code} • Truck Run`,
                                  subtitle: `Truck Photo ${i + 1}`,
                                })),
                                ...((activeCourier.boxes || []).flatMap((b) =>
                                  (b.photos || []).map((bp, i) => ({
                                    id: bp.id,
                                    url: bp.url,
                                    title: `${activeCourier.courier_code} • Box ${b.box_code}`,
                                    subtitle: `Master Box Photo ${i + 1}`,
                                  }))
                                )),
                                ...((activeCourier.loose_items || []).flatMap((li) =>
                                  (li.item?.photo_urls || []).map((u, i) => ({
                                    id: undefined,
                                    url: u,
                                    title: `${activeCourier.courier_code} • Loose Cargo • ${li.parcel?.customer?.name || 'Customer'}`,
                                    subtitle: `${li.item?.item_name || li.item?.name_on_parcel || 'Package'} #${li.item?.item_index || i + 1}`,
                                  }))
                                )),
                              ];
                              handleOpenLightbox(allPhotos, pIdx);
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this photo of the truck run?')) {
                                handleDeleteCourierPhoto(p.id);
                              }
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 text-white rounded-md transition-colors"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Transition Actions & Delete Truck Run */}
                <div className="shrink-0 flex items-center gap-2">
                  {activeCourier.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus('in_transit')}
                        className="flex-1 py-2.5 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 min-h-[44px]"
                      >
                        <Send className="w-4 h-4" />
                        <span>{strings.couriers.dispatchButton}</span>
                      </button>

                      {/* Delete Truck Run - Allowed ONLY when in draft / loading */}
                      <button
                        type="button"
                        onClick={handleDeleteCourierRun}
                        className="px-3.5 py-2.5 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5"
                        title="Delete Truck Run"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{strings.couriers.deleteTruckButton}</span>
                      </button>
                    </>
                  )}

                  {activeCourier.status === 'in_transit' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('delivered')}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 min-h-[44px] transition-all"
                        title="Mark truck run as delivered and update all cargo contents to Delivered"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{strings.couriers.markDeliveredButton}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('draft')}
                        className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5 shrink-0"
                        title="Revert back to loading stage"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{strings.couriers.revertToDraftButton}</span>
                      </button>
                    </>
                  )}

                  {activeCourier.status === 'delivered' && (
                    <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-2.5 rounded-xl">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{strings.couriers.deliveredCompletedBadge}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus('in_transit')}
                        className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-[#ED7D24] dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs font-bold transition-colors min-h-[44px] flex items-center gap-1.5"
                        title="Revert back to in transit if marked delivered by mistake"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{strings.couriers.revertToTransitButton}</span>
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic shrink-0">
                  {strings.couriers.statusCascadeNote}
                </p>

                {/* Scrollable Cargo Sections */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  
                  {/* Section 1: Loaded Big Boxes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-[#1F3A5F] flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-[#D9822B]" />
                        <span>{strings.couriers.loadedBoxesSection} ({activeCourier.boxes.length})</span>
                      </h4>

                      {activeCourier.status === 'draft' && (
                        <button
                          onClick={handleOpenLoadBoxView}
                          className="text-xs font-bold text-[#2F6FB3] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{strings.couriers.loadRepackedBoxesTitle}</span>
                        </button>
                      )}
                    </div>

                    {activeCourier.boxes.length === 0 ? (
                      <div className="p-4 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                        {strings.couriers.noBoxesLoaded}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {activeCourier.boxes.map((b) => {
                          const bPhotos: LightboxPhoto[] = [];
                          (b.items || []).forEach((bi) => {
                            (bi.item?.photo_urls || []).forEach((u, pi) => {
                              bPhotos.push({
                                url: u,
                                title: `${b.box_code} • ${bi.parcel?.customer?.name || 'Customer'}`,
                                subtitle: `${bi.item?.item_name || bi.item?.name_on_parcel || 'Package'} #${bi.item?.item_index || pi + 1}`,
                              });
                            });
                          });

                          return (
                            <div
                              key={b.id}
                              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs shadow-2xs gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {bPhotos.length > 0 && (
                                  <img
                                    src={bPhotos[0].url}
                                    alt="Box photo thumbnail"
                                    onClick={() => handleOpenLightbox(bPhotos, 0)}
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 shrink-0 shadow-2xs"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-[#1E75BB] dark:text-[#2D8AD1]">
                                    <span>{b.box_code}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {b.total_pieces || 0} pieces ({b.parcels_count || 0} packages) • {(b.total_weight_kg || 0).toFixed(2)} kg
                                  </div>
                                </div>
                              </div>

                              {activeCourier.status === 'draft' && (
                                <button
                                  onClick={() => handleUnloadBox(b.id)}
                                  title={strings.couriers.removeCargo}
                                  className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Loaded Loose Parcels */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-[#1E75BB] dark:text-[#2D8AD1] flex items-center gap-1.5">
                        <PackageSearch className="w-4 h-4 text-[#1E75BB] dark:text-[#2D8AD1]" />
                        <span>{strings.couriers.loadedLooseSection} ({activeCourier.loose_items.length})</span>
                      </h4>

                      {activeCourier.status === 'draft' && (
                        <button
                          onClick={handleOpenLoadParcelView}
                          className="text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1] hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{strings.couriers.loadLooseParcelsTitle}</span>
                        </button>
                      )}
                    </div>

                    {activeCourier.loose_items.length === 0 ? (
                      <div className="p-4 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                        {strings.couriers.noLooseLoaded}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {activeCourier.loose_items.map((li) => {
                          const liPhotos = (li.item?.photo_urls || []).map((u, pi) => ({
                            url: u,
                            title: `${li.parcel.parcel_code} (${li.item.name_on_parcel})`,
                            subtitle: `Photo ${pi + 1}`,
                          }));

                          return (
                            <div
                              key={li.id}
                              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs shadow-2xs gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {liPhotos.length > 0 && (
                                  <img
                                    src={liPhotos[0].url}
                                    alt="Loose item thumbnail"
                                    onClick={() => handleOpenLightbox(liPhotos, 0)}
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 shrink-0 shadow-2xs"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 font-bold text-[#1E75BB] dark:text-[#2D8AD1] flex-wrap">
                                    <span>{li.parcel.parcel_code}</span>
                                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                      (Pkg #{li.item.item_index}: {li.item.item_name || li.item.name_on_parcel})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {li.qty} pcs • {li.item?.weight_per_piece_kg || 0} kg/pc ({(li.weight_kg || 0).toFixed(2)} kg)
                                  </div>
                                </div>
                              </div>

                              {activeCourier.status === 'draft' && (
                                <button
                                  onClick={() => handleUnloadParcel(li.id)}
                                  title={strings.couriers.removeCargo}
                                  className="p-1.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : modalView === 'load_box' ? (
              /* View 2: Load Repack Box View */
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    onClick={() => setModalView('details')}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1] hover:underline min-h-[36px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{strings.couriers.backToCourier}</span>
                  </button>

                  <h3 className="font-extrabold text-sm text-[#1E75BB] dark:text-[#2D8AD1]">
                    Load Big Box
                  </h3>

                  <button
                    onClick={() => setSelectedCourierId(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  Pick an available big box to load onto truck {activeCourier.truck_no}:
                </p>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {loadingBoxes ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">Loading available boxes...</div>
                  ) : availableBoxes.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                      No unassigned big boxes available.
                    </div>
                  ) : (
                    availableBoxes.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-between hover:border-[#1E75BB] dark:hover:border-[#2D8AD1] transition-all"
                      >
                        <div>
                          <div className="font-black text-xs text-[#1E75BB] dark:text-[#2D8AD1]">{b.box_code}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {b.total_pieces || 0} pieces ({b.parcels_count || 0} packages) • {(b.total_weight_kg || 0).toFixed(2)} kg
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLoadBox(b.id)}
                          disabled={isLoadingCargo}
                          className="px-4 py-1.5 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-lg text-xs font-bold min-h-[36px] transition-colors"
                        >
                          Load
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* View 3: Load Loose Parcels View */
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <button
                    onClick={() => setModalView('details')}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1] hover:underline min-h-[36px]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{strings.couriers.backToCourier}</span>
                  </button>

                  <h3 className="font-extrabold text-sm text-[#1E75BB] dark:text-[#2D8AD1]">
                    Load Loose Parcel
                  </h3>

                  <button
                    onClick={() => setSelectedCourierId(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  Select available stored packages to load directly onto truck {activeCourier.truck_no}:
                </p>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {loadingParcels ? (
                    <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">Loading loose parcels...</div>
                  ) : availableParcels.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-400 dark:text-slate-500">
                      No loose stored parcels available.
                    </div>
                  ) : (
                    availableParcels.map((p) => {
                      const availableItems = p.items.filter((it) => it.stored_qty > 0);
                      if (availableItems.length === 0) return null;

                      return (
                        <div
                          key={p.id}
                          className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 p-3 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
                                {p.parcel_code}
                              </span>
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                {p.customer?.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {p.breakdown.stored_qty} pcs stored
                            </span>
                          </div>

                          <div className="space-y-2">
                            {availableItems.map((it) => {
                              const selectedQty = looseQtyMap[it.id] ?? it.stored_qty;

                              return (
                                <div
                                  key={it.id}
                                  className="p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                      <span className="text-[10px] bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 px-1 py-0.5 rounded font-mono">
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
                                        setLooseQtyMap((prev) => ({
                                          ...prev,
                                          [it.id]: Math.min(it.stored_qty, Math.max(1, val)),
                                        }));
                                      }}
                                      className="w-16 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 text-center bg-white dark:bg-slate-900"
                                    />

                                    <button
                                      type="button"
                                      onClick={() => handleLoadLooseParcel(p, it)}
                                      disabled={isLoadingCargo}
                                      className="px-3.5 py-1.5 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1 min-h-[34px]"
                                    >
                                      {isLoadingCargo && <Loader2 className="w-3 h-3 animate-spin" />}
                                      <span>Load</span>
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
            await handleDeleteCourierPhoto(photoId);
            setIsLightboxOpen(false);
          }}
        />
      )}
    </div>
  );
};
