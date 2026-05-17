import React, { useEffect, useMemo, useState } from 'react';
import { reportsApi } from '../../api/reports.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { formatVES, formatUSD } from '../../utils/currency';

const MONTH_LABELS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface GlobalStatementRow {
  id: string;
  owner_name?: string;
  structure_label?: string;
  unit?: {
    id: string;
    unit_number: string;
    building?: {
      id: string;
      name: string;
      parent?: {
        id: string;
        name: string;
        parent?: {
          id: string;
          name: string;
        };
      };
    };
    owner?: {
      full_name: string;
    };
  };
  total_ves: number;
  total_usd: number;
  payments: Array<{ id: string }>;
}

interface GlobalStatementResponse {
  year?: number;
  month?: number;
  by_unit?: GlobalStatementRow[];
  grand_total_ves?: number;
  grand_total_usd?: number;
}

export function GlobalStatementPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | ''>('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [structureFilter, setStructureFilter] = useState('');
  const [data, setData] = useState<GlobalStatementRow[]>([]);
  const [grandTotalVes, setGrandTotalVes] = useState(0);
  const [grandTotalUsd, setGrandTotalUsd] = useState(0);
  const [loading, setLoading] = useState(false);

  const clearFilters = () => {
    setOwnerFilter('');
    setStructureFilter('');
  };

  const getStructureLabel = (row: GlobalStatementRow) => {
    const building = row.unit?.building;
    if (!building) return '—';

    const parts = [
      building.parent?.parent?.name,
      building.parent?.name,
      building.name,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' / ') : '—';
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getGlobalStatement(condominiumId, year, month || undefined);
      const payload = (res.data || {}) as GlobalStatementResponse;
      const rows = Array.isArray(payload.by_unit)
        ? payload.by_unit.map((row, index) => ({
            ...row,
            id: row.unit?.id || `${row.unit?.unit_number || 'unit'}-${index}`,
            owner_name: row.unit?.owner?.full_name || 'Sin asignar',
            structure_label: getStructureLabel(row),
          })).sort((left, right) =>
            (left.unit?.unit_number || '').localeCompare(right.unit?.unit_number || '', 'es', { numeric: true, sensitivity: 'base' }),
          )
        : [];

      setData(rows);
      setGrandTotalVes(Number(payload.grand_total_ves || 0));
      setGrandTotalUsd(Number(payload.grand_total_usd || 0));
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const ownerOptions = useMemo(
    () => Array.from(new Set(data.map(row => row.owner_name || 'Sin asignar'))).sort((left, right) =>
      left.localeCompare(right, 'es', { sensitivity: 'base' })),
    [data],
  );

  const structureOptions = useMemo(
    () => Array.from(new Set(data.map(row => row.structure_label || '—'))).sort((left, right) =>
      left.localeCompare(right, 'es', { sensitivity: 'base' })),
    [data],
  );

  const filteredData = useMemo(() => data.filter(row => {
    const matchesOwner = !ownerFilter || (row.owner_name || 'Sin asignar') === ownerFilter;
    const matchesStructure = !structureFilter || (row.structure_label || '—') === structureFilter;
    return matchesOwner && matchesStructure;
  }), [data, ownerFilter, structureFilter]);

  const filteredGrandTotalVes = useMemo(
    () => filteredData.reduce((sum, row) => sum + Number(row.total_ves || 0), 0),
    [filteredData],
  );

  const filteredGrandTotalUsd = useMemo(
    () => filteredData.reduce((sum, row) => sum + Number(row.total_usd || 0), 0),
    [filteredData],
  );

  const columns = [
    {
      key: 'unit_number', label: 'Unidad',
      render: (r: GlobalStatementRow) => r.unit?.unit_number || '—',
    },
    {
      key: 'owner_name', label: 'Propietario',
      render: (r: GlobalStatementRow) => r.owner_name || 'Sin asignar',
    },
    {
      key: 'structure_label', label: 'Sector / Torre / Edificio',
      render: (r: GlobalStatementRow) => r.structure_label || '—',
    },
    {
      key: 'total_ves', label: 'Total Bs.',
      render: (r: GlobalStatementRow) => formatVES(r.total_ves),
    },
    {
      key: 'total_usd', label: 'Total USD',
      render: (r: GlobalStatementRow) => formatUSD(r.total_usd),
    },
    {
      key: 'payment_count', label: 'N° Pagos',
      render: (r: GlobalStatementRow) => r.payments?.length || 0,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Estado de Cuenta Global (CU-13)</h1>
      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="label">Año</label>
            <input type="number" min="2020" max="2099" className="input w-28" value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Mes (opcional)</label>
            <select className="input" value={month} onChange={e => setMonth(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos los meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{MONTH_LABELS[m - 1]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Propietario</label>
            <select className="input min-w-[220px]" value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
              <option value="">Todos los propietarios</option>
              {ownerOptions.map(owner => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Sector / Torre / Edificio</label>
            <select className="input min-w-[240px]" value={structureFilter} onChange={e => setStructureFilter(e.target.value)}>
              <option value="">Todas las estructuras</option>
              {structureOptions.map(structure => (
                <option key={structure} value={structure}>{structure}</option>
              ))}
            </select>
          </div>
          <button onClick={load} disabled={loading} className="btn-primary">
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button type="button" onClick={clearFilters} className="btn-secondary">
            Limpiar filtros
          </button>
        </div>
      </div>

      {filteredData.length > 0 && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <StatCard label="Total General Recaudado (Bs.)" value={formatVES(filteredGrandTotalVes)} colorClass="text-green-600" />
          <StatCard label="Total General Recaudado (USD)" value={formatUSD(filteredGrandTotalUsd)} colorClass="text-emerald-600" />
        </div>
      )}

      <div className="card">
        <DataTable data={filteredData} columns={columns} loading={loading} />
      </div>
    </div>
  );
}
