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
} from 'lucide-react';

export const AdminDashboardScreen: React.FC = () => {
  const repository = useRepository();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [customFrom, setCustomFrom] = useState<string>(getTodayIsoDate());
  const [customTo, setCustomTo] = useState<string>(getTodayIsoDate());
  const [customerSort, setCustomerSort] = useState<'weight' | 'shipments'>('weight');

  const [kpis, setKpis] = useState<AdminKPIData | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* Top Header & Period Dropdown Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-[#1E75BB] dark:text-[#2D8AD1] shrink-0" />
            <h2 className="text-lg sm:text-xl font-black text-[#1E75BB] dark:text-[#2D8AD1] tracking-tight">
              {strings.admin.dashboardTitle}
            </h2>
            {/* Refresh Icon right beside Warehouse KPI */}
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

        {/* Date Range Dropdown for compact mobile view */}
        <div className="shrink-0">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB] shadow-2xs cursor-pointer min-h-[34px]"
          >
            <option value="today">{strings.admin.kpiPeriodToday}</option>
            <option value="week">{strings.admin.kpiPeriodWeek}</option>
            <option value="month">{strings.admin.kpiPeriodMonth}</option>
            <option value="all">{strings.admin.kpiPeriodAll}</option>
            <option value="custom">{strings.admin.kpiPeriodCustom}</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range Picker: Compact "Date - Date" without from/to labels */}
      {period === 'custom' && (
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-2xs text-xs justify-end w-fit ml-auto animate-in fade-in">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB]"
          />
          <span className="text-slate-400 font-bold px-0.5">-</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#1E75BB]"
          />
        </div>
      )}

      {loading && !kpis ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-[#1E75BB]" />
          <span>Loading performance metrics...</span>
        </div>
      ) : (
        <>
          {/* 5 Main KPI Metric Cards (Compact Design) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {/* 1. Dynamic Intake Title */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide truncate">
                  {getIntakeCardTitle()}
                </span>
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] shrink-0">
                  <PackagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                  {kpis?.intakePieces || 0} <span className="text-xs font-bold text-slate-500">pcs</span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 flex items-center justify-between">
                  <span>{(kpis?.intakeWeightKg || 0).toFixed(1)} kg</span>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                    {kpis?.intakeCount || 0} lots
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Warehouse Stock (Stored) */}
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
                  <span>{(kpis?.storedWeightKg || 0).toFixed(1)} kg</span>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                    {kpis?.storedParcelsCount || 0} lots
                  </span>
                </div>
              </div>
            </div>

            {/* 3. In Transit */}
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
                  <span>{(kpis?.inTransitWeightKg || 0).toFixed(1)} kg</span>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                    {kpis?.inTransitBoxesCount || 0} boxes
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Delivered */}
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
                  <span>{(kpis?.deliveredWeightKg || 0).toFixed(1)} kg</span>
                  <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded">
                    {kpis?.deliveredParcelsCount || 0} lots
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Returned */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-xs space-y-1 sm:space-y-1.5 col-span-2 sm:col-span-1">
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
                  <span>{(kpis?.returnedWeightKg || 0).toFixed(1)} kg</span>
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
                            {(c.total_weight_kg || 0).toFixed(1)} kg
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
                            {cust.totalWeightKg.toFixed(1)} kg
                          </div>
                        ) : (
                          <div className="font-extrabold text-xs text-[#1E75BB] dark:text-[#2D8AD1]">
                            {cust.parcelsCount} <span className="text-[10px] text-slate-500">lots</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-medium">
                          {customerSort === 'weight' ? `${cust.parcelsCount} lots` : `${cust.totalWeightKg.toFixed(1)} kg`}
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
