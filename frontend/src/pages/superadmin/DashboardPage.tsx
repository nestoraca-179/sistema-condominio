import React, { useEffect, useState } from 'react';
import { condominiumsApi } from '../../api/condominiums.api';
import { usersApi } from '../../api/users.api';
import { StatCard } from '../../components/common/StatCard';

export function SuperadminDashboard() {
  const [condoCount, setCondoCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    condominiumsApi.getAll().then(r => setCondoCount(r.data.length));
    usersApi.getAll().then(r => setUserCount(r.data.length));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panel Super Administrador</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard label="Total Condominios" value={condoCount} />
        <StatCard label="Usuarios Registrados" value={userCount} colorClass="text-green-600" />
      </div>
    </div>
  );
}
