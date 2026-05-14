import React, { useState } from 'react';
import { reportsApi } from '../../api/reports.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { formatVES, formatUSD } from '../../utils/currency';
import type { Payment } from '../../types';

export function AdminReportsPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await reportsApi.getFinancialReport(condominiumId, startDate, endDate);
      setReport(res.data);
    } catch { } finally { setLoading(false); }
  };

  const columns = [
    {
      key: 'unit', label: 'Unidad',
      render: (p: Payment) => p.unit?.unit_number || '—',
    },
    {
      key: 'owner', label: 'Propietario',
      render: (p: Payment) => p.unit?.owner?.full_name || '—',
    },
    {
      key: 'fee', label: 'Cuota',
      render: (p: Payment) => p.fee?.name || 'Pago general',
    },
    {
      key: 'amount_original', label: 'Monto',
      render: (p: Payment) => p.currency === 'USD' ? formatUSD(p.amount_original) : formatVES(p.amount_original),
    },
    {
      key: 'amount_ves', label: 'En Bs.',
      render: (p: Payment) => formatVES(p.amount_ves),
    },
    { key: 'payment_date', label: 'Fecha' },
    { key: 'reference', label: 'Referencia' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reporte Financiero (CU-12)</h1>
      <div className="card mb-6">
        <div className="flex items-end gap-4">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button onClick={handleSearch} disabled={!startDate || !endDate || loading} className="btn-primary">
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <StatCard
              label="Total Recaudado (Bs.)"
              value={formatVES(report.summary?.total_ves || 0)}
              colorClass="text-green-600"
            />
            <StatCard
              label="Total en USD"
              value={formatUSD(report.summary?.total_usd || 0)}
              colorClass="text-blue-600"
            />
            <StatCard
              label="N° de Pagos"
              value={report.payments?.length || 0}
            />
          </div>
          <div className="card">
            <DataTable data={report.payments || []} columns={columns} />
          </div>
        </>
      )}
    </div>
  );
}
