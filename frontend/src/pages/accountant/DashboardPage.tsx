import React, { useEffect, useState } from 'react';
import { dashboardApi, reportsApi } from '../../api/reports.api';
import { exchangeRatesApi } from '../../api/exchangeRates.api';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { formatVES } from '../../utils/currency';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function formatDashboardValue(value: number | null | undefined): number | string {
  const normalized = Number(value ?? 0);
  return normalized === 0 ? '0.00' : normalized;
}

export function AccountantDashboard() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [summary, setSummary] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!condominiumId) {
      setLoading(false);
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    setLoading(true);
    Promise.all([
      dashboardApi.getAdminSummary(condominiumId).catch(() => null),
      exchangeRatesApi.getLatest().catch(() => null),
      reportsApi.getGlobalStatement(condominiumId, year).catch(() => null),
    ]).then(([s, er, gs]) => {
      if (s) setSummary(s.data);
      if (er) setLatest(er.data);
      if (gs) {
        const data = (gs.data || []).slice(0, 10).map((item: any) => ({
          unit: item.unit_number,
          total: Number(item.total_ves),
        }));
        setChartData(data);
      }
    }).finally(() => setLoading(false));
  }, [condominiumId]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel Contador</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <StatCard label="Recaudado este Mes (Bs.)" value={formatVES(Number(summary?.month_collected_ves ?? 0))} colorClass="text-green-600" loading={loading} />
        <StatCard label="Tasa Actual (Bs./USD)" value={formatVES(Number(latest?.rate ?? 0))} colorClass="text-blue-600" subtitle={latest?.effective_date} loading={loading} />
        <StatCard label="Pagos este Mes" value={formatDashboardValue(summary?.month_payment_count)} loading={loading} />
      </div>
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Top 10 Unidades — Recaudado (año en curso)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="unit" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatVES(v)} />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
