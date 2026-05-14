import React, { useEffect, useState } from 'react';
import { reportsApi } from '../../api/reports.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { formatVES } from '../../utils/currency';

export function GlobalStatementPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | ''>('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getGlobalStatement(condominiumId, year, month || undefined);
      setData(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const totalVes = data.reduce((acc, r) => acc + Number(r.total_ves || 0), 0);

  const columns = [
    { key: 'unit_number', label: 'Unidad' },
    { key: 'owner_name', label: 'Propietario' },
    {
      key: 'total_ves', label: 'Total Bs.',
      render: (r: any) => formatVES(r.total_ves),
    },
    { key: 'payment_count', label: 'N° Pagos' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Estado de Cuenta Global (CU-13)</h1>
      <div className="card mb-6">
        <div className="flex items-end gap-4">
          <div>
            <label className="label">Año</label>
            <input type="number" min="2020" max="2099" className="input w-28" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Mes (opcional)</label>
            <select className="input" value={month} onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos los meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <button onClick={load} disabled={loading} className="btn-primary">
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="mb-6">
          <StatCard label="Total General Recaudado (Bs.)" value={formatVES(totalVes)} colorClass="text-green-600" />
        </div>
      )}

      <div className="card">
        <DataTable data={data} columns={columns} loading={loading} />
      </div>
    </div>
  );
}
