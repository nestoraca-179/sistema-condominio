import api from './axios';
import type { Notice } from '../types';

export const noticesApi = {
  getAll: (condominiumId: string) =>
    api.get<Notice[]>('/notices', { params: { condominiumId } }),
  getOne: (id: string) => api.get<Notice>(`/notices/${id}`),
  create: (data: Partial<Notice> & { send_by_email?: boolean }, recipients?: string[]) =>
    api.post<Notice>('/notices', data, {
      params: recipients?.length ? { recipients: recipients.join(',') } : {},
    }),
};
