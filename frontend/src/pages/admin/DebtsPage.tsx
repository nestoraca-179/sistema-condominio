import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { debtsApi } from '../../api/debts.api';
import { feesApi } from '../../api/fees.api';
import { paymentsApi } from '../../api/payments.api';
import { buildingsApi } from '../../api/buildings.api';
import { noticesApi } from '../../api/notices.api';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { StatCard } from '../../components/common/StatCard';
import { formatVES } from '../../utils/currency';
import type { Building, Debt, Fee, Payment, Unit } from '../../types';

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOutstandingAmount(debt: Pick<Debt, 'original_amount_ves' | 'late_fee_ves' | 'paid_amount_ves'>) {
  return Math.max(
    Number(debt.original_amount_ves) + Number(debt.late_fee_ves) - Number(debt.paid_amount_ves),
    0,
  );
}

function getDebtClassification(debt: Pick<Debt, 'due_date'>, today: string) {
  return debt.due_date < today ? 'mora' : 'deuda';
}

function getDaysOverdue(dueDate: string, today: string) {
  if (dueDate >= today) return 0;

  const due = new Date(`${dueDate}T00:00:00`);
  const current = new Date(`${today}T00:00:00`);
  const difference = current.getTime() - due.getTime();
  return Math.max(Math.floor(difference / (1000 * 60 * 60 * 24)), 0);
}

interface DebtRow {
  id: string;
  unit: Unit;
  fee: Fee;
  due_date: string;
  original_amount_ves: number;
  late_fee_ves: number;
  paid_amount_ves: number;
  status: Debt['status'];
  structureLabel: string;
  debtRecordId?: string;
}

interface NoticeFormValues {
  title: string;
  content: string;
  send_by_email: boolean;
}

function buildReminderTitle(row: DebtRow) {
  return `Recordatorio de pago - ${row.fee.name}`;
}

function buildReminderMessage(row: DebtRow) {
  return `Estimado residente, le recordamos que la cuota "${row.fee.name}" asociada a la unidad "${row.unit.unit_number}" se encuentra vencida. Por favor, regularice el pago a la brevedad posible para evitar cargos adicionales por mora.`;
}

export function DebtsPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [debts, setDebts] = useState<Debt[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [noticeTarget, setNoticeTarget] = useState<DebtRow | null>(null);
  const [sendingNotice, setSendingNotice] = useState(false);
  const today = getTodayDateString();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NoticeFormValues>({
    defaultValues: { title: '', content: '', send_by_email: false },
  });

  const load = async () => {
    setLoading(true);
    try {
      const [debtsResponse, feesResponse, unitsResponse, paymentsResponse, buildingsResponse] = await Promise.all([
        debtsApi.getAll(condominiumId),
        feesApi.getAll(condominiumId),
        buildingsApi.getUnits(condominiumId),
        paymentsApi.getAll(condominiumId),
        buildingsApi.getSectors(condominiumId),
      ]);

      setDebts(debtsResponse.data);
      setFees(feesResponse.data);
      setUnits(unitsResponse.data);
      setPayments(paymentsResponse.data);
      setBuildings(buildingsResponse.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const openNoticeModal = (row: DebtRow) => {
    reset({
      title: buildReminderTitle(row),
      content: buildReminderMessage(row),
      send_by_email: false,
    });
    setNoticeTarget(row);
  };

  const handleSendNotice = async (data: NoticeFormValues) => {
    if (!noticeTarget) return;

    setSendingNotice(true);
    try {
      const recipients = data.send_by_email && noticeTarget.unit.owner?.email
        ? [noticeTarget.unit.owner.email]
        : undefined;

      await noticesApi.create({
        condominium_id: condominiumId,
        title: data.title,
        content: data.content,
        target_type: 'unit',
        target_id: noticeTarget.unit.id,
        send_by_email: data.send_by_email,
      }, recipients);

      toast.success('Comunicado enviado');
      setNoticeTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al enviar comunicado');
    } finally {
      setSendingNotice(false);
    }
  };

  const buildingsById = useMemo(
    () => new Map(buildings.map(building => [building.id, building])),
    [buildings],
  );

  const unitLineageByUnitId = useMemo(() => {
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
  }, [buildingsById, units]);

  const getUnitStructureLabel = (unit: Unit) => {
    const names: string[] = [];
    let currentId: string | undefined = unit.building_id;

    while (currentId) {
      const currentBuilding = buildingsById.get(currentId);
      if (!currentBuilding) break;
      names.unshift(currentBuilding.name);
      currentId = currentBuilding.parent_id ?? undefined;
    }

    return names.join(' / ') || 'Sin estructura';
  };

  const paymentsByFeeAndUnit = useMemo(() => {
    return payments.reduce<Record<string, number>>((accumulator, payment) => {
      if (payment.is_voided || !payment.fee_id) return accumulator;
      const key = `${payment.fee_id}:${payment.unit_id}`;
      accumulator[key] = Number((accumulator[key] || 0) + Number(payment.amount_ves));
      return accumulator;
    }, {});
  }, [payments]);

  const debtByFeeAndUnit = useMemo(() => {
    return debts.reduce<Record<string, Debt>>((accumulator, debt) => {
      accumulator[`${debt.fee_id}:${debt.unit_id}`] = debt;
      return accumulator;
    }, {});
  }, [debts]);

  const outstandingRows = useMemo<DebtRow[]>(() => {
    const activeFees = fees.filter(fee => !fee.start_date || fee.start_date <= today);

    return activeFees.flatMap(fee => {
      const applicableUnits = units.filter(unit => {
        if (!fee.applies_to || fee.applies_to === 'condominium') return true;
        if (fee.applies_to === 'unit') return fee.target_unit_id === unit.id;
        if (fee.applies_to === 'building') {
          return !!fee.target_building_id && !!unitLineageByUnitId[unit.id]?.has(fee.target_building_id);
        }
        return false;
      });

      return applicableUnits.flatMap(unit => {
        const key = `${fee.id}:${unit.id}`;
        const debtRecord = debtByFeeAndUnit[key];
        const paidAmountVes = Number(debtRecord?.paid_amount_ves ?? paymentsByFeeAndUnit[key] ?? 0);
        const lateFeeVes = Number(debtRecord?.late_fee_ves ?? 0);
        const originalAmountVes = Number(debtRecord?.original_amount_ves ?? fee.amount_ves);
        const status = debtRecord?.status ?? (paidAmountVes > 0 ? 'partial' : 'pending');
        const remainingAmount = Math.max(originalAmountVes + lateFeeVes - paidAmountVes, 0);

        if (status === 'paid' || status === 'waived' || remainingAmount <= 0.01) {
          return [];
        }

        return [{
          id: debtRecord?.id ?? key,
          unit,
          fee,
          due_date: debtRecord?.due_date ?? fee.due_date,
          original_amount_ves: originalAmountVes,
          late_fee_ves: lateFeeVes,
          paid_amount_ves: paidAmountVes,
          status,
          structureLabel: getUnitStructureLabel(unit),
          debtRecordId: debtRecord?.id,
        }];
      });
    }).sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [debtByFeeAndUnit, fees, getUnitStructureLabel, paymentsByFeeAndUnit, today, unitLineageByUnitId, units]);

  const outstandingDebts = useMemo(
    () => outstandingRows,
    [outstandingRows],
  );

  const currentDebts = useMemo(
    () => outstandingDebts.filter(debt => getDebtClassification(debt, today) === 'deuda'),
    [outstandingDebts, today],
  );

  const overdueDebts = useMemo(
    () => outstandingDebts.filter(debt => getDebtClassification(debt, today) === 'mora'),
    [outstandingDebts, today],
  );

  const columns = [
    {
      key: 'unit', label: 'Unidad',
      render: (d: DebtRow) => d.unit?.unit_number || '—',
    },
    {
      key: 'structure', label: 'Sector / Torre / Edificio',
      render: (d: DebtRow) => d.structureLabel,
    },
    {
      key: 'owner', label: 'Propietario',
      render: (d: DebtRow) => d.unit?.owner?.full_name || '—',
    },
    {
      key: 'fee', label: 'Cuota',
      render: (d: DebtRow) => d.fee?.name || '—',
    },
    { key: 'due_date', label: 'Vencimiento' },
    {
      key: 'classification', label: 'Clasificación', sortable: false,
      render: (d: DebtRow) => {
        const classification = getDebtClassification(d, today);
        return classification === 'mora'
          ? <span className="badge-red">Mora</span>
          : <span className="badge-yellow">Deuda</span>;
      },
    },
    {
      key: 'term', label: 'Plazo', sortable: false,
      render: (d: DebtRow) => {
        const daysOverdue = getDaysOverdue(d.due_date, today);

        return daysOverdue > 0
          ? <span className="text-red-600 font-medium">Vencida hace {daysOverdue} día(s)</span>
          : <span className="text-green-600 font-medium">Dentro del plazo</span>;
      },
    },
    {
      key: 'original_amount_ves', label: 'Monto Original',
      render: (d: DebtRow) => formatVES(d.original_amount_ves),
    },
    {
      key: 'late_fee_ves', label: 'Mora',
      render: (d: DebtRow) => formatVES(d.late_fee_ves),
    },
    {
      key: 'paid_amount_ves', label: 'Abonado',
      render: (d: DebtRow) => formatVES(d.paid_amount_ves),
    },
    {
      key: 'total', label: 'Total',
      render: (d: DebtRow) => formatVES(getOutstandingAmount(d)),
    },
    {
      key: 'actions', label: 'Acciones', sortable: false,
      render: (d: DebtRow) => {
        const isOverdue = getDebtClassification(d, today) === 'mora';

        return isOverdue ? (
          <button onClick={() => openNoticeModal(d)} className="btn-secondary text-xs py-1">Enviar comunicado</button>
        ) : (
          <span className="text-xs text-gray-400"></span>
        );
      },
    },
  ];

  const currentDebtTotal = currentDebts.reduce((sum, debt) => sum + getOutstandingAmount(debt), 0);
  const overdueDebtTotal = overdueDebts.reduce((sum, debt) => sum + getOutstandingAmount(debt), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Deudas y Moras (CU-09)</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          label="Deudas Vigentes"
          value={currentDebts.length}
          subtitle={formatVES(currentDebtTotal)}
          colorClass="text-amber-600"
        />
        <StatCard
          label="Moras Vencidas"
          value={overdueDebts.length}
          subtitle={formatVES(overdueDebtTotal)}
          colorClass="text-red-600"
        />
        <StatCard
          label="Total Pendiente"
          value={formatVES(currentDebtTotal + overdueDebtTotal)}
          subtitle={`${outstandingDebts.length} cuota(s) pendientes por unidad`}
          colorClass="text-primary-600"
        />
      </div>

      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Deudas y Moras por Unidad</h2>
          <p className="text-sm text-gray-500 mt-1">Todas las cuotas pendientes consolidadas en un solo listado. Use la clasificación para distinguir entre deudas vigentes y moras.</p>
        </div>
        <DataTable data={outstandingDebts} columns={columns} loading={loading} emptyMessage="No hay cuotas pendientes" />
      </div>

      <Modal
        isOpen={!!noticeTarget}
        title={noticeTarget ? `Comunicado para ${noticeTarget.unit.unit_number}` : 'Enviar comunicado'}
        onClose={() => setNoticeTarget(null)}
        size="lg"
      >
        <form onSubmit={handleSubmit(handleSendNotice)} className="space-y-4">
          {noticeTarget && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Se enviara un recordatorio de pago a la unidad <strong>{noticeTarget.unit.unit_number}</strong> por la cuota <strong>{noticeTarget.fee.name}</strong>.
            </div>
          )}
          <div>
            <label className="label">Título <span className="text-red-500">*</span></label>
            <input {...register('title', { required: true })} className="input" />
            {errors.title && <p className="text-red-500 text-xs mt-1">Título requerido</p>}
          </div>
          <div>
            <label className="label">Mensaje <span className="text-red-500">*</span></label>
            <textarea {...register('content', { required: true })} className="input" rows={5} />
            {errors.content && <p className="text-red-500 text-xs mt-1">Mensaje requerido</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('send_by_email')} type="checkbox" className="w-4 h-4" />
            <span className="text-sm text-gray-700">Enviar también por correo electrónico</span>
          </label>
          {noticeTarget && !noticeTarget.unit.owner?.email && (
            <p className="text-xs text-amber-700">
              Esta unidad no tiene un correo electrónico de propietario disponible. El comunicado se registrará igualmente para la unidad.
            </p>
          )}
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {sendingNotice && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setNoticeTarget(null)} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={sendingNotice}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={sendingNotice}>{sendingNotice ? 'Enviando...' : 'Enviar comunicado'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
