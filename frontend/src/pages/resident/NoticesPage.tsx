import React, { useEffect, useState } from 'react';
import { noticesApi } from '../../api/notices.api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/common/Modal';
import type { Notice } from '../../types';

export function ResidentNoticesPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Notice | null>(null);

  useEffect(() => {
    if (!condominiumId) { setLoading(false); return; }
    noticesApi.getAll(condominiumId)
      .then(r => setNotices(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [condominiumId]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comunicados (CU-17)</h1>
      {loading && <div className="text-gray-400 text-center py-8">Cargando...</div>}
      {!loading && notices.length === 0 && (
        <div className="card text-center text-gray-400 py-8">No hay comunicados por el momento.</div>
      )}
      <div className="space-y-4">
        {notices.map(n => (
          <div key={n.id} className="card cursor-pointer hover:border-primary-300 transition-colors" onClick={() => setSelected(n)}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{n.content}</p>
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0 ml-4">
                {new Date(n.created_at).toLocaleDateString('es-VE')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <Modal isOpen={true} title={selected.title} onClose={() => setSelected(null)} size="lg">
          <p className="text-gray-700 whitespace-pre-wrap">{selected.content}</p>
          <p className="text-xs text-gray-400 mt-4">
            {new Date(selected.created_at).toLocaleString('es-VE')}
          </p>
        </Modal>
      )}
    </div>
  );
}
