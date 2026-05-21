/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Piece, PieceType, PlayerColor, Position } from "../types";

// Standard initial board placement
export function getInitialPieces(): Piece[] {
  const pieces: Piece[] = [];

  // Red is bottom (rows 0-4), Black is top (rows 5-9)
  // Let's set up Red at row 0, 2, 3
  const redSetup: { col: number; type: PieceType; id: string }[] = [
    { col: 0, type: "chariot", id: "r_chariot_1" },
    { col: 1, type: "horse", id: "r_horse_1" },
    { col: 2, type: "elephant", id: "r_elephant_1" },
    { col: 3, type: "advisor", id: "r_advisor_1" },
    { col: 4, type: "general", id: "r_general" },
    { col: 5, type: "advisor", id: "r_advisor_2" },
    { col: 6, type: "elephant", id: "r_elephant_2" },
    { col: 7, type: "horse", id: "r_horse_2" },
    { col: 8, type: "chariot", id: "r_chariot_2" },
  ];

  redSetup.forEach((item) => {
    pieces.push({
      id: item.id,
      type: item.type,
      color: "red",
      row: 0,
      col: item.col,
      captured: false,
    });
  });

  // Red Cannons at row 2
  pieces.push(
    { id: "r_cannon_1", type: "cannon", color: "red", row: 2, col: 1, captured: false },
    { id: "r_cannon_2", type: "cannon", color: "red", row: 2, col: 7, captured: false }
  );

  // Red Soldiers at row 3
  for (let c = 0; c < 9; c += 2) {
    pieces.push({
      id: `r_soldier_${c}`,
      type: "soldier",
      color: "red",
      row: 3,
      col: c,
      captured: false,
    });
  }

  // Black is top (rows 5-9)
  // Let's set up Black at row 9
  const blackSetup: { col: number; type: PieceType; id: string }[] = [
    { col: 0, type: "chariot", id: "b_chariot_1" },
    { col: 1, type: "horse", id: "b_horse_1" },
    { col: 2, type: "elephant", id: "b_elephant_1" },
    { col: 3, type: "advisor", id: "b_advisor_1" },
    { col: 4, type: "general", id: "b_general" },
    { col: 5, type: "advisor", id: "b_advisor_2" },
    { col: 6, type: "elephant", id: "b_elephant_2" },
    { col: 7, type: "horse", id: "b_horse_2" },
    { col: 8, type: "chariot", id: "b_chariot_2" },
  ];

  blackSetup.forEach((item) => {
    pieces.push({
      id: item.id,
      type: item.type,
      color: "black",
      row: 9,
      col: item.col,
      captured: false,
    });
  });

  // Black Cannons at row 7
  pieces.push(
    { id: "b_cannon_1", type: "cannon", color: "black", row: 7, col: 1, captured: false },
    { id: "b_cannon_2", type: "cannon", color: "black", row: 7, col: 7, captured: false }
  );

  // Black Soldiers at row 6
  for (let c = 0; c < 9; c += 2) {
    pieces.push({
      id: `b_soldier_${c}`,
      type: "soldier",
      color: "black",
      row: 6,
      col: c,
      captured: false,
    });
  }

  return pieces;
}

// Check boundary
export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row <= 9 && col >= 0 && col <= 8;
}

// Find piece at coordinate
export function getPieceAt(row: number, col: number, pieces: Piece[]): Piece | undefined {
  return pieces.find((p) => !p.captured && p.row === row && p.col === col);
}

// Generate theoretical pseudo-legal moves disregarding check safety
export function getPseudoLegalMoves(piece: Piece, pieces: Piece[]): Position[] {
  const moves: Position[] = [];
  const { row, col, type, color } = piece;

  if (piece.captured) return [];

  switch (type) {
    case "general": {
      // Must stay in Palace: col 3-5, row 0-2 (Red), row 7-9 (Black)
      const rMin = color === "red" ? 0 : 7;
      const rMax = color === "red" ? 2 : 9;
      const cMin = 3;
      const cMax = 5;

      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];

      for (const [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= rMin && nr <= rMax && nc >= cMin && nc <= cMax) {
          const target = getPieceAt(nr, nc, pieces);
          if (!target || target.color !== color) {
            moves.push({ row: nr, col: nc });
          }
        }
      }
      break;
    }

    case "advisor": {
      // Must stay in Palace: col 3-5, row 0-2 (Red), row 7-9 (Black)
      const rMin = color === "red" ? 0 : 7;
      const rMax = color === "red" ? 2 : 9;
      const cMin = 3;
      const cMax = 4; // wait, palace is cols 3, 4, 5. So cols 3 to 5
      const cMaxFull = 5;

      const directions = [
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ];

      for (const [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= rMin && nr <= rMax && nc >= cMin && nc <= cMaxFull) {
          const target = getPieceAt(nr, nc, pieces);
          if (!target || target.color !== color) {
            moves.push({ row: nr, col: nc });
          }
        }
      }
      break;
    }

    case "elephant": {
      // Moves exactly 2 steps diagonally, cannot cross river.
      // Red: rows 0-4, Black: rows 5-9.
      const rMin = color === "red" ? 0 : 5;
      const rMax = color === "red" ? 4 : 9;

      const directions = [
        [-2, -2], [-2, 2], [2, -2], [2, 2]
      ];

      for (const [dr, dc] of directions) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= rMin && nr <= rMax && nc >= 0 && nc <= 8) {
          // Block eye check (Mắt Tượng/Center of the diagonal jump must be empty)
          const midRow = row + dr / 2;
          const midCol = col + dc / 2;
          if (!getPieceAt(midRow, midCol, pieces)) {
            const target = getPieceAt(nr, nc, pieces);
            if (!target || target.color !== color) {
              moves.push({ row: nr, col: nc });
            }
          }
        }
      }
      break;
    }

    case "horse": {
      // Moves orthogonally 1 step, then diagonally 1 step ("L-shaped").
      // Check block (Cản chân Mã)
      const horseMoves = [
        { dr: -2, dc: -1, blockR: -1, blockC: 0 },
        { dr: -2, dc: 1,  blockR: -1, blockC: 0 },
        { dr: 2,  dc: -1, blockR: 1,  blockC: 0 },
        { dr: 2,  dc: 1,  blockR: 1,  blockC: 0 },
        { dr: -1, dc: -2, blockR: 0,  blockC: -1 },
        { dr: 1,  dc: -2, blockR: 0,  blockC: -1 },
        { dr: -1, dc: 2,  blockR: 0,  blockC: 1 },
        { dr: 1,  dc: 2,  blockR: 0,  blockC: 1 },
      ];

      for (const m of horseMoves) {
        const nr = row + m.dr;
        const nc = col + m.dc;
        if (inBounds(nr, nc)) {
          // Check horse leg block
          const blockPiece = getPieceAt(row + m.blockR, col + m.blockC, pieces);
          if (!blockPiece) {
            const target = getPieceAt(nr, nc, pieces);
            if (!target || target.color !== color) {
              moves.push({ row: nr, col: nc });
            }
          }
        }
      }
      break;
    }

    case "chariot": {
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];

      for (const [dr, dc] of directions) {
        let nr = row + dr;
        let nc = col + dc;
        while (inBounds(nr, nc)) {
          const target = getPieceAt(nr, nc, pieces);
          if (!target) {
            moves.push({ row: nr, col: nc });
          } else {
            if (target.color !== color) {
              moves.push({ row: nr, col: nc }); // can capture
            }
            break; // blocked by first piece encountered
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case "cannon": {
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];

      for (const [dr, dc] of directions) {
        let nr = row + dr;
        let nc = col + dc;
        let foundScreen = false;

        while (inBounds(nr, nc)) {
          const target = getPieceAt(nr, nc, pieces);
          
          if (!foundScreen) {
            if (!target) {
              moves.push({ row: nr, col: nc }); // Normal move
            } else {
              foundScreen = true; // Found the screen (Ngòi Pháo)
            }
          } else {
            if (target) {
              // Found target after screen, can capture if opponent color
              if (target.color !== color) {
                moves.push({ row: nr, col: nc });
              }
              break; // Blocked after contact
            }
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case "soldier": {
      // Red starts bottom (row 3 has soldados) and moves positive row dir.
      // Black starts top (row 6 has soldados) and moves negative row dir.
      if (color === "red") {
        // Forward
        const frontR = row + 1;
        if (inBounds(frontR, col)) {
          const target = getPieceAt(frontR, col, pieces);
          if (!target || target.color !== color) {
            moves.push({ row: frontR, col: col });
          }
        }
        // Crossed River (river is at row 4-5. Red crossings are row >= 5)
        if (row >= 5) {
          // Sideways left/right
          for (const dc of [-1, 1]) {
            const nc = col + dc;
            if (inBounds(row, nc)) {
              const target = getPieceAt(row, nc, pieces);
              if (!target || target.color !== color) {
                moves.push({ row: row, col: nc });
              }
            }
          }
        }
      } else {
        // Black
        // Forward (downwards)
        const frontR = row - 1;
        if (inBounds(frontR, col)) {
          const target = getPieceAt(frontR, col, pieces);
          if (!target || target.color !== color) {
            moves.push({ row: frontR, col: col });
          }
        }
        // Crossed River (river is row 4-5. Black crossings are row <= 4)
        if (row <= 4) {
          // Sideways left/right
          for (const dc of [-1, 1]) {
            const nc = col + dc;
            if (inBounds(row, nc)) {
              const target = getPieceAt(row, nc, pieces);
              if (!target || target.color !== color) {
                moves.push({ row: row, col: nc });
              }
            }
          }
        }
      }
      break;
    }
  }

  return moves;
}

// Enforce full legality check (including self-checking and Flying General facing check)
export function getLegalMoves(piece: Piece, pieces: Piece[]): Position[] {
  if (piece.captured) return [];
  
  const pseudoMoves = getPseudoLegalMoves(piece, pieces);
  const legalMoves: Position[] = [];

  for (const move of pseudoMoves) {
    // Simulate move
    const simulatedPieces = pieces.map((p) => {
      if (p.id === piece.id) {
        return { ...p, row: move.row, col: move.col };
      }
      // If capturing
      if (!p.captured && p.row === move.row && p.col === move.col) {
        return { ...p, captured: true };
      }
      return p;
    });

    // Check if the move violates Flying General rule
    if (isFlyingGeneralViolated(simulatedPieces)) {
      continue;
    }

    // Check if making this move leaves own king in check
    if (!isKingInCheck(piece.color, simulatedPieces)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

// Checks if the two generals face each other directly without intermediate pieces
export function isFlyingGeneralViolated(pieces: Piece[]): boolean {
  const redKing = pieces.find((p) => !p.captured && p.type === "general" && p.color === "red");
  const blackKing = pieces.find((p) => !p.captured && p.type === "general" && p.color === "black");

  if (!redKing || !blackKing) return false;

  // Must be on the same column
  if (redKing.col !== blackKing.col) return false;

  const col = redKing.col;
  const startRow = Math.min(redKing.row, blackKing.row);
  const endRow = Math.max(redKing.row, blackKing.row);

  // Check if any piece is bridging the column
  for (let r = startRow + 1; r < endRow; r++) {
    const obstacle = getPieceAt(r, col, pieces);
    if (obstacle) {
      return false; // Intervening piece found, so Flying General rule is NOT violated
    }
  }

  return true; // No intervening pieces, generals face each other directly! Illegal!
}

// Check if a player color's General is attacked by the opponent
export function isKingInCheck(color: PlayerColor, pieces: Piece[]): boolean {
  const targetKing = pieces.find((p) => !p.captured && p.type === "general" && p.color === color);
  if (!targetKing) return false;

  const opponentColor: PlayerColor = color === "red" ? "black" : "red";
  const activeOpponents = pieces.filter((p) => !p.captured && p.color === opponentColor);

  for (const opp of activeOpponents) {
    const pseudo = getPseudoLegalMoves(opp, pieces);
    const attacksKing = pseudo.some((m) => m.row === targetKing.row && m.col === targetKing.col);
    if (attacksKing) {
      return true;
    }
  }

  return false;
}

// Generate all legal moves for a given side
export function getAllLegalMovesForPlayer(color: PlayerColor, pieces: Piece[]): { piece: Piece; moves: Position[] }[] {
  const result: { piece: Piece; moves: Position[] }[] = [];
  const playerPieces = pieces.filter((p) => !p.captured && p.color === color);

  for (const p of playerPieces) {
    const moves = getLegalMoves(p, pieces);
    if (moves.length > 0) {
      result.push({ piece: p, moves });
    }
  }

  return result;
}

// Check if a player is in checkmate
export function isCheckmate(color: PlayerColor, pieces: Piece[]): boolean {
  if (!isKingInCheck(color, pieces)) return false;

  // Let's generate all legal moves. If none exist, it is checkmate
  const allMoves = getAllLegalMovesForPlayer(color, pieces);
  const totalMovesCount = allMoves.reduce((accum, curr) => accum + curr.moves.length, 0);

  return totalMovesCount === 0;
}

// Check if game is in stalemate (current active turn player has no legal moves and is not in check)
export function isStalemate(color: PlayerColor, pieces: Piece[]): boolean {
  if (isKingInCheck(color, pieces)) return false;

  const allMoves = getAllLegalMovesForPlayer(color, pieces);
  const totalMovesCount = allMoves.reduce((accum, curr) => accum + curr.moves.length, 0);

  return totalMovesCount === 0;
}

// Translate column coordinates for move notation
// Chinese Chess represents columns 1 to 9 (from right-to-left for Red, and right-to-left for Black)
// Let's do elegant Vietnamese notation format!
// E.g.: "Pháo 2 bình 5" or "Xe 1 tấn 1" or "Mã 8 thối 7"
export function getVietnameseMoveNotation(
  piece: Piece,
  from: Position,
  to: Position,
  pieces: Piece[]
): string {
  const pieceNameMap: Record<PieceType, string> = {
    general: "Tướng",
    advisor: "Sĩ",
    elephant: "Tượng",
    horse: "Mã",
    chariot: "Xe",
    cannon: "Pháo",
    soldier: "Tốt",
  };

  const name = pieceNameMap[piece.type];

  // Vietnamese column mapping: Red counts columns 1-9 from Red's right-to-left (Col 8 -> Column 1, Col 0 -> Column 9)
  // Wait, standard numbering is 1-9 from right to left of the playing player:
  // For Red (at row 0), index col 8 is R1, col 7 is R2, ..., col 0 is R9. So code is: `9 - col`
  // For Black (at row 9), index col 0 is B1, col 1 is B2, ..., col 8 is B9. So code is `col + 1`
  // Let's implement this elegant standard notation!
  
  const fromColLabel = piece.color === "red" ? (9 - from.col) : (from.col + 1);
  const toColLabel = piece.color === "red" ? (9 - to.col) : (to.col + 1);

  const rowDiff = to.row - from.row;

  let direction = "";
  let distanceOrTargetCol = 0;

  if (rowDiff === 0) {
    // Horizontal (Bình)
    direction = "bình";
    distanceOrTargetCol = toColLabel;
  } else {
    // Vertical or Diagonal (Tấn / Thối)
    const isForward = piece.color === "red" ? rowDiff > 0 : rowDiff < 0;
    direction = isForward ? "tấn" : "thối";

    if (piece.type === "chariot" || piece.type === "cannon" || piece.type === "soldier") {
      // Straight moving pieces count physical rows
      distanceOrTargetCol = Math.abs(rowDiff);
    } else {
      // Diagonally moving pieces (Horse, Advisor, Elephant) count standard column target
      distanceOrTargetCol = toColLabel;
    }
  }

  return `${name} ${fromColLabel} ${direction} ${distanceOrTargetCol}`;
}
