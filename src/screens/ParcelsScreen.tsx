import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  PackageSearch,
  Plus,
  Loader2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { useRepository, ParcelWithDetails } from '../data';
import { strings } from '../strings';
import { formatLocalDate, formatDisplayDate } from '../utils/date';
import { useDateFilter } from '../context/DateFilterContext';
import { ReceiveSheet } from '../components/ReceiveSheet';
import { ParcelDetailModal } from '../components/ParcelDetailModal';

export const ParcelsScreen: React.FC = () => {
  const repository = useRepository();

  const [parcels, setParcels] = useState<ParcelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReceiveSheetOpen, setIsReceiveSheetOpen] = useState(false);

  // Global sticky date filter
  const { selectedDate, setSelectedDate, stepDate, todayIso } = useDateFilter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Detail & Edit Modal State
  const [selectedParcel, setSelectedParcel] = useState<ParcelWithDetails | null>(null);

  const loadParcels = useCallback(async () => {
    try {
      setLoading(true);
      const data = await repository.getParcels();
      setParcels(data);
    } catch (err) {
      console.error('Failed to load parcels:', err);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  // Enhanced search & date filter:
  // When search query is entered, search across ALL dates!
  // When search query is empty, filter by selectedDate.
  const filteredParcels = useMemo(() => {
    let result = parcels;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) => {
        const codeMatch = p.parcel_code.toLowerCase().includes(q);
        const custMatch = p.customer?.name.toLowerCase().includes(q);
        const custCodeMatch = p.customer?.code.toLowerCase().includes(q);
        const phoneMatch = p.customer?.phone?.toLowerCase().includes(q);
        const itemMatch = p.items?.some(
          (it) =>
            it.item_name?.toLowerCase().includes(q) ||
            it.name_on_parcel.toLowerCase().includes(q)
        );

        // Status name matching for mobile & general text search
        let statusMatch = false;
        if (q === 'stored' && (p.status === 'stored' || p.breakdown.stored_qty > 0)) {
          statusMatch = true;
        } else if (q === 'packed' && (p.status === 'packed' || p.breakdown.packed_qty > 0)) {
          statusMatch = true;
        } else if ((q === 'transit' || q === 'in transit') && (p.status === 'in_transit' || p.breakdown.in_transit_qty > 0)) {
          statusMatch = true;
        } else if (q === 'delivered' && p.status === 'delivered') {
          statusMatch = true;
        } else if (
          (q === 'return' || q === 'returned' || q === 'to return' || q === 'to be returned') &&
          (p.status === 'to_be_returned' || p.status === 'returned')
        ) {
          statusMatch = true;
        } else if (p.status.toLowerCase().includes(q)) {
          statusMatch = true;
        }

        return codeMatch || custMatch || custCodeMatch || phoneMatch || itemMatch || statusMatch;
      });
    } else if (selectedDate !== 'all') {
      result = result.filter((p) => {
        const pDate = formatLocalDate(p.received_at);
        return pDate === selectedDate;
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => {
        if (statusFilter === 'stored') return p.status === 'stored' && p.breakdown.stored_qty > 0;
        if (statusFilter === 'packed') return p.status === 'packed' && p.breakdown.packed_qty > 0;
        if (statusFilter === 'in_transit') return p.status === 'in_transit' && p.breakdown.in_transit_qty > 0;
        if (statusFilter === 'delivered') return p.status === 'delivered';
        if (statusFilter === 'to_be_returned') return p.status === 'to_be_returned';
        if (statusFilter === 'returned') return p.status === 'returned';
        return p.status === statusFilter;
      });
    }

    return result;
  }, [parcels, selectedDate, searchQuery, statusFilter]);

  // Aggregate totals
  const totalPieces = useMemo(() => {
    return filteredParcels.reduce((sum, p) => sum + (p.total_qty || 0), 0);
  }, [filteredParcels]);

  const totalWeight = useMemo(() => {
    return filteredParcels.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
  }, [filteredParcels]);

  return (
    <div className="p-3 sm:p-5 lg:p-8 space-y-2.5 sm:space-y-3.5 max-w-7xl mx-auto w-full">
      {/* Top Header & Receive Action */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-[#1E75BB] dark:text-[#2D8AD1] flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-[#1E75BB] dark:text-[#2D8AD1]" />
            <span>{strings.parcelsList.title}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {strings.parcelsList.totalFound(filteredParcels.length, totalPieces)} •{' '}
            {(totalWeight || 0).toFixed(1)} kg total
          </p>
        </div>

        <button
          onClick={() => setIsReceiveSheetOpen(true)}
          className="px-3.5 py-2 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 min-h-[38px]"
        >
          <Plus className="w-4 h-4" />
          <span>{strings.parcelsList.receiveButton}</span>
        </button>
      </div>

      {/* Sticky Date Navigation Bar - Fixed at top when scrolling */}
      <div className="sticky top-0 z-20 bg-[#FAF9F6]/95 dark:bg-slate-950/95 backdrop-blur-xs py-1 -mx-3 px-3 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
        <div className="bg-white dark:bg-slate-900 p-1 sm:p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-1 w-full select-none transition-colors">
          {/* Left / Center: < [ 📅 09 Nov 2026 Today ] > */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => stepDate(-1)}
              title="Previous Day"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-center shrink-0 min-h-[34px] min-w-[34px]"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Clickable Date Display that opens Native Date Picker */}
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

              {/* Hidden native input for date picking - Empty value when 'all' so picker's Today event always triggers change */}
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate === 'all' ? '' : selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
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

          {/* Right Action Button: All Dates */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDate('all')}
              title="Show All Dates"
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-colors min-h-[34px] whitespace-nowrap ${
                selectedDate === 'all'
                  ? 'bg-[#1E75BB] text-white shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {strings.parcelsList.allDates}
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar - Below Date Bar, scrolls naturally with content */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-2.5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={strings.parcelsList.searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-[#1E75BB]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs (Desktop / Web view only - Hidden on mobile) */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-xs select-none">
          {[
            { id: 'all', label: strings.parcelsList.allStatuses },
            { id: 'stored', label: strings.parcelsList.filterStored },
            { id: 'packed', label: strings.parcelsList.filterPacked },
            { id: 'in_transit', label: strings.parcelsList.filterInTransit },
            { id: 'delivered', label: strings.parcelsList.filterDelivered },
            { id: 'to_be_returned', label: strings.parcelsList.filterToBeReturned },
            { id: 'returned', label: strings.parcelsList.filterReturned },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs ${
                  active
                    ? 'bg-[#1E75BB] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Parcels List - Clean Summary Cards */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#1E75BB]" />
          <span>{strings.common.loading}</span>
        </div>
      ) : filteredParcels.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors">
          <PackageSearch className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto">
            {strings.parcelsList.noParcelsFound}
          </p>
          <div className="flex items-center justify-center gap-2">
            {selectedDate !== 'all' && parcels.length > 0 && (
              <button
                onClick={() => setSelectedDate('all')}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Show {strings.parcelsList.allDates} ({parcels.length})
              </button>
            )}
            <button
              onClick={() => setIsReceiveSheetOpen(true)}
              className="px-4 py-2 bg-[#1E75BB] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#165B94]"
            >
              {strings.parcelsList.receiveButton}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {filteredParcels.map((p) => {
            const items = p.items || [];
            // Collect all photo URLs across items to show ONLY 1 preview photo on the card
            const allPhotoUrls: string[] = [];
            for (const it of items) {
              if (it.photo_urls && it.photo_urls.length > 0) {
                allPhotoUrls.push(...it.photo_urls);
              }
            }
            const firstPhotoUrl = allPhotoUrls[0] || null;
            const extraPhotosCount = Math.max(0, allPhotoUrls.length - 1);

            return (
              <div
                key={p.id}
                onClick={() => setSelectedParcel(p)}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs hover:border-[#1E75BB] dark:hover:border-[#2D8AD1] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
              >
                <div className="space-y-2.5">
                  {/* Top: Main Customer Name Prominent + Small Customer ID & Small Parcel ID */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-black text-slate-900 dark:text-white truncate group-hover:text-[#1E75BB] dark:group-hover:text-[#2D8AD1] transition-colors">
                        {p.customer?.name || strings.parcelsList.customerLabel}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.customer?.code && (
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] font-mono font-bold px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                            {p.customer.code}
                          </span>
                        )}
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono font-semibold px-1.5 py-0.5 rounded">
                          {p.parcel_code}
                        </span>
                        {p.status === 'to_be_returned' && (
                          <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <RotateCcw className="w-2.5 h-2.5 text-amber-600" />
                            <span>To Return</span>
                          </span>
                        )}
                        {p.status === 'returned' && (
                          <span className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-purple-600" />
                            <span>Returned</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Single Preview Photo (Only 1 photo shown on card) */}
                    {firstPhotoUrl && (
                      <div className="relative w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                        <img
                          src={firstPhotoUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        {extraPhotosCount > 0 && (
                          <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-bold px-1 rounded">
                            +{extraPhotosCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Packages' Names in the Log */}
                  <div className="bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {items.map((it) => {
                      const label = it.item_name?.trim()
                        ? it.item_name.trim()
                        : it.name_on_parcel;
                      const showRecipient =
                        it.item_name?.trim() &&
                        it.name_on_parcel &&
                        it.name_on_parcel !== p.customer?.name;

                      return (
                        <div
                          key={it.id}
                          className="px-2.5 py-1.5 flex items-center justify-between text-xs gap-2"
                        >
                          <div className="truncate font-bold text-slate-800 dark:text-slate-200">
                            <span>{label}</span>
                            {showRecipient && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-normal ml-1">
                                ({it.name_on_parcel})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-bold text-[#1E75BB] dark:text-[#2D8AD1] shrink-0">
                            {it.qty || 1} pcs
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer: Total Pieces, Total Weight & Receive Date */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5 font-extrabold text-[#1E75BB] dark:text-[#2D8AD1]">
                    <Layers className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1]" />
                    <span>{p.total_qty || 0} pcs</span>
                    <span className="text-slate-300 dark:text-slate-600 font-normal">•</span>
                    <span>{(p.total_weight_kg || 0).toFixed(1)} kg</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{formatLocalDate(p.received_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-Up Bottom Sheet for Receiving New Parcels */}
      <ReceiveSheet
        isOpen={isReceiveSheetOpen}
        onClose={() => setIsReceiveSheetOpen(false)}
        onSuccess={() => {
          loadParcels();
        }}
      />

      {/* Pop-Up Modal for Full Details, Specific Statuses, Photos & Edit */}
      {selectedParcel && (
        <ParcelDetailModal
          parcel={selectedParcel}
          onClose={() => setSelectedParcel(null)}
          onUpdated={(updated) => {
            if (!updated) {
              setSelectedParcel(null);
            } else {
              setSelectedParcel(updated);
            }
            loadParcels();
          }}
        />
      )}
    </div>
  );
};
