import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false,
  loadingMessage,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        {isLoading && loadingMessage ? (
          <p className="text-sm text-primary-700 mb-4">{loadingMessage}</p>
        ) : null}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary" disabled={isLoading}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`${isDestructive ? 'btn-danger' : 'btn-primary'} disabled:opacity-70 disabled:cursor-not-allowed`}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
