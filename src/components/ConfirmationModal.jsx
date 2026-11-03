import React from 'react';
import { LiquidGlassContainer } from '../lib/liquid-glass';

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <LiquidGlassContainer className="modal-content" borderRadius={20}>
        <h2 className="modal-title">{title}</h2>
        <p className="modal-subtitle">{message}</p>

        <div className="modal-actions">
          <button
            className={isDanger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </LiquidGlassContainer>
    </div>
  );
}

