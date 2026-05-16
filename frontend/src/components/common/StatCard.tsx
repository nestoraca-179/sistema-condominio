import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  colorClass?: string;
  loading?: boolean;
}

export function StatCard({
  label,
  value,
  subtitle,
  colorClass = 'text-primary-600',
  loading = false,
}: StatCardProps) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      {loading ? (
        <div className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-500">
          <svg className="h-5 w-5 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" className="opacity-20" stroke="currentColor" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span>Cargando...</span>
        </div>
      ) : (
        <>
          <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </>
      )}
    </div>
  );
}
