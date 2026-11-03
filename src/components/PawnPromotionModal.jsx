import React from 'react';

const PROMOTIONS = [
  { type: 'q', name: 'Queen' },
  { type: 'r', name: 'Rook' },
  { type: 'b', name: 'Bishop' },
  { type: 'n', name: 'Knight' }
];

export default function PawnPromotionModal({ color, onSelect }) {
  const colorName = color === 'w' ? 'white' : 'black';

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2 className="modal-title">Pawn Promotion</h2>
        <p className="modal-subtitle">Choose a piece to promote your pawn:</p>

        <div className="promotion-grid">
          {PROMOTIONS.map((item) => (
            <div
              key={item.type}
              className="promotion-item"
              onClick={() => onSelect(item.type)}
            >
              <img
                src={`/assets/pieces/${colorName}/${item.name.toLowerCase()}.png`}
                alt={item.name}
              />
              <span className="promotion-label">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

