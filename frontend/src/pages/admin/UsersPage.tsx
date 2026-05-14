import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UsersManagementPage } from '../../components/users/UsersManagementPage';

export function AdminUsersPage() {
  const { user } = useAuth();

  return (
    <UsersManagementPage
      title="Usuarios del Condominio"
      allowedRoles={['admin', 'accountant', 'resident']}
      condominiumId={user?.condominium_id}
      showCondominiumField={false}
    />
  );
}