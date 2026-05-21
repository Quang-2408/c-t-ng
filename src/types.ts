/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PlayerColor = "red" | "black";

export type PieceType = 
  | "general"    // Tướng
  | "advisor"    // Sĩ
  | "elephant"   // Tượng
  | "horse"      // Mã
  | "chariot"    // Xe
  | "cannon"     // Pháo
  | "soldier";   // Tốt

export interface Piece {
  id: string;         // Unique id e.g., 'r_chariot_1'
  type: PieceType;
  color: PlayerColor;
  row: number;        // 0 to 9
  col: number;        // 0 to 8
  captured: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface MatchMove {
  piece: Piece;
  from: Position;
  to: Position;
  capturedPiece?: Piece;
  notation: string;    // Vietnamese notation e.g., Xe 2 tấn 3
  timestamp: number;
}

export type GameMode = "vs_ai" | "pass_and_play";

export type GameStatus = 
  | "active" 
  | "check"         // Chiếu Tướng
  | "checkmate"     // Thua/Chiếu Bí
  | "stalemate"     // Hòa/Vô loại
  | "draw";         // Hòa thỏa thuận / 60 nước

export interface GameSettings {
  mode: GameMode;
  aiDifficulty: "easy" | "medium" | "hard";
  theme: "wooden" | "imperial" | "modern";
}

export interface AICoachFeedback {
  generalCommentary: string;
  warning: string;
  suggestedMove: string;
  strategyTip: string;
}
