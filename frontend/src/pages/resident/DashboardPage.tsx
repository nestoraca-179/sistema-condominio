import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/reports.api';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { formatVES } from '../../utils/currency';
import type { Debt, Payment } from '../../types';

export function ResidentDashboard() {
  const { user } = useAuth();
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.unit_id) {
      dashboardApi.getMyStatement(user.unit_id)
        .then(r => setStatement(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const debtColumns = [
    { key: 'fee', label: 'Cuota', render: (d: Debt) => d.fee?.name || '—' },
    { key: 'due_date', label: 'Vencimiento' },
    {
      key: 'total', label: 'Pendiente Bs.',
      render: (d: Debt) => formatVES(Number(d.original_amount_ves) + Number(d.late_fee_ves) - Number(d.paid_amount_ves)),
    },
    {
      key: 'status', label: 'Estado',
      render: (d: Debt) => {
        const map: Record<string, string> = { pending: 'badge-red', partial: 'badge-yellow', paid: 'badge-green', waived: 'badge-blue' };
        return <span className={map[d.status] || 'badge-blue'}>{d.status}</span>;
      },
    },
  ];

  const paymentColumns = [
    { key: 'fee', label: 'Cuota', render: (p: Payment) => p.fee?.name || 'Pago general' },
    { key: 'payment_date', label: 'Fecha' },
    { key: 'amount_ves', label: 'Monto Bs.', render: (p: Payment) => formatVES(p.amount_ves) },
    { key: 'reference', label: 'Comprobante' },
  ];

  if (!user?.unit_id && !loading) {
    return (
      <div className="card text-center py-10 text-gray-500">
        Su cuenta no tiene una unidad habitacional asignada. Contáctese con la administración.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Estado de Cuenta (CU-14)</h1>
      {loading && <div className="text-gray-400 text-center py-10">Cargando...</div>}
      {!loading && statement && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <StatCard
              label="Saldo Pendiente (Bs.)"
              value={formatVES(statement.pending_total_ves || 0)}
              colorClass={statement.pending_total_ves > 0 ? 'text-red-600' : 'text-green-600'}
            />
            <StatCard label="Deudas Pendientes" value={statement.debts?.filter((d: Debt) => d.status !== 'paid').length ?? 0} />
            <StatCard label="Total Pagado (Bs.)" value={formatVES(statement.total_paid_ves || 0)} colorClass="text-green-600" />
          </div>

          {statement.pending_total_ves > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 font-medium">Tiene deudas pendientes por {formatVES(statement.pending_total_ves)}. Por favor acérquese a la administración.</p>
            </div>
          )}

          <div className="card mb-6">
            <h2 className="font-semibold text-gray-700 mb-3">Cuotas Pendientes</h2>
            <DataTable data={statement.debts?.filter((d: Debt) => d.status !== 'paid') || []} columns={debtColumns} />
          </div>
          <div className="card">
            <h2 className="font-semibold text-gray-700 mb-3">Historial de Pagos</h2>
            <DataTable data={statement.payments || []} columns={paymentColumns} />
          </div>
        </>
      )}
    </div>
  );
}
