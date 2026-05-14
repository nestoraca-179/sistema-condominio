import api from './axios';

export const reportsApi = {
  getFinancialReport: (condominiumId: string, startDate: string, endDate: string) =>
    api.get('/reports/financial', { params: { condominiumId, startDate, endDate } }),

  getGlobalStatement: (condominiumId: string, year?: number, month?: number) =>
    api.get('/reports/global-statement', { params: { condominiumId, year, month } }),
};

export const dashboardApi = {
  getMyStatement: (unitId: string) =>
    api.get('/dashboard/my-statement', { params: { unitId } }),

  getAdminSummary: (condominiumId: string) =>
    api.get('/dashboard/admin-summary', { params: { condominiumId } }),
};
