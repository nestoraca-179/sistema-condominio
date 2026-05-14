import React from 'react';
import { UsersManagementPage } from '../../components/users/UsersManagementPage';

export function SuperadminUsersPage() {
  return (
    <UsersManagementPage
      title="Usuarios del Sistema"
      allowedRoles={['superadmin', 'admin', 'accountant', 'resident']}
      showCondominiumField
    />
  );
}
