import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { feesApi } from '../../api/fees.api';
import { exchangeRatesApi } from '../../api/exchangeRates.api';
import { buildingsApi } from '../../api/buildings.api';
import { paymentsApi } from '../../api/payments.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { formatVES, formatUSD } from '../../utils/currency';
import type { Building, Fee, FeeApplyScope, ExchangeRate, Payment, Unit } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  sector: 'Sector',
  building: 'Edificio',
  tower: 'Torre',
};

const SCOPE_LABELS: Record<FeeApplyScope, string> = {
  condominium: 'Todo el condominio',
  building: 'Sector / Torre / Edificio',
  unit: 'Unidad específica',
};

interface FeeFormValues {
  name: string;
  type: Fee['type'];
  currency: Fee['currency'];
  amount_original: string;
  start_date: string;
  due_date: string;
  applies_to: FeeApplyScope;
  target_building_id?: string;
  target_unit_id?: string;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-VE');
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-VE');
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function getPaymentAmountInFeeCurrency(payment: Payment, feeCurrency: Fee['currency']) {
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
}

function isApprovedPayment(payment: Payment) {
  return payment.status === 'approved' && !payment.is_voided;
}

function isSameDate(value: string | undefined | null, expectedDate: string) {
  if (!value) return false;
  return value.slice(0, 10) === expectedDate;
}

function getFeeScopeLabel(fee: Fee) {
  if (fee.applies_to === 'building' && fee.targetBuilding) {
    return `${TYPE_LABELS[fee.targetBuilding.type] ?? 'Estructura'}: ${fee.targetBuilding.name}`;
  }

  if (fee.applies_to === 'unit' && fee.targetUnit) {
    return `Unidad: ${fee.targetUnit.unit_number}`;
  }

  return SCOPE_LABELS[fee.applies_to || 'condominium'];
}

interface FeeCoverageSummary {
  expectedUnits: number;
  paidUnits: number;
  missingUnits: number;
  totalPaidAmount: number;
  totalExpectedAmount: number;
  remainingAmount: number;
  isPaid: boolean;
}

export function FeesPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [fees, setFees] = useState<Fee[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [checkingExchangeRate, setCheckingExchangeRate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Fee | null>(null);
  const [detailsFee, setDetailsFee] = useState<Fee | null>(null);
  const [paymentsFee, setPaymentsFee] = useState<Fee | null>(null);

  const today = getTodayDateString();
  const { register, handleSubmit, reset, watch, setValue } = useForm<FeeFormValues>({
    defaultValues: {
      currency: 'VES',
      type: 'ordinary',
      applies_to: 'condominium',
      start_date: today,
      target_building_id: '',
      target_unit_id: '',
    },
  });

  const currency = watch('currency');
  const amountOriginal = watch('amount_original');
  const startDate = watch('start_date');
  const appliesTo = watch('applies_to');
  const requiresTodayExchangeRate = currency === 'USD';
  const hasTodayExchangeRate = isSameDate(exchangeRate?.effective_date, today);
  const canSubmitUsdFee = !requiresTodayExchangeRate || (hasTodayExchangeRate && !checkingExchangeRate);

  const paymentsByFeeId = useMemo(() => {
    return payments.reduce<Record<string, Payment[]>>((accumulator, payment) => {
      if (!payment.fee_id || !isApprovedPayment(payment)) return accumulator;
      accumulator[payment.fee_id] = accumulator[payment.fee_id] || [];
      accumulator[payment.fee_id].push(payment);
      return accumulator;
    }, {});
  }, [payments]);

  const lockedFeeIds = useMemo(
    () => new Set(Object.keys(paymentsByFeeId)),
    [paymentsByFeeId],
  );

  const getFeePayments = (feeId: string) => paymentsByFeeId[feeId] || [];

  const feeHasPayments = (feeId: string) => lockedFeeIds.has(feeId);

  const unitLineageByUnitId = useMemo(() => {
    const buildingsById = new Map(buildings.map(building => [building.id, building]));

    return units.reduce<Record<string, Set<string>>>((accumulator, unit) => {
      const lineage = new Set<string>();
      let currentId: string | undefined = unit.building_id;

      while (currentId) {
        lineage.add(currentId);
        currentId = buildingsById.get(currentId)?.parent_id ?? undefined;
      }

      accumulator[unit.id] = lineage;
      return accumulator;
    }, {});
  }, [buildings, units]);

  const feeCoverageById = useMemo(() => {
    return fees.reduce<Record<string, FeeCoverageSummary>>((accumulator, fee) => {
      const applicableUnits = units.filter(unit => {
        if (!fee.applies_to || fee.applies_to === 'condominium') return true;
        if (fee.applies_to === 'unit') return fee.target_unit_id === unit.id;
        if (fee.applies_to === 'building') {
          return !!fee.target_building_id && !!unitLineageByUnitId[unit.id]?.has(fee.target_building_id);
        }
        return false;
      });

      const feePayments = getFeePayments(fee.id);
      const amountPerUnit = fee.currency === 'USD' ? Number(fee.amount_original) : Number(fee.amount_ves);
      const paidAmountByUnitId = feePayments.reduce<Record<string, number>>((unitTotals, payment) => {
        unitTotals[payment.unit_id] = roundMoney((unitTotals[payment.unit_id] || 0) + getPaymentAmountInFeeCurrency(payment, fee.currency));
        return unitTotals;
      }, {});

      const paidUnits = applicableUnits.filter(unit => (paidAmountByUnitId[unit.id] || 0) >= amountPerUnit - 0.01).length;
      const expectedUnits = applicableUnits.length;
      const totalPaidAmount = roundMoney(
        feePayments.reduce((sum, payment) => sum + getPaymentAmountInFeeCurrency(payment, fee.currency), 0),
      );
      const totalExpectedAmount = roundMoney(expectedUnits * amountPerUnit);
      const remainingAmount = roundMoney(Math.max(totalExpectedAmount - totalPaidAmount, 0));
      const missingUnits = Math.max(expectedUnits - paidUnits, 0);

      accumulator[fee.id] = {
        expectedUnits,
        paidUnits,
        missingUnits,
        totalPaidAmount,
        totalExpectedAmount,
        remainingAmount,
        isPaid: expectedUnits > 0 && missingUnits === 0 && remainingAmount <= 0.01,
      };

      return accumulator;
    }, {});
  }, [fees, getFeePayments, unitLineageByUnitId, units]);

  const getFeeCoverage = (feeId: string): FeeCoverageSummary => feeCoverageById[feeId] || {
    expectedUnits: 0,
    paidUnits: 0,
    missingUnits: 0,
    totalPaidAmount: 0,
    totalExpectedAmount: 0,
    remainingAmount: 0,
    isPaid: false,
  };

  const refreshTodayExchangeRate = async () => {
    const currentDate = getTodayDateString();
    setCheckingExchangeRate(true);

    try {
      const response = await exchangeRatesApi.getByDate(currentDate);
      setExchangeRate(response.data);
      return response.data;
    } catch {
      setExchangeRate(null);
      return null;
    } finally {
      setCheckingExchangeRate(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [f, er, b, u, p] = await Promise.all([
        feesApi.getAll(condominiumId),
        exchangeRatesApi.getByDate(today).catch(() => null),
        buildingsApi.getSectors(condominiumId),
        buildingsApi.getUnits(condominiumId),
        paymentsApi.getAll(condominiumId),
      ]);
      setFees(f.data);
      setBuildings(b.data);
      setUnits(u.data);
      setPayments(p.data);
      setExchangeRate(er ? er.data : null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const previewVes = () => {
    if (!amountOriginal) return '—';
    const rate = Number(exchangeRate?.rate || 0);
    const amount = parseFloat(amountOriginal);
    return currency === 'USD'
      ? rate > 0 ? formatVES(amount * rate) : '—'
      : formatVES(amount);
  };

  const handleScopeChange = (scope: FeeApplyScope) => {
    setValue('applies_to', scope);
    setValue('target_building_id', '');
    setValue('target_unit_id', '');
  };

  const openCreate = () => {
    const currentDate = getTodayDateString();
    setEditingFee(null);
    reset({
      currency: 'VES',
      type: 'ordinary',
      applies_to: 'condominium',
      start_date: currentDate,
      due_date: '',
      amount_original: '',
      name: '',
      target_building_id: '',
      target_unit_id: '',
    });
    setShowModal(true);
    refreshTodayExchangeRate();
  };

  const openEdit = (fee: Fee) => {
    if (feeHasPayments(fee.id)) {
      toast.error('Esta cuota ya tiene pagos asociados y no puede modificarse');
      return;
    }

    setEditingFee(fee);
    reset({
      name: fee.name,
      type: fee.type,
      currency: fee.currency,
      amount_original: String(fee.amount_original),
      start_date: fee.start_date ?? today,
      due_date: fee.due_date,
      applies_to: fee.applies_to ?? 'condominium',
      target_building_id: fee.target_building_id ?? '',
      target_unit_id: fee.target_unit_id ?? '',
    });
    setShowModal(true);
    refreshTodayExchangeRate();
  };

  const onSubmit = async (data: FeeFormValues) => {
    if (editingFee && feeHasPayments(editingFee.id)) {
      toast.error('Esta cuota ya tiene pagos asociados y no puede modificarse');
      return;
    }

    let currentExchangeRate = exchangeRate;
    if (data.currency === 'USD') {
      currentExchangeRate = await refreshTodayExchangeRate();
    }

    if (data.currency === 'USD' && !currentExchangeRate) {
      toast.error('Debe existir una tasa de cambio registrada para la fecha actual antes de crear una cuota en USD');
      return;
    }

    setSaving(true);
    try {
      const normalizedExchangeRate = Number(currentExchangeRate?.rate || 1);
      const payload = {
        ...data,
        condominium_id: condominiumId,
        amount_original: parseFloat(data.amount_original),
        exchange_rate: normalizedExchangeRate,
        target_building_id: data.applies_to === 'building' ? data.target_building_id || undefined : undefined,
        target_unit_id: data.applies_to === 'unit' ? data.target_unit_id || undefined : undefined,
      };

      if (editingFee) {
        await feesApi.update(editingFee.id, payload);
        toast.success('Cuota actualizada');
      } else {
        await feesApi.create(payload);
        toast.success('Cuota creada');
      }

      setEditingFee(null);
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (!showModal || currency !== 'USD') return;
    refreshTodayExchangeRate();
  }, [showModal, currency]);

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    if (feeHasPayments(deactivateTarget.id)) {
      toast.error('Esta cuota ya tiene pagos asociados y no puede desactivarse');
      setDeactivateTarget(null);
      return;
    }
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
    {
      key: 'scope', label: 'Aplica a', sortable: false,
      render: (f: Fee) => getFeeScopeLabel(f),
    },
    {
      key: 'start_date', label: 'Inicio',
      render: (f: Fee) => formatDate(f.start_date),
    },
    {
      key: 'due_date', label: 'Vencimiento',
      render: (f: Fee) => formatDate(f.due_date),
    },
    {
      key: 'is_active', label: 'Estado',
      render: (f: Fee) => {
        const coverage = getFeeCoverage(f.id);

        return (
          <div className="flex flex-col gap-1">
            <span className={f.is_active ? 'badge-green' : 'badge-red'}>{f.is_active ? 'Activa' : 'Inactiva'}</span>
            {coverage.isPaid
              ? <span className="badge-green">Pagada</span>
              : feeHasPayments(f.id)
                ? <span className="badge-yellow">Con pagos aplicados</span>
                : null}
          </div>
        );
      },
    },
    {
      key: 'actions', label: 'Acciones', sortable: false,
      render: (f: Fee) => {
        const isLocked = feeHasPayments(f.id);

        return (
          <div className="flex gap-2">
            <button
              onClick={() => setDetailsFee(f)}
              className="h-7 w-7 rounded-full border border-gray-300 text-sm font-semibold text-gray-600 transition hover:border-primary-400 hover:text-primary-700"
              title="Ver detalles"
            >
              i
            </button>
            <button
              onClick={() => openEdit(f)}
              className="btn-secondary text-xs py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLocked}
              title={isLocked ? 'La cuota ya tiene pagos asociados' : undefined}
            >
              Editar
            </button>
            {f.is_active && (
              <button
                onClick={() => setDeactivateTarget(f)}
                className="btn-danger text-xs py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLocked}
                title={isLocked ? 'La cuota ya tiene pagos asociados' : undefined}
              >
                Desactivar
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuotas (CU-07)</h1>
          {exchangeRate && hasTodayExchangeRate && (
            <p className="text-sm text-gray-500 mt-1">
              Tasa actual: 1 USD = {formatVES(exchangeRate.rate)}
            </p>
          )}
          {!loading && !hasTodayExchangeRate && (
            <p className="text-sm text-amber-700 mt-1">
              No hay una tasa de cambio registrada para la fecha actual. Las cuotas en USD están bloqueadas hasta registrar la tasa de hoy.
            </p>
          )}
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Nueva Cuota
        </button>
      </div>
      <div className="card">
        <DataTable
          data={fees}
          columns={columns}
          loading={loading}
          rowClassName={(fee: Fee) => {
            const coverage = getFeeCoverage(fee.id);
            if (coverage.isPaid) return 'bg-emerald-50';
            if (feeHasPayments(fee.id)) return 'bg-amber-50';
            return '';
          }}
        />
      </div>

      <Modal isOpen={showModal} title={editingFee ? 'Editar Cuota' : 'Nueva Cuota'} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Concepto <span className="text-red-500">*</span></label>
            <input {...register('name')} className="input" required placeholder="Mantenimiento Junio 2026" />
          </div>
          <input type="hidden" {...register('applies_to')} />
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
          <div>
            <label className="label">Aplicación de la cuota <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['condominium', 'building', 'unit'] as FeeApplyScope[]).map(scope => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => handleScopeChange(scope)}
                  className={`rounded-lg border px-4 py-3 text-left transition ${appliesTo === scope ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                >
                  <span className="block font-medium">{SCOPE_LABELS[scope]}</span>
                  <span className="block text-xs mt-1 text-gray-500">
                    {scope === 'condominium'
                      ? 'Aplica a todas las unidades del condominio.'
                      : scope === 'building'
                        ? 'Aplica a un sector, torre o edificio completo.'
                        : 'Aplica a una sola unidad habitacional.'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {appliesTo === 'building' && (
            <div>
              <label className="label">Sector / Torre / Edificio <span className="text-red-500">*</span></label>
              <select {...register('target_building_id')} className="input" required={appliesTo === 'building'}>
                <option value="">Seleccionar estructura...</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>
                    {(TYPE_LABELS[building.type] || 'Estructura')} - {building.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {appliesTo === 'unit' && (
            <div>
              <label className="label">Unidad habitacional <span className="text-red-500">*</span></label>
              <select {...register('target_unit_id')} className="input" required={appliesTo === 'unit'}>
                <option value="">Seleccionar unidad...</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number} - {unit.building?.name || 'Sin estructura'}
                    {unit.owner?.full_name ? ` - ${unit.owner.full_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto ({currency}) <span className="text-red-500">*</span></label>
              <input {...register('amount_original')} type="number" step="0.01" className="input" required />
            </div>
            <div>
              <label className="label">Equivalente en Bs.</label>
              <div className="input bg-gray-50 text-gray-600">{previewVes()}</div>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Fecha de Inicio <span className="text-red-500">*</span></label>
                <input {...register('start_date')} type="date" className="input" required max={watch('due_date') || undefined} />
              </div>
              <div>
                <label className="label">Fecha de Vencimiento <span className="text-red-500">*</span></label>
                <input {...register('due_date')} type="date" className="input" required min={startDate || undefined} />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {requiresTodayExchangeRate && !hasTodayExchangeRate && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No hay una tasa de cambio registrada para la fecha actual. No puede registrar cuotas en USD hasta cargar la tasa del dia.
            </div>
          )}
          {requiresTodayExchangeRate && checkingExchangeRate && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Validando la tasa de cambio de la fecha actual...
            </div>
          )}
          {saving && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving || !canSubmitUsdFee}>{saving ? 'Guardando...' : editingFee ? 'Actualizar' : 'Crear Cuota'}</button>
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

      <Modal
        isOpen={!!detailsFee}
        title={detailsFee ? `Detalle de ${detailsFee.name}` : 'Detalle de cuota'}
        onClose={() => setDetailsFee(null)}
        size="lg"
      >
        {detailsFee && (() => {
          const coverage = getFeeCoverage(detailsFee.id);
          const associatedPayments = getFeePayments(detailsFee.id);

          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Cobertura</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {coverage.paidUnits}/{coverage.expectedUnits} unidades al día
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {coverage.missingUnits === 0 ? 'Sin unidades pendientes' : `Faltan ${coverage.missingUnits} unidad(es) por cubrir`}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Monto cubierto</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {detailsFee.currency === 'USD'
                      ? `${formatUSD(coverage.totalPaidAmount)} de ${formatUSD(coverage.totalExpectedAmount)}`
                      : `${formatVES(coverage.totalPaidAmount)} de ${formatVES(coverage.totalExpectedAmount)}`}
                  </p>
                  {!coverage.isPaid && coverage.expectedUnits > 0 && coverage.remainingAmount > 0.01 && (
                    <p className="text-sm text-amber-700 mt-1">
                      Pendiente {detailsFee.currency === 'USD' ? formatUSD(coverage.remainingAmount) : formatVES(coverage.remainingAmount)}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 px-4 py-3 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Pagos asociados</p>
                    <p className="text-base font-semibold text-gray-900 mt-1">{associatedPayments.length} pago(s) registrados</p>
                  </div>
                  {associatedPayments.length > 0 && (
                    <button
                      onClick={() => {
                        setDetailsFee(null);
                        setPaymentsFee(detailsFee);
                      }}
                      className="btn-secondary text-xs py-1"
                    >
                      Ver pagos
                    </button>
                  )}
                </div>
                {associatedPayments.length === 0 && (
                  <p className="text-sm text-gray-500">Esta cuota no tiene pagos asociados.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-200 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Registrada</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatDateTime(detailsFee.created_at)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Estado financiero</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {coverage.isPaid
                      ? <span className="badge-green">Pagada</span>
                      : coverage.expectedUnits > 0 && coverage.remainingAmount > 0.01
                        ? <span className="badge-yellow">Pendiente</span>
                        : <span className="badge-blue">Sin cobertura</span>}
                    {feeHasPayments(detailsFee.id) && !coverage.isPaid && (
                      <span className="badge-yellow">Con pagos aplicados</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setDetailsFee(null)} className="btn-secondary">Cerrar</button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={!!paymentsFee}
        title={paymentsFee ? `Pagos asociados a ${paymentsFee.name}` : 'Pagos asociados'}
        onClose={() => setPaymentsFee(null)}
        size="lg"
      >
        <div className="space-y-3">
          {paymentsFee && getFeePayments(paymentsFee.id).length === 0 && (
            <p className="text-sm text-gray-500">Esta cuota no tiene pagos asociados.</p>
          )}
          {paymentsFee && getFeePayments(paymentsFee.id).map(payment => (
            <div key={payment.id} className="rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {payment.unit?.unit_number || 'Unidad sin identificar'}
                    {payment.unit?.owner?.full_name ? ` - ${payment.unit.owner.full_name}` : ''}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Fecha: {formatDate(payment.payment_date)}
                    {payment.reference ? ` · Referencia: ${payment.reference}` : ''}
                  </p>
                  {payment.notes && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{payment.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-gray-900">
                    {payment.currency === 'USD' ? formatUSD(payment.amount_original) : formatVES(payment.amount_original)}
                  </p>
                  <p className="text-sm text-gray-500">{formatVES(payment.amount_ves)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
