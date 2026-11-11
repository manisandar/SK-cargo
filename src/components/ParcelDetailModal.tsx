import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Edit2,
  Plus,
  Loader2,
  Calendar,
  Layers,
  Check,
  Trash2,
  AlertTriangle,
  Lock,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { useRepository, ParcelWithDetails, ParcelItemWithDetails, ParcelStatus } from '../data';
import { useAuth } from '../context/AuthContext';
import { strings } from '../strings';
import { compressPhoto } from '../utils/imageCompression';
import { formatLocalDate } from '../utils/date';
import { PhotoLightbox, LightboxPhoto } from './PhotoLightbox';

interface ParcelDetailModalProps {
  parcel: ParcelWithDetails | null;
  onClose: () => void;
  onUpdated: (updated: ParcelWithDetails) => void;
}

export const ParcelDetailModal: React.FC<ParcelDetailModalProps> = ({
  parcel,
  onClose,
  onUpdated,
}) => {
  const repository = useRepository();
  const { user } = useAuth();

  const [selectedItemToEdit, setSelectedItemToEdit] = useState<ParcelItemWithDetails | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editRecipientName, setEditRecipientName] = useState('');
  const [editItemQty, setEditItemQty] = useState('');
  const [editItemWeightPerPiece, setEditItemWeightPerPiece] = useState('');
  const [editItemLength, setEditItemLength] = useState('');
  const [editItemWidth, setEditItemWidth] = useState('');
  const [editItemHeight, setEditItemHeight] = useState('');
  const [newPhotos, setNewPhotos] = useState<Blob[]>([]);
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>([]);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Date Editing State
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateValue, setEditDateValue] = useState(
    formatLocalDate(parcel?.received_at) || ''
  );
  const [isSavingDate, setIsSavingDate] = useState(false);

  // Add Package Item State
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemRecipient, setNewItemRecipient] = useState(parcel?.customer?.name || '');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemWeightPerPiece, setNewItemWeightPerPiece] = useState('');
  const [newItemLength, setNewItemLength] = useState('');
  const [newItemWidth, setNewItemWidth] = useState('');
  const [newItemHeight, setNewItemHeight] = useState('');
  const [newItemPhotos, setNewItemPhotos] = useState<Blob[]>([]);
  const [newItemPhotoUrls, setNewItemPhotoUrls] = useState<string[]>([]);
  const [isSavingNewItem, setIsSavingNewItem] = useState(false);
  const newItemFileInputRef = useRef<HTMLInputElement>(null);

  // Parcel Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSoleParcelForCustomer, setIsSoleParcelForCustomer] = useState(false);
  const [alsoDeleteCustomer, setAlsoDeleteCustomer] = useState(false);
  const [isDeletingParcel, setIsDeletingParcel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flatten all photos from this parcel lot for the unified Lightbox
  const allParcelPhotos: LightboxPhoto[] = useMemo(() => {
    if (!parcel) return [];
    const list: LightboxPhoto[] = [];
    for (const item of parcel.items || []) {
      const title = item.item_name || item.name_on_parcel || `Package #${item.item_index}`;
      const subtitle = `Pkg #${item.item_index} • ${item.qty} pcs`;
      if (item.photos && item.photos.length > 0) {
        for (const ph of item.photos) {
          list.push({
            id: ph.id,
            url: ph.url,
            title,
            subtitle,
          });
        }
      } else if (item.photo_urls && item.photo_urls.length > 0) {
        for (const u of item.photo_urls) {
          list.push({
            url: u,
            title,
            subtitle,
          });
        }
      }
    }
    return list;
  }, [parcel]);

  if (!parcel) return null;

  const handleOpenLightbox = (targetUrl: string) => {
    const idx = allParcelPhotos.findIndex((p) => p.url === targetUrl);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  const handleDeleteExistingPhoto = async (photoId: string) => {
    if (!window.confirm(strings.parcelsList.deletePhotoConfirm)) return;
    try {
      await repository.deleteParcelPhoto(photoId);
      const fresh = await repository.getParcelById(parcel.id);
      if (fresh) {
        onUpdated(fresh);
        if (selectedItemToEdit) {
          const updatedItem = fresh.items.find((it) => it.id === selectedItemToEdit.id);
          if (updatedItem) setSelectedItemToEdit(updatedItem);
        }
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
      setEditError('Could not delete photo. Please retry.');
    }
  };

  const handleInitiateDeleteParcel = async () => {
    if (!parcel) return;
    if (parcel.breakdown.packed_qty > 0 || parcel.breakdown.in_transit_qty > 0 || parcel.breakdown.delivered_qty > 0) {
      alert('Cannot delete parcel lot while packages are packed in Big Box, in transit, or delivered.');
      return;
    }
    try {
      const allCustomerParcels = await repository.getParcels({ customerId: parcel.customer_id });
      const otherParcels = allCustomerParcels.filter((p) => p.id !== parcel.id);
      const isSole = otherParcels.length === 0;
      setIsSoleParcelForCustomer(isSole);
      setAlsoDeleteCustomer(isSole);
      setShowDeleteConfirm(true);
    } catch (err) {
      console.error('Failed to check customer parcels:', err);
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDeleteParcel = async () => {
    if (!parcel) return;
    setIsDeletingParcel(true);
    try {
      await repository.deleteParcel(parcel.id, alsoDeleteCustomer);
      setShowDeleteConfirm(false);
      onClose();
      onUpdated(undefined as unknown as ParcelWithDetails);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete parcel';
      setEditError(msg);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeletingParcel(false);
    }
  };

  const isToBeReturned = parcel?.status === 'to_be_returned';
  const isReturned = parcel?.status === 'returned';
  const isStaff = user?.role === 'staff';
  const isAdmin = user?.role === 'admin';

  // If parcel is in a return status, staff is completely locked out of editing/adding
  const isStaffLocked = isStaff && (isToBeReturned || isReturned);
  const isParcelLocked =
    isStaffLocked ||
    (parcel?.breakdown.packed_qty || 0) > 0 ||
    (parcel?.breakdown.in_transit_qty || 0) > 0 ||
    (parcel?.breakdown.delivered_qty || 0) > 0;

  const isStoredOnly =
    parcel?.status === 'stored' &&
    (parcel?.breakdown.packed_qty || 0) === 0 &&
    (parcel?.breakdown.in_transit_qty || 0) === 0 &&
    (parcel?.breakdown.delivered_qty || 0) === 0;

  const isPackedOrInTransit =
    (parcel?.breakdown.packed_qty || 0) > 0 ||
    (parcel?.breakdown.in_transit_qty || 0) > 0 ||
    parcel?.status === 'packed' ||
    parcel?.status === 'in_transit';

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const handleAdminChangeStatus = async (toStatus: ParcelStatus, note?: string) => {
    if (!parcel) return;
    if (
      (toStatus === 'to_be_returned' || toStatus === 'returned') &&
      parcel.status !== 'to_be_returned' &&
      (!isStoredOnly || isPackedOrInTransit)
    ) {
      setEditError('Return status is only allowed when parcel is in stored status (not packed in a box or on a truck).');
      return;
    }
    setIsUpdatingStatus(true);
    try {
      const userId = user?.id || crypto.randomUUID();
      const updated = await repository.updateParcelStatus(parcel.id, toStatus, userId, note);
      onUpdated(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update parcel status.';
      console.error('Failed to update parcel status:', err);
      setEditError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStaffMarkAsReturned = async () => {
    if (!parcel) return;
    if (!window.confirm(strings.parcelsList.markAsReturnedConfirm)) return;
    setIsUpdatingStatus(true);
    try {
      const userId = user?.id || crypto.randomUUID();
      const updated = await repository.markParcelAsReturned(parcel.id, userId);
      onUpdated(updated);
      onClose();
    } catch (err) {
      console.error('Failed to mark parcel as returned:', err);
      setEditError('Could not update status to Returned.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveDate = async () => {
    if (!editDateValue || !parcel) return;
    if (isParcelLocked) {
      setEditError('Cannot change receive date once packages are packed in Big Box or dispatched.');
      return;
    }
    setIsSavingDate(true);
    setEditError(null);
    try {
      const userId = user?.id || crypto.randomUUID();
      const updated = await repository.updateParcelDetails(
        parcel.id,
        { received_at: editDateValue },
        userId
      );
      setIsEditingDate(false);
      onUpdated(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update date';
      setEditError(msg);
    } finally {
      setIsSavingDate(false);
    }
  };

  const handleNewItemPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const addedBlobs: Blob[] = [];
      const addedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressPhoto(files[i]);
        addedBlobs.push(compressed);
        addedUrls.push(URL.createObjectURL(compressed));
      }
      setNewItemPhotos((prev) => [...prev, ...addedBlobs]);
      setNewItemPhotoUrls((prev) => [...prev, ...addedUrls]);
    } catch (err) {
      console.error('Failed to compress photo:', err);
      setEditError(strings.receive.photoCaptureFailed);
    } finally {
      if (newItemFileInputRef.current) newItemFileInputRef.current.value = '';
    }
  };

  const handleRemoveNewItemPhoto = (idx: number) => {
    URL.revokeObjectURL(newItemPhotoUrls[idx]);
    setNewItemPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
    setNewItemPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveNewItem = async () => {
    if (!parcel) return;
    const qty = parseInt(newItemQty, 10);
    const weightPerPiece = parseFloat(newItemWeightPerPiece);
    if (!qty || qty <= 0) {
      setEditError(strings.receive.validationErrorQty);
      return;
    }
    if (!weightPerPiece || weightPerPiece <= 0) {
      setEditError(strings.receive.validationErrorWeightPerPiece);
      return;
    }

    setIsSavingNewItem(true);
    setEditError(null);
    try {
      const userId = user?.id || crypto.randomUUID();
      let subNameId: string | null = null;
      const recipient = newItemRecipient.trim() || parcel.customer?.name || 'Customer';
      if (recipient !== parcel.customer?.name) {
        const newSub = await repository.createSubName(parcel.customer_id, recipient);
        subNameId = newSub.id;
      }

      const updated = await repository.addPackageItemToParcel(
        parcel.id,
        {
          item_name: newItemName.trim(),
          sub_name_id: subNameId,
          name_on_parcel: recipient,
          qty,
          weight_per_piece_kg: weightPerPiece,
          weight_kg: Number((qty * weightPerPiece).toFixed(2)),
          length_cm: parseFloat(newItemLength) || 0,
          width_cm: parseFloat(newItemWidth) || 0,
          height_cm: parseFloat(newItemHeight) || 0,
          photos: newItemPhotos,
        },
        userId
      );

      newItemPhotoUrls.forEach((u) => URL.revokeObjectURL(u));
      setNewItemPhotoUrls([]);
      setNewItemPhotos([]);
      setNewItemName('');
      setNewItemQty('1');
      setNewItemWeightPerPiece('');
      setNewItemLength('');
      setNewItemWidth('');
      setNewItemHeight('');
      setIsAddingItem(false);
      onUpdated(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add package';
      setEditError(msg);
    } finally {
      setIsSavingNewItem(false);
    }
  };

  const handleStartEditItem = (item: ParcelItemWithDetails) => {
    if (item.delivered_qty > 0) {
      alert('⚠️ Cannot edit: Package has already been delivered.');
      return;
    }
    if (item.in_transit_qty > 0) {
      alert('⚠️ Cannot edit: Package is currently in transit on a courier truck.');
      return;
    }
    if (item.packed_qty > 0) {
      const boxLoc = (item.locations || []).find((l) => l.type === 'box');
      alert(`⚠️ Cannot edit: Package is packed inside Big Box (${boxLoc?.label || 'repacked'}). Please unpack from Big Box first to edit.`);
      return;
    }

    setSelectedItemToEdit(item);
    setEditItemName(item.item_name || '');
    setEditRecipientName(item.name_on_parcel || '');
    setEditItemQty(String(item.qty || 1));
    setEditItemWeightPerPiece(String(item.weight_per_piece_kg || 0));
    setEditItemLength(item.length_cm ? String(item.length_cm) : '');
    setEditItemWidth(item.width_cm ? String(item.width_cm) : '');
    setEditItemHeight(item.height_cm ? String(item.height_cm) : '');
    setNewPhotos([]);
    newPhotoUrls.forEach((u) => URL.revokeObjectURL(u));
    setNewPhotoUrls([]);
    setEditError(null);
  };

  const handleCancelEditItem = () => {
    newPhotoUrls.forEach((u) => URL.revokeObjectURL(u));
    setNewPhotoUrls([]);
    setNewPhotos([]);
    setSelectedItemToEdit(null);
    setEditError(null);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressingPhoto(true);
    try {
      const addedBlobs: Blob[] = [];
      const addedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const compressed = await compressPhoto(files[i]);
        addedBlobs.push(compressed);
        addedUrls.push(URL.createObjectURL(compressed));
      }

      setNewPhotos((prev) => [...prev, ...addedBlobs]);
      setNewPhotoUrls((prev) => [...prev, ...addedUrls]);
    } catch (err) {
      console.error('Failed to compress photo:', err);
      setEditError(strings.receive.photoCaptureFailed);
    } finally {
      setIsCompressingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveNewPhoto = (idx: number) => {
    URL.revokeObjectURL(newPhotoUrls[idx]);
    setNewPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
    setNewPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveItemEdit = async () => {
    if (!selectedItemToEdit) return;
    const qty = parseInt(editItemQty, 10);
    const weightPerPiece = parseFloat(editItemWeightPerPiece);

    if (!qty || qty <= 0) {
      setEditError(strings.receive.validationErrorQty);
      return;
    }
    if (!weightPerPiece || weightPerPiece <= 0) {
      setEditError(strings.receive.validationErrorWeightPerPiece);
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);
    try {
      const userId = user?.id || crypto.randomUUID();

      let subNameId = selectedItemToEdit.sub_name_id;
      const trimmedRecipient = editRecipientName.trim() || parcel.customer?.name || 'Customer';

      if (
        trimmedRecipient !== parcel.customer?.name &&
        trimmedRecipient !== selectedItemToEdit.name_on_parcel
      ) {
        const newSub = await repository.createSubName(parcel.customer_id, trimmedRecipient);
        subNameId = newSub.id;
      }

      const updated = await repository.updateParcelItemDetails(
        selectedItemToEdit.id,
        {
          item_name: editItemName.trim(),
          sub_name_id: subNameId,
          name_on_parcel: trimmedRecipient,
          qty,
          weight_per_piece_kg: weightPerPiece,
          length_cm: parseFloat(editItemLength) || 0,
          width_cm: parseFloat(editItemWidth) || 0,
          height_cm: parseFloat(editItemHeight) || 0,
          new_photos: newPhotos.length > 0 ? newPhotos : undefined,
        },
        userId
      );

      newPhotoUrls.forEach((u) => URL.revokeObjectURL(u));
      setNewPhotoUrls([]);
      setNewPhotos([]);
      setSelectedItemToEdit(null);
      onUpdated(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update package';
      setEditError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
        <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-3.5 p-4 sm:p-5 animate-in zoom-in-95 max-h-[92vh] flex flex-col text-slate-800 dark:text-slate-100">
          {/* Header: Main Customer Prominent, Code & Parcel ID Small */}
          <div className="flex items-start justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div>
              <h3 className="font-black text-base sm:text-lg text-[#1E75BB] dark:text-[#2D8AD1] leading-tight">
                {parcel.customer?.name || strings.parcelsList.customerLabel}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                {parcel.customer?.code && (
                  <span className="bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] font-mono font-bold px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                    {parcel.customer.code}
                  </span>
                )}
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold px-1.5 py-0.5 rounded">
                  {parcel.parcel_code}
                </span>

                {/* Received Date Display & Inline Editor */}
                {!isEditingDate ? (
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    <Calendar className="w-3 h-3 text-[#1E75BB] dark:text-[#2D8AD1]" />
                    <span>{formatLocalDate(parcel.received_at)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isParcelLocked) {
                          alert('⚠️ Cannot change receive date once packages are packed in Big Box or in transit/delivered.');
                          return;
                        }
                        setEditDateValue(formatLocalDate(parcel.received_at) || '');
                        setIsEditingDate(true);
                      }}
                      className="p-0.5 text-slate-400 hover:text-[#1E75BB] dark:hover:text-slate-200 transition-colors"
                      title={isParcelLocked ? "Date locked: cargo packed or dispatched" : "Edit receive date"}
                    >
                      {isParcelLocked ? (
                        <Lock className="w-2.5 h-2.5 text-amber-500" />
                      ) : (
                        <Edit2 className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </span>
                ) : (
                  <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 p-1 rounded-lg border border-blue-200 dark:border-blue-900">
                    <input
                      type="date"
                      value={editDateValue}
                      onChange={(e) => setEditDateValue(e.target.value)}
                      className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-850 dark:text-slate-100 rounded px-1.5 py-0.5 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDate}
                      disabled={isSavingDate}
                      className="p-1 bg-[#1E75BB] text-white rounded hover:bg-[#165B94]"
                      title="Save date"
                    >
                      {isSavingDate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingDate(false)}
                      className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-300"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {editError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium shrink-0">
              {editError}
            </div>
          )}

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {/* Overall Lot Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1E75BB] dark:text-[#2D8AD1]" />
                <span>
                  Total: <span className="text-[#1E75BB] dark:text-[#2D8AD1]">{parcel.total_qty || 0} pcs</span> (
                  {(parcel.items || []).length}{' '}
                  {(parcel.items || []).length === 1 ? 'package' : 'packages'})
                </span>
              </div>
              <div className="font-extrabold text-[#1E75BB] dark:text-[#2D8AD1]">
                {(parcel.total_weight_kg || 0).toFixed(1)} kg total
              </div>
            </div>

            {/* Admin Override Controls */}
            {isAdmin && (
              <div className="p-3 bg-blue-50/70 dark:bg-slate-800/90 rounded-xl border border-blue-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#1E75BB] dark:text-[#2D8AD1]" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {strings.parcelsList.adminStatusControlsTitle}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    Status: {parcel.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Mark as To Be Returned & Mark as Returned: ONLY allowed when in stored status and not in box / truck */}
                  {isStoredOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAdminChangeStatus('to_be_returned', 'Flagged as To Be Returned by Admin')}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 min-h-[32px]"
                      >
                        {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        <span>{strings.parcelsList.adminSetToBeReturned}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdminChangeStatus('returned', 'Flagged as Returned by Admin')}
                        disabled={isUpdatingStatus}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 min-h-[32px]"
                      >
                        {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{strings.parcelsList.adminSetReturned}</span>
                      </button>
                    </>
                  )}

                  {/* If already to_be_returned, allow marking as returned */}
                  {parcel.status === 'to_be_returned' && (
                    <button
                      type="button"
                      onClick={() => handleAdminChangeStatus('returned', 'Flagged as Returned by Admin')}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 min-h-[32px]"
                    >
                      {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{strings.parcelsList.adminSetReturned}</span>
                    </button>
                  )}

                  {/* Revert to stored if already in return state */}
                  {(parcel.status === 'to_be_returned' || parcel.status === 'returned') && (
                    <button
                      type="button"
                      onClick={() => handleAdminChangeStatus('stored', 'Reverted back to stored warehouse stock by Admin')}
                      disabled={isUpdatingStatus}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 min-h-[32px]"
                    >
                      {isUpdatingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{strings.parcelsList.adminRevertToStored}</span>
                    </button>
                  )}

                  {/* Warning if packed in box or on truck */}
                  {isPackedOrInTransit && parcel.status !== 'to_be_returned' && parcel.status !== 'returned' && (
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50">
                      Cannot return: pieces are packed in a Big Box or on a truck. Unpack them first.
                    </span>
                  )}

                  {parcel.status === 'delivered' && (
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Delivered parcel lots cannot be marked as returned.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Staff Status Alerts */}
            {isStaff && isToBeReturned && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{strings.parcelsList.toBeReturnedNotice}</span>
              </div>
            )}

            {isStaff && isReturned && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 rounded-xl text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{strings.parcelsList.returnedNotice}</span>
              </div>
            )}

            {/* List of Packages with Specific Statuses, Photos & Edit */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold uppercase tracking-wider text-[10px] text-slate-400 dark:text-slate-500">
                  {strings.parcelsList.packagesCountTitle((parcel.items || []).length)}
                </h4>
                {!isAddingItem && !isParcelLocked && (
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(true)}
                    className="text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1] hover:text-[#165B94] flex items-center gap-1 transition-colors py-1 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{strings.parcelsList.addNewPackageToLot}</span>
                  </button>
                )}
              </div>

              {/* Form to Add New Package to Lot */}
              {isAddingItem && (
                <div className="p-3 bg-blue-50/60 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
                      New Package (#{(parcel.items || []).length + 1})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingItem(false);
                        newItemPhotoUrls.forEach((u) => URL.revokeObjectURL(u));
                        setNewItemPhotoUrls([]);
                        setNewItemPhotos([]);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        {strings.receive.itemNameLabel}
                      </label>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={strings.receive.itemNamePlaceholder}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        {strings.receive.nameOnParcel}
                      </label>
                      <input
                        type="text"
                        value={newItemRecipient}
                        onChange={(e) => setNewItemRecipient(e.target.value)}
                        placeholder={parcel.customer?.name || ''}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        {strings.receive.qtyLabel}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                        {strings.receive.weightPerPieceLabel}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={newItemWeightPerPiece}
                        onChange={(e) => setNewItemWeightPerPiece(e.target.value)}
                        placeholder="0.0"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      {strings.receive.sizeLabel}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input
                        type="number"
                        placeholder="L"
                        value={newItemLength}
                        onChange={(e) => setNewItemLength(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-xs text-slate-800 dark:text-slate-100"
                      />
                      <input
                        type="number"
                        placeholder="W"
                        value={newItemWidth}
                        onChange={(e) => setNewItemWidth(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-xs text-slate-800 dark:text-slate-100"
                      />
                      <input
                        type="number"
                        placeholder="H"
                        value={newItemHeight}
                        onChange={(e) => setNewItemHeight(e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-xs text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {strings.receive.photosSection}
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {newItemPhotoUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative w-12 h-12 rounded-lg border border-blue-300 dark:border-blue-700 overflow-hidden bg-white dark:bg-slate-900"
                        >
                          <img src={url} alt="New package upload" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewItemPhoto(idx)}
                            className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => newItemFileInputRef.current?.click()}
                        className="px-3 py-2 rounded-lg border border-dashed border-[#1E75BB] dark:border-[#2D8AD1] bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-[#1E75BB] dark:text-[#2D8AD1] font-bold text-xs flex items-center gap-1 min-h-[36px]"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{strings.parcelsList.addMorePhotos}</span>
                      </button>

                      <input
                        ref={newItemFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        capture="environment"
                        onChange={handleNewItemPhotoSelect}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveNewItem}
                      disabled={isSavingNewItem}
                      className="px-3.5 py-1.5 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-lg text-xs font-bold flex items-center gap-1 min-h-[34px]"
                    >
                      {isSavingNewItem ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{strings.common.save}</span>
                    </button>
                  </div>
                </div>
              )}

              {(parcel.items || []).map((it) => {
                const isEditingThis = selectedItemToEdit?.id === it.id;
                const itemLocations = it.locations || [];

                // Strict edit lock check: Staff cannot edit when returned/to_be_returned, or when packed/dispatched
                const isLocked = isStaffLocked || it.packed_qty > 0 || it.in_transit_qty > 0 || it.delivered_qty > 0;

                if (isEditingThis) {
                  {/* When editing: Show ONLY the edit form cleanly */}
                  return (
                    <div
                      key={it.id}
                      className="p-3 bg-blue-50/60 dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-[#1E75BB] text-white px-1.5 py-0.5 rounded font-mono font-bold">
                            #{it.item_index}
                          </span>
                          <span className="font-extrabold text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
                            Edit Package #{it.item_index}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelEditItem}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                            {strings.receive.itemNameLabel}
                          </label>
                          <input
                            type="text"
                            value={editItemName}
                            onChange={(e) => setEditItemName(e.target.value)}
                            placeholder={strings.receive.itemNamePlaceholder}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                            {strings.receive.nameOnParcel}
                          </label>
                          <input
                            type="text"
                            value={editRecipientName}
                            onChange={(e) => setEditRecipientName(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                            {strings.receive.qtyLabel}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={editItemQty}
                            onChange={(e) => setEditItemQty(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                            {strings.receive.weightPerPieceLabel}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editItemWeightPerPiece}
                            onChange={(e) => setEditItemWeightPerPiece(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                          {strings.receive.sizeLabel}
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <input
                            type="number"
                            placeholder="L"
                            value={editItemLength}
                            onChange={(e) => setEditItemLength(e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-xs text-slate-800 dark:text-slate-100"
                          />
                          <input
                            type="number"
                            placeholder="W"
                            value={editItemWidth}
                            onChange={(e) => setEditItemWidth(e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-xs text-slate-800 dark:text-slate-100"
                          />
                          <input
                            type="number"
                            placeholder="H"
                            value={editItemHeight}
                            onChange={(e) => setEditItemHeight(e.target.value)}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-center text-xs text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      {/* Previously Added Photos (with delete button) */}
                      {it.photos && it.photos.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Current Photos ({it.photos.length}) — Tap red trash to delete:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {it.photos.map((ph, pi) => (
                              <div
                                key={ph.id || pi}
                                className="relative w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 group shadow-xs"
                              >
                                <img
                                  src={ph.url}
                                  alt={`Existing photo ${pi + 1}`}
                                  onClick={() => handleOpenLightbox(ph.url)}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExistingPhoto(ph.id)}
                                  className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 transition-colors shadow-md"
                                  title="Delete photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add More Photos Section */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {strings.parcelsList.addMorePhotos}
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {newPhotoUrls.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative w-12 h-12 rounded-lg border border-blue-300 dark:border-blue-700 overflow-hidden bg-white dark:bg-slate-900"
                            >
                              <img
                                src={url}
                                alt="New upload"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveNewPhoto(idx)}
                                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isCompressingPhoto}
                            className="px-3 py-2 rounded-lg border border-dashed border-[#1E75BB] dark:border-[#2D8AD1] bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 text-[#1E75BB] dark:text-[#2D8AD1] font-bold text-xs flex items-center gap-1 min-h-[36px]"
                          >
                            {isCompressingPhoto ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Plus className="w-3.5 h-3.5" />
                            )}
                            <span>{strings.parcelsList.addMorePhotos}</span>
                          </button>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            capture="environment"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveItemEdit}
                          disabled={isSavingEdit}
                          className="px-3.5 py-1.5 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-lg text-xs font-bold flex items-center gap-1 min-h-[34px]"
                        >
                          {isSavingEdit ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{strings.common.save}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={it.id}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-[#1E75BB] text-white px-1.5 py-0.5 rounded font-mono font-bold">
                            #{it.item_index}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {it.item_name || it.name_on_parcel}
                          </span>
                          {it.item_name && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                              (Name on parcel: {it.name_on_parcel})
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold pt-0.5">
                          {it.qty || 1} pcs • {(it.weight_kg || 0).toFixed(1)} kg total{' '}
                          <span className="text-slate-400 dark:text-slate-500 font-normal">
                            ({it.weight_per_piece_kg || 0} kg/pc)
                          </span>
                          {it.length_cm > 0 &&
                            ` • ${it.length_cm}×${it.width_cm}×${it.height_cm} cm`}
                        </div>
                      </div>

                      {/* Edit Button or Locked Indicator */}
                      {isLocked ? (
                        <div
                          title="Locked: Item is packed in big box, in transit, or delivered"
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Locked</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEditItem(it)}
                          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0 min-h-[32px]"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{strings.common.edit}</span>
                        </button>
                      )}
                    </div>

                    {/* Specific Package Status Breakdown (Stored / In Repack / On Truck / Delivered) */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {it.stored_qty > 0 && (
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] border border-blue-200 dark:border-blue-900/50 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1E75BB] dark:bg-[#2D8AD1]"></span>
                          <span>{it.stored_qty} pcs Stored in Warehouse</span>
                        </span>
                      )}

                      {itemLocations.map((loc, lIdx) => {
                        let colorClasses = 'bg-amber-50 text-[#ED7D24] border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
                        let dotColor = 'bg-[#ED7D24] dark:bg-amber-400';
                        let statusText = 'Repacked';

                        if (loc.status === 'in_transit') {
                          colorClasses = 'bg-blue-50 text-[#1E75BB] border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50';
                          dotColor = 'bg-[#1E75BB] dark:bg-blue-400';
                          statusText = 'In Transit';
                        } else if (loc.status === 'delivered') {
                          colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
                          dotColor = 'bg-emerald-600 dark:bg-emerald-400';
                          statusText = 'Delivered';
                        }

                        return (
                          <span
                            key={lIdx}
                            className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${colorClasses}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                            <span>
                              {loc.qty} pcs {statusText} ({loc.label})
                            </span>
                          </span>
                        );
                      })}
                    </div>

                    {/* All Photos for this Package Item */}
                    {it.photo_urls && it.photo_urls.length > 0 && (
                      <div className="pt-1">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">
                          Photos ({it.photo_urls.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {it.photo_urls.map((u, pi) => (
                            <img
                              key={pi}
                              src={u}
                              alt={`Package ${it.item_index} photo ${pi + 1}`}
                              onClick={() => handleOpenLightbox(u)}
                              className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity shadow-2xs"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
            {isStaff && isToBeReturned ? (
              <button
                type="button"
                onClick={handleStaffMarkAsReturned}
                disabled={isUpdatingStatus}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs min-h-[42px]"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                <span>{strings.parcelsList.markAsReturnedButton}</span>
              </button>
            ) : isStaff && isReturned ? (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>Returned (Completed)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInitiateDeleteParcel}
                className="px-3.5 py-2 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 min-h-[40px]"
              >
                <Trash2 className="w-4 h-4" />
                <span>{strings.parcelsList.deleteParcelButton}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Parcel Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                  {strings.parcelsList.deleteParcelConfirmTitle}
                </h3>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  {parcel.parcel_code}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              {strings.parcelsList.deleteParcelConfirmMsg(parcel.parcel_code)}
            </p>

            {/* Checkbox if this was the sole parcel for this customer */}
            {isSoleParcelForCustomer && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/80 space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={alsoDeleteCustomer}
                    onChange={(e) => setAlsoDeleteCustomer(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                  />
                  <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    {strings.parcelsList.alsoDeleteCustomerOption(
                      parcel.customer?.name || 'Customer',
                      parcel.customer?.code || ''
                    )}
                    <p className="text-[11px] font-normal text-amber-700 dark:text-amber-300/80 mt-0.5">
                      This customer has no other parcel shipments. Checking this will remove the customer name and code from the system.
                    </p>
                  </div>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingParcel}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold min-h-[40px]"
              >
                {strings.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteParcel}
                disabled={isDeletingParcel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs min-h-[40px]"
              >
                {isDeletingParcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Photo Lightbox with Sliding, Arrow Keys & Thumbnails */}
      {lightboxIndex !== null && allParcelPhotos.length > 0 && (
        <PhotoLightbox
          photos={allParcelPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDeletePhoto={handleDeleteExistingPhoto}
        />
      )}
    </>
  );
};

