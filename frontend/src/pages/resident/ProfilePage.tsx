import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi } from '../../api/users.api';
import { useAuth } from '../../contexts/AuthContext';

const profileSchema = z.object({
  full_name: z.string().min(2),
  username: z.string().min(3),
  phone: z.string().optional(),
  email: z.string().email(),
});

const passwordSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ProfileData = z.infer<typeof profileSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

export function ResidentProfilePage() {
  const { user } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const { register: regP, handleSubmit: hsP, formState: { errors: errP } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  const { register: regPw, handleSubmit: hsPw, reset: resetPw, formState: { errors: errPw } } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSaveProfile = async (data: ProfileData) => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await usersApi.update(user.id, data);
      toast.success('Perfil actualizado');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSavingProfile(false); }
  };

  const onChangePassword = async (data: PasswordData) => {
    if (!user) return;
    setSavingPassword(true);
    try {
      await usersApi.update(user.id, { password: data.password });
      toast.success('Contraseña actualizada');
      resetPw();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSavingPassword(false); }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mi Perfil (CU-19)</h1>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Datos Personales</h2>
        <form onSubmit={hsP(onSaveProfile)} className="space-y-4">
          <div>
            <label className="label">Nombre Completo</label>
            <input {...regP('full_name')} className="input" />
            {errP.full_name && <p className="text-red-500 text-xs mt-1">Nombre requerido</p>}
          </div>
          <div>
            <label className="label">Nombre de usuario</label>
            <input {...regP('username')} className="input" autoComplete="username" />
            {errP.username && <p className="text-red-500 text-xs mt-1">Username requerido</p>}
          </div>
          <div>
            <label className="label">Correo Electrónico</label>
            <input {...regP('email')} type="email" className="input" />
            {errP.email && <p className="text-red-500 text-xs mt-1">Email inválido</p>}
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input {...regP('phone')} className="input" placeholder="0412-1234567" />
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Cambiar Contraseña</h2>
        <form onSubmit={hsPw(onChangePassword)} className="space-y-4">
          <div>
            <label className="label">Nueva Contraseña</label>
            <input {...regPw('password')} type="password" className="input" />
            {errPw.password && <p className="text-red-500 text-xs mt-1">Mínimo 8 caracteres</p>}
          </div>
          <div>
            <label className="label">Confirmar Contraseña</label>
            <input {...regPw('confirmPassword')} type="password" className="input" />
            {errPw.confirmPassword && <p className="text-red-500 text-xs mt-1">{errPw.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? 'Guardando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
