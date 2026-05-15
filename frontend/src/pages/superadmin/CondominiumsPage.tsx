import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { condominiumsApi } from '../../api/condominiums.api';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import type { Condominium } from '../../types';

const schema = z.object({
  name: z.string().min(3),
  rif: z.string().min(5),
  address: z.string().min(5),
});
type FormData = z.infer<typeof schema>;

export function CondominiumsPage() {
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Condominium | null>(null);
  const [statusTarget, setStatusTarget] = useState<Condominium | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await condominiumsApi.getAll();
      setCondominiums(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); reset({}); setShowModal(true); };
  const openEdit = (c: Condominium) => { setEditing(c); reset(c); setShowModal(true); };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      if (editing) {
        await condominiumsApi.update(editing.id, data);
        toast.success('Condominio actualizado');
      } else {
        await condominiumsApi.create(data);
        toast.success('Condominio creado');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setTogglingStatus(true);
    try {
      const nextIsActive = !statusTarget.is_active;
      await condominiumsApi.update(statusTarget.id, { is_active: nextIsActive });
      toast.success(nextIsActive ? 'Condominio activado' : 'Condominio desactivado');
      setStatusTarget(null);
      load();
    } catch {
      toast.error('Error al actualizar estatus');
    } finally {
      setTogglingStatus(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'rif', label: 'RIF' },
    { key: 'address', label: 'Dirección' },
    {
      key: 'is_active', label: 'Estado',
      render: (c: Condominium) => (
        <span className={c.is_active ? 'badge-green' : 'badge-red'}>
          {c.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Acciones', sortable: false,
      render: (c: Condominium) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(c)} className="btn-secondary text-xs py-1">Editar</button>
          <button
            onClick={() => setStatusTarget(c)}
            className={`${c.is_active ? 'btn-danger' : 'btn-primary'} text-xs py-1`}
          >
            {c.is_active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Condominios</h1>
        <button onClick={openCreate} className="btn-primary">+ Nuevo Condominio</button>
      </div>

      <div className="card">
        <DataTable data={condominiums} columns={columns} loading={loading} />
      </div>

      <Modal isOpen={showModal} title={editing ? 'Editar Condominio' : 'Nuevo Condominio'} onClose={() => setShowModal(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Nombre <span className="text-red-500">*</span></label>
            <input {...register('name')} className="input" />
            {errors.name && <p className="text-red-500 text-xs mt-1">Nombre requerido</p>}
          </div>
          <div>
            <label className="label">RIF <span className="text-red-500">*</span></label>
            <input {...register('rif')} className="input" placeholder="J-12345678-9" />
            {errors.rif && <p className="text-red-500 text-xs mt-1">RIF requerido</p>}
          </div>
          <div>
            <label className="label">Dirección <span className="text-red-500">*</span></label>
            <textarea {...register('address')} className="input" rows={2} />
            {errors.address && <p className="text-red-500 text-xs mt-1">Dirección requerida</p>}
          </div>
          {saving && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!statusTarget}
        title={statusTarget?.is_active ? 'Desactivar Condominio' : 'Activar Condominio'}
        message={statusTarget?.is_active
          ? `¿Desactivar "${statusTarget?.name}"?`
          : `¿Activar "${statusTarget?.name}"?`}
        confirmLabel={statusTarget?.is_active ? 'Desactivar' : 'Activar'}
        isDestructive={!!statusTarget?.is_active}
        isLoading={togglingStatus}
        loadingMessage={statusTarget?.is_active ? 'Desactivando condominio...' : 'Activando condominio...'}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
