import api from './axios';
import type { Notice } from '../types';

export const noticesApi = {
  getAll: (condominiumId: string) =>
    api.get<Notice[]>('/notices', { params: { condominiumId } }),
  getUnreadCount: (condominiumId: string) =>
    api.get<{ count: number }>('/notices/unread-count', { params: { condominiumId } }),
  getOne: (id: string) => api.get<Notice>(`/notices/${id}`),
  markAsRead: (id: string) => api.patch(`/notices/${id}/read`),
  create: (data: Partial<Notice> & { send_by_email?: boolean }, recipients?: string[]) =>
    api.post<Notice>('/notices', data, {
      params: recipients?.length ? { recipients: recipients.join(',') } : {},
    }),
};
