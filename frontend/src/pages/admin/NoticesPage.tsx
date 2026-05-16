import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { noticesApi } from '../../api/notices.api';
import { buildingsApi } from '../../api/buildings.api';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/common/Modal';
import type { Building, Notice, NoticeTargetType, Unit } from '../../types';

interface NoticeFormValues {
  title: string;
  content: string;
  target_type: NoticeTargetType;
  target_id?: string;
  send_by_email: boolean;
}

export function NoticesPage() {
  const { user } = useAuth();
  const condominiumId = user?.condominium_id || '';
  const [notices, setNotices] = useState<Notice[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Notice | null>(null);

  const { register, handleSubmit, reset, watch, setValue } = useForm<NoticeFormValues>({
    defaultValues: { target_type: 'all', target_id: '', send_by_email: false },
  });
  const targetType = watch('target_type');

  const buildingsById = useMemo(
    () => new Map(buildings.map(building => [building.id, building])),
    [buildings],
  );

  const unitsById = useMemo(
    () => new Map(units.map(unit => [unit.id, unit])),
    [units],
  );

  const getNoticeTargetLabel = (notice: Notice) => {
    if (notice.target_type === 'all') return 'Todos los residentes';

    if (notice.target_type === 'sector' || notice.target_type === 'building') {
      const building = notice.target_id ? buildingsById.get(notice.target_id) : undefined;
      if (!building) {
        return notice.target_type === 'sector' ? 'Sector' : 'Edificio / Torre';
      }

      return building.type === 'sector'
        ? `Sector ${building.name}`
        : `Edificio / Torre ${building.name}`;
    }

    if (notice.target_type === 'unit') {
      const unit = notice.target_id ? unitsById.get(notice.target_id) : undefined;
      return unit ? `Unidad ${unit.unit_number}` : 'Unidad específica';
    }

    return 'Destinatario no especificado';
  };

  const load = async () => {
    setLoading(true);
    try {
      const [noticesResponse, buildingsResponse, unitsResponse] = await Promise.all([
        noticesApi.getAll(condominiumId),
        buildingsApi.getSectors(condominiumId),
        buildingsApi.getUnits(condominiumId),
      ]);
      setNotices(noticesResponse.data);
      setBuildings(buildingsResponse.data);
      setUnits(unitsResponse.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [condominiumId]);

  useEffect(() => {
    if (targetType === 'all') {
      setValue('target_id', '');
    }
  }, [setValue, targetType]);

  const onSubmit = async (data: NoticeFormValues) => {
    setSaving(true);
    try {
      await noticesApi.create({
        ...data,
        condominium_id: condominiumId,
        target_id: data.target_type === 'all' ? undefined : data.target_id || undefined,
      });
      toast.success('Comunicado publicado');
      setShowModal(false);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comunicados (CU-10, CU-18)</h1>
        <button onClick={() => { reset({ target_type: 'all', target_id: '', send_by_email: false, title: '', content: '' }); setShowModal(true); }} className="btn-primary">
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
                <p className="text-xs font-medium uppercase tracking-wide text-primary-700">{getNoticeTargetLabel(n)}</p>
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
            <label className="label">Título <span className="text-red-500">*</span></label>
            <input {...register('title')} className="input" required />
          </div>
          <div>
            <label className="label">Contenido <span className="text-red-500">*</span></label>
            <textarea {...register('content')} className="input" rows={4} required />
          </div>
          <div>
            <label className="label">Destinatarios</label>
            <select {...register('target_type')} className="input">
              <option value="all">Todos los residentes</option>
              <option value="sector">Por sector</option>
              <option value="building">Por edificio</option>
              <option value="unit">Unidad específica</option>
            </select>
          </div>
          {targetType === 'sector' && (
            <div>
              <label className="label">Sector <span className="text-red-500">*</span></label>
              <select {...register('target_id', { required: targetType === 'sector' })} className="input" required>
                <option value="">Seleccionar sector...</option>
                {buildings.filter(building => building.type === 'sector').map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>
          )}
          {targetType === 'building' && (
            <div>
              <label className="label">Edificio / Torre <span className="text-red-500">*</span></label>
              <select {...register('target_id', { required: targetType === 'building' })} className="input" required>
                <option value="">Seleccionar edificio o torre...</option>
                {buildings.filter(building => building.type === 'building' || building.type === 'tower').map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>
          )}
          {targetType === 'unit' && (
            <div>
              <label className="label">Unidad habitacional <span className="text-red-500">*</span></label>
              <select {...register('target_id', { required: targetType === 'unit' })} className="input" required>
                <option value="">Seleccionar unidad...</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unit_number} - {unit.building?.name || 'Sin estructura'}
                    {unit.owner?.full_name ? ` - ${unit.owner.full_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('send_by_email')} type="checkbox" className="w-4 h-4" />
            <span className="text-sm text-gray-700">Enviar también por correo electrónico (CU-18)</span>
          </label>
          <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Requerido</p>
          {saving && <p className="text-sm text-primary-700">Procesando información, por favor espere...</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed" disabled={saving}>{saving ? 'Guardando...' : 'Publicar'}</button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={true} title={selected.title} onClose={() => setSelected(null)} size="lg">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-700 mb-3">{getNoticeTargetLabel(selected)}</p>
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
