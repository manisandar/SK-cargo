import React, { useState } from 'react';
import { Customer } from '../types';
import { strings } from '../strings';
import { X, Search, Phone, MapPin } from 'lucide-react';

interface CustomerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
}

export const CustomerPickerModal: React.FC<CustomerPickerModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSelectCustomer,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-[390px] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom duration-200 text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {strings.receive.savedCustomersTitle}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {customers.length} registered customers
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={strings.receive.searchCustomersPlaceholder}
              autoFocus
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-900 min-h-[44px]"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No customers found matching &quot;{search}&quot;
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelectCustomer(c);
                  onClose();
                }}
                className="w-full text-left pt-2.5 pb-2 px-2 hover:bg-blue-50/60 dark:hover:bg-slate-800/80 rounded-xl transition-colors flex items-center justify-between min-h-[44px]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {c.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-[#1E75BB] text-white">
                      {c.code}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {c.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">{strings.receive.noPhone}</span>
                    )}
                    {c.address && (
                      <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

