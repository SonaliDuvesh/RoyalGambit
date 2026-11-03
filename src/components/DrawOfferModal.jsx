import React from 'react';
import { Handshake } from 'lucide-react';
import { LiquidGlassContainer } from '../lib/liquid-glass';

export default function DrawOfferModal({
  isOpen,
  fromColor,
  onAccept,
  onDecline
}) {
  if (!isOpen) return null;

  const colorName = fromColor === 'w' ? 'White' : 'Black';

  return (
    <div className="modal-backdrop">
      <LiquidGlassContainer className="modal-content" borderRadius={20}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 16px',
          borderRadius: '50%',
          background: 'rgba(229, 169, 149, 0.2)',
          border: '1px solid var(--rose-gold)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Handshake size={32} color="var(--rose-gold-light)" />
        </div>

        <h2 className="modal-title">Draw Offer</h2>
        <p className="modal-subtitle">
          {colorName} has offered a draw. Would you like to accept?
        </p>

        <div className="modal-actions">
          <button className="btn-primary" onClick={onAccept}>
            Accept Draw
          </button>
          <button className="btn-secondary" onClick={onDecline}>
            Decline
          </button>
        </div>
      </LiquidGlassContainer>
    </div>
  );
}

