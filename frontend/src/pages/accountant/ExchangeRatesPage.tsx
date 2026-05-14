import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { exchangeRatesApi } from '../../api/exchangeRates.api';
import { useAuth } from '../../contexts/AuthContext';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatVES } from '../../utils/currency';
import type { ExchangeRate } from '../../types';

export function ExchangeRatesPage() {
  const [latest, setLatest] = useState<ExchangeRate | null>(null);
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const { register, handleSubmit, reset } = useForm<any>();

  const load = async () => {
    setLoading(true);
    try {
      const [l, h] = await Promise.all([exchangeRatesApi.getLatest(), exchangeRatesApi.getHistory()]);
      setLatest(l.data);
      setHistory(h.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: any) => {
    try {
      await exchangeRatesApi.create({ ...data, rate: parseFloat(data.rate) });
      toast.success('Tasa registrada');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const columns = [
    {
      key: 'rate', label: 'Tasa (Bs./USD)',
      render: (r: ExchangeRate) => formatVES(r.rate),
    },
    { key: 'effective_date', label: 'Fecha Efectiva' },
    {
      key: 'registered_by_user', label: 'Registrado por',
      render: (r: ExchangeRate) => (r as any).registeredByUser?.full_name || '—',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tasa de Cambio (CU-16)</h1>
        <button onClick={() => { reset({}); setShowModal(true); }} className="btn-primary">+ Registrar Tasa</button>
      </div>

      {latest && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          <StatCard
            label="Tasa Actual (Bs./USD)"
            value={formatVES(latest.rate)}
            subtitle={`Vigente desde: ${latest.effective_date}`}
            colorClass="text-green-600"
          />
          <StatCard
            label="Última actualización"
            value={latest.effective_date}
          />
        </div>
      )}

      <div className="card">
        <DataTable data={history} columns={columns} loading={loading} />
      </div>

      <Modal isOpen={showModal} title="Registrar Nueva Tasa" onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Tasa (Bs. por 1 USD)</label>
            <input {...register('rate')} type="number" step="0.0001" className="input" required placeholder="36.50" />
          </div>
          <div>
            <label className="label">Fecha Efectiva</label>
            <input {...register('effective_date')} type="date" className="input" required />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
