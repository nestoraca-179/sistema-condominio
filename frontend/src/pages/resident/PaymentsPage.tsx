import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { dashboardApi } from '../../api/reports.api';
import { paymentsApi } from '../../api/payments.api';
import { buildingsApi } from '../../api/buildings.api';
import { exchangeRatesApi } from '../../api/exchangeRates.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { formatVES, formatUSD } from '../../utils/currency';
import {
  formatPaymentDateTime,
  getPaymentUsdAmount,
  getTodayDateString,
  isApprovedPayment,
  PAYMENT_STATUS_BADGE_CLASSES,
  PAYMENT_STATUS_LABELS,
  roundMoney,
} from '../../utils/payments';
import type { Debt, ExchangeRate, Fee, Payment, Unit } from '../../types';

function getOutstandingAmount(debt: Pick<Debt, 'original_amount_ves' | 'late_fee_ves' | 'paid_amount_ves'>) {
  return Math.max(
    Number(debt.original_amount_ves) + Number(debt.late_fee_ves) - Number(debt.paid_amount_ves),
    0,
  );
}

export function ResidentPaymentsPage() {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingDebts, setPendingDebts] = useState<Debt[]>([]);
  const [latestRate, setLatestRate] = useState<ExchangeRate | null>(null);
  const [paymentDateRate, setPaymentDateRate] = useState<ExchangeRate | null>(null);
  const [rateWarning, setRateWarning] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [noteTarget, setNoteTarget] = useState<Payment | null>(null);
  const [infoTarget, setInfoTarget] = useState<Payment | null>(null);

  const today = getTodayDateString();

  const { register, handleSubmit, reset, watch, setValue } = useForm<any>({
    defaultValues: { currency: 'VES', payment_date: today },
  });
  const formUnitId = watch('unit_id');
  const selectedFeeId = watch('fee_id');
  const currency = watch('currency');
  const amount = watch('amount_original');
  const paymentDate = watch('payment_date');

  const selectedUnit = useMemo(
    () => units.find(unit => unit.id === selectedUnitId),
    [selectedUnitId, units],
  );

  const selectedFormUnit = useMemo(
    () => units.find(unit => unit.id === formUnitId),
    [formUnitId, units],
  );

  const availableFees = useMemo(
    () => pendingDebts
      .filter(debt => !!debt.fee && getOutstandingAmount(debt) > 0.01)
      .map(debt => debt.fee as Fee),
    [pendingDebts],
  );

  const selectedFeeDebt = useMemo(
    () => pendingDebts.find(debt => debt.fee_id === selectedFeeId),
    [pendingDebts, selectedFeeId],
  );

  const selectedFee = useMemo(
    () => selectedFeeDebt?.fee,
    [selectedFeeDebt],
  );

  const requiresExchangeRate = currency === 'USD' || selectedFee?.currency === 'USD';

  const selectedFeeRemaining = useMemo(() => {
    if (!selectedFeeDebt) return null;

    if (selectedFeeDebt.fee?.currency === 'USD') {
      const exchangeRate = Number(selectedFeeDebt.fee.exchange_rate || 0);
      if (exchangeRate <= 0) return 0;
      return roundMoney(getOutstandingAmount(selectedFeeDebt) / exchangeRate);
    }

    return roundMoney(getOutstandingAmount(selectedFeeDebt));
  }, [selectedFeeDebt]);

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

  const loadBaseData = async () => {
    if (!user) {
      setLoadingUnits(false);
      return;
    }

    setLoadingUnits(true);
    try {
      const [unitsResponse, latestRateResponse] = await Promise.all([
        buildingsApi.getMyUnits(),
        exchangeRatesApi.getLatest().catch(() => null),
      ]);

      setUnits(unitsResponse.data);
      setSelectedUnitId(current => current || unitsResponse.data[0]?.id || '');
      if (latestRateResponse) setLatestRate(latestRateResponse.data);
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadPendingDebts = async (unitId: string) => {
    if (!unitId) {
      setPendingDebts([]);
      return;
    }

    try {
      const response = await dashboardApi.getMyStatement(unitId);
      const debts = (response.data?.debts || []).filter((debt: Debt) => getOutstandingAmount(debt) > 0.01);
      setPendingDebts(debts);
    } catch {
      setPendingDebts([]);
    }
  };

  const loadPayments = async (unitId: string) => {
    if (!unitId) {
      setPayments([]);
      return;
    }

    setLoadingPayments(true);
    try {
      const response = await paymentsApi.getByUnit(unitId);
      setPayments(response.data);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => { loadBaseData(); }, [user]);

  useEffect(() => {
    loadPayments(selectedUnitId);
  }, [selectedUnitId]);

  useEffect(() => {
    if (!showModal) return;
    loadPendingDebts(formUnitId);
  }, [formUnitId, showModal]);

  useEffect(() => {
    if (!selectedFeeId) return;
    const feeStillAvailable = availableFees.some(fee => fee.id === selectedFeeId);
    if (!feeStillAvailable) setValue('fee_id', '');
  }, [availableFees, selectedFeeId, setValue]);

  const onSubmit = async (data: any) => {
    if (!data.unit_id) {
      toast.error('Debe seleccionar una unidad');
      return;
    }
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
        unit_id: data.unit_id,
        amount_original: parseFloat(data.amount_original),
        exchange_rate: exchangeRateValue,
      };
      if (!payload.fee_id) delete payload.fee_id;
      await paymentsApi.create(payload);
      toast.success('Pago enviado para aprobación');
      setShowModal(false);
      setSelectedUnitId(data.unit_id);
      await loadPayments(data.unit_id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    if (!selectedUnitId) {
      toast.error('Debe seleccionar una unidad');
      return;
    }
    setPaymentDateRate(null);
    setRateWarning(null);
    reset({ unit_id: selectedUnitId, currency: 'VES', payment_date: today, fee_id: '', amount_original: '', reference: '', notes: '' });
    setShowModal(true);
  };

  const columns = [
    {
      key: 'fee', label: 'Cuota',
      render: (payment: Payment) => payment.fee?.name || 'Pago general',
    },
    {
      key: 'amount_original', label: 'Monto',
      render: (payment: Payment) => payment.currency === 'USD' ? formatUSD(payment.amount_original) : formatVES(payment.amount_original),
    },
    {
      key: 'amount_ves', label: 'En Bs.',
      render: (payment: Payment) => formatVES(payment.amount_ves),
    },
    {
      key: 'amount_usd', label: 'En $USD',
      render: (payment: Payment) => {
        const usdAmount = getPaymentUsdAmount(payment);
        return usdAmount === null ? '—' : formatUSD(usdAmount);
      },
    },
    { key: 'payment_date', label: 'Fecha' },
    { key: 'reference', label: 'Referencia' },
    {
      key: 'status', label: 'Estado',
      render: (payment: Payment) => (
        <span className={PAYMENT_STATUS_BADGE_CLASSES[payment.status] || 'badge-blue'}>
          {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
        </span>
      ),
    },
    {
      key: 'notes', label: 'Nota', sortable: false,
      render: (payment: Payment) => payment.notes ? (
        <button
          type="button"
          onClick={() => setNoteTarget(payment)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-primary-400 hover:text-primary-700"
          title="Ver nota"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M7 4h8l5 5v11a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="M15 4v5h5" />
            <path d="M9 13h6" />
            <path d="M9 17h4" />
          </svg>
        </button>
      ) : null,
    },
    {
      key: 'actions', label: 'Acciones', sortable: false, headerClassName: 'text-center', cellClassName: 'text-center',
      render: (payment: Payment) => payment.status !== 'pending' ? (
        <button
          type="button"
          onClick={() => setInfoTarget(payment)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-primary-400 hover:text-primary-700"
          title="Ver detalle del pago"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 10v6" />
            <path d="M12 7.5h.01" />
          </svg>
        </button>
      ) : null,
    },
  ];

  const blockSubmit = saving || (requiresExchangeRate && !paymentDateRate) || exceedsSelectedFeeRemaining;

  if (!loadingUnits && units.length === 0) {
    return (
      <div className="card text-center py-10 text-gray-500">
        Su cuenta no tiene unidades habitacionales asociadas. Contáctese con la administración.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Pagos</h1>
          {latestRate && <p className="text-sm text-gray-500 mt-1">Tasa más reciente: 1 USD = {formatVES(latestRate.rate)}</p>}
        </div>
        <button onClick={openModal} className="btn-primary" disabled={loadingUnits || !selectedUnitId}>
          + Registrar Pago
        </button>
      </div>

      {loadingUnits ? (
        <div className="card text-center py-10 text-gray-400">Cargando...</div>
      ) : (
        <>
          <div className="card mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-semibold text-gray-700">Unidades Asociadas</h2>
                <p className="text-sm text-gray-500 mt-1">Seleccione la unidad para consultar y registrar pagos.</p>
              </div>
              <div className="sm:w-72">
                <label className="label">Unidad</label>
                <select className="input" value={selectedUnitId} onChange={event => setSelectedUnitId(event.target.value)}>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                      {unit.building?.name ? ` - ${unit.building.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <DataTable
              data={payments}
              columns={columns}
              loading={loadingPayments}
              rowClassName={(payment: Payment) => {
                if (payment.status === 'voided') return 'bg-red-50 text-red-700';
                if (payment.status === 'pending') return 'bg-amber-50';
                if (payment.status === 'rejected') return 'bg-slate-50';
                return '';
              }}
            />
          </div>
        </>
      )}

      <Modal isOpen={showModal} title="Registrar Pago" onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Unidad <span className="text-red-500">*</span></label>
            <select {...register('unit_id')} className="input" required>
              <option value="">Seleccionar unidad...</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_number}
                  {unit.building?.name ? ` - ${unit.building.name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cuota (opcional)</label>
            <select {...register('fee_id')} className="input" disabled={!selectedFormUnit}>
              <option value="">{selectedFormUnit ? 'Pago general / abono' : 'Pago especial / abono'}</option>
              {availableFees.map(fee => <option key={fee.id} value={fee.id}>{fee.name}</option>)}
            </select>
            {selectedFormUnit && availableFees.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">
                La unidad seleccionada no tiene cuotas pendientes aplicables. Puede registrar un pago general.
              </p>
            )}
            {!selectedFormUnit && (
              <p className="text-xs text-gray-500 mt-1">
                Seleccione una unidad para ver las cuotas pendientes aplicables al condominio, su estructura o esa unidad.
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
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Los pagos registrados por residentes quedan con estado <strong>Por aprobar</strong> hasta que la administración los valide.
          </div>
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {saving && <p className="text-sm text-primary-700">Enviando pago, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={blockSubmit}>{saving ? 'Enviando...' : 'Enviar Pago'}</button>
          </div>
        </form>
      </Modal>

      {noteTarget && (
        <Modal isOpen={true} title={`Nota del pago${noteTarget.reference ? ` ${noteTarget.reference}` : ''}`} onClose={() => setNoteTarget(null)}>
          <p className="text-gray-700 whitespace-pre-wrap">{noteTarget.notes}</p>
          <div className="flex justify-end mt-6">
            <button type="button" onClick={() => setNoteTarget(null)} className="btn-secondary">Cerrar</button>
          </div>
        </Modal>
      )}

      {infoTarget && (
        <Modal isOpen={true} title="Detalle del pago" onClose={() => setInfoTarget(null)}>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-medium text-gray-900">Estado</p>
              <p>{PAYMENT_STATUS_LABELS[infoTarget.status] || infoTarget.status}</p>
            </div>
            {infoTarget.status === 'approved' && (
              <>
                <div>
                  <p className="font-medium text-gray-900">Aprobado por</p>
                  <p>{infoTarget.approvedByUser?.full_name || infoTarget.approvedByUser?.username || 'No disponible'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Fecha y hora de aprobación</p>
                  <p>{formatPaymentDateTime(infoTarget.approved_at)}</p>
                </div>
              </>
            )}
            {infoTarget.status === 'rejected' && (
              <>
                <div>
                  <p className="font-medium text-gray-900">Rechazado por</p>
                  <p>{infoTarget.rejectedByUser?.full_name || infoTarget.rejectedByUser?.username || 'No disponible'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Fecha y hora de rechazo</p>
                  <p>{formatPaymentDateTime(infoTarget.rejected_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Motivo del rechazo</p>
                  <p className="whitespace-pre-wrap">{infoTarget.rejection_reason || 'No disponible'}</p>
                </div>
              </>
            )}
            {infoTarget.status === 'voided' && (
              <>
                <div>
                  <p className="font-medium text-gray-900">Anulado por</p>
                  <p>{infoTarget.voidedByUser?.full_name || infoTarget.voidedByUser?.username || 'No disponible'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Fecha y hora de anulación</p>
                  <p>{formatPaymentDateTime(infoTarget.voided_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Motivo de anulación</p>
                  <p className="whitespace-pre-wrap">{infoTarget.void_reason || 'No disponible'}</p>
                </div>
              </>
            )}
            <div className="flex justify-end">
              <button type="button" onClick={() => setInfoTarget(null)} className="btn-secondary">Cerrar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
