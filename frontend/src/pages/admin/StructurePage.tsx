import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { buildingsApi } from '../../api/buildings.api';
import { paymentsApi } from '../../api/payments.api';
import { usersApi } from '../../api/users.api';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/common/DataTable';
import type { Building, Payment, Unit, User } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  sector: 'Sector',
  building: 'Edificio',
  tower: 'Torre',
};

interface BuildingNode extends Building {
  children: BuildingNode[];
}

interface BuildingFormValues {
  name: string;
  type: Building['type'];
  parent_id?: string;
}

interface UnitFormValues {
  building_id: string;
  unit_number: string;
  floor?: string;
  owner_id?: string;
  is_occupied: boolean;
}

const unitNumberCollator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function toastWarning(message: string) {
  toast(message, {
    icon: '⚠️',
    style: {
      border: '1px solid #f59e0b',
      background: '#fffbeb',
      color: '#92400e',
    },
  });
}

function buildTree(flat: Building[]): BuildingNode[] {
  const map = new Map<string, BuildingNode>();
  flat.forEach(b => map.set(b.id, { ...b, children: [] }));
  const roots: BuildingNode[] = [];
  map.forEach(node => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function getDescendantIds(flat: Building[], buildingId: string): Set<string> {
  const descendants = new Set<string>();
  const stack = flat.filter(item => item.parent_id === buildingId).map(item => item.id);

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (descendants.has(currentId)) continue;
    descendants.add(currentId);
    flat.forEach(item => {
      if (item.parent_id === currentId) stack.push(item.id);
    });
  }

  return descendants;
}

function BuildingTreeNode({
  node,
  depth = 0,
  onEdit,
  onDelete,
}: {
  node: BuildingNode;
  depth?: number;
  onEdit: (building: Building) => void;
  onDelete: (building: Building) => void;
}) {
  const badgeColor = node.type === 'sector' ? 'badge-blue' : node.type === 'building' ? 'badge-green' : 'badge-yellow';
  return (
    <>
      <li className="flex items-center justify-between py-2 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0" style={{ paddingLeft: depth * 16 }}>
          <span className="flex items-center gap-1 font-medium text-gray-800 min-w-0">
            {depth > 0 && <span className="text-gray-300 select-none mr-1">{'└─'}</span>}
            <span className="truncate">{node.name}</span>
          </span>
          <span className={`${badgeColor} capitalize text-xs`}>{TYPE_LABELS[node.type] ?? node.type}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onEdit(node)} className="btn-secondary text-xs py-1">Editar</button>
          <button onClick={() => onDelete(node)} className="btn-danger text-xs py-1">Eliminar</button>
        </div>
      </li>
      {node.children.map(child => (
        <BuildingTreeNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

export function StructurePage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [residents, setResidents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
  const [savingBuilding, setSavingBuilding] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [deletingBuilding, setDeletingBuilding] = useState(false);
  const [deletingUnit, setDeletingUnit] = useState(false);

  const { register: regB, handleSubmit: hsB, reset: resetB } = useForm<BuildingFormValues>();
  const { register: regU, handleSubmit: hsU, reset: resetU } = useForm<UnitFormValues>();

  const load = async () => {
    if (!condominiumId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [b, u, p, r] = await Promise.all([
        buildingsApi.getSectors(condominiumId),
        buildingsApi.getUnits(condominiumId),
        paymentsApi.getAll(condominiumId),
        usersApi.getAll(condominiumId),
      ]);
      setBuildings(b.data);
      setUnits(u.data);
      setPayments(p.data);
      setResidents(r.data.filter(u => u.role === 'resident'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const openCreateBuilding = () => {
    setEditingBuilding(null);
    resetB({ name: '', type: 'sector', parent_id: '' });
    setShowBuildingModal(true);
  };

  const openEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    resetB({
      name: building.name,
      type: building.type,
      parent_id: building.parent_id ?? '',
    });
    setShowBuildingModal(true);
  };

  const openCreateUnit = () => {
    setEditingUnit(null);
    resetU({ building_id: '', unit_number: '', floor: '', owner_id: '', is_occupied: true });
    setShowUnitModal(true);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    resetU({
      building_id: unit.building_id,
      unit_number: unit.unit_number,
      floor: unit.floor ?? '',
      owner_id: unit.owner_id ?? '',
      is_occupied: unit.is_occupied,
    });
    setShowUnitModal(true);
  };

  const onSubmitBuilding = async (data: BuildingFormValues) => {
    const payload = {
      ...data,
      condominium_id: condominiumId,
      parent_id: data.parent_id || null,
    };

    setSavingBuilding(true);
    try {
      if (editingBuilding) {
        await buildingsApi.updateBuilding(editingBuilding.id, payload);
        toast.success('Sector/Edificio actualizado');
      } else {
        await buildingsApi.createBuilding(payload);
        toast.success('Sector/Edificio creado');
      }
      setEditingBuilding(null);
      setShowBuildingModal(false);
      await load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSavingBuilding(false); }
  };

  const onSubmitUnit = async (data: UnitFormValues) => {
    const payload = {
      ...data,
      owner_id: data.owner_id || null,
    };

    setSavingUnit(true);
    try {
      if (editingUnit) {
        await buildingsApi.updateUnit(editingUnit.id, payload);
        toast.success('Unidad actualizada');
      } else {
        await buildingsApi.createUnit(payload);
        toast.success('Unidad creada');
      }
      setEditingUnit(null);
      setShowUnitModal(false);
      await load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSavingUnit(false); }
  };

  const handleDeleteBuilding = async () => {
    if (!buildingToDelete) return;
    setDeletingBuilding(true);
    try {
      await buildingsApi.deleteBuilding(buildingToDelete.id);
      toast.success('Sector/Edificio eliminado');
      setBuildingToDelete(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setDeletingBuilding(false);
    }
  };

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    setDeletingUnit(true);
    try {
      await buildingsApi.deleteUnit(unitToDelete.id);
      toast.success('Unidad eliminada');
      setUnitToDelete(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    } finally {
      setDeletingUnit(false);
    }
  };

  const hasRegisteredPayments = (unitId: string) =>
    payments.some(payment => payment.unit_id === unitId);

  const requestDeleteBuilding = (building: Building) => {
    const childBuildings = buildings.filter(item => item.parent_id === building.id);
    if (childBuildings.length > 0) {
      const childLabel = building.type === 'sector' ? 'edificios o torres relacionados' : 'elementos asociados';
      toastWarning(`No se puede eliminar ${TYPE_LABELS[building.type].toLowerCase()} porque tiene ${childLabel}`);
      return;
    }

    const relatedUnits = units.filter(unit => unit.building_id === building.id);
    if (relatedUnits.length > 0) {
      toastWarning(`No se puede eliminar ${TYPE_LABELS[building.type].toLowerCase()} porque tiene unidades habitacionales relacionadas`);
      return;
    }

    setBuildingToDelete(building);
  };

  const requestDeleteUnit = (unit: Unit) => {
    if (hasRegisteredPayments(unit.id)) {
      toastWarning('No se puede eliminar la unidad porque ya tiene pagos registrados');
      return;
    }

    setUnitToDelete(unit);
  };

  const excludedParentIds = editingBuilding
    ? new Set([editingBuilding.id, ...getDescendantIds(buildings, editingBuilding.id)])
    : new Set<string>();

  const availableParents = buildings.filter(building => !excludedParentIds.has(building.id));

  const sortedUnits = [...units].sort((left, right) =>
    unitNumberCollator.compare(left.unit_number, right.unit_number),
  );

  const unitColumns = [
    { key: 'unit_number', label: 'N° Unidad' },
    { key: 'floor', label: 'Piso' },
    {
      key: 'building', label: 'Sector/Edificio',
      render: (u: Unit) => u.building?.name || '—',
    },
    {
      key: 'owner', label: 'Propietario',
      render: (u: Unit) => u.owner?.full_name || 'Sin asignar',
    },
    {
      key: 'is_occupied', label: 'Estado',
      render: (u: Unit) => (
        <span className={u.is_occupied ? 'badge-green' : 'badge-yellow'}>
          {u.is_occupied ? 'Ocupada' : 'Disponible'}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Acciones', sortable: false,
      render: (u: Unit) => (
        <div className="flex gap-2">
          <button onClick={() => openEditUnit(u)} className="btn-secondary text-xs py-1">Editar</button>
          <button onClick={() => requestDeleteUnit(u)} className="btn-danger text-xs py-1">Eliminar</button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-white text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" className="stroke-current opacity-25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" className="stroke-current" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-base font-medium text-gray-800">Cargando...</p>
          <p className="text-sm text-gray-500">Recuperando la estructura y las unidades del condominio.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Estructura Física (CU-05, CU-06)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Sectores / Edificios</h2>
            <button onClick={openCreateBuilding} className="btn-primary text-xs">+ Agregar</button>
          </div>
          <ul className="space-y-0 text-sm">
            {buildings.length === 0
              ? <li className="text-gray-400 text-center py-4">Sin registros</li>
              : buildTree(buildings).map(root => (
                  <BuildingTreeNode key={root.id} node={root} onEdit={openEditBuilding} onDelete={requestDeleteBuilding} />
                ))
            }
          </ul>
        </div>
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Unidades Habitacionales</h2>
            <button onClick={openCreateUnit} className="btn-primary text-xs">+ Agregar Unidad</button>
          </div>
          <DataTable data={sortedUnits} columns={unitColumns} />
        </div>
      </div>

      <Modal isOpen={showBuildingModal} title={editingBuilding ? 'Editar Sector/Edificio' : 'Nuevo Sector/Edificio'} onClose={() => setShowBuildingModal(false)}>
        <form onSubmit={hsB(onSubmitBuilding)} className="space-y-4">
          <div>
            <label className="label">Nombre <span className="text-red-500">*</span></label>
            <input {...regB('name')} className="input" required placeholder="Sector A / Torre 1" />
          </div>
          <div>
            <label className="label">Tipo <span className="text-red-500">*</span></label>
            <select {...regB('type')} className="input">
              <option value="sector">Sector</option>
              <option value="building">Edificio</option>
              <option value="tower">Torre</option>
            </select>
          </div>
          <div>
            <label className="label">Depende de (opcional)</label>
            <select {...regB('parent_id')} className="input">
              <option value="">— Ninguno —</option>
              {availableParents.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {savingBuilding && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowBuildingModal(false)} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={savingBuilding}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={savingBuilding}>{savingBuilding ? 'Guardando...' : editingBuilding ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showUnitModal} title={editingUnit ? 'Editar Unidad Habitacional' : 'Nueva Unidad Habitacional'} onClose={() => setShowUnitModal(false)}>
        <form onSubmit={hsU(onSubmitUnit)} className="space-y-4">
          <div>
            <label className="label">Sector/Edificio <span className="text-red-500">*</span></label>
            <select {...regU('building_id')} className="input" required>
              <option value="">Seleccionar...</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">N° Unidad <span className="text-red-500">*</span></label>
              <input {...regU('unit_number')} className="input" required placeholder="Apto 101" />
            </div>
            <div>
              <label className="label">Piso</label>
              <input {...regU('floor')} className="input" placeholder="1" />
            </div>
          </div>
          <div>
            <label className="label">Propietario (opcional)</label>
            <select {...regU('owner_id')} className="input">
              <option value="">Sin asignar</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              {...regU('is_occupied')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Marcar unidad como ocupada
          </label>
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {savingUnit && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowUnitModal(false)} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={savingUnit}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={savingUnit}>{savingUnit ? 'Guardando...' : editingUnit ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!buildingToDelete}
        title="Eliminar Sector/Edificio"
        message={`¿Eliminar "${buildingToDelete?.name}"? Si tiene elementos hijos o unidades asociadas, el sistema bloqueará la acción.`}
        confirmLabel="Eliminar"
        isDestructive
        isLoading={deletingBuilding}
        loadingMessage="Eliminando estructura..."
        onConfirm={handleDeleteBuilding}
        onCancel={() => setBuildingToDelete(null)}
      />

      <ConfirmModal
        isOpen={!!unitToDelete}
        title="Eliminar Unidad Habitacional"
        message={`¿Eliminar la unidad "${unitToDelete?.unit_number}"?`}
        confirmLabel="Eliminar"
        isDestructive
        isLoading={deletingUnit}
        loadingMessage="Eliminando unidad..."
        onConfirm={handleDeleteUnit}
        onCancel={() => setUnitToDelete(null)}
      />
    </div>
  );
}
