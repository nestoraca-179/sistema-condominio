import api from './axios';
import type { Payment } from '../types';

export const paymentsApi = {
  getAll: (condominiumId?: string) =>
    api.get<Payment[]>('/payments', { params: { condominiumId } }),
  create: (data: Partial<Payment> & { amount_original: number; exchange_rate: number }) =>
    api.post<Payment>('/payments', data),
  approvePayment: (id: string) => api.patch<Payment>(`/payments/${id}/approve`, {}),
  rejectPayment: (id: string, reason: string) => api.patch<Payment>(`/payments/${id}/reject`, { reason }),
  voidPayment: (id: string, reason: string) => api.patch<Payment>(`/payments/${id}/void`, { reason }),
  getByUnit: (unitId: string) => api.get<Payment[]>(`/payments/resident/${unitId}`),
};
