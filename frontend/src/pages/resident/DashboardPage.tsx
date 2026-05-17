import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/reports.api';
import { buildingsApi } from '../../api/buildings.api';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { formatUSD, formatVES } from '../../utils/currency';
import type { Debt, Payment, Unit } from '../../types';

const DEBT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagada',
  waived: 'Condonada',
};

function isApprovedPayment(payment: Payment) {
  return payment.status === 'approved' && !payment.is_voided;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOutstandingAmount(debt: Pick<Debt, 'original_amount_ves' | 'late_fee_ves' | 'paid_amount_ves'>) {
  return Math.max(
    Number(debt.original_amount_ves) + Number(debt.late_fee_ves) - Number(debt.paid_amount_ves),
    0,
  );
}

export function ResidentDashboard() {
  const { user } = useAuth();
  const [statement, setStatement] = useState<any>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const today = getTodayDateString();

  useEffect(() => {
    if (!user) {
      setLoadingUnits(false);
      return;
    }

    setLoadingUnits(true);
    buildingsApi.getMyUnits()
      .then(r => {
        setUnits(r.data);
        setSelectedUnitId(current => current || r.data[0]?.id || '');
      })
      .catch(() => {})
      .finally(() => setLoadingUnits(false));
  }, [user]);

  useEffect(() => {
    if (!selectedUnitId) {
      setStatement(null);
      setLoadingStatement(false);
      return;
    }

    setLoadingStatement(true);
    dashboardApi.getMyStatement(selectedUnitId)
      .then(r => setStatement(r.data))
      .catch(() => {})
      .finally(() => setLoadingStatement(false));
  }, [selectedUnitId]);

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
        return <span className={map[d.status] || 'badge-blue'}>{DEBT_STATUS_LABELS[d.status] || d.status}</span>;
      },
    },
  ];

  const paymentColumns = [
    { key: 'fee', label: 'Cuota', render: (p: Payment) => p.fee?.name || 'Pago general' },
    { key: 'payment_date', label: 'Fecha' },
    { key: 'amount_ves', label: 'Monto Bs.', render: (p: Payment) => formatVES(p.amount_ves) },
    { key: 'amount_usd', label: 'Monto $', render: (p: Payment) => p.amount_usd !== null && p.amount_usd !== undefined ? formatUSD(Number(p.amount_usd)) : '—' },
    { key: 'reference', label: 'Comprobante' },
  ];

  const outstandingDebts = (statement?.debts || []).filter((debt: Debt) => getOutstandingAmount(debt) > 0.01);
  const overdueDebts = outstandingDebts.filter((debt: Debt) => debt.due_date < today);
  const currentDebts = outstandingDebts.filter((debt: Debt) => debt.due_date >= today);
  const sortedPayments = [...(statement?.payments || [])].sort((left: Payment, right: Payment) => {
    const leftTime = new Date(left.created_at || left.payment_date).getTime();
    const rightTime = new Date(right.created_at || right.payment_date).getTime();
    return rightTime - leftTime;
  });
  const validPayments = (statement?.payments || []).filter((payment: Payment) => isApprovedPayment(payment));
  const totalPaidVes = validPayments.reduce(
    (sum: number, payment: Payment) => sum + Number(payment.amount_ves || 0),
    0,
  );
  const totalPaidUsd = validPayments.reduce(
    (sum: number, payment: Payment) => sum + Number(payment.amount_usd || 0),
    0,
  );
  const pendingTotalVes = Number(statement?.pending_total_ves ?? statement?.summary?.total_pending_ves ?? 0);
  const pendingTotalUsd = Number(statement?.pending_total_usd ?? statement?.summary?.total_pending_usd ?? 0);

  if (!loadingUnits && units.length === 0) {
    return (
      <div className="card text-center py-10 text-gray-500">
        Su cuenta no tiene unidades habitacionales asociadas. Contáctese con la administración.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Estado de Cuenta (CU-14)</h1>
      {loadingUnits && <div className="text-gray-400 text-center py-10">Cargando...</div>}
      {!loadingUnits && units.length > 0 && (
        <div className="card mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-top sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-700">Unidades Asociadas</h2>
              <p className="text-sm text-gray-500 mt-1">Seleccione la unidad que desea consultar.</p>
            </div>
            <div className="sm:w-72">
              <label className="label">Unidad</label>
              <select
                className="input"
                value={selectedUnitId}
                onChange={event => setSelectedUnitId(event.target.value)}
              >
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number}
                    {unit.building?.name ? ` - ${unit.building.name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {units.map(unit => (
              <button
                key={unit.id}
                type="button"
                onClick={() => setSelectedUnitId(unit.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  unit.id === selectedUnitId
                    ? 'border-primary-600 bg-primary-50 text-primary-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {unit.unit_number}
                {unit.building?.name ? ` · ${unit.building.name}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
      {!loadingUnits && units.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-6 mb-6">
            <StatCard
              label="Saldo Pendiente (Bs.)"
              value={formatVES(pendingTotalVes)}
              colorClass={pendingTotalVes > 0 ? 'text-red-600' : 'text-green-600'}
              loading={loadingStatement}
            />
            <StatCard
              label="Saldo Pendiente ($)"
              value={formatUSD(pendingTotalUsd)}
              colorClass={pendingTotalUsd > 0 ? 'text-amber-600' : 'text-blue-600'}
              loading={loadingStatement}
            />
            <StatCard
              label="Deudas Pendientes"
              value={Number(statement?.summary?.current_items ?? currentDebts.length)}
              colorClass={pendingTotalVes > 0 ? 'text-red-600' : 'text-green-600'}
              loading={loadingStatement}
            />
            <StatCard
              label="Cuotas en Mora"
              value={Number(statement?.summary?.overdue_items ?? overdueDebts.length)}
              colorClass={(Number(statement?.summary?.overdue_items ?? overdueDebts.length) > 0) ? 'text-amber-600' : 'text-blue-600'}
              loading={loadingStatement}
            />
            <StatCard
              label="Total Pagado (Bs.)"
              value={formatVES(Number(statement?.total_paid_ves ?? statement?.summary?.total_paid_ves ?? totalPaidVes))}
              colorClass="text-green-600"
              loading={loadingStatement}
            />
            <StatCard
              label="Total Pagado ($)"
              value={formatUSD(Number(statement?.total_paid_usd ?? statement?.summary?.total_paid_usd ?? totalPaidUsd))}
              colorClass="text-blue-600"
              loading={loadingStatement}
            />
          </div>

          {!loadingStatement && statement && pendingTotalVes > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 font-medium">Tiene deudas pendientes por {formatVES(pendingTotalVes)}. Por favor acérquese a la administración.</p>
            </div>
          )}

          {!loadingStatement && statement && (
            <>
              <div className="card mb-6">
                <h2 className="font-semibold text-gray-700 mb-3">Cuotas Pendientes</h2>
                <DataTable data={outstandingDebts} columns={debtColumns} />
              </div>
              <div className="card">
                <h2 className="font-semibold text-gray-700 mb-3">Historial de Pagos</h2>
                <DataTable data={sortedPayments} columns={paymentColumns} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
