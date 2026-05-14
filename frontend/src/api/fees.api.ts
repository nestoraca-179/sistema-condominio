import api from './axios';
import type { Fee } from '../types';

export const feesApi = {
  getAll: (condominiumId?: string, activeOnly?: boolean) =>
    api.get<Fee[]>('/fees', { params: { condominiumId, activeOnly } }),
  getByCondominium: (id: string) => api.get<Fee[]>(`/fees/condominium/${id}`),
  getOne: (id: string) => api.get<Fee>(`/fees/${id}`),
  create: (data: Partial<Fee> & { amount_original: number; exchange_rate: number }) =>
    api.post<Fee>('/fees', data),
  deactivate: (id: string) => api.delete(`/fees/${id}`),
};
