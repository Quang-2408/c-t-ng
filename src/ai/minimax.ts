/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Piece, PieceType, PlayerColor, Position } from "../types";
import { getLegalMoves, getAllLegalMovesForPlayer, isKingInCheck, isFlyingGeneralViolated } from "../engine/board";

// Material value tables
const PIECE_VALUES: Record<PieceType, number> = {
  general: 10000,
  chariot: 90,
  cannon: 45,
  horse: 40,
  elephant: 15, // 15 to balance defensive weight
  advisor: 15,
  soldier: 10,  // starts at 10, increases after crossing river
};

// Positional bonuses: Piece-Square tables (from Red perspective)
// Columns are 0-8, Rows are 0-9.
// Row 0 is Red back rank, Row 9 is Black back rank.
// For Black, we mirror the table by row: row_black = 9 - row_red

const SOLDIER_PST_RED = [
  [0,  3,  6,  9, 12,  9,  6,  3,  0], // row 0 (back rank, soldier never goes here)
  [0,  0,  0,  0,  0,  0,  0,  0,  0], // row 1
  [0,  0,  0,  0,  0,  0,  0,  0,  0], // row 2
  [0,  1,  2,  3,  4,  3,  2,  1,  0], // row 3 (starting soldier spots)
  [0,  2,  4,  6,  8,  6,  4,  2,  0], // row 4 (river bank)
  // ---- RIVER ----
  [6, 12, 18, 24, 26, 24, 18, 12,  6], // row 5 (just crossed)
  [8, 16, 22, 28, 30, 28, 22, 16,  8], // row 6
  [12, 18, 24, 30, 32, 30, 24, 18, 12], // row 7 (deep opponent territory)
  [14, 20, 26, 32, 34, 32, 26, 20, 14], // row 8
  [4,  8, 12, 16, 16, 16, 12,  8,  4]  // row 9 (extreme rank)
];

const HORSE_PST_RED = [
  [ 0, -5, -4, -3, -3, -3, -4, -5,  0], // row 0
  [ 2,  4,  6,  8,  8,  8,  6,  4,  2], // row 1 (development spots)
  [ 4,  8, 12, 14, 14, 14, 12,  8,  4], // row 2
  [ 6, 10, 14, 18, 18, 18, 14, 10,  6], // row 3
  [ 8, 12, 16, 20, 22, 20, 16, 12,  8], // row 4
  [10, 14, 18, 22, 24, 22, 18, 14, 10], // row 5
  [12, 16, 20, 24, 26, 24, 20, 16, 12], // row 6
  [10, 14, 18, 22, 22, 22, 18, 14, 10], // row 7
  [ 4,  8, 12, 14, 14, 14, 12,  8,  4], // row 8
  [ 0,  2,  4,  6,  6,  6,  4,  2,  0]  // row 9
];

const CANNON_PST_RED = [
  [ 0,  0,  0,  3,  5,  3,  0,  0,  0], // row 0
  [ 0,  2,  4,  6,  6,  6,  4,  2,  0], // row 1
  [ 0,  4,  6,  8,  8,  8,  6,  4,  0], // row 2 (standard spots)
  [ 2,  6,  8, 10, 12, 10,  8,  6,  2], // row 3
  [ 4,  8, 10, 12, 14, 12, 10,  8,  4], // row 4
  [ 6, 10, 12, 14, 16, 14, 12, 10,  6], // row 5
  [ 8, 12, 14, 16, 18, 16, 14, 12,  8], // row 6
  [ 6, 10, 12, 14, 14, 14, 12, 10,  6], // row 7
  [ 2,  4,  6,  8,  8,  8,  6,  4,  2], // row 8
  [ 0,  0,  2,  4,  4,  4,  2,  0,  0]  // row 9
];

const CHARIOT_PST_RED = [
  [ -2,  0,  2,  4,  4,  4,  2,  0, -2], // row 0
  [  0,  4,  4,  6,  8,  6,  4,  4,  0], // row 1
  [  2,  6,  6,  8, 10,  8,  6,  6,  2], // row 2
  [  4,  8,  8, 10, 12, 10,  8,  8,  4], // row 3
  [  6, 10, 10, 12, 14, 12, 10, 10,  6], // row 4
  [  8, 12, 12, 14, 16, 14, 12, 12,  8], // row 5
  [ 10, 14, 14, 16, 18, 16, 14, 14, 10], // row 6
  [ 12, 16, 16, 18, 20, 18, 16, 16, 12], // row 7
  [ 10, 14, 14, 16, 18, 16, 14, 14, 10], // row 8
  [  6,  8,  8, 10, 12, 10,  8,  8,  6]  // row 9
];

// Evaluate the board statically
// Return evaluation score: Positive favors Red, Negative favors Black
export function evaluateBoard(pieces: Piece[]): number {
  let score = 0;

  for (const piece of pieces) {
    if (piece.captured) continue;

    const { type, color, row, col } = piece;
    const isRed = color === "red";
    const multiplier = isRed ? 1 : -1;

    // 1. Base Material Value
    let value = PIECE_VALUES[type];

    // Increase soldier value as it crosses river or approaches general
    if (type === "soldier") {
      const crossedRiver = isRed ? row >= 5 : row <= 4;
      if (crossedRiver) value += 10; // crossed river solder behaves like powerful warrior
    }

    score += multiplier * value;

    // 2. Position Value
    let pstValue = 0;
    const r = isRed ? row : 9 - row; // Map to the Red visual orientation index
    const c = col;

    switch (type) {
      case "soldier":
        pstValue = SOLDIER_PST_RED[r]?.[c] || 0;
        break;
      case "horse":
        pstValue = HORSE_PST_RED[r]?.[c] || 0;
        break;
      case "cannon":
        pstValue = CANNON_PST_RED[r]?.[c] || 0;
        break;
      case "chariot":
        pstValue = CHARIOT_PST_RED[r]?.[c] || 0;
        break;
      case "general":
        pstValue = 2; // subtle central palace center weight
        break;
      default:
        break;
    }

    score += multiplier * pstValue;
  }

  return score;
}

interface AIMove {
  piece: Piece;
  to: Position;
  score: number;
}

// Alpha-Beta minimax search logic
function minimax(
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  turnColor: PlayerColor
): { score: number; moveCount: number } {
  // Terminal states or depth limits
  if (depth === 0) {
    return { score: evaluateBoard(pieces), moveCount: 1 };
  }

  const legalMoves = getAllLegalMovesForPlayer(turnColor, pieces);
  const totalMovesCount = legalMoves.reduce((acc, curr) => acc + curr.moves.length, 0);

  if (totalMovesCount === 0) {
    // Checkmate or stalemate
    if (isKingInCheck(turnColor, pieces)) {
      // Checkmate loss
      return { score: isMaximizing ? -20000 + (3 - depth) : 20000 - (3 - depth), moveCount: 0 };
    } else {
      // Stalemate: Draw (usually valued at 0)
      return { score: 0, moveCount: 0 };
    }
  }

  // Basic move ordering: captures first to improve alpha-beta pruning speed
  const flattenedMoves: { piece: Piece; to: Position; priority: number }[] = [];
  for (const group of legalMoves) {
    for (const to of group.moves) {
      const target = pieces.find((p) => !p.captured && p.row === to.row && p.col === to.col);
      // Capture priority
      let priority = 0;
      if (target) {
        priority = PIECE_VALUES[target.type] * 10 - PIECE_VALUES[group.piece.type];
      }
      flattenedMoves.push({ piece: group.piece, to, priority });
    }
  }

  // Sort by priority desc
  flattenedMoves.sort((a, b) => b.priority - a.priority);

  let nodeCount = 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of flattenedMoves) {
       // Simulate move
       const currId = move.piece.id;
       const originalPieces = pieces.map(p => ({...p}));
       
       // execute on originalPieces copy
       const index = originalPieces.findIndex(p => p.id === currId);
       const originalR = originalPieces[index].row;
       const originalC = originalPieces[index].col;
       
       originalPieces[index].row = move.to.row;
       originalPieces[index].col = move.to.col;
       
       const capIndex = originalPieces.findIndex(p => !p.captured && p.row === move.to.row && p.col === move.to.col && p.id !== currId);
       if (capIndex !== -1) {
         originalPieces[capIndex].captured = true;
       }

       const nextColor: PlayerColor = "black";
       const result = minimax(originalPieces, depth - 1, alpha, beta, false, nextColor);
       nodeCount += result.moveCount;

       maxEval = Math.max(maxEval, result.score);
       alpha = Math.max(alpha, result.score);
       if (beta <= alpha) {
         break; // Beta cut-off
       }
    }
    return { score: maxEval, moveCount: nodeCount + 1 };
  } else {
    let minEval = Infinity;
    for (const move of flattenedMoves) {
       // Simulate move
       const currId = move.piece.id;
       const originalPieces = pieces.map(p => ({...p}));
       
       // execute on originalPieces copy
       const index = originalPieces.findIndex(p => p.id === currId);
       originalPieces[index].row = move.to.row;
       originalPieces[index].col = move.to.col;
       
       const capIndex = originalPieces.findIndex(p => !p.captured && p.row === move.to.row && p.col === move.to.col && p.id !== currId);
       if (capIndex !== -1) {
         originalPieces[capIndex].captured = true;
       }

       const nextColor: PlayerColor = "red";
       const result = minimax(originalPieces, depth - 1, alpha, beta, true, nextColor);
       nodeCount += result.moveCount;

       minEval = Math.min(minEval, result.score);
       beta = Math.min(beta, result.score);
       if (beta <= alpha) {
         break; // Alpha cut-off
       }
    }
    return { score: minEval, moveCount: nodeCount + 1 };
  }
}

// Generate the best move for the active computer player
export function playAIMove(
  pieces: Piece[],
  aiColor: PlayerColor,
  difficulty: "easy" | "medium" | "hard"
): { piece: Piece; to: Position; score: number } | null {
  
  const legalMoves = getAllLegalMovesForPlayer(aiColor, pieces);
  const totalMoves: { piece: Piece; to: Position; priority: number }[] = [];

  for (const group of legalMoves) {
    for (const to of group.moves) {
      const target = pieces.find((p) => !p.captured && p.row === to.row && p.col === to.col);
      let priority = 0;
      if (target) {
        priority = PIECE_VALUES[target.type] * 5;
      }
      totalMoves.push({ piece: group.piece, to, priority });
    }
  }

  if (totalMoves.length === 0) return null;

  // Determine search depth based on difficulty
  let depth = 1;
  if (difficulty === "medium") depth = 2;
  // If Hard, we use depth 3 to run within 1-2 seconds smoothly.
  if (difficulty === "hard") depth = 3;

  const isMaximizing = aiColor === "red"; // Red is maximizing, Black minimizing

  // Scored moves mapping
  const scoredMoves: { piece: Piece; to: Position; score: number }[] = [];

  for (const m of totalMoves) {
    // Simulate move
    const simulated = pieces.map((p) => {
      if (p.id === m.piece.id) {
        return { ...p, row: m.to.row, col: m.to.col };
      }
      if (!p.captured && p.row === m.to.row && p.col === m.to.col) {
        return { ...p, captured: true };
      }
      return p;
    });

    const nextColor: PlayerColor = aiColor === "red" ? "black" : "red";
    const result = minimax(
      simulated,
      depth - 1,
      -Infinity,
      Infinity,
      !isMaximizing,
      nextColor
    );
    
    scoredMoves.push({
      piece: m.piece,
      to: m.to,
      score: result.score,
    });
  }

  // Easy mode: introduces occasional variance or chooses some random moves among 40% best to feel human-like
  if (difficulty === "easy") {
    // Sort in terms of utility
    if (isMaximizing) {
      scoredMoves.sort((a, b) => b.score - a.score);
    } else {
      scoredMoves.sort((a, b) => a.score - b.score);
    }
    // Pick randomly from the top 4 candidates to keep it easy and conversational
    const sliceCount = Math.min(4, scoredMoves.length);
    const randomIndex = Math.floor(Math.random() * sliceCount);
    return scoredMoves[randomIndex] || null;
  }

  // Medium and Hard: select strictly the absolute best move
  if (isMaximizing) {
    scoredMoves.sort((a, b) => b.score - a.score);
  } else {
    scoredMoves.sort((a, b) => a.score - b.score);
  }

  return scoredMoves[0] || null;
}
