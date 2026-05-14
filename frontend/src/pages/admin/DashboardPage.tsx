import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/reports.api';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { formatVES } from '../../utils/currency';

function formatDashboardValue(value: number | null | undefined): number | string {
  const normalized = Number(value ?? 0);
  return normalized === 0 ? '0.00' : normalized;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (user?.condominium_id) {
      dashboardApi.getAdminSummary(user.condominium_id)
        .then(r => setSummary(r.data))
        .catch(() => {});
    }
  }, [user]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel Administrador</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Unidades Habitacionales"
          value={formatDashboardValue(summary?.total_units)}
        />
        <StatCard
          label="Cuotas Activas"
          value={formatDashboardValue(summary?.active_fees)}
          colorClass="text-blue-600"
        />
        <StatCard
          label="Recaudado este Mes"
          value={formatVES(Number(summary?.month_collected_ves ?? 0))}
          colorClass="text-green-600"
        />
        <StatCard
          label="Pagos este Mes"
          value={formatDashboardValue(summary?.month_payment_count)}
          colorClass="text-purple-600"
        />
      </div>
    </div>
  );
}
