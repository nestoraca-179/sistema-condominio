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
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Condominium | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Condominium | null>(null);

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
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await condominiumsApi.update(deactivateTarget.id, { is_active: false });
      toast.success('Condominio desactivado');
      setDeactivateTarget(null);
      load();
    } catch { toast.error('Error al desactivar'); }
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
          {c.is_active && (
            <button onClick={() => setDeactivateTarget(c)} className="btn-danger text-xs py-1">Desactivar</button>
          )}
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
            <label className="label">Nombre</label>
            <input {...register('name')} className="input" />
            {errors.name && <p className="text-red-500 text-xs mt-1">Nombre requerido</p>}
          </div>
          <div>
            <label className="label">RIF</label>
            <input {...register('rif')} className="input" placeholder="J-12345678-9" />
            {errors.rif && <p className="text-red-500 text-xs mt-1">RIF requerido</p>}
          </div>
          <div>
            <label className="label">Dirección</label>
            <textarea {...register('address')} className="input" rows={2} />
            {errors.address && <p className="text-red-500 text-xs mt-1">Dirección requerida</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deactivateTarget}
        title="Desactivar Condominio"
        message={`¿Desactivar "${deactivateTarget?.name}"?`}
        confirmLabel="Desactivar"
        isDestructive
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
