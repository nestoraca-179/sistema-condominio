import api from './axios';
import type { Debt, DebtStatus } from '../types';

export const debtsApi = {
  getAll: (condominiumId?: string, status?: DebtStatus) =>
    api.get<Debt[]>('/debts', { params: { condominiumId, status } }),
  getByUnit: (unitId: string) => api.get<Debt[]>(`/debts/unit/${unitId}`),
  update: (id: string, data: Partial<Debt>) => api.patch<Debt>(`/debts/${id}`, data),
  waive: (id: string) => api.patch(`/debts/${id}/waive`),
};
