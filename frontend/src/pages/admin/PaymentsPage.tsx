import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { paymentsApi } from '../../api/payments.api';
import { buildingsApi } from '../../api/buildings.api';
import { feesApi } from '../../api/fees.api';
import { exchangeRatesApi } from '../../api/exchangeRates.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { formatVES, formatUSD } from '../../utils/currency';
import type { Payment, Unit, Fee, ExchangeRate, Building } from '../../types';

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function getPaymentUsdAmount(payment: Payment) {
  if (payment.amount_usd !== null && payment.amount_usd !== undefined) {
    return Number(payment.amount_usd);
  }

  if (payment.currency === 'USD') {
    return Number(payment.amount_original);
  }

  const exchangeRate = Number(payment.exchange_rate || 0);
  if (exchangeRate <= 0) return null;
  return roundMoney(Number(payment.amount_ves) / exchangeRate);
}

export function PaymentsPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [latestRate, setLatestRate] = useState<ExchangeRate | null>(null);
  const [paymentDateRate, setPaymentDateRate] = useState<ExchangeRate | null>(null);
  const [rateWarning, setRateWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voiding, setVoiding] = useState(false);

  const today = getTodayDateString();

  const { register, handleSubmit, reset, watch, setValue } = useForm<any>({
    defaultValues: { currency: 'VES', payment_date: today },
  });
  const selectedUnitId = watch('unit_id');
  const selectedFeeId = watch('fee_id');
  const currency = watch('currency');
  const amount = watch('amount_original');
  const paymentDate = watch('payment_date');

  const selectedUnit = useMemo(
    () => units.find(unit => unit.id === selectedUnitId),
    [units, selectedUnitId],
  );

  const selectedFee = useMemo(
    () => fees.find(fee => fee.id === selectedFeeId),
    [fees, selectedFeeId],
  );

  const requiresExchangeRate = currency === 'USD' || selectedFee?.currency === 'USD';

  const getPaymentAmountInFeeCurrency = (payment: Payment, feeCurrency: Fee['currency']) => {
    if (feeCurrency === 'USD') {
      if (payment.amount_usd !== null && payment.amount_usd !== undefined) {
        return Number(payment.amount_usd);
      }

      if (payment.currency === 'USD') {
        return Number(payment.amount_original);
      }

      const exchangeRate = Number(payment.exchange_rate || 0);
      return exchangeRate > 0 ? roundMoney(Number(payment.amount_ves) / exchangeRate) : 0;
    }

    return Number(payment.amount_ves);
  };

  const getPaidAmountForFee = (fee: Fee, unitId: string) => {
    return payments
      .filter(payment => !payment.is_voided && payment.unit_id === unitId && payment.fee_id === fee.id)
      .reduce((sum, payment) => sum + getPaymentAmountInFeeCurrency(payment, fee.currency), 0);
  };

  const getRemainingAmountForFee = (fee: Fee, unitId: string) => {
    const total = fee.currency === 'USD' ? Number(fee.amount_original) : Number(fee.amount_ves);
    const paid = getPaidAmountForFee(fee, unitId);
    return roundMoney(Math.max(total - paid, 0));
  };

  const applicableBuildingIds = useMemo(() => {
    if (!selectedUnit) return new Set<string>();

    const ids = new Set<string>();
    let currentId: string | undefined = selectedUnit.building_id;

    while (currentId) {
      ids.add(currentId);
      const currentBuilding = buildings.find(building => building.id === currentId);
      currentId = currentBuilding?.parent_id ?? undefined;
    }

    return ids;
  }, [buildings, selectedUnit]);

  const availableFees = useMemo(() => {
    if (!selectedUnit) return [];

    return fees.filter(fee => {
      if (!fee.applies_to || fee.applies_to === 'condominium') return true;
      if (fee.applies_to === 'unit') return fee.target_unit_id === selectedUnit.id;
      if (fee.applies_to === 'building') return !!fee.target_building_id && applicableBuildingIds.has(fee.target_building_id);
      return false;
    }).filter(fee => getRemainingAmountForFee(fee, selectedUnit.id) > 0.01);
  }, [applicableBuildingIds, fees, selectedUnit, payments]);

  const selectedFeeRemaining = useMemo(() => {
    if (!selectedUnit || !selectedFee) return null;
    return getRemainingAmountForFee(selectedFee, selectedUnit.id);
  }, [selectedFee, selectedUnit, payments]);

  const remainingInSelectedCurrency = useMemo(() => {
    if (selectedFeeRemaining === null || selectedFeeRemaining === undefined || !selectedFee) return null;
    if (selectedFee.currency === currency) return selectedFeeRemaining;
    if (!paymentDateRate || Number(paymentDateRate.rate) <= 0) return null;

    return currency === 'USD'
      ? roundMoney(selectedFeeRemaining / Number(paymentDateRate.rate))
      : roundMoney(selectedFeeRemaining * Number(paymentDateRate.rate));
  }, [currency, paymentDateRate, selectedFee, selectedFeeRemaining]);

  const enteredAmountInFeeCurrency = useMemo(() => {
    const numericAmount = Number(amount || 0);
    if (!selectedFee || !numericAmount) return null;
    if (selectedFee.currency === currency) return numericAmount;
    if (!paymentDateRate || Number(paymentDateRate.rate) <= 0) return null;

    return currency === 'USD'
      ? roundMoney(numericAmount * Number(paymentDateRate.rate))
      : roundMoney(numericAmount / Number(paymentDateRate.rate));
  }, [amount, currency, paymentDateRate, selectedFee]);

  const exceedsSelectedFeeRemaining = useMemo(() => {
    if (selectedFeeRemaining === null || enteredAmountInFeeCurrency === null) return false;
    return enteredAmountInFeeCurrency - selectedFeeRemaining > 0.01;
  }, [enteredAmountInFeeCurrency, selectedFeeRemaining]);

  const previewUsd = useMemo(() => {
    const numericAmount = Number(amount || 0);
    if (!numericAmount || !paymentDateRate || Number(paymentDateRate.rate) <= 0) return null;
    if (currency !== 'VES') return null;
    return roundMoney(numericAmount / Number(paymentDateRate.rate));
  }, [amount, currency, paymentDateRate]);

  // Fetch rate for the selected payment date to support previews and required validations.
  useEffect(() => {
    if (!paymentDate) return;

    exchangeRatesApi.getByDate(paymentDate)
      .then(res => {
        setPaymentDateRate(res.data);
        setRateWarning(null);
      })
      .catch(() => {
        setPaymentDateRate(null);
        if (requiresExchangeRate) {
          const formatted = new Date(`${paymentDate}T00:00:00`).toLocaleDateString('es-VE');
          setRateWarning(`No hay tasa de cambio registrada para el ${formatted}. Registre la tasa antes de continuar.`);
          return;
        }

        setRateWarning(null);
      });
  }, [paymentDate, requiresExchangeRate]);

  const previewVes = () => {
    if (!amount) return '—';
    if (currency === 'USD') {
      if (!paymentDateRate) return '—';
      return formatVES(parseFloat(amount) * Number(paymentDateRate.rate));
    }
    return formatVES(parseFloat(amount));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [p, b, u, f, er] = await Promise.all([
        paymentsApi.getAll(condominiumId),
        buildingsApi.getSectors(condominiumId),
        buildingsApi.getUnits(condominiumId),
        feesApi.getAll(condominiumId, true),
        exchangeRatesApi.getLatest().catch(() => null),
      ]);
      setPayments(p.data);
      setBuildings(b.data);
      setUnits(u.data);
      setFees(f.data);
      if (er) setLatestRate(er.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  useEffect(() => {
    if (!selectedFeeId) return;
    const feeStillAvailable = availableFees.some(fee => fee.id === selectedFeeId);
    if (!feeStillAvailable) {
      setValue('fee_id', '');
    }
  }, [availableFees, selectedFeeId, setValue]);

  const onSubmit = async (data: any) => {
    if (requiresExchangeRate && !paymentDateRate) {
      toast.error('No hay tasa de cambio para la fecha del pago');
      return;
    }
    if (exceedsSelectedFeeRemaining) {
      toast.error('El monto ingresado excede el saldo pendiente de la cuota seleccionada');
      return;
    }
    setSaving(true);
    try {
      const exchangeRateValue = requiresExchangeRate ? Number(paymentDateRate!.rate) : 0;
      const payload: any = {
        ...data,
        amount_original: parseFloat(data.amount_original),
        exchange_rate: exchangeRateValue,
      };
      if (!payload.fee_id) delete payload.fee_id;
      await paymentsApi.create(payload);
      toast.success('Pago registrado exitosamente');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const openModal = () => {
    setPaymentDateRate(null);
    setRateWarning(null);
    reset({ currency: 'VES', payment_date: today, unit_id: '', fee_id: '', amount_original: '' });
    setShowModal(true);
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
    {
      key: 'amount_usd', label: 'En $USD',
      render: (p: Payment) => {
        const usdAmount = getPaymentUsdAmount(p);
        return usdAmount === null ? '—' : formatUSD(usdAmount);
      },
    },
    { key: 'payment_date', label: 'Fecha' },
    { key: 'reference', label: 'Referencia' },
    {
      key: 'is_voided', label: 'Estado',
      render: (p: Payment) => p.is_voided
        ? <span className="badge-red">Anulado</span>
        : <span className="badge-green">Válido</span>,
    },
    {
      key: 'actions', label: 'Acciones', sortable: false,
      render: (p: Payment) => !p.is_voided ? (
        <button onClick={() => setVoidTarget(p)} className="btn-danger text-xs py-1">Anular</button>
      ) : null,
    },
  ];

  const blockSubmit = saving || (requiresExchangeRate && !paymentDateRate) || exceedsSelectedFeeRemaining;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos (CU-08)</h1>
          {latestRate && <p className="text-sm text-gray-500 mt-1">Tasa más reciente: 1 USD = {formatVES(latestRate.rate)}</p>}
        </div>
        <button onClick={openModal} className="btn-primary">
          + Registrar Pago
        </button>
      </div>
      <div className="card">
        <DataTable
          data={payments}
          columns={columns}
          loading={loading}
          rowClassName={(p: Payment) => p.is_voided ? 'bg-red-50 text-red-700' : ''}
        />
      </div>

      <Modal isOpen={showModal} title="Registrar Pago (CU-08)" onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Unidad <span className="text-red-500">*</span></label>
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
              {availableFees.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {selectedUnit && availableFees.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">
                La unidad seleccionada no tiene cuotas pendientes aplicables. Puede registrar un pago general.
              </p>
            )}
            {!selectedUnit && (
              <p className="text-xs text-gray-500 mt-1">
                Seleccione primero una unidad para ver las cuotas que aplican al condominio, a su estructura o a esa unidad.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Moneda <span className="text-red-500">*</span></label>
              <select {...register('currency')} className="input">
                <option value="VES">Bs. (VES)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div>
              <label className="label">Monto ({currency}) <span className="text-red-500">*</span></label>
              <input {...register('amount_original')} type="number" step="0.01" className="input" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Pago <span className="text-red-500">*</span></label>
              <input {...register('payment_date')} type="date" className="input" required max={today} />
            </div>
            <div>
              <label className="label">N° Comprobante</label>
              <input {...register('reference')} className="input" placeholder="0001-2026" />
            </div>
          </div>
          {requiresExchangeRate && rateWarning && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {rateWarning}
            </div>
          )}
          {selectedFee && selectedFeeRemaining !== null && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <p>
                Saldo pendiente de la cuota: <strong>{selectedFee.currency === 'USD' ? `${selectedFeeRemaining.toFixed(2)} USD` : formatVES(selectedFeeRemaining)}</strong>
              </p>
              {remainingInSelectedCurrency !== null && selectedFee.currency !== currency && (
                <p className="mt-1 text-blue-800">
                  Equivalente en la moneda seleccionada: <strong>{currency === 'USD' ? `${remainingInSelectedCurrency.toFixed(2)} USD` : formatVES(remainingInSelectedCurrency)}</strong>
                </p>
              )}
            </div>
          )}
          {exceedsSelectedFeeRemaining && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              El monto ingresado supera el saldo pendiente de la cuota seleccionada.
            </div>
          )}
          {currency === 'USD' && paymentDateRate && (
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
              Tasa del {new Date(`${paymentDate}T00:00:00`).toLocaleDateString('es-VE')}: <strong>1 USD = {formatVES(paymentDateRate.rate)}</strong>
              <span className="ml-4">Equivalente en Bs.: <strong>{previewVes()}</strong></span>
            </div>
          )}
          {currency === 'VES' && paymentDateRate && previewUsd !== null && (
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
              Tasa del {new Date(`${paymentDate}T00:00:00`).toLocaleDateString('es-VE')}: <strong>1 USD = {formatVES(paymentDateRate.rate)}</strong>
              <span className="ml-4">Equivalente en USD: <strong>{formatUSD(previewUsd)}</strong></span>
            </div>
          )}
          <div>
            <label className="label">Notas</label>
            <textarea {...register('notes')} className="input" rows={3} />
          </div>
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {saving && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={blockSubmit}>{saving ? 'Guardando...' : 'Registrar Pago'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={!!voidTarget}
        title="Anular Pago"
        message={`¿Está seguro que desea anular el pago${voidTarget?.reference ? ` N° ${voidTarget.reference}` : ''} de ${voidTarget?.unit?.unit_number ?? ''}? Esta acción no se puede revertir.`}
        confirmLabel="Anular"
        isDestructive
        isLoading={voiding}
        loadingMessage="Anulando pago, por favor espere..."
        onConfirm={async () => {
          if (!voidTarget) return;
          setVoiding(true);
          try {
            await paymentsApi.voidPayment(voidTarget.id);
            toast.success('Pago anulado');
            setVoidTarget(null);
            load();
          } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
          finally { setVoiding(false); }
        }}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
}
