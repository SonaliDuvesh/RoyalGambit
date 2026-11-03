// Exact grid boundary percentages calculated for the new 1024 x 1024 RoyalGambit Luxury Chessboard
// X grid lines: a-border, a/b, b/c, c/d, d/e, e/f, f/g, g/h, h-border
export const X_LINES = [129, 225, 320, 416, 512, 608, 704, 799, 895];
// Y grid lines: rank 8 top, 8/7, 7/6, 6/5, 5/4, 4/3, 3/2, 2/1, rank 1 bottom
export const Y_LINES = [141, 235, 329, 423, 518, 612, 706, 800, 894];
export const BOARD_IMG_SIZE = 1024;

/**
 * Returns CSS percentage positioning for square [fileIndex, rankIndex]
 * fileIndex: 0 = 'a', 7 = 'h'
 * rankIndex: 0 = '1', 7 = '8'
 * isFlipped: true if playing as Black (Black at bottom, White at top)
 */
export function getSquareStyle(fileIndex, rankIndex, isFlipped = false) {
  // If not flipped:
  // col 0 = file 'a' (leftmost), col 7 = file 'h' (rightmost)
  // row 0 = rank '8' (topmost), row 7 = rank '1' (bottommost)
  const col = isFlipped ? 7 - fileIndex : fileIndex;
  const row = isFlipped ? rankIndex : 7 - rankIndex;

  const x0 = X_LINES[col];
  const x1 = X_LINES[col + 1];
  const y0 = Y_LINES[row];
  const y1 = Y_LINES[row + 1];

  const left = (x0 / BOARD_IMG_SIZE) * 100;
  const top = (y0 / BOARD_IMG_SIZE) * 100;
  const width = ((x1 - x0) / BOARD_IMG_SIZE) * 100;
  const height = ((y1 - y0) / BOARD_IMG_SIZE) * 100;

  return {
    position: 'absolute',
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  };
}

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function squareToCoords(square) {
  const file = square[0];
  const rank = square[1];
  return {
    fileIndex: FILES.indexOf(file),
    rankIndex: RANKS.indexOf(rank)
  };
}

export function coordsToSquare(fileIndex, rankIndex) {
  return `${FILES[fileIndex]}${RANKS[rankIndex]}`;
}

