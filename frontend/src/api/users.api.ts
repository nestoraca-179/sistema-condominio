import api from './axios';
import type { User } from '../types';

export const usersApi = {
  getAll: (condominiumId?: string) =>
    api.get<User[]>('/users', { params: { condominiumId } }),

  getOne: (id: string) => api.get<User>(`/users/${id}`),

  create: (data: Partial<User> & { password: string }) =>
    api.post<User>('/users', data),

  update: (id: string, data: Partial<User> & { password?: string }) =>
    api.patch<User>(`/users/${id}`, data),

  deactivate: (id: string) => api.delete(`/users/${id}`),
};
