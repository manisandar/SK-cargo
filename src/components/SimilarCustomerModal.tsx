import React from 'react';
import { Customer } from '../types';
import { strings } from '../strings';
import { AlertTriangle, Check, PlusCircle } from 'lucide-react';

interface SimilarCustomerModalProps {
  isOpen: boolean;
  typedName: string;
  similarCustomers: Customer[];
  onUseCustomer: (customer: Customer) => void;
  onCreateAnyway: (phone?: string) => void;
  onCancel: () => void;
}

export const SimilarCustomerModal: React.FC<SimilarCustomerModalProps> = ({
  isOpen,
  typedName,
  similarCustomers,
  onUseCustomer,
  onCreateAnyway,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-[370px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-amber-200 dark:border-amber-900/60 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100">
        {/* Amber Header */}
        <div className="bg-amber-500 text-white p-3.5 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold leading-tight">
              {strings.receive.similarCustomersTitle}
            </h3>
            <p className="text-[11px] text-amber-100 mt-0.5">
              Typed: &quot;<span className="font-bold underline">{typedName}</span>&quot;
            </p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {strings.receive.similarCustomersSubtitle}
          </p>

          {/* List of matching customers */}
          <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/60">
            {similarCustomers.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg flex items-center justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-100">{c.name}</span>
                    <span className="text-[10px] bg-[#1E75BB] text-white px-1.5 py-0.5 rounded font-mono font-bold">
                      {c.code}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onUseCustomer(c)}
                  className="bg-[#1E75BB] hover:bg-[#165B94] text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-xs min-h-[38px] transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{strings.receive.useThisCustomerButton}</span>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1.5 font-medium min-h-[38px] transition-colors"
            >
              {strings.common.cancel}
            </button>

            <button
              type="button"
              onClick={() => onCreateAnyway()}
              className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 min-h-[38px] transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span>{strings.receive.createNewAnywayButton}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
