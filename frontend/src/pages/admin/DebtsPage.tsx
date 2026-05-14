import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { debtsApi } from '../../api/debts.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { formatVES } from '../../utils/currency';
import type { Debt } from '../../types';

export function DebtsPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiveTarget, setWaiveTarget] = useState<Debt | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await debtsApi.getAll(condominiumId, 'pending');
      setDebts(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const handleWaive = async () => {
    if (!waiveTarget) return;
    try {
      await debtsApi.waive(waiveTarget.id);
      toast.success('Mora exonerada');
      setWaiveTarget(null);
      load();
    } catch { toast.error('Error al exonerar'); }
  };

  const statusLabels: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'badge-red' },
    partial: { label: 'Parcial', cls: 'badge-yellow' },
    paid: { label: 'Pagado', cls: 'badge-green' },
    waived: { label: 'Exonerado', cls: 'badge-blue' },
  };

  const columns = [
    {
      key: 'unit', label: 'Unidad',
      render: (d: Debt) => d.unit?.unit_number || '—',
    },
    {
      key: 'owner', label: 'Propietario',
      render: (d: Debt) => d.unit?.owner?.full_name || '—',
    },
    {
      key: 'fee', label: 'Cuota',
      render: (d: Debt) => d.fee?.name || '—',
    },
    { key: 'due_date', label: 'Vencimiento' },
    {
      key: 'original_amount_ves', label: 'Monto Original',
      render: (d: Debt) => formatVES(d.original_amount_ves),
    },
    {
      key: 'late_fee_ves', label: 'Mora',
      render: (d: Debt) => formatVES(d.late_fee_ves),
    },
    {
      key: 'total', label: 'Total',
      render: (d: Debt) => formatVES(Number(d.original_amount_ves) + Number(d.late_fee_ves) - Number(d.paid_amount_ves)),
    },
    {
      key: 'status', label: 'Estado',
      render: (d: Debt) => {
        const s = statusLabels[d.status] || { label: d.status, cls: 'badge-blue' };
        return <span className={s.cls}>{s.label}</span>;
      },
    },
    {
      key: 'actions', label: 'Acciones', sortable: false,
      render: (d: Debt) => (
        <button onClick={() => setWaiveTarget(d)} className="btn-secondary text-xs py-1">Exonerar mora</button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Deudas y Moras (CU-09)</h1>
      <div className="card">
        <DataTable data={debts} columns={columns} loading={loading} emptyMessage="No hay deudas pendientes" />
      </div>

      <ConfirmModal
        isOpen={!!waiveTarget}
        title="Exonerar Mora"
        message={`¿Exonerar la mora de la unidad "${waiveTarget?.unit?.unit_number}"?`}
        confirmLabel="Exonerar"
        onConfirm={handleWaive}
        onCancel={() => setWaiveTarget(null)}
      />
    </div>
  );
}
