import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRepository, Customer, CustomerSubName } from '../data';
import { useAuth } from '../context/AuthContext';
import { strings } from '../strings';
import { getTodayIsoDate, isFutureDate } from '../utils/date';
import { PackageCard, PackageFormData } from './PackageCard';
import { CustomerPickerModal } from './CustomerPickerModal';
import { SimilarCustomerModal } from './SimilarCustomerModal';
import { ChevronDown, Calendar, AlertCircle, Plus, Loader2, UserCheck, X } from 'lucide-react';

const createEmptyPackage = (): PackageFormData => ({
  id: crypto.randomUUID(),
  item_name: '',
  is_custom_name: false,
  custom_name: '',
  sub_name_id: null,
  qty: '1',
  weight_per_piece_kg: '',
  weight_kg: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  photos: [],
  photoUrls: [],
});

const INVALID_PREFIXES = ['daw', 'ko', 'ma', 'u', 'mg', 'mr', 'ms', 'mrs'];

interface ReceiveSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReceiveSheet: React.FC<ReceiveSheetProps> = ({ isOpen, onClose, onSuccess }) => {
  const repository = useRepository();
  const { user } = useAuth();

  // State: Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [showLiveSuggestions, setShowLiveSuggestions] = useState(false);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // State: Similar Customer Check
  const [similarMatches, setSimilarMatches] = useState<Customer[]>([]);
  const [isSimilarModalOpen, setIsSimilarModalOpen] = useState(false);
  const [hasConfirmedSimilar, setHasConfirmedSimilar] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | undefined>(undefined);

  // State: Date received
  const [dateReceived, setDateReceived] = useState<string>(getTodayIsoDate());
  const [dateError, setDateError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // State: Packages
  const [packages, setPackages] = useState<PackageFormData[]>([createEmptyPackage()]);
  const [activePackageId, setActivePackageId] = useState<string>(packages[0].id);
  const [packageErrors, setPackageErrors] = useState<Record<string, string>>({});

  // State: Submission
  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Load existing customers
  const loadCustomers = useCallback(async () => {
    try {
      const list = await repository.getCustomers();
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  }, [repository]);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen, loadCustomers]);

  // Reset form when sheet opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCustomer(null);
      setCustomerNameInput('');
      setDateReceived(getTodayIsoDate());
      setDateError(null);
      setPackages([createEmptyPackage()]);
      setPackageErrors({});
      setGlobalError(null);
      setHasConfirmedSimilar(false);
      setPendingPhone(undefined);
    }
  }, [isOpen]);

  // Close live suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        customerInputRef.current &&
        !customerInputRef.current.contains(e.target as Node)
      ) {
        setShowLiveSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching customers as user types
  const liveCustomerMatches = useMemo(() => {
    const q = customerNameInput.trim().toLowerCase();
    if (!q || selectedCustomer?.name.toLowerCase() === q) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [customers, customerNameInput, selectedCustomer]);

  // Date change handler
  const handleDateChange = (val: string) => {
    setDateReceived(val);
    if (isFutureDate(val)) {
      setDateError(strings.receive.futureDateError);
    } else {
      setDateError(null);
    }
  };

  // Customer selection from picker modal or live dropdown
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerNameInput(customer.name);
    setShowLiveSuggestions(false);
    setHasConfirmedSimilar(true);
    setSimilarMatches([]);
  };

  // Check customer when typing finishes or on blur
  const handleCustomerBlur = async () => {
    // Do not silently override typed name; exact case-insensitive matches are confirmed on Save
  };

  // Package Handlers
  const handleUpdatePackage = (index: number, updated: Partial<PackageFormData>) => {
    setPackages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updated };
      return next;
    });

    const pkgId = packages[index].id;
    if (packageErrors[pkgId]) {
      setPackageErrors((prev) => {
        const next = { ...prev };
        delete next[pkgId];
        return next;
      });
    }
  };

  const handleAddPackage = () => {
    const newPkg = createEmptyPackage();
    setPackages((prev) => [...prev, newPkg]);
    setActivePackageId(newPkg.id);
  };

  const handleRemovePackage = (index: number) => {
    if (packages.length <= 1) return;
    const removedPkg = packages[index];
    removedPkg.photoUrls.forEach((u) => URL.revokeObjectURL(u));

    setPackages((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });

    if (activePackageId === removedPkg.id) {
      const remainingIndex = Math.max(0, index - 1);
      setActivePackageId(packages[remainingIndex]?.id || '');
    }
  };

  // Running totals
  const totalWeight = useMemo(() => {
    return packages.reduce((sum, p) => {
      const qty = parseInt(p.qty, 10) || 1;
      const weightPerPiece = parseFloat(p.weight_per_piece_kg) || 0;
      return sum + qty * weightPerPiece;
    }, 0);
  }, [packages]);

  const totalPieces = useMemo(() => {
    return packages.reduce((sum, p) => sum + (parseInt(p.qty, 10) || 1), 0);
  }, [packages]);

  // Validation
  const validateForm = (): boolean => {
    setGlobalError(null);
    const errors: Record<string, string> = {};
    const trimmedCustomer = customerNameInput.trim();

    if (!trimmedCustomer) {
      setGlobalError(strings.receive.validationErrorCustomer);
      return false;
    }

    const lowerCustomer = trimmedCustomer.toLowerCase();
    if (INVALID_PREFIXES.includes(lowerCustomer) || trimmedCustomer.length < 3) {
      setGlobalError(strings.receive.validationErrorCustomerTooShort);
      return false;
    }

    if (isFutureDate(dateReceived)) {
      setDateError(strings.receive.futureDateError);
      return false;
    }

    if (packages.length === 0) {
      setGlobalError(strings.receive.validationErrorNoPackages);
      return false;
    }

    let firstInvalidId: string | null = null;

    packages.forEach((p) => {
      const qtyNum = parseInt(p.qty, 10);
      const perPieceNum = parseFloat(p.weight_per_piece_kg);

      if (!qtyNum || qtyNum <= 0) {
        errors[p.id] = strings.receive.validationErrorQty;
      } else if (!perPieceNum || perPieceNum <= 0) {
        errors[p.id] = strings.receive.validationErrorWeightPerPiece;
      } else if (p.is_custom_name && !p.custom_name.trim()) {
        errors[p.id] = strings.receive.validationErrorNameOnParcel;
      }

      if (errors[p.id] && !firstInvalidId) {
        firstInvalidId = p.id;
      }
    });

    setPackageErrors(errors);

    if (firstInvalidId) {
      setActivePackageId(firstInvalidId);
      return false;
    }

    return true;
  };

  // Save handler
  const handleSave = async (overrideCustomer?: Customer, forceCreateNew?: boolean) => {
    if (isSaving) return;

    if (!validateForm()) {
      return;
    }

    const trimmedCustomer = customerNameInput.trim();
    const activeCust = overrideCustomer ?? selectedCustomer;
    const confirmedNew = forceCreateNew ?? hasConfirmedSimilar;

    // If user typed a name without selecting from dropdown, check if exact name (case-insensitive) exists
    if (!activeCust && !confirmedNew) {
      const exactMatches = await repository.findSimilarCustomers(trimmedCustomer);
      if (exactMatches.length > 0) {
        setSimilarMatches(exactMatches);
        setIsSimilarModalOpen(true);
        return;
      }
    }

    setIsSaving(true);
    try {
      const currentUserId = user?.id || crypto.randomUUID();

      // 1. Ensure Customer exists
      let finalCustomer = activeCust;
      if (!finalCustomer) {
        finalCustomer = await repository.createCustomer({
          name: trimmedCustomer,
          phone: pendingPhone,
        });
        setSelectedCustomer(finalCustomer);
      }

      // Timestamp with current time
      const todayTime = new Date();
      const [y, m, d] = dateReceived.split('-').map(Number);
      const receivedDateTime = new Date(
        y,
        m - 1,
        d,
        todayTime.getHours(),
        todayTime.getMinutes(),
        todayTime.getSeconds()
      ).toISOString();

      // 2. Prepare Package Items for this single arrival lot
      const packageItems = [];
      for (const pkg of packages) {
        let subNameId: string | null = null;
        let displayName = finalCustomer.name;

        if (pkg.is_custom_name && pkg.custom_name.trim()) {
          const createdSub = await repository.createSubName(
            finalCustomer.id,
            pkg.custom_name.trim()
          );
          subNameId = createdSub.id;
          displayName = pkg.custom_name.trim();
        }

        const qty = Math.max(1, parseInt(pkg.qty, 10) || 1);
        const weightPerPiece = parseFloat(pkg.weight_per_piece_kg) || 0;
        const totalWeightPkg = Number((qty * weightPerPiece).toFixed(2));

        packageItems.push({
          item_name: pkg.item_name.trim(),
          sub_name_id: subNameId,
          name_on_parcel: displayName,
          qty: qty,
          weight_per_piece_kg: weightPerPiece,
          weight_kg: totalWeightPkg,
          length_cm: parseFloat(pkg.length_cm) || 0,
          width_cm: parseFloat(pkg.width_cm) || 0,
          height_cm: parseFloat(pkg.height_cm) || 0,
          photos: pkg.photos,
        });
      }

      // Create ONE parcel lot record containing all packages entered
      await repository.createParcel(
        {
          customer_id: finalCustomer.id,
          received_at: receivedDateTime,
          status: 'stored',
          items: packageItems,
        },
        currentUserId
      );

      // Clean up object URLs
      packages.forEach((p) => p.photoUrls.forEach((u) => URL.revokeObjectURL(u)));

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Save failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setGlobalError(`Save failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubNameCreated = async (name: string): Promise<CustomerSubName> => {
    if (!selectedCustomer) throw new Error('No customer selected');
    return repository.createSubName(selectedCustomer.id, name);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-Up Bottom Sheet */}
      <div className="relative w-full max-w-3xl mx-auto bg-[#FAF9F6] dark:bg-slate-950 rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] z-10 animate-in slide-in-from-bottom duration-300 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
        
        {/* Sheet Top Drag / Header */}
        <div className="bg-[#1E75BB] dark:bg-slate-900 text-white px-4 py-2.5 rounded-t-3xl flex items-center justify-between shrink-0 shadow-xs border-b border-blue-400/20 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ED7D24]"></span>
            <h2 className="font-extrabold text-sm tracking-tight">{strings.receive.receiveModalTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-24">
          {globalError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Main Customer Section */}
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1]">
                {strings.receive.mainCustomerLabel}
              </label>
              {selectedCustomer && (
                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] font-bold px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/50">
                  {selectedCustomer.code}
                </span>
              )}
            </div>

            {/* Input with dropdown picker button */}
            <div className="relative">
              <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-[#1E75BB] focus-within:ring-2 focus-within:ring-[#1E75BB]/20 bg-white dark:bg-slate-800">
                <input
                  ref={customerInputRef}
                  type="text"
                  value={customerNameInput}
                  onChange={(e) => {
                    setCustomerNameInput(e.target.value);
                    setSelectedCustomer(null);
                    setShowLiveSuggestions(true);
                  }}
                  onFocus={() => setShowLiveSuggestions(true)}
                  onBlur={handleCustomerBlur}
                  placeholder={strings.receive.mainCustomerPlaceholder}
                  className="flex-1 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 bg-transparent placeholder-slate-400 focus:outline-none min-h-[38px]"
                />

                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  title={strings.receive.savedCustomersTitle}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-l border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors min-h-[38px] flex items-center justify-center"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Live matching customer suggestions */}
              {showLiveSuggestions && liveCustomerMatches.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-30 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto"
                >
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {strings.receive.matchingCustomersTitle}
                  </div>
                  {liveCustomerMatches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectCustomer(c);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50/70 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                        {c.phone && <span className="text-[11px] text-slate-400 ml-1.5">({c.phone})</span>}
                      </div>
                      <span className="text-[10px] font-mono bg-blue-100/70 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] font-bold px-1.5 py-0.5 rounded">
                        {c.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-lg">
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Using saved customer: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.code})
                </span>
              </div>
            )}
          </div>

          {/* Date received section - Clickable calendar icon */}
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <label className="text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1]">
              {strings.receive.dateReceivedLabel}
            </label>
            <div className="relative">
              <input
                ref={dateInputRef}
                type="date"
                value={dateReceived}
                onChange={(e) => handleDateChange(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {
                    // Fallback
                  }
                }}
                max={getTodayIsoDate()}
                className="w-full px-3 py-1.5 pr-10 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB] focus:ring-2 focus:ring-[#1E75BB]/20 bg-white dark:bg-slate-800 min-h-[38px] cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker?.();
                  } catch {
                    dateInputRef.current?.focus();
                  }
                }}
                title="Choose date"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#1E75BB] dark:hover:text-[#2D8AD1] transition-colors rounded-lg flex items-center justify-center cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            {dateError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{dateError}</p>
            )}
          </div>

          {/* Packages List */}
          <div className="space-y-2 pt-0.5">
            {packages.map((pkg, idx) => {
              const isCollapsed = pkg.id !== activePackageId && packages.length > 1;

              return (
                <PackageCard
                  key={pkg.id}
                  packageIndex={idx + 1}
                  data={pkg}
                  customerName={customerNameInput.trim()}
                  canRemove={packages.length > 1}
                  isCollapsed={isCollapsed}
                  error={packageErrors[pkg.id]}
                  onUpdate={(upd) => handleUpdatePackage(idx, upd)}
                  onRemove={() => handleRemovePackage(idx)}
                  onExpand={() => setActivePackageId(pkg.id)}
                  onAddSubName={handleSubNameCreated}
                />
              );
            })}

            {/* Add Next Package Button */}
            <button
              type="button"
              onClick={handleAddPackage}
              className="w-full py-2 rounded-xl border-2 border-dashed border-[#1E75BB] dark:border-[#2D8AD1] text-[#1E75BB] dark:text-[#2D8AD1] hover:bg-blue-50/60 dark:hover:bg-blue-950/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>{strings.receive.addNewPackageButton}</span>
            </button>
          </div>
        </div>

        {/* Sticky Bottom Save Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-lg z-20">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
            <span>
              {strings.receive.runningSummary(
                packages.length,
                totalPieces,
                customerNameInput.trim()
              )}
            </span>
            <span className="font-extrabold text-[#1E75BB] dark:text-[#2D8AD1]">
              {strings.receive.totalWeightDisplay(totalWeight)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="w-full py-2.5 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white rounded-xl font-bold text-sm tracking-wide shadow-sm hover:shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 min-h-[42px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{strings.receive.savingText}</span>
              </>
            ) : (
              <span>{strings.receive.saveButtonText(packages.length, totalPieces)}</span>
            )}
          </button>
        </div>
      </div>

      {/* Customer Picker Modal */}
      <CustomerPickerModal
        isOpen={isCustomerModalOpen}
        customers={customers}
        onSelectCustomer={(c: Customer) => {
          handleSelectCustomer(c);
          setIsCustomerModalOpen(false);
        }}
        onClose={() => setIsCustomerModalOpen(false)}
      />

      {/* Exact Match Customer Confirmation Modal */}
      <SimilarCustomerModal
        isOpen={isSimilarModalOpen}
        typedName={customerNameInput.trim()}
        similarCustomers={similarMatches}
        onUseCustomer={(c: Customer) => {
          handleSelectCustomer(c);
          setIsSimilarModalOpen(false);
          setTimeout(() => handleSave(c, false), 50);
        }}
        onCreateAnyway={(phone?: string) => {
          setHasConfirmedSimilar(true);
          setPendingPhone(phone);
          setIsSimilarModalOpen(false);
          setTimeout(() => handleSave(undefined, true), 50);
        }}
        onCancel={() => setIsSimilarModalOpen(false)}
      />
    </div>
  );
};
