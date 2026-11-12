import React, { useRef, useEffect } from 'react';
import { CustomerSubName } from '../types';
import { strings } from '../strings';
import { compressPhoto } from '../utils/imageCompression';
import { Plus, X, Loader2, Edit3, Trash2 } from 'lucide-react';

export interface PackageFormData {
  id: string; // local temporary id
  item_name: string; // Description of item e.g. Book, Shirt
  is_custom_name: boolean; // false = Same as customer, true = New name
  custom_name: string; // Single new name for this package
  sub_name_id: string | null;
  qty: string; // quantity of identical packages
  weight_per_piece_kg: string; // weight of 1 package
  weight_kg: string; // total weight
  length_cm: string;
  width_cm: string;
  height_cm: string;
  photos: Blob[];
  photoUrls: string[];
}

interface PackageCardProps {
  packageIndex: number;
  data: PackageFormData;
  customerName: string;
  savedSubNames?: CustomerSubName[];
  canRemove: boolean;
  isCollapsed: boolean;
  error?: string | null;
  onUpdate: (updated: Partial<PackageFormData>) => void;
  onRemove: () => void;
  onExpand: () => void;
  onAddSubName?: (name: string) => Promise<CustomerSubName>;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  packageIndex,
  data,
  customerName,
  canRemove,
  isCollapsed,
  error,
  onUpdate,
  onRemove,
  onExpand,
}) => {
  const [isCompressing, setIsCompressing] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const newNameInputRef = useRef<HTMLInputElement>(null);

  // If there's an error, scroll into view
  useEffect(() => {
    if (error && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // Focus input when switching to new name
  useEffect(() => {
    if (data.is_custom_name && newNameInputRef.current) {
      newNameInputRef.current.focus();
    }
  }, [data.is_custom_name]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const newBlobs: Blob[] = [];
      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressPhoto(file);
        newBlobs.push(compressed);
        newUrls.push(URL.createObjectURL(compressed));
      }

      onUpdate({
        photos: [...data.photos, ...newBlobs],
        photoUrls: [...data.photoUrls, ...newUrls],
      });
    } catch (err) {
      console.error('Photo compression error:', err);
      alert(strings.receive.photoCaptureFailed);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...data.photos];
    const newUrls = [...data.photoUrls];
    URL.revokeObjectURL(newUrls[index]);
    newPhotos.splice(index, 1);
    newUrls.splice(index, 1);
    onUpdate({ photos: newPhotos, photoUrls: newUrls });
  };

  // Calculations
  const qtyNum = Math.max(1, parseInt(data.qty, 10) || 1);
  const perPieceNum = parseFloat(data.weight_per_piece_kg) || 0;
  const computedTotalWeight = (qtyNum * perPieceNum).toFixed(2);

  // Determine current active name for display
  const currentDisplayName = data.is_custom_name && data.custom_name.trim()
    ? data.custom_name.trim()
    : customerName || strings.receive.sameAsCustomer;

  // If collapsed, display compact single line summary
  if (isCollapsed) {
    return (
      <div
        ref={cardRef}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-xs flex items-center justify-between transition-all"
      >
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
              {strings.receive.packageIndex(packageIndex)}:
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
              {data.item_name.trim() ? `${data.item_name.trim()} (${currentDisplayName})` : currentDisplayName}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {qtyNum} pcs • {perPieceNum} kg/pc ({computedTotalWeight} kg total)
          </div>
        </div>

        <button
          type="button"
          onClick={onExpand}
          className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors min-h-[36px]"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{strings.receive.editPackageButton}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`bg-white dark:bg-slate-900 rounded-xl border-2 ${
        error ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-950' : 'border-[#1E75BB]/40 dark:border-slate-700'
      } p-2.5 shadow-xs space-y-2 transition-all relative text-slate-800 dark:text-slate-100`}
    >
      {/* Card Header: Package 1 on left, Remove on right */}
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
          {strings.receive.packageIndex(packageIndex)}
        </h3>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-0.5 rounded-lg transition-colors min-h-[30px] flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{strings.receive.removePackage}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Name on parcel - Full width container with sliding transition */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
          {strings.receive.nameOnParcel}
        </label>

        <div className="relative w-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 min-h-[36px] bg-slate-50 dark:bg-slate-800 flex items-center">
          {/* Box 1: "Same as customer" takes the whole div */}
          <div
            className={`w-full flex items-center justify-between px-2.5 py-1 transition-all duration-300 ease-in-out ${
              data.is_custom_name
                ? '-translate-x-full opacity-0 pointer-events-none absolute inset-0'
                : 'translate-x-0 opacity-100 relative'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span className="text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1]">
                {strings.receive.sameAsCustomer}
              </span>
              {customerName && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  ({customerName})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onUpdate({ is_custom_name: true })}
              className="px-2 py-1 text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1] hover:text-[#165B94] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors flex items-center gap-1 min-h-[30px] flex-shrink-0 border border-dashed border-[#1E75BB]/60 bg-white dark:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{strings.receive.addNewName}</span>
            </button>
          </div>

          {/* Box 2: "New name" input takes the whole div */}
          <div
            className={`w-full flex items-center px-2 transition-all duration-300 ease-in-out bg-white dark:bg-slate-800 ${
              !data.is_custom_name
                ? 'translate-x-full opacity-0 pointer-events-none absolute inset-0'
                : 'translate-x-0 opacity-100 relative'
            }`}
          >
            <input
              ref={newNameInputRef}
              type="text"
              value={data.custom_name || ''}
              onChange={(e) => onUpdate({ custom_name: e.target.value })}
              placeholder={strings.receive.newParcelNamePlaceholder}
              className="flex-1 px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none min-h-[34px]"
            />

            <button
              type="button"
              onClick={() => onUpdate({ is_custom_name: false, custom_name: '' })}
              title={strings.receive.switchToSameAsCustomer}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors min-h-[30px] min-w-[30px] flex items-center justify-center flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Item Name (Description of parcel e.g. Book, Shirt) */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
          {strings.receive.itemNameLabel}
        </label>
        <input
          type="text"
          value={data.item_name || ''}
          onChange={(e) => onUpdate({ item_name: e.target.value })}
          placeholder={strings.receive.itemNamePlaceholder}
          className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-900 min-h-[36px]"
        />
      </div>

      {/* Bulk Quantity & Weight per 1 piece */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
            {strings.receive.qtyLabel}
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={data.qty}
            onChange={(e) => onUpdate({ qty: e.target.value })}
            placeholder="1"
            className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-900 min-h-[36px]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {strings.receive.weightPerPieceLabel}
            </label>
            {perPieceNum > 0 && (
              <span className="text-[10px] font-bold text-[#1E75BB] dark:text-[#2D8AD1]">
                Total: {computedTotalWeight} kg
              </span>
            )}
          </div>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={data.weight_per_piece_kg}
            onChange={(e) => onUpdate({ weight_per_piece_kg: e.target.value })}
            placeholder="0.00"
            className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-900 min-h-[36px]"
          />
        </div>
      </div>

      {/* Size L x W x H (Optional) */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
          {strings.receive.sizeLabel}
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <input
            type="number"
            step="1"
            min="0"
            value={data.length_cm}
            onChange={(e) => onUpdate({ length_cm: e.target.value })}
            placeholder={strings.receive.lengthPlaceholder}
            className="w-full px-1 py-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-900 min-h-[36px]"
          />
          <input
            type="number"
            step="1"
            min="0"
            value={data.width_cm}
            onChange={(e) => onUpdate({ width_cm: e.target.value })}
            placeholder={strings.receive.widthPlaceholder}
            className="w-full px-1 py-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-900 min-h-[36px]"
          />
          <input
            type="number"
            step="1"
            min="0"
            value={data.height_cm}
            onChange={(e) => onUpdate({ height_cm: e.target.value })}
            placeholder={strings.receive.heightPlaceholder}
            className="w-full px-1 py-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-900 min-h-[36px]"
          />
        </div>
      </div>

      {/* Photos (Optional) */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
          {strings.receive.photosSection}
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          {data.photoUrls.map((url, idx) => (
            <div
              key={idx}
              className="relative w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-xs group"
            >
              <img
                src={url}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                title="Remove photo"
                className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 transition-colors min-h-[18px] min-w-[18px] flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            className="w-12 h-12 rounded-lg border-2 border-dashed border-[#1E75BB] dark:border-[#2D8AD1] bg-blue-50/40 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-[#1E75BB] dark:text-[#2D8AD1] flex flex-col items-center justify-center transition-colors min-h-[36px] min-w-[36px]"
          >
            {isCompressing ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#1E75BB]" />
            ) : (
              <Plus className="w-4 h-4 stroke-[2.5]" />
            )}
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
    </div>
  );
};
