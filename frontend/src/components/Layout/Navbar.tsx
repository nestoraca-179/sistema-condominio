import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();

  const roleLabels: Record<string, string> = {
    superadmin: 'Superadministrador',
    admin: 'Administrador',
    accountant: 'Contador',
    resident: 'Residente',
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between" style={{ height: '65px' }}>
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-500">
          Sistema de Condominios
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
          <p className="text-xs text-gray-500">{roleLabels[user?.role || ''] || user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="btn-secondary text-xs"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
