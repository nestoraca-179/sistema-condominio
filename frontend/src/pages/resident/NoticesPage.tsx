import React, { useEffect, useState } from 'react';
import { noticesApi } from '../../api/notices.api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/common/Modal';
import type { Notice } from '../../types';

const RESIDENT_NOTICES_UPDATED_EVENT = 'resident-notices-updated';

export function ResidentNoticesPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Notice | null>(null);

  const markNoticeAsRead = async (noticeId: string) => {
    const targetNotice = notices.find(notice => notice.id === noticeId);
    if (!targetNotice || targetNotice.is_read) return;

    try {
      await noticesApi.markAsRead(noticeId);
      setNotices(currentNotices => currentNotices.map(notice => (
        notice.id === noticeId ? { ...notice, is_read: true } : notice
      )));
      setSelected(currentSelected => currentSelected?.id === noticeId
        ? { ...currentSelected, is_read: true }
        : currentSelected);
      window.dispatchEvent(new Event(RESIDENT_NOTICES_UPDATED_EVENT));
    } catch {
      // Ignore read status update failures in the UI.
    }
  };

  const openNotice = (notice: Notice) => {
    setSelected(notice);
    markNoticeAsRead(notice.id);
  };

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
          <div
            key={n.id}
            className={`card transition-colors ${n.is_read ? 'cursor-pointer hover:border-primary-300' : 'cursor-pointer border-l-4 border-l-red-500 bg-red-50/50 hover:border-primary-300'}`}
            onClick={() => openNotice(n)}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {!n.is_read && <span className="badge-red text-xs">No leído</span>}
                  {n.is_read && <span className="badge-blue text-xs">Leído</span>}
                </div>
                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{n.content}</p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-4">
                <p className="text-xs text-gray-400">
                  {new Date(n.created_at).toLocaleDateString('es-VE')}
                </p>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      markNoticeAsRead(n.id);
                    }}
                    className="btn-secondary text-xs py-1"
                  >
                    Marcar como leído
                  </button>
                )}
              </div>
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
