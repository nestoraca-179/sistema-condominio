import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi } from '../../api/users.api';
import { condominiumsApi } from '../../api/condominiums.api';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import type { Condominium, Role, User } from '../../types';

const schema = z.object({
  full_name: z.string().min(2),
  username: z.string().min(3).optional().or(z.literal('')),
  email: z.string().email(),
  password: z.string().min(8).optional().or(z.literal('')),
  role: z.enum(['superadmin', 'admin', 'accountant', 'resident']),
  phone: z.string().optional(),
  condominium_id: z.string().uuid().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  accountant: 'Contador',
  resident: 'Residente',
};

const ROLE_BADGE_CLASSES: Record<Role, string> = {
  superadmin: 'badge-red',
  admin: 'badge-blue',
  accountant: 'badge-yellow',
  resident: 'badge-green',
};

interface UsersManagementPageProps {
  title: string;
  allowedRoles: Role[];
  condominiumId?: string;
  showCondominiumField: boolean;
}

export function UsersManagementPage({
  title,
  allowedRoles,
  condominiumId,
  showCondominiumField,
}: UsersManagementPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [condominiums, setCondominiums] = useState<Condominium[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const roleOptions = useMemo(
    () => allowedRoles.map((role) => ({ value: role, label: ROLE_LABELS[role] })),
    [allowedRoles],
  );

  const load = async () => {
    setLoading(true);
    try {
      if (showCondominiumField) {
        const [usersResponse, condominiumsResponse] = await Promise.all([
          usersApi.getAll(condominiumId),
          condominiumsApi.getAll(),
        ]);
        const filteredUsers = usersResponse.data
          .filter((user) => allowedRoles.includes(user.role))
          .sort((left, right) =>
            left.full_name.localeCompare(right.full_name, 'es', { sensitivity: 'base' }),
          );
        setUsers(filteredUsers);
        setCondominiums(condominiumsResponse.data);
        return;
      }

      const usersResponse = await usersApi.getAll(condominiumId);
      const filteredUsers = usersResponse.data
        .filter((user) => allowedRoles.includes(user.role))
        .sort((left, right) =>
          left.full_name.localeCompare(right.full_name, 'es', { sensitivity: 'base' }),
        );
      setUsers(filteredUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [condominiumId, showCondominiumField]);

  const openCreate = () => {
    setEditing(null);
    reset({
      role: roleOptions[0]?.value ?? 'resident',
      condominium_id: condominiumId ?? '',
    });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    reset({
      full_name: user.full_name,
      username: user.username ?? '',
      email: user.email,
      password: '',
      role: user.role,
      phone: user.phone ?? '',
      condominium_id: user.condominium_id ?? condominiumId ?? '',
    });
    setShowModal(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload: Partial<User> & { password?: string } = {
        ...data,
        condominium_id: showCondominiumField ? data.condominium_id || undefined : condominiumId,
      };

      if (!payload.password) delete payload.password;
      if (!payload.condominium_id) delete payload.condominium_id;

      if (editing) {
        await usersApi.update(editing.id, payload);
        toast.success('Usuario actualizado');
      } else {
        await usersApi.create(payload as Partial<User> & { password: string });
        toast.success('Usuario creado');
      }

      setShowModal(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user: User) => {
    try {
      await usersApi.deactivate(user.id);
      toast.success('Usuario desactivado');
      await load();
    } catch {
      toast.error('Error');
    }
  };

  const columns: Array<{
    key: string;
    label: string;
    render?: (user: User) => React.ReactNode;
    sortable?: boolean;
  }> = [
    { key: 'full_name', label: 'Nombre' },
    {
      key: 'username',
      label: 'Username',
      render: (user: User) => user.username || 'Autogenerado',
    },
    { key: 'email', label: 'Email' },
    {
      key: 'role',
      label: 'Rol',
      render: (user: User) => <span className={ROLE_BADGE_CLASSES[user.role]}>{ROLE_LABELS[user.role]}</span>,
    },
    {
      key: 'is_active',
      label: 'Estado',
      render: (user: User) => (
        <span className={user.is_active ? 'badge-green' : 'badge-red'}>
          {user.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      sortable: false,
      render: (user: User) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(user)} className="btn-secondary text-xs py-1">Editar</button>
          {user.is_active && (
            <button onClick={() => handleDeactivate(user)} className="btn-danger text-xs py-1">Desactivar</button>
          )}
        </div>
      ),
    },
  ];

  if (showCondominiumField) {
    columns.splice(4, 0, {
      key: 'condominium',
      label: 'Condominio',
      render: (user: User) => user.condominium?.name || 'Sin asignar',
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <button onClick={openCreate} className="btn-primary">+ Nuevo Usuario</button>
      </div>

      <div className="card">
        <DataTable data={users} columns={columns} loading={loading} />
      </div>

      <Modal
        isOpen={showModal}
        title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nombre completo <span className="text-red-500">*</span></label>
              <input {...register('full_name')} className="input" />
            </div>
            <div>
              <label className="label">Username</label>
              <input {...register('username')} className="input" placeholder="Autogenerado si lo deja vacio" />
              {errors.username && <p className="text-red-500 text-xs mt-1">Username inválido</p>}
            </div>
            <div>
              <label className="label">Email <span className="text-red-500">*</span></label>
              <input {...register('email')} type="email" className="input" />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input {...register('phone')} className="input" />
            </div>
            <div>
              <label className="label">Contraseña {editing ? '(dejar vacío para no cambiar)' : <span className="text-red-500">*</span>}</label>
              <input {...register('password')} type="password" className="input" />
            </div>
            <div>
              <label className="label">Rol <span className="text-red-500">*</span></label>
              <select {...register('role')} className="input">
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            {showCondominiumField && (
              <div className="col-span-2">
                <label className="label">Condominio</label>
                <select {...register('condominium_id')} className="input">
                  <option value="">— Ninguno (Superadmin) —</option>
                  {condominiums.map((condominium) => (
                    <option key={condominium.id} value={condominium.id}>{condominium.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {saving && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}