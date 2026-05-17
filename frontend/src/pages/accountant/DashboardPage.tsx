import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/reports.api';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { formatUSD, formatVES } from '../../utils/currency';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AccountantSummary {
  month_collected_ves: number;
  month_payment_count: number;
}

interface AccountantDashboardResponse {
  summary: AccountantSummary;
  latest_exchange_rate: { rate: number; effective_date: string } | null;
  charts: {
    collection_trend: Array<{ month: string; ves: number; usd: number }>;
    top_units: Array<{ unit: string; total: number }>;
    accounts_receivable_aging: Array<{ name: string; amount: number }>;
    exchange_rate_trend: Array<{ date: string; rate: number }>;
  };
}

const AGING_COLORS = ['#16a34a', '#f59e0b', '#f97316', '#dc2626'];

function formatDashboardValue(value: number | null | undefined): number | string {
  const normalized = Number(value ?? 0);
  return normalized === 0 ? '0.00' : normalized;
}

export function AccountantDashboard() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [dashboardData, setDashboardData] = useState<AccountantDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!condominiumId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    dashboardApi.getAccountantDashboard(condominiumId)
      .then(r => setDashboardData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [condominiumId]);

  const summary = dashboardData?.summary;
  const latest = dashboardData?.latest_exchange_rate;
  const charts = dashboardData?.charts;
  const totalReceivable = (charts?.accounts_receivable_aging || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const renderChartBody = (content: React.ReactNode, isEmpty = false) => {
    if (loading) {
      return <div className="h-[260px] flex items-center justify-center text-gray-400">Cargando gráfico...</div>;
    }

    if (isEmpty) {
      return <div className="h-[260px] flex items-center justify-center text-gray-400">No hay información disponible.</div>;
    }

    return content;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel Contador</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <StatCard label="Recaudado este Mes (Bs.)" value={formatVES(Number(summary?.month_collected_ves ?? 0))} colorClass="text-green-600" loading={loading} />
        <StatCard label="Tasa Actual (Bs./USD)" value={formatVES(Number(latest?.rate ?? 0))} colorClass="text-blue-600" subtitle={latest?.effective_date} loading={loading} />
        <StatCard label="Pagos este Mes" value={formatDashboardValue(summary?.month_payment_count)} loading={loading} />
        <StatCard label="Cuentas por Cobrar (Bs.)" value={formatVES(totalReceivable)} colorClass="text-amber-600" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Recaudación mensual del año</h2>
            <span className="badge-green">Área</span>
          </div>
          {renderChartBody(
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts?.collection_trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="ves" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="usd" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => (
                    name === 'USD' ? formatUSD(Number(value)) : formatVES(Number(value))
                  )}
                />
                <Legend />
                <Area yAxisId="ves" type="monotone" dataKey="ves" stroke="#2563eb" fill="#93c5fd" name="VES" />
                <Area yAxisId="usd" type="monotone" dataKey="usd" stroke="#16a34a" fill="#86efac" name="USD" />
              </AreaChart>
            </ResponsiveContainer>,
            !charts?.collection_trend?.length,
          )}
        </div>

        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Histórico de tasa de cambio</h2>
            <span className="badge-blue">Línea</span>
          </div>
          {renderChartBody(
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={charts?.exchange_rate_trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatVES(Number(value))} />
                <Line type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} name="Tasa" />
              </LineChart>
            </ResponsiveContainer>,
            !charts?.exchange_rate_trend?.length,
          )}
        </div>

        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Top unidades recaudadas</h2>
            <span className="badge-yellow">Barras</span>
          </div>
          {renderChartBody(
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts?.top_units || []} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="unit" type="category" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatVES(Number(value))} />
                <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} name="Recaudado" />
              </BarChart>
            </ResponsiveContainer>,
            !charts?.top_units?.length,
          )}
        </div>

        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Antigüedad de cuentas por cobrar</h2>
            <span className="badge-red">Pie</span>
          </div>
          {renderChartBody(
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={charts?.accounts_receivable_aging || []}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {(charts?.accounts_receivable_aging || []).map((entry, index) => (
                    <Cell key={entry.name} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatVES(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>,
            !charts?.accounts_receivable_aging?.length,
          )}
        </div>
      </div>
    </div>
  );
}
