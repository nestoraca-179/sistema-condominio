import api from './axios';
import type { ExchangeRate } from '../types';

export const exchangeRatesApi = {
  getLatest: () => api.get<ExchangeRate>('/exchange-rates/latest'),
  getHistory: () => api.get<ExchangeRate[]>('/exchange-rates/history'),
  create: (data: { rate: number; effective_date: string }) =>
    api.post<ExchangeRate>('/exchange-rates', data),
};
