import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  colorClass?: string;
}

export function StatCard({ label, value, subtitle, colorClass = 'text-primary-600' }: StatCardProps) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
