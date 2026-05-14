import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { buildingsApi } from '../../api/buildings.api';
import { usersApi } from '../../api/users.api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/common/Modal';
import { DataTable } from '../../components/common/DataTable';
import type { Building, Unit, User } from '../../types';

export function StructurePage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [residents, setResidents] = useState<User[]>([]);
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  const { register: regB, handleSubmit: hsB, reset: resetB } = useForm<any>();
  const { register: regU, handleSubmit: hsU, reset: resetU } = useForm<any>();

  const load = async () => {
    if (!condominiumId) return;
    const [b, u, r] = await Promise.all([
      buildingsApi.getSectors(condominiumId),
      buildingsApi.getUnits(condominiumId),
      usersApi.getAll(condominiumId),
    ]);
    setBuildings(b.data);
    setUnits(u.data);
    setResidents(r.data.filter(u => u.role === 'resident'));
  };

  useEffect(() => { load(); }, [condominiumId]);

  const onCreateBuilding = async (data: any) => {
    try {
      await buildingsApi.createBuilding({ ...data, condominium_id: condominiumId });
      toast.success('Sector/Edificio creado');
      setShowBuildingModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const onCreateUnit = async (data: any) => {
    try {
      if (!data.owner_id) delete data.owner_id;
      await buildingsApi.createUnit(data);
      toast.success('Unidad creada');
      setShowUnitModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

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
          {u.is_occupied ? 'Ocupado' : 'Disponible'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Estructura Física (CU-05, CU-06)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Sectores / Edificios</h2>
            <button onClick={() => { resetB({ type: 'sector' }); setShowBuildingModal(true); }} className="btn-primary text-xs">+ Agregar</button>
          </div>
          <ul className="space-y-2 text-sm">
            {buildings.map(b => (
              <li key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="font-medium">{b.name}</span>
                <span className="badge-blue capitalize">{b.type}</span>
              </li>
            ))}
            {buildings.length === 0 && <li className="text-gray-400 text-center py-4">Sin registros</li>}
          </ul>
        </div>
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Unidades Habitacionales</h2>
            <button onClick={() => { resetU({}); setShowUnitModal(true); }} className="btn-primary text-xs">+ Agregar Unidad</button>
          </div>
          <DataTable data={units} columns={unitColumns} />
        </div>
      </div>

      <Modal isOpen={showBuildingModal} title="Nuevo Sector/Edificio" onClose={() => setShowBuildingModal(false)}>
        <form onSubmit={hsB(onCreateBuilding)} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input {...regB('name')} className="input" required placeholder="Sector A / Torre 1" />
          </div>
          <div>
            <label className="label">Tipo</label>
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
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowBuildingModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showUnitModal} title="Nueva Unidad Habitacional" onClose={() => setShowUnitModal(false)}>
        <form onSubmit={hsU(onCreateUnit)} className="space-y-4">
          <div>
            <label className="label">Sector/Edificio</label>
            <select {...regU('building_id')} className="input" required>
              <option value="">Seleccionar...</option>
              {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">N° Unidad</label>
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
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowUnitModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
