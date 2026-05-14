import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { noticesApi } from '../../api/notices.api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/common/Modal';
import type { Notice } from '../../types';

export function NoticesPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Notice | null>(null);

  const { register, handleSubmit, reset } = useForm<any>({
    defaultValues: { target_type: 'all', send_by_email: false },
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await noticesApi.getAll(condominiumId);
      setNotices(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  const onSubmit = async (data: any) => {
    try {
      await noticesApi.create({ ...data, condominium_id: condominiumId });
      toast.success('Comunicado publicado');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comunicados (CU-10, CU-18)</h1>
        <button onClick={() => { reset({ target_type: 'all', send_by_email: false }); setShowModal(true); }} className="btn-primary">
          + Nuevo Comunicado
        </button>
      </div>

      <div className="space-y-4">
        {loading && <div className="text-center text-gray-400 py-8">Cargando...</div>}
        {!loading && notices.length === 0 && (
          <div className="card text-center text-gray-400 py-8">No hay comunicados</div>
        )}
        {notices.map(n => (
          <div key={n.id} className="card cursor-pointer hover:border-primary-300 transition-colors" onClick={() => setSelected(n)}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{n.content}</p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <p className="text-xs text-gray-400">{new Date(n.created_at).toLocaleDateString('es-VE')}</p>
                {n.sent_by_email && <span className="badge-blue mt-1 text-xs">Email enviado</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} title="Nuevo Comunicado" onClose={() => setShowModal(false)} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Título</label>
            <input {...register('title')} className="input" required />
          </div>
          <div>
            <label className="label">Contenido</label>
            <textarea {...register('content')} className="input" rows={5} required />
          </div>
          <div>
            <label className="label">Destinatarios</label>
            <select {...register('target_type')} className="input">
              <option value="all">Todos los residentes</option>
              <option value="sector">Por sector</option>
              <option value="building">Por edificio</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('send_by_email')} type="checkbox" className="w-4 h-4" />
            <span className="text-sm text-gray-700">Enviar también por correo electrónico (CU-18)</span>
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Publicar</button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={true} title={selected.title} onClose={() => setSelected(null)} size="lg">
          <p className="text-gray-700 whitespace-pre-wrap">{selected.content}</p>
          <p className="text-xs text-gray-400 mt-4">
            Publicado: {new Date(selected.created_at).toLocaleString('es-VE')}
            {selected.sentByUser ? ` por ${selected.sentByUser.full_name}` : ''}
          </p>
        </Modal>
      )}
    </div>
  );
}
