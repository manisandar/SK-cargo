import React, { useState } from 'react';
import { useRepository, Customer, ParcelWithDetails } from '../data';
import { useAuth } from '../context/AuthContext';
import { strings } from '../strings';
import { X, GitMerge, AlertTriangle, Loader2, ChevronDown } from 'lucide-react';

interface CustomerMergeModalProps {
  customers: Customer[];
  parcels: ParcelWithDetails[];
  initialTargetCustomerId?: string | null;
  onClose: () => void;
  onMerged: () => void;
}

export const CustomerMergeModal: React.FC<CustomerMergeModalProps> = ({
  customers,
  parcels,
  initialTargetCustomerId,
  onClose,
  onMerged,
}) => {
  const repository = useRepository();
  const { user } = useAuth();

  const [targetId, setTargetId] = useState<string>(initialTargetCustomerId || (customers[0]?.id || ''));
  const [sourceId, setSourceId] = useState<string>(
    customers.find((c) => c.id !== targetId)?.id || ''
  );
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetCustomer = customers.find((c) => c.id === targetId);
  const sourceCustomer = customers.find((c) => c.id === sourceId);

  const targetParcels = parcels.filter((p) => p.customer_id === targetId);
  const sourceParcels = parcels.filter((p) => p.customer_id === sourceId);

  const targetWeight = targetParcels.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
  const sourceWeight = sourceParcels.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
  const combinedLots = targetParcels.length + sourceParcels.length;
  const combinedWeight = targetWeight + sourceWeight;

  const handleMerge = async () => {
    if (!sourceId || !targetId) {
      setError('Please select both a source customer and a target customer.');
      return;
    }
    if (sourceId === targetId) {
      setError('Cannot merge a customer into itself. Please choose two distinct customers.');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to merge "${sourceCustomer?.name}" into "${targetCustomer?.name}"? All ${sourceParcels.length} parcels (${sourceWeight.toFixed(2)} kg) will be reassigned, and "${sourceCustomer?.name}" will be deleted.`
      )
    ) {
      return;
    }

    setIsMerging(true);
    setError(null);
    try {
      const userId = user?.id || crypto.randomUUID();
      await repository.mergeCustomers(sourceId, targetId, userId);
      onMerged();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to merge customers';
      setError(msg);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1]">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                {strings.admin.mergeCustomersTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {strings.admin.mergeCustomersSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          {/* Target Customer Selection (Keep) */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              {strings.admin.targetCustomerLabel}
            </label>
            <div className="relative">
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB] cursor-pointer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) {c.phone ? `• ${c.phone}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {targetCustomer && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>
                  <strong>Keep:</strong> {targetCustomer.name} ({targetCustomer.code})
                </span>
                <span className="font-bold">{targetParcels.length} lots ({targetWeight.toFixed(2)} kg)</span>
              </div>
            )}
          </div>

          {/* Source Customer Selection (Delete / Merge Into Target) */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              {strings.admin.sourceCustomerLabel}
            </label>
            <div className="relative">
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB] cursor-pointer"
              >
                <option value="">-- Select duplicate customer to merge --</option>
                {customers
                  .filter((c) => c.id !== targetId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) {c.phone ? `• ${c.phone}` : ''}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {sourceCustomer && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>
                  <strong>Merge & Delete:</strong> {sourceCustomer.name} ({sourceCustomer.code})
                </span>
                <span className="font-bold">{sourceParcels.length} lots ({sourceWeight.toFixed(2)} kg) to transfer</span>
              </div>
            )}
          </div>

          {/* Combined Preview Result */}
          {targetCustomer && sourceCustomer && (
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-[11px] text-blue-900 dark:text-blue-300 flex items-center justify-between font-semibold">
              <span>Combined Total Preview:</span>
              <span className="font-extrabold text-[#1E75BB] dark:text-[#2D8AD1]">
                {combinedLots} lots ({combinedWeight.toFixed(2)} kg)
              </span>
            </div>
          )}

          {/* Warning notice */}
          <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <p className="text-[11px] font-medium leading-relaxed">
              {strings.admin.mergeWarning}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold min-h-[40px]"
          >
            {strings.common.cancel}
          </button>
          <button
            type="button"
            onClick={handleMerge}
            disabled={isMerging || !sourceId || !targetId || sourceId === targetId}
            className="px-4 py-2 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs min-h-[40px] disabled:opacity-50"
          >
            {isMerging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <GitMerge className="w-4 h-4" />
            )}
            <span>{strings.admin.mergeConfirmButton}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
