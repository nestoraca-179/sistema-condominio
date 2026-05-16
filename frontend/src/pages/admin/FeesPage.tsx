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

export function FeesPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [fees, setFees] = useState<Fee[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Fee | null>(null);
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
  const canSubmitUsdFee = !requiresTodayExchangeRate || hasTodayExchangeRate;

  const paymentsByFeeId = useMemo(() => {
    return payments.reduce<Record<string, Payment[]>>((accumulator, payment) => {
      if (!payment.fee_id || payment.is_voided) return accumulator;
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
      if (er) setExchangeRate(er.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const previewVes = () => {
    if (!amountOriginal) return '—';
    const rate = Number(exchangeRate?.rate || 1);
    const amount = parseFloat(amountOriginal);
    return currency === 'USD'
      ? formatVES(amount * rate)
      : formatVES(amount);
  };

  const handleScopeChange = (scope: FeeApplyScope) => {
    setValue('applies_to', scope);
    setValue('target_building_id', '');
    setValue('target_unit_id', '');
  };

  const openCreate = () => {
    setEditingFee(null);
    reset({
      currency: 'VES',
      type: 'ordinary',
      applies_to: 'condominium',
      start_date: today,
      due_date: '',
      amount_original: '',
      name: '',
      target_building_id: '',
      target_unit_id: '',
    });
    setShowModal(true);
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
  };

  const onSubmit = async (data: FeeFormValues) => {
    if (editingFee && feeHasPayments(editingFee.id)) {
      toast.error('Esta cuota ya tiene pagos asociados y no puede modificarse');
      return;
    }

    if (data.currency === 'USD' && !hasTodayExchangeRate) {
      toast.error('Debe existir una tasa de cambio registrada para la fecha actual antes de crear una cuota en USD');
      return;
    }

    setSaving(true);
    try {
      const normalizedExchangeRate = Number(exchangeRate?.rate || 1);
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
      key: 'payments', label: 'Pagos asociados', sortable: false,
      render: (f: Fee) => {
        const associatedPayments = getFeePayments(f.id);
        if (associatedPayments.length === 0) {
          return <span className="text-gray-400">Sin pagos</span>;
        }

        return (
          <div className="flex items-center gap-2">
            <span className="badge-yellow">{associatedPayments.length} pago(s)</span>
            <button onClick={() => setPaymentsFee(f)} className="btn-secondary text-xs py-1">
              Ver pagos
            </button>
          </div>
        );
      },
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
      key: 'created_at', label: 'Registrada',
      render: (f: Fee) => formatDateTime(f.created_at),
    },
    {
      key: 'is_active', label: 'Estado',
      render: (f: Fee) => (
        <div className="flex flex-col gap-1">
          <span className={f.is_active ? 'badge-green' : 'badge-red'}>{f.is_active ? 'Activa' : 'Inactiva'}</span>
          {feeHasPayments(f.id) && <span className="badge-yellow">Con pagos aplicados</span>}
        </div>
      ),
    },
    {
      key: 'actions', label: 'Acciones', sortable: false,
      render: (f: Fee) => {
        const isLocked = feeHasPayments(f.id);

        return (
          <div className="flex gap-2">
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
          rowClassName={(fee: Fee) => feeHasPayments(fee.id) ? 'bg-amber-50' : ''}
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
              Para registrar una cuota en USD debe existir una tasa de cambio con fecha de hoy.
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
