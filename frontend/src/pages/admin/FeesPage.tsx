import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { feesApi } from '../../api/fees.api';
import { exchangeRatesApi } from '../../api/exchangeRates.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { formatVES, formatUSD } from '../../utils/currency';
import type { Fee, ExchangeRate } from '../../types';

export function FeesPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [fees, setFees] = useState<Fee[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Fee | null>(null);

  const { register, handleSubmit, reset, watch } = useForm<any>({
    defaultValues: { currency: 'VES', type: 'ordinary' },
  });

  const currency = watch('currency');
  const amountOriginal = watch('amount_original');

  const load = async () => {
    setLoading(true);
    try {
      const [f, er] = await Promise.all([
        feesApi.getAll(condominiumId),
        exchangeRatesApi.getLatest().catch(() => null),
      ]);
      setFees(f.data);
      if (er) setExchangeRate(er.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const previewVes = () => {
    if (!amountOriginal) return '—';
    const rate = exchangeRate?.rate || 1;
    const amount = parseFloat(amountOriginal);
    return currency === 'USD'
      ? formatVES(amount * rate)
      : formatVES(amount);
  };

  const onSubmit = async (data: any) => {
    try {
      await feesApi.create({
        ...data,
        condominium_id: condominiumId,
        amount_original: parseFloat(data.amount_original),
        exchange_rate: exchangeRate?.rate || 1,
      });
      toast.success('Cuota creada');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await feesApi.deactivate(deactivateTarget.id);
      toast.success('Cuota desactivada');
      setDeactivateTarget(null);
      load();
    } catch { toast.error('Error'); }
  };

  const columns = [
    { key: 'name', label: 'Concepto' },
    {
      key: 'type', label: 'Tipo',
      render: (f: Fee) => <span className="badge-blue">{f.type === 'ordinary' ? 'Ordinaria' : 'Extraordinaria'}</span>,
    },
    {
      key: 'amount_original', label: 'Monto Original',
      render: (f: Fee) => f.currency === 'USD' ? formatUSD(f.amount_original) : formatVES(f.amount_original),
    },
    {
      key: 'amount_ves', label: 'En Bs.',
      render: (f: Fee) => formatVES(f.amount_ves),
    },
    { key: 'due_date', label: 'Vencimiento' },
    {
      key: 'is_active', label: 'Estado',
      render: (f: Fee) => <span className={f.is_active ? 'badge-green' : 'badge-red'}>{f.is_active ? 'Activa' : 'Inactiva'}</span>,
    },
    {
      key: 'actions', label: 'Acciones', sortable: false,
      render: (f: Fee) => f.is_active ? (
        <button onClick={() => setDeactivateTarget(f)} className="btn-danger text-xs py-1">Desactivar</button>
      ) : null,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuotas (CU-07)</h1>
          {exchangeRate && (
            <p className="text-sm text-gray-500 mt-1">
              Tasa actual: 1 USD = {formatVES(exchangeRate.rate)}
            </p>
          )}
        </div>
        <button onClick={() => { reset({ currency: 'VES', type: 'ordinary' }); setShowModal(true); }} className="btn-primary">
          + Nueva Cuota
        </button>
      </div>
      <div className="card">
        <DataTable data={fees} columns={columns} loading={loading} />
      </div>

      <Modal isOpen={showModal} title="Nueva Cuota" onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Concepto</label>
            <input {...register('name')} className="input" required placeholder="Mantenimiento Junio 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select {...register('type')} className="input">
                <option value="ordinary">Ordinaria</option>
                <option value="extraordinary">Extraordinaria</option>
              </select>
            </div>
            <div>
              <label className="label">Moneda</label>
              <select {...register('currency')} className="input">
                <option value="VES">Bs. (VES)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto ({currency})</label>
              <input {...register('amount_original')} type="number" step="0.01" className="input" required />
            </div>
            <div>
              <label className="label">Equivalente en Bs.</label>
              <div className="input bg-gray-50 text-gray-600">{previewVes()}</div>
            </div>
          </div>
          <div>
            <label className="label">Fecha de Vencimiento</label>
            <input {...register('due_date')} type="date" className="input" required />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Crear Cuota</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deactivateTarget}
        title="Desactivar Cuota"
        message={`¿Desactivar la cuota "${deactivateTarget?.name}"?`}
        confirmLabel="Desactivar"
        isDestructive
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
