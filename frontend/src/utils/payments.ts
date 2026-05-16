import type { Payment } from '../types';

export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function getPaymentUsdAmount(payment: Payment) {
  if (payment.amount_usd !== null && payment.amount_usd !== undefined) {
    return Number(payment.amount_usd);
  }

  if (payment.currency === 'USD') {
    return Number(payment.amount_original);
  }

  const exchangeRate = Number(payment.exchange_rate || 0);
  if (exchangeRate <= 0) return null;
  return roundMoney(Number(payment.amount_ves) / exchangeRate);
}

export function formatPaymentDateTime(value?: string | null) {
  if (!value) return 'No disponible';
  return new Date(value).toLocaleString('es-VE');
}

export function isApprovedPayment(payment: Payment) {
  return payment.status === 'approved' && !payment.is_voided;
}

export const PAYMENT_STATUS_LABELS: Record<Payment['status'], string> = {
  approved: 'Aprobado',
  pending: 'Por aprobar',
  rejected: 'Rechazado',
  voided: 'Anulado',
};

export const PAYMENT_STATUS_BADGE_CLASSES: Record<Payment['status'], string> = {
  approved: 'badge-green',
  pending: 'badge-yellow',
  rejected: 'badge-blue',
  voided: 'badge-red',
};
