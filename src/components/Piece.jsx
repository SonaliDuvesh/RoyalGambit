import React from 'react';

const PIECE_NAMES = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king'
};

export default function Piece({ piece, isDragging, onDragStart, onDragEnd }) {
  if (!piece) return null;

  const color = piece.color === 'w' ? 'white' : 'black';
  const name = PIECE_NAMES[piece.type];
  const src = `/assets/pieces/${color}/${name}.png`;

  return (
    <img
      src={src}
      alt={`${color} ${name}`}
      className={`chess-piece ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );
}

