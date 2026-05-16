import api from './axios';
import type { Building, Unit } from '../types';

export const buildingsApi = {
  getSectors: (condominiumId: string) =>
    api.get<Building[]>('/buildings/sectors', { params: { condominiumId } }),
  createBuilding: (data: Partial<Building>) =>
    api.post<Building>('/buildings/sectors', data),
  updateBuilding: (id: string, data: Partial<Building>) =>
    api.patch<Building>(`/buildings/sectors/${id}`, data),
  deleteBuilding: (id: string) => api.delete(`/buildings/sectors/${id}`),
  getUnits: (condominiumId?: string, buildingId?: string) =>
    api.get<Unit[]>('/buildings/units', { params: { condominiumId, buildingId } }),
  getMyUnits: () => api.get<Unit[]>('/buildings/my-units'),
  getUnit: (id: string) => api.get<Unit>(`/buildings/units/${id}`),
  createUnit: (data: Partial<Unit>) => api.post<Unit>('/buildings/units', data),
  updateUnit: (id: string, data: Partial<Unit>) =>
    api.patch<Unit>(`/buildings/units/${id}`, data),
  deleteUnit: (id: string) => api.delete(`/buildings/units/${id}`),
};
