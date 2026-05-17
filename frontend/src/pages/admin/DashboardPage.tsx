import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/reports.api';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { formatVES } from '../../utils/currency';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface AdminSummary {
  total_units: number;
  active_fees: number;
  month_collected_ves: number;
  month_payment_count: number;
}

interface AdminDashboardResponse {
  summary: AdminSummary;
  charts: {
    occupancy: Array<{ name: string; value: number }>;
    fee_status: Array<{ name: string; activas: number; inactivas: number }>;
    payment_flow: Array<{ month: string; aprobados: number; pendientes: number; rechazados: number }>;
    delinquency_by_building: Array<{ name: string; pendientes: number; mora: number }>;
  };
}

const OCCUPANCY_COLORS = ['#2563eb', '#cbd5e1'];

function formatDashboardValue(value: number | null | undefined): number | string {
  const normalized = Number(value ?? 0);
  return normalized === 0 ? '0.00' : normalized;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.condominium_id) {
      setLoading(true);
      dashboardApi.getAdminDashboard(user.condominium_id)
        .then(r => setDashboardData(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, [user]);

  const summary = dashboardData?.summary;
  const charts = dashboardData?.charts;

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel Administrador</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          label="Unidades Habitacionales"
          value={formatDashboardValue(summary?.total_units)}
          loading={loading}
        />
        <StatCard
          label="Cuotas Activas"
          value={formatDashboardValue(summary?.active_fees)}
          colorClass="text-blue-600"
          loading={loading}
        />
        <StatCard
          label="Recaudado este Mes"
          value={formatVES(Number(summary?.month_collected_ves ?? 0))}
          colorClass="text-green-600"
          loading={loading}
        />
        <StatCard
          label="Pagos este Mes"
          value={formatDashboardValue(summary?.month_payment_count)}
          colorClass="text-purple-600"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Ocupación de unidades</h2>
            <span className="badge-blue">Pie</span>
          </div>
          {renderChartBody(
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={charts?.occupancy || []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {(charts?.occupancy || []).map((entry, index) => (
                    <Cell key={entry.name} fill={OCCUPANCY_COLORS[index % OCCUPANCY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatDashboardValue(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>,
            !charts?.occupancy?.length,
          )}
        </div>

        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Cuotas por tipo y estado</h2>
            <span className="badge-yellow">Barras</span>
          </div>
          {renderChartBody(
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts?.fee_status || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatDashboardValue(value)} />
                <Legend />
                <Bar dataKey="activas" stackId="fees" fill="#2563eb" radius={[4, 4, 0, 0]} name="Activas" />
                <Bar dataKey="inactivas" stackId="fees" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Inactivas" />
              </BarChart>
            </ResponsiveContainer>,
            !charts?.fee_status?.length,
          )}
        </div>

        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Flujo operativo de pagos</h2>
            <span className="badge-green">Área</span>
          </div>
          {renderChartBody(
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts?.payment_flow || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatDashboardValue(value)} />
                <Legend />
                <Area type="monotone" dataKey="aprobados" stackId="payments" stroke="#16a34a" fill="#86efac" name="Aprobados" />
                <Area type="monotone" dataKey="pendientes" stackId="payments" stroke="#f59e0b" fill="#fde68a" name="Pendientes" />
                <Area type="monotone" dataKey="rechazados" stackId="payments" stroke="#dc2626" fill="#fca5a5" name="Rechazados" />
              </AreaChart>
            </ResponsiveContainer>,
            !charts?.payment_flow?.length,
          )}
        </div>

        <div className="card min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Morosidad por edificio</h2>
            <span className="badge-red">Radar</span>
          </div>
          {renderChartBody(
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={charts?.delinquency_by_building || []} outerRadius="72%">
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatVES(Number(value))} />
                <Legend />
                <Radar name="Pendiente" dataKey="pendientes" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.35} />
                <Radar name="En mora" dataKey="mora" stroke="#dc2626" fill="#f87171" fillOpacity={0.45} />
              </RadarChart>
            </ResponsiveContainer>,
            !charts?.delinquency_by_building?.length,
          )}
        </div>
      </div>
    </div>
  );
}
