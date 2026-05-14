import api from './axios';
import type { Condominium } from '../types';

export const condominiumsApi = {
  getAll: () => api.get<Condominium[]>('/condominiums'),
  getOne: (id: string) => api.get<Condominium>(`/condominiums/${id}`),
  create: (data: Partial<Condominium>) => api.post<Condominium>('/condominiums', data),
  update: (id: string, data: Partial<Condominium>) =>
    api.patch<Condominium>(`/condominiums/${id}`, data),
};
