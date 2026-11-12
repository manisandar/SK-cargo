import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRepository, EnrichedStatusHistory, StaffUser } from '../../data';
import { strings } from '../../strings';
import {
  FileText,
  Search,
  RefreshCw,
  Loader2,
  Package,
  Boxes,
  Truck,
  Users,
  Download,
  X,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';

export const AuditLogsScreen: React.FC = () => {
  const repository = useRepository();

  const [logs, setLogs] = useState<EnrichedStatusHistory[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyData, usersData] = await Promise.all([
        repository.getAllStatusHistory({
          staffId: selectedStaffId !== 'all' ? selectedStaffId : undefined,
          entityType: selectedEntityType !== 'all' ? selectedEntityType : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: 300,
        }),
        repository.getStaffUsers(),
      ]);
      setLogs(historyData);
      setStaffUsers(usersData);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [repository, selectedStaffId, selectedEntityType, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side text search across entity label, staff name, note
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const labelMatch = (log.entity_label || '').toLowerCase().includes(q);
      const noteMatch = (log.note || '').toLowerCase().includes(q);
      const staffMatch = (log.changed_by_name || '').toLowerCase().includes(q);
      const statusMatch = `${log.from_status || ''} ${log.to_status}`.toLowerCase().includes(q);
      return labelMatch || noteMatch || staffMatch || statusMatch;
    });
  }, [logs, searchQuery]);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Staff Member', 'Entity Type', 'Entity Label', 'From Status', 'To Status', 'Note'];
    const rows = filteredLogs.map((l) => [
      `"${l.changed_at}"`,
      `"${l.changed_by_name}"`,
      `"${l.entity_type}"`,
      `"${l.entity_label || l.entity_id}"`,
      `"${l.from_status || 'Initial'}"`,
      `"${l.to_status}"`,
      `"${(l.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sk_cargo_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'parcel':
        return <Package className="w-3.5 h-3.5 text-blue-500" />;
      case 'box':
        return <Boxes className="w-3.5 h-3.5 text-indigo-500" />;
      case 'courier':
        return <Truck className="w-3.5 h-3.5 text-amber-500" />;
      case 'customer':
        return <Users className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  // Format timestamp as MM/DD/YY, h:mmA (e.g., 11/11/26, 10:50PM)
  const formatAuditTimestamp = (dateStr: string): string => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year}, ${hours}:${minutes}${ampm}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#1E75BB] dark:text-[#2D8AD1] tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#1E75BB] dark:text-[#2D8AD1]" />
            <span>{strings.admin.auditLogsTitle}</span>
          </h2>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {strings.admin.auditLogsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[34px]"
          >
            <Download className="w-3.5 h-3.5 text-[#1E75BB] dark:text-[#2D8AD1]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={loadData}
            title="Refresh logs"
            className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-[#1E75BB] dark:hover:text-slate-200 shadow-xs transition-colors shrink-0 min-h-[34px]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Staff Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              {strings.admin.filterStaff}
            </label>
            <div className="relative">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E75BB] focus:ring-1 focus:ring-[#1E75BB] cursor-pointer"
              >
                <option value="all">{strings.admin.allStaff}</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Entity Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              {strings.admin.filterEntity}
            </label>
            <div className="relative">
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E75BB] focus:ring-1 focus:ring-[#1E75BB] cursor-pointer"
              >
                <option value="all">{strings.admin.allEntities}</option>
                <option value="parcel">{strings.admin.entityParcel}</option>
                <option value="box">{strings.admin.entityBox}</option>
                <option value="courier">{strings.admin.entityCourier}</option>
                <option value="customer">{strings.admin.entityCustomer}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              {strings.admin.filterDateFrom}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              {strings.admin.filterDateTo}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Search Bar within Logs */}
        <div className="relative pt-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search within logs by code, staff name, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
      </div>

      {/* Logs Table / Cards */}
      {loading ? (
        <div className="p-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#1E75BB]" />
          <span>Loading activity stream...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            No activity logs found for the selected filters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Action / Status</th>
                  <th className="px-4 py-3">Notes & Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredLogs.map((log) => {
                  const dateStr = formatAuditTimestamp(log.changed_at);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {log.changed_by_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold font-mono">
                          {getEntityIcon(log.entity_type)}
                          <span>{log.entity_label || log.entity_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {log.from_status && (
                            <>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                                {log.from_status}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              log.to_status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : log.to_status === 'in_transit'
                                ? 'bg-blue-100 text-[#1E75BB] dark:bg-blue-950/60 dark:text-blue-300'
                                : log.to_status === 'to_be_returned'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : log.to_status === 'returned'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {log.to_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-xs truncate">
                        {log.note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map((log) => {
              const dateStr = formatAuditTimestamp(log.changed_at);
              return (
                <div key={log.id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold font-mono text-slate-800 dark:text-slate-200">
                      {getEntityIcon(log.entity_type)}
                      <span>{log.entity_label || log.entity_id}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    {log.from_status && (
                      <>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                          {log.from_status}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                      </>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.to_status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : log.to_status === 'in_transit'
                          ? 'bg-blue-100 text-[#1E75BB] dark:bg-blue-950/60 dark:text-blue-300'
                          : log.to_status === 'to_be_returned'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : log.to_status === 'returned'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {log.to_status}
                    </span>
                    <span className="text-slate-400 text-[10px] ml-auto font-medium">
                      by {log.changed_by_name}
                    </span>
                  </div>

                  {log.note && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      "{log.note}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
