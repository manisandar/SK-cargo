import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRepository } from '../data';
import { Customer, ParcelWithDetails } from '../types';
import { strings } from '../strings';
import { formatLocalDate } from '../utils/date';
import { ParcelDetailModal } from '../components/ParcelDetailModal';
import { CustomerMergeModal } from '../components/CustomerMergeModal';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  X,
  ArrowLeft,
  Calendar,
  Package,
  Scale,
  ChevronRight,
  Users,
  Plus,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  FileText,
  Loader2,
  Check,
  GitMerge,
} from 'lucide-react';

export const CustomersScreen: React.FC = () => {
  const repository = useRepository();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parcels, setParcels] = useState<ParcelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSort, setCustomerSort] = useState<'shipments' | 'weight' | 'name'>('shipments');

  // Selected customer for Detail & History View
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Selected parcel lot for detail/edit modal
  const [selectedParcelId, setSelectedParcelId] = useState<string | null>(null);

  // Modals for Create & Edit Customer
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const { user } = useAuth();

  // Form State for Customer (Create / Edit)
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custData, parcelData] = await Promise.all([
        repository.getCustomers(),
        repository.getParcels(),
      ]);
      setCustomers(custData);
      setParcels(parcelData);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group parcels by customer_id, sorted by received_at descending (latest at top)
  const parcelsByCustomer = useMemo(() => {
    const map = new Map<string, ParcelWithDetails[]>();
    for (const p of parcels) {
      const list = map.get(p.customer_id) || [];
      list.push(p);
      map.set(p.customer_id, list);
    }
    for (const [custId, list] of map.entries()) {
      list.sort((a, b) => {
        const dateDiff = (b.received_at || '').localeCompare(a.received_at || '');
        if (dateDiff !== 0) return dateDiff;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
      map.set(custId, list);
    }
    return map;
  }, [parcels]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = customers.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    });

    return list.sort((a, b) => {
      const aParcels = parcelsByCustomer.get(a.id) || [];
      const bParcels = parcelsByCustomer.get(b.id) || [];
      const aShipments = aParcels.length;
      const bShipments = bParcels.length;
      const aWeight = aParcels.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
      const bWeight = bParcels.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);

      if (customerSort === 'shipments') {
        if (bShipments !== aShipments) return bShipments - aShipments;
        if (bWeight !== aWeight) return bWeight - aWeight;
        return a.name.localeCompare(b.name);
      }
      if (customerSort === 'weight') {
        if (bWeight !== aWeight) return bWeight - aWeight;
        if (bShipments !== aShipments) return bShipments - aShipments;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [customers, searchQuery, parcelsByCustomer, customerSort]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const selectedCustomerLogs = useMemo(() => {
    if (!selectedCustomerId) return [];
    return parcelsByCustomer.get(selectedCustomerId) || [];
  }, [parcelsByCustomer, selectedCustomerId]);

  const selectedParcel = useMemo(
    () => parcels.find((p) => p.id === selectedParcelId) || null,
    [parcels, selectedParcelId]
  );

  // Open Create Customer Modal
  const handleOpenCreateCustomer = () => {
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = (customer: Customer) => {
    setFormName(customer.name);
    setFormPhone(customer.phone || '');
    setFormAddress(customer.address || '');
    setFormNotes(customer.notes || '');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveCustomer = async (isEditing: boolean) => {
    const trimmedName = formName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Please enter a valid customer name (at least 2 characters).');
      return;
    }

    // Check for exact duplicate customer name (case-insensitive)
    const duplicate = customers.find(
      (c) =>
        c.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (!isEditing || c.id !== selectedCustomer?.id)
    );
    if (duplicate) {
      setFormError(`A customer named "${duplicate.name}" already exists (${duplicate.code}).`);
      return;
    }

    setIsSavingCustomer(true);
    setFormError(null);
    try {
      if (isEditing && selectedCustomer) {
        await repository.updateCustomer(selectedCustomer.id, {
          name: trimmedName,
          phone: formPhone.trim() || null,
          address: formAddress.trim() || null,
          notes: formNotes.trim() || null,
        });
        setIsEditModalOpen(false);
      } else {
        const created = await repository.createCustomer({
          name: trimmedName,
          phone: formPhone.trim() || null,
          address: formAddress.trim() || null,
          notes: formNotes.trim() || null,
        });
        setIsCreateModalOpen(false);
        setSelectedCustomerId(created.id);
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save customer';
      setFormError(msg);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const shipmentCount = (parcelsByCustomer.get(customerId) || []).length;
    if (shipmentCount > 0) {
      alert(strings.customers.cannotDeleteWithShipments);
      return;
    }
    if (!window.confirm(strings.customers.deleteCustomerConfirm)) return;

    try {
      await repository.deleteCustomer(customerId);
      setSelectedCustomerId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert('Could not delete customer.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {!selectedCustomer ? (
        <>
          {/* Header & Create Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1E75BB] dark:text-[#2D8AD1] tracking-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1E75BB] dark:text-[#2D8AD1]" />
                <span>{strings.customers.title}</span>
              </h2>
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {strings.customers.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {user?.role === 'admin' && customers.length > 1 && (
                <button
                  onClick={() => setIsMergeModalOpen(true)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 min-h-[38px]"
                >
                  <GitMerge className="w-4 h-4 text-[#1E75BB] dark:text-[#2D8AD1]" />
                  <span>{strings.admin.mergeCustomersButton}</span>
                </button>
              )}
              <button
                onClick={handleOpenCreateCustomer}
                className="px-3.5 py-2 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 min-h-[38px]"
              >
                <Plus className="w-4 h-4" />
                <span>{strings.customers.createNewCustomerButton}</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Sorting Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-2.5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={strings.customers.searchPlaceholder}
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

            {/* Sorting Segment: By Shipments | By Weight | Name */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setCustomerSort('shipments')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  customerSort === 'shipments'
                    ? 'bg-white dark:bg-slate-900 text-[#1E75BB] dark:text-[#2D8AD1] shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                By Shipments
              </button>
              <button
                type="button"
                onClick={() => setCustomerSort('weight')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  customerSort === 'weight'
                    ? 'bg-white dark:bg-slate-900 text-[#1E75BB] dark:text-[#2D8AD1] shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                By Weight
              </button>
              <button
                type="button"
                onClick={() => setCustomerSort('name')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  customerSort === 'name'
                    ? 'bg-white dark:bg-slate-900 text-[#1E75BB] dark:text-[#2D8AD1] shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Name
              </button>
            </div>
          </div>

          {/* Customer Directory List */}
          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400 text-xs font-semibold">
              {strings.common.loading}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {strings.customers.noCustomersFound}
              </p>
              <button
                onClick={handleOpenCreateCustomer}
                className="px-4 py-2 bg-[#1E75BB] text-white rounded-xl text-xs font-bold"
              >
                {strings.customers.createNewCustomerButton}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredCustomers.map((cust) => {
                const custParcels = parcelsByCustomer.get(cust.id) || [];
                const shipmentCount = custParcels.length;
                const totalWeight = custParcels.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0);
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#1E75BB] dark:hover:border-[#2D8AD1] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-2 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-[#1E75BB] dark:group-hover:text-[#2D8AD1] transition-colors truncate leading-snug">
                          {cust.name}
                        </h3>
                        <span className="shrink-0 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {cust.code}
                        </span>
                      </div>

                      {cust.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.phone}</span>
                        </div>
                      )}

                      {cust.address && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] border border-blue-200 dark:border-blue-900/50 text-[11px] font-extrabold">
                          {strings.customers.totalShipments(shipmentCount)}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                          {totalWeight.toFixed(2)} kg
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                        <span>Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Customer Profile & Shipment History View */
        <div className="space-y-4">
          {/* Header Bar with compact inline details under customer name */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors mt-0.5 shrink-0"
                title={strings.customers.backToList}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedCustomer.name}
                  </h2>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {selectedCustomer.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    • {strings.customers.totalShipments(selectedCustomerLogs.length)} • {selectedCustomerLogs.reduce((sum, p) => sum + (p.total_weight_kg || 0), 0).toFixed(2)} kg
                  </span>
                </div>

                {/* Compact details under customer name with small text to save vertical space */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                  {selectedCustomer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#1E75BB] dark:text-[#2D8AD1]" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedCustomer.phone}</span>
                    </span>
                  )}
                  {selectedCustomer.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#1E75BB] dark:text-[#2D8AD1]" />
                      <span>{selectedCustomer.address}</span>
                    </span>
                  )}
                  {selectedCustomer.notes && (
                    <span className="flex items-center gap-1 italic text-slate-600 dark:text-slate-300">
                      <FileText className="w-3 h-3 text-[#1E75BB] dark:text-[#2D8AD1]" />
                      <span>{selectedCustomer.notes}</span>
                    </span>
                  )}
                  {!selectedCustomer.phone && !selectedCustomer.address && !selectedCustomer.notes && (
                    <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">No contact details or notes recorded</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenEditCustomer(selectedCustomer)}
                className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#1E75BB] dark:text-[#2D8AD1] text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{strings.customers.editProfileButton}</span>
              </button>

              {selectedCustomerLogs.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                  className="px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{strings.customers.deleteCustomerButton}</span>
                </button>
              )}
            </div>
          </div>

          {/* Receive Logs sorted by latest date at the top (decreasing dates) */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
              Shipment History ({selectedCustomerLogs.length})
            </h3>

            {selectedCustomerLogs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-2">
                <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {strings.customers.noShipmentsForCustomer}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedCustomerLogs.map((log) => {
                  const receiveDate = formatLocalDate(log.received_at);
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedParcelId(log.id)}
                      className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#1E75BB] dark:hover:border-[#2D8AD1] hover:shadow-md transition-all cursor-pointer space-y-3 group"
                    >
                      {/* Log Top Row: Date, Parcel Lot ID, Total Packages & Total Weight */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1E75BB] text-white text-xs font-extrabold">
                            <Calendar className="w-3.5 h-3.5" />
                            {receiveDate}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            {log.parcel_code}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                            <Package className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1]" />
                            {log.total_qty || 0} {strings.common.pcs}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                            <Scale className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1]" />
                            {(log.total_weight_kg || 0).toFixed(2)} {strings.common.kg}
                          </span>
                        </div>
                      </div>

                      {/* Individual Parcels / Package Items inside this Receive Log */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {(log.items || []).map((item, idx) => {
                          const displayName =
                            item.item_name && item.item_name.trim().length > 0
                              ? item.item_name
                              : item.name_on_parcel;
                          const hasCustomRecipient =
                            item.name_on_parcel &&
                            item.name_on_parcel !== selectedCustomer.name &&
                            item.name_on_parcel !== displayName;

                          return (
                            <div
                              key={item.id || idx}
                              className="bg-slate-50 dark:bg-slate-800/80 rounded-lg px-3 py-2 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                                  {displayName}
                                </div>
                                {hasCustomRecipient && (
                                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                    {item.name_on_parcel}
                                  </div>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs font-black text-[#1F3A5F] dark:text-[#2D8AD1]">
                                  {item.qty} {strings.common.pcs}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  {(item.weight_kg || 0).toFixed(2)} {strings.common.kg}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Customer Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-[#1E75BB] dark:text-[#2D8AD1]">
                {isEditModalOpen
                  ? strings.customers.editModalTitle
                  : strings.customers.createModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.customers.nameLabel} *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={strings.customers.namePlaceholder}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#1E75BB]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.customers.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder={strings.customers.phonePlaceholder}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#1E75BB]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.customers.addressLabel}
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder={strings.customers.addressPlaceholder}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#1E75BB]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {strings.customers.notesLabel}
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder={strings.customers.notesPlaceholder}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#1E75BB]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                disabled={isSavingCustomer}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold min-h-[38px] transition-colors"
              >
                {strings.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleSaveCustomer(isEditModalOpen)}
                disabled={isSavingCustomer}
                className="px-4 py-2 bg-[#1E75BB] hover:bg-[#165B94] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs min-h-[38px] transition-colors"
              >
                {isSavingCustomer ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{strings.common.save}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail & Edit Pop-Up Modal when clicking a Receive Log */}
      {selectedParcel && (
        <ParcelDetailModal
          parcel={selectedParcel}
          onClose={() => setSelectedParcelId(null)}
          onUpdated={(fresh) => {
            if (!fresh) {
              setSelectedParcelId(null);
            }
            loadData();
          }}
        />
      )}

      {isMergeModalOpen && (
        <CustomerMergeModal
          customers={customers}
          parcels={parcels}
          initialTargetCustomerId={selectedCustomerId}
          onClose={() => setIsMergeModalOpen(false)}
          onMerged={async () => {
            await loadData();
          }}
        />
      )}
    </div>
  );
};

// Also export as LogsScreen for backward compatibility
export const LogsScreen = CustomersScreen;

