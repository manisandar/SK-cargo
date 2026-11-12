import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRepository, AdminKPIData } from '../../data';
import { strings } from '../../strings';
import { getTodayIsoDate } from '../../utils/date';
import {
  LayoutDashboard,
  PackagePlus,
  Warehouse,
  Truck,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Loader2,
  Users,
  ChevronRight,
  Download,
} from 'lucide-react';

export const AdminDashboardScreen: React.FC = () => {
  const repository = useRepository();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customFrom, setCustomFrom] = useState<string>(getTodayIsoDate());
  const [customTo, setCustomTo] = useState<string>(getTodayIsoDate());
  const [customerSort, setCustomerSort] = useState<'weight' | 'shipments'>('weight');
  const [graphMetric, setGraphMetric] = useState<'weight' | 'shipments' | 'pieces'>('weight');
  const [activeDateTooltip, setActiveDateTooltip] = useState<string | null>(null);

  const [kpis, setKpis] = useState<AdminKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const calculateDateRange = useCallback(() => {
    const today = getTodayIsoDate();
    if (period === 'today') {
      return { from: today, to: today };
    }
    if (period === 'week') {
      const now = new Date();
      const day = now.getDay() || 7;
      now.setDate(now.getDate() - day + 1);
      const from = now.toISOString().split('T')[0];
      return { from, to: today };
    }
    if (period === 'month') {
      const now = new Date();
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to: today };
    }
    if (period === 'custom') {
      return { from: customFrom || today, to: customTo || today };
    }
    return undefined; // All time
  }, [period, customFrom, customTo]);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const range = calculateDateRange();
      const data = await repository.getAdminKPIs(range);
      setKpis(data);
    } catch (err) {
      console.error('Failed to load KPIs:', err);
    } finally {
      setLoading(false);
    }
  }, [repository, calculateDateRange]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Dynamic intake title based on period
  const getIntakeCardTitle = () => {
    switch (period) {
      case 'today':
        return strings.admin.kpiIntakeToday;
      case 'week':
        return strings.admin.kpiIntakeWeek;
      case 'month':
        return strings.admin.kpiIntakeMonth;
      case 'all':
        return strings.admin.kpiIntakeAll;
      case 'custom':
        return strings.admin.kpiIntakeCustom;
    }
  };

  // Top Customers dynamically sorted by Weight or Shipments
  const sortedTopCustomers = useMemo(() => {
    if (!kpis?.topCustomers) return [];
    const list = [...kpis.topCustomers];
    if (customerSort === 'shipments') {
      return list
        .sort((a, b) => b.parcelsCount - a.parcelsCount || b.totalWeightKg - a.totalWeightKg)
        .slice(0, 5);
    }
    return list
      .sort((a, b) => b.totalWeightKg - a.totalWeightKg || b.parcelsCount - a.parcelsCount)
      .slice(0, 5);
  }, [kpis?.topCustomers, customerSort]);

  // Export Unified Operations & Audit CSV in decreasing date order
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const range = calculateDateRange();

      const [allParcels, allBoxes, allCouriers, staffUsers, auditHistory] = await Promise.all([
        repository.getParcels(),
        repository.getBoxes(),
        repository.getCouriers(),
        repository.getStaffUsers(),
        repository.getAllStatusHistory({
          dateFrom: range?.from,
          dateTo: range?.to,
          limit: 5000,
        }),
      ]);

      const staffMap = new Map<string, string>(
        staffUsers.map((u) => [u.id, `${u.name} (${u.role})`])
      );

      interface ExportRow {
        timestamp: string;
        date: string;
        recordType: string;
        refCode: string;
        customerOrDestination: string;
        recipient: string;
        statusOrAction: string;
        qtyPcs: number | string;
        weightKg: number | string;
        dimensionsInches: string;
        details: string;
        performedBy: string;
        notes: string;
      }

      const rows: ExportRow[] = [];

      // 1. Parcels within date range
      for (const p of allParcels) {
        const pDate = (p.received_at || '').split('T')[0];
        if (range?.from && pDate < range.from) continue;
        if (range?.to && pDate > range.to) continue;

        const customerInfo = p.customer ? `${p.customer.name} (${p.customer.code})` : 'Unknown';
        const recipients = Array.from(
          new Set((p.items || []).map((it) => it.name_on_parcel).filter(Boolean))
        ).join('; ');
        const dims = (p.items || [])
          .filter((it) => it.length_cm > 0)
          .map((it) => `${it.length_cm}x${it.width_cm}x${it.height_cm} in`)
          .join('; ');
        const itemContents = (p.items || [])
          .map((it) => `${it.qty}x ${it.item_name || it.name_on_parcel}`)
          .join('; ');

        rows.push({
          timestamp: p.received_at || p.created_at || `${pDate}T00:00:00`,
          date: pDate,
          recordType: 'PARCEL',
          refCode: p.parcel_code,
          customerOrDestination: customerInfo,
          recipient: recipients || '-',
          statusOrAction: p.status,
          qtyPcs: p.total_qty,
          weightKg: p.total_weight_kg.toFixed(2),
          dimensionsInches: dims || '-',
          details: itemContents || '-',
          performedBy: staffMap.get(p.created_by) || 'Staff',
          notes: (p as any).notes || '-',
        });
      }

      // 2. Repacking Boxes within date range
      for (const b of allBoxes) {
        const bTimestamp = b.created_at || '';
        const bDate = bTimestamp.split('T')[0];
        if (range?.from && bDate < range.from) continue;
        if (range?.to && bDate > range.to) continue;

        const boxContents = `${b.parcels_count || b.items.length} lots packed (${b.total_pieces} pcs)`;

        rows.push({
          timestamp: bTimestamp || `${bDate}T00:00:00`,
          date: bDate,
          recordType: 'REPACK_BOX',
          refCode: b.box_code,
          customerOrDestination: 'Warehouse Repacked Box',
          recipient: '-',
          statusOrAction: b.status,
          qtyPcs: b.total_pieces,
          weightKg: (b.total_weight_kg || 0).toFixed(2),
          dimensionsInches: '-',
          details: boxContents,
          performedBy: staffMap.get(b.created_by) || 'Staff',
          notes: '-',
        });
      }

      // 3. Couriers within date range
      for (const c of allCouriers) {
        const cTimestamp = c.dispatch_date ? `${c.dispatch_date}T00:00:00` : c.created_at || '';
        const cDate = (c.dispatch_date || c.created_at || '').split('T')[0];
        if (range?.from && cDate < range.from) continue;
        if (range?.to && cDate > range.to) continue;

        const courierDetails = `${c.boxes.length} boxes, ${c.loose_items.length} loose items`;

        rows.push({
          timestamp: cTimestamp || `${cDate}T00:00:00`,
          date: cDate,
          recordType: 'COURIER_TRUCK',
          refCode: c.courier_code,
          customerOrDestination: `Truck: ${c.truck_no}`,
          recipient: '-',
          statusOrAction: c.status,
          qtyPcs: c.total_pieces_count,
          weightKg: (c.total_weight_kg || 0).toFixed(2),
          dimensionsInches: '-',
          details: courierDetails,
          performedBy: staffMap.get(c.created_by) || 'Staff',
          notes: '-',
        });
      }

      // 4. System Audit Logs within date range
      for (const h of auditHistory) {
        const hTimestamp = h.changed_at;
        const hDate = (hTimestamp || '').split('T')[0];

        rows.push({
          timestamp: hTimestamp,
          date: hDate,
          recordType: 'AUDIT_LOG',
          refCode: h.entity_label || h.entity_id,
          customerOrDestination: `Entity: ${h.entity_type.toUpperCase()}`,
          recipient: '-',
          statusOrAction: `${h.from_status || 'initial'} -> ${h.to_status}`,
          qtyPcs: '-',
          weightKg: '-',
          dimensionsInches: '-',
          details: `Status Change (${h.entity_type})`,
          performedBy: h.changed_by_name || 'Staff',
          notes: h.note || '-',
        });
      }

      // Strict decreasing order of date / timestamp (latest first)
      rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      // Build CSV content
      const headers = [
        'Timestamp',
        'Date',
        'Record_Type',
        'Reference_Code',
        'Customer_Or_Destination',
        'Recipient',
        'Status_Or_Action',
        'Pieces_Count',
        'Weight_Kg',
        'Dimensions_Inches',
        'Details_Contents',
        'Performed_By',
        'Notes',
      ];

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const csvLines = [
        headers.join(','),
        ...rows.map((r) =>
          [
            escapeCSV(r.timestamp),
            escapeCSV(r.date),
            escapeCSV(r.recordType),
            escapeCSV(r.refCode),
            escapeCSV(r.customerOrDestination),
            escapeCSV(r.recipient),
            escapeCSV(r.statusOrAction),
            escapeCSV(r.qtyPcs),
            escapeCSV(r.weightKg),
            escapeCSV(r.dimensionsInches),
            escapeCSV(r.details),
            escapeCSV(r.performedBy),
            escapeCSV(r.notes),
          ].join(',')
        ),
      ];

      // Prepend UTF-8 BOM so Microsoft Excel renders accented and special characters correctly
      const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filenameDate = range?.from ? `${range.from}_to_${range.to || range.from}` : 'all_time';
      link.href = url;
      link.setAttribute('download', `sk_cargo_operations_${filenameDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to generate CSV export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* Top Header with Refresh Icon and Export CSV Button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-[#1E75BB] dark:text-[#2D8AD1] shrink-0" />
            <h2 className="text-lg sm:text-xl font-black text-[#1E75BB] dark:text-[#2D8AD1] tracking-tight">
              {strings.admin.dashboardTitle}
            </h2>
            <button
              onClick={loadMetrics}
              title="Refresh metrics immediately"
              className="p-1 sm:p-1.5 text-slate-400 hover:text-[#1E75BB] dark:hover:text-[#2D8AD1] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1E75BB]' : ''}`} />
            </button>
          </div>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
            {strings.admin.dashboardSubtitle}
          </p>
        </div>

        {/* Top Header Actions: Export CSV Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-3 py-1.5 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 min-h-[34px] cursor-pointer disabled:opacity-50"
            title="Export all operations, parcels, repacking, couriers, and audit logs for the selected date range"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading && !kpis ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#1E75BB]" />
          <span>Loading performance metrics...</span>
        </div>
      ) : (
        <>
          {/* Exactly 4 Main KPI Metric Cards (Clean 4-col desktop, 2x2 mobile) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* 1. Warehouse Stock (Stored) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide truncate">
                  {strings.admin.kpiStoredTitle}
                </span>
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Warehouse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                  {kpis?.storedPieces || 0} <span className="text-xs font-bold text-slate-500">pcs</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{(kpis?.storedWeightKg || 0).toFixed(2)} kg</span>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                    {kpis?.storedParcelsCount || 0} lots
                  </span>
                </div>
              </div>
            </div>

            {/* 2. In Transit */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide truncate">
                  {strings.admin.kpiInTransitTitle}
                </span>
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-[#ED7D24] dark:text-amber-400 shrink-0">
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                  {kpis?.activeTrucksCount || 0} <span className="text-xs font-bold text-slate-500">trucks</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{(kpis?.inTransitWeightKg || 0).toFixed(2)} kg</span>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                    {kpis?.inTransitBoxesCount || 0} boxes
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Delivered */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate">
                  {strings.admin.kpiDeliveredTitle}
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                  {kpis?.deliveredPieces || 0} <span className="text-xs font-bold text-slate-500">pcs</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{(kpis?.deliveredWeightKg || 0).toFixed(2)} kg</span>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                    {kpis?.deliveredParcelsCount || 0} lots
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Returned */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide truncate">
                  {strings.admin.kpiReturnedTitle}
                </span>
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                  {kpis?.returnedPieces || 0} <span className="text-xs font-bold text-slate-500">pcs</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{(kpis?.returnedWeightKg || 0).toFixed(2)} kg</span>
                  {(kpis?.toBeReturnedCount || 0) > 0 ? (
                    <span className="font-mono text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold px-1 py-0.2 rounded">
                      {kpis?.toBeReturnedCount} to return
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                      {kpis?.returnedCount || 0} returned
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Graph Box with Intake Summary, Date Dropdown, and Weight/Shipment Trends */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs space-y-3">
            {/* Graph Box Header: Dynamic Intake Title, Stats Pills, Date Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] shrink-0">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                    {getIntakeCardTitle()}
                  </h3>

                  {/* Summary Intake Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1E75BB] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 text-[11px] font-black">
                      {kpis?.intakePieces || 0} pcs
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                      {(kpis?.intakeWeightKg || 0).toFixed(2)} kg
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold">
                      {kpis?.intakeCount || 0} shipments
                    </span>
                  </div>
                </div>
              </div>

              {/* Date Filter & Metric Toggle Controls */}
              <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end">
                {/* Graph Metric Toggle: Weight vs Shipments vs Pieces */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setGraphMetric('weight')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      graphMetric === 'weight'
                        ? 'bg-white dark:bg-slate-900 text-[#1E75BB] dark:text-[#2D8AD1] shadow-2xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Weight (kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphMetric('shipments')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      graphMetric === 'shipments'
                        ? 'bg-white dark:bg-slate-900 text-[#1E75BB] dark:text-[#2D8AD1] shadow-2xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Shipments
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphMetric('pieces')}
                    className={`px-2 py-1 rounded-md transition-all ${
                      graphMetric === 'pieces'
                        ? 'bg-white dark:bg-slate-900 text-[#1E75BB] dark:text-[#2D8AD1] shadow-2xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Pieces
                  </button>
                </div>

                {/* Period Dropdown inside Graph Box */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB] shadow-2xs cursor-pointer min-h-[30px]"
                  >
                    <option value="today">{strings.admin.kpiPeriodToday}</option>
                    <option value="week">{strings.admin.kpiPeriodWeek}</option>
                    <option value="month">{strings.admin.kpiPeriodMonth}</option>
                    <option value="all">{strings.admin.kpiPeriodAll}</option>
                    <option value="custom">{strings.admin.kpiPeriodCustom}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Range compact pickers: "[date] - [date]" if period === 'custom' */}
            {period === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs justify-end w-fit ml-auto animate-in fade-in">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB]"
                />
                <span className="text-slate-400 font-bold px-0.5">-</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB]"
                />
              </div>
            )}

            {/* The Visual Trend Chart */}
            <div className="pt-2">
              {!kpis?.dailyTrends || kpis.dailyTrends.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <span>No cargo intake recorded for this period</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="h-44 sm:h-48 w-full flex items-end justify-start gap-2 sm:gap-3 px-2 pt-6 pb-2 overflow-x-auto scrollbar-thin">
                    {(() => {
                      const maxVal = Math.max(
                        ...kpis.dailyTrends.map((t) =>
                          graphMetric === 'weight'
                            ? t.weightKg
                            : graphMetric === 'shipments'
                            ? t.lotsCount
                            : t.pieces
                        ),
                        1
                      );

                      return kpis.dailyTrends.map((d) => {
                        const val =
                          graphMetric === 'weight'
                            ? d.weightKg
                            : graphMetric === 'shipments'
                            ? d.lotsCount
                            : d.pieces;
                        const heightPct = Math.max(Math.round((val / maxVal) * 100), 8);
                        const isHovered = activeDateTooltip === d.date;

                        return (
                          <div
                            key={d.date}
                            onMouseEnter={() => setActiveDateTooltip(d.date)}
                            onMouseLeave={() => setActiveDateTooltip(null)}
                            onClick={() => setActiveDateTooltip(activeDateTooltip === d.date ? null : d.date)}
                            className="flex-1 min-w-[46px] max-w-[80px] h-full flex flex-col justify-end items-center group cursor-pointer relative"
                          >
                            {/* Hover / Tap Tooltip */}
                            {isHovered && (
                              <div className="absolute -top-11 z-30 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 border border-slate-700 dark:border-slate-200">
                                <div>{d.displayDate} ({d.date})</div>
                                <div className="text-blue-300 dark:text-blue-600 font-extrabold">
                                  {d.weightKg.toFixed(2)} kg • {d.lotsCount} lots • {d.pieces} pcs
                                </div>
                              </div>
                            )}

                            {/* Value Above Bar */}
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 mb-1 group-hover:text-[#1E75BB] dark:group-hover:text-[#2D8AD1] transition-colors truncate">
                              {graphMetric === 'weight'
                                ? `${d.weightKg.toFixed(2)}`
                                : graphMetric === 'shipments'
                                ? `${d.lotsCount}`
                                : `${d.pieces}`}
                              <span className="text-[8px] font-normal text-slate-400 ml-0.5">
                                {graphMetric === 'weight' ? 'kg' : graphMetric === 'shipments' ? 'lots' : 'pcs'}
                              </span>
                            </span>

                            {/* The Bar */}
                            <div className="w-full h-full flex items-end">
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full rounded-t-lg transition-all duration-300 group-hover:brightness-110 shadow-xs ${
                                  graphMetric === 'weight'
                                    ? 'bg-gradient-to-t from-[#1E75BB] to-[#38A0EE]'
                                    : graphMetric === 'shipments'
                                    ? 'bg-gradient-to-t from-[#ED7D24] to-[#FBA861]'
                                    : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                                } ${isHovered ? 'ring-2 ring-[#1E75BB] ring-offset-1' : ''}`}
                              />
                            </div>

                            {/* Date Label Under Bar */}
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 truncate">
                              {d.displayDate}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2-Column Responsive Section: Active Couriers & Top Customers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Left: Active Courier Shipments (Compact Mobile Layout) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#ED7D24]" />
                  <span>{strings.admin.activeTrucksTitle}</span>
                </h3>
                <button
                  onClick={() => navigate('/couriers')}
                  className="text-xs font-bold text-[#1E75BB] dark:text-[#2D8AD1] hover:underline flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {!kpis?.activeCouriers || kpis.activeCouriers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {strings.admin.noActiveTrucks}
                </div>
              ) : (
                <div className="space-y-2">
                  {kpis.activeCouriers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate('/couriers')}
                      className="p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer transition-colors space-y-1.5"
                    >
                      {/* Top Row: Truck No & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white break-words">
                              Truck: {c.truck_no}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                              {c.courier_code}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            c.status === 'in_transit'
                              ? 'bg-blue-100 text-[#1E75BB] dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {c.status === 'in_transit' ? 'In Transit' : 'Loading'}
                        </span>
                      </div>

                      {/* Bottom Row: Cargo Summary Pills */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {c.boxes.length} boxes
                          </span>
                          <span>•</span>
                          <span>{c.total_pieces_count} pcs</span>
                          <span>•</span>
                          <span className="font-bold text-[#1E75BB] dark:text-[#2D8AD1]">
                            {(c.total_weight_kg || 0).toFixed(2)} kg
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Top 5 Customers with Weight / Shipments Filter */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#1E75BB] dark:text-[#2D8AD1]" />
                    <span>{strings.admin.topCustomersTitle}</span>
                  </h3>
                </div>

                {/* Filter Segment: By Weight vs By Shipments */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setCustomerSort('weight')}
                    className={`px-2 py-0.8 rounded-md transition-all ${
                      customerSort === 'weight'
                        ? 'bg-white dark:bg-slate-900 text-[#1E75BB] dark:text-[#2D8AD1] shadow-2xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {strings.admin.filterByWeight}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerSort('shipments')}
                    className={`px-2 py-0.8 rounded-md transition-all ${
                      customerSort === 'shipments'
                        ? 'bg-white dark:bg-slate-900 text-[#1E75BB] dark:text-[#2D8AD1] shadow-2xs font-extrabold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {strings.admin.filterByShipments}
                  </button>
                </div>
              </div>

              {!sortedTopCustomers || sortedTopCustomers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {strings.admin.noTopCustomers}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sortedTopCustomers.map((cust, idx) => (
                    <div
                      key={cust.id}
                      onClick={() => navigate('/customers')}
                      className="p-2 sm:p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 font-black text-[10px] text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {cust.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {cust.code} • {cust.parcelsCount} shipments ({cust.piecesCount} pcs)
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {customerSort === 'weight' ? (
                          <div className="font-extrabold text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
                            {cust.totalWeightKg.toFixed(2)} kg
                          </div>
                        ) : (
                          <div className="font-extrabold text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
                            {cust.parcelsCount} <span className="text-[10px] text-slate-500">lots</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-medium">
                          {customerSort === 'weight' ? `${cust.parcelsCount} lots` : `${cust.totalWeightKg.toFixed(2)} kg`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
