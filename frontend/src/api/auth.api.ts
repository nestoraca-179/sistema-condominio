import api from './axios';
import type { AuthResponse } from '../types';

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }),

  getProfile: () => api.get('/auth/profile'),
};
