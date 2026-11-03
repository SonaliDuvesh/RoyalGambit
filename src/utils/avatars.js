export const AVATAR_OPTIONS = [
  { id: 'queen', name: 'Grand Queen', img: '/assets/avatars/queen.png', role: 'Queen' },
  { id: 'king', name: 'Royal King', img: '/assets/avatars/king.png', role: 'King' },
  { id: 'rook', name: 'Castle Rook', img: '/assets/avatars/rook.png', role: 'Rook' },
  { id: 'knight', name: 'Noble Knight', img: '/assets/avatars/knight.png', role: 'Knight' },
  { id: 'bishop', name: 'Grand Bishop', img: '/assets/avatars/bishop.png', role: 'Bishop' },
  { id: 'pawn', name: 'Valiant Pawn', img: '/assets/avatars/pawn.png', role: 'Pawn' }
];

const AVATAR_FALLBACK_MAP = {
  queen: '/assets/avatars/queen.png',
  king: '/assets/avatars/king.png',
  rook: '/assets/avatars/rook.png',
  knight: '/assets/avatars/knight.png',
  bishop: '/assets/avatars/bishop.png',
  pawn: '/assets/avatars/pawn.png',
  // Backward compatibility with legacy avatar ids
  sakura: '/assets/avatars/queen.png',
  crown: '/assets/avatars/king.png',
  blossom: '/assets/avatars/pawn.png'
};

export function getAvatarSrc(avatarId) {
  if (!avatarId) return '/assets/avatars/queen.png';
  return AVATAR_FALLBACK_MAP[avatarId] || '/assets/avatars/queen.png';
}

