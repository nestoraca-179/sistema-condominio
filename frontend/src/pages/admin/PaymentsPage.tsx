import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { paymentsApi } from '../../api/payments.api';
import { buildingsApi } from '../../api/buildings.api';
import { feesApi } from '../../api/fees.api';
import { exchangeRatesApi } from '../../api/exchangeRates.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatVES, formatUSD } from '../../utils/currency';
import type { Payment, Unit, Fee, ExchangeRate } from '../../types';

export function PaymentsPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const { register, handleSubmit, reset, watch } = useForm<any>({
    defaultValues: { currency: 'VES' },
  });
  const currency = watch('currency');
  const amount = watch('amount_original');

  const previewVes = () => {
    if (!amount) return '—';
    const rate = exchangeRate?.rate || 1;
    return currency === 'USD' ? formatVES(parseFloat(amount) * rate) : formatVES(parseFloat(amount));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, u, f, er] = await Promise.all([
        paymentsApi.getAll(condominiumId),
        buildingsApi.getUnits(condominiumId),
        feesApi.getAll(condominiumId, true),
        exchangeRatesApi.getLatest().catch(() => null),
      ]);
      setPayments(p.data);
      setUnits(u.data);
      setFees(f.data);
      if (er) setExchangeRate(er.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const onSubmit = async (data: any) => {
    try {
      await paymentsApi.create({
        ...data,
        amount_original: parseFloat(data.amount_original),
        exchange_rate: exchangeRate?.rate || 1,
      });
      toast.success('Pago registrado exitosamente');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const columns = [
    {
      key: 'unit', label: 'Unidad',
      render: (p: Payment) => `${p.unit?.unit_number || '—'} — ${p.unit?.owner?.full_name || ''}`,
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos (CU-08)</h1>
          {exchangeRate && <p className="text-sm text-gray-500 mt-1">Tasa: 1 USD = {formatVES(exchangeRate.rate)}</p>}
        </div>
        <button onClick={() => { reset({ currency: 'VES' }); setShowModal(true); }} className="btn-primary">
          + Registrar Pago
        </button>
      </div>
      <div className="card">
        <DataTable data={payments} columns={columns} loading={loading} />
      </div>

      <Modal isOpen={showModal} title="Registrar Pago (CU-08)" onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Unidad</label>
            <select {...register('unit_id')} className="input" required>
              <option value="">Seleccionar unidad...</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.unit_number} — {u.owner?.full_name || 'Sin propietario'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cuota (opcional)</label>
            <select {...register('fee_id')} className="input">
              <option value="">Pago general / abono</option>
              {fees.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Moneda</label>
              <select {...register('currency')} className="input">
                <option value="VES">Bs. (VES)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div>
              <label className="label">Monto ({currency})</label>
              <input {...register('amount_original')} type="number" step="0.01" className="input" required />
            </div>
          </div>
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
            Equivalente en Bs.: <strong>{previewVes()}</strong>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Pago</label>
              <input {...register('payment_date')} type="date" className="input" required />
            </div>
            <div>
              <label className="label">N° Comprobante</label>
              <input {...register('reference')} className="input" placeholder="0001-2026" />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea {...register('notes')} className="input" rows={2} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Registrar Pago</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
