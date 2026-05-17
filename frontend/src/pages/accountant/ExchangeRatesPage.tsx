import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { exchangeRatesApi } from '../../api/exchangeRates.api';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatVES } from '../../utils/currency';
import type { ExchangeRate } from '../../types';

interface ExchangeRateFormValues {
  rate: string;
  effective_date: string;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ExchangeRatesPage() {
  const [latest, setLatest] = useState<ExchangeRate | null>(null);
  const [history, setHistory] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const today = getTodayDateString();
  const defaultFormValues: ExchangeRateFormValues = { rate: '', effective_date: today };
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExchangeRateFormValues>({
    defaultValues: defaultFormValues,
  });

  const openModal = () => {
    reset(defaultFormValues);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    reset(defaultFormValues);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [l, h] = await Promise.all([exchangeRatesApi.getLatest(), exchangeRatesApi.getHistory()]);
      setLatest(l.data);
      setHistory(h.data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: ExchangeRateFormValues) => {
    const parsedRate = Number(data.rate);

    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      toast.error('La tasa debe ser un valor numerico mayor a 0');
      return;
    }

    if (data.effective_date > today) {
      toast.error('La fecha de la tasa no puede ser superior a la actual');
      return;
    }

    if (history.some(rate => rate.effective_date === data.effective_date)) {
      toast.error('Ya existe una tasa de cambio registrada para esa fecha');
      return;
    }

    setSaving(true);
    try {
      await exchangeRatesApi.create({ ...data, rate: parsedRate });
      toast.success('Tasa registrada');
      closeModal();
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
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
        <button onClick={openModal} className="btn-primary">+ Registrar Tasa</button>
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

      <Modal isOpen={showModal} title="Registrar Nueva Tasa" onClose={closeModal}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Tasa (Bs. por 1 USD) <span className="text-red-500">*</span></label>
            <input
              {...register('rate', {
                required: true,
                validate: value => Number(value) > 0,
              })}
              type="number"
              step="0.0001"
              min="0.0001"
              className="input"
              required
              placeholder="36.50"
            />
            {errors.rate && <p className="text-red-500 text-xs mt-1">La tasa debe ser un valor numérico mayor a 0</p>}
          </div>
          <div>
            <label className="label">Fecha Efectiva <span className="text-red-500">*</span></label>
            <input
              {...register('effective_date', {
                required: true,
                validate: value => {
                  if (value > today) return false;
                  return !history.some(rate => rate.effective_date === value);
                },
              })}
              type="date"
              max={today}
              className="input"
              required
            />
            {errors.effective_date?.type === 'required' && <p className="text-red-500 text-xs mt-1">La fecha efectiva es requerida</p>}
            {errors.effective_date?.type === 'validate' && <p className="text-red-500 text-xs mt-1">La fecha no puede ser futura ni repetida</p>}
          </div>
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {saving && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
