import { type Currency } from '../types';

export function formatCurrency(amount: number, currency: Currency, exchangeRate?: number): string {
  if (currency === 'VES') {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount).replace('VES', 'Bs.');
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatVES(amount: number): string {
  return `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(amount)}`;
}

export function formatUSD(amount: number): string {
  return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(amount)}`;
}

export function vesToUsd(amountVes: number, rate: number): number {
  if (!rate || rate === 0) return 0;
  return amountVes / rate;
}

export function usdToVes(amountUsd: number, rate: number): number {
  return amountUsd * rate;
}
