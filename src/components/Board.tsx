/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Piece, Position } from "../types";
import { getLegalMoves, inBounds } from "../engine/board";

interface BoardProps {
  pieces: Piece[];
  selectedPiece: Piece | null;
  onSelectPiece: (piece: Piece | null) => void;
  onMove: (piece: Piece, to: Position) => void;
  activeColor: "red" | "black";
  theme: "wooden" | "imperial" | "modern";
  lastMove: { from: Position; to: Position } | null;
  isGameOver: boolean;
}

export const Board: React.FC<BoardProps> = ({
  pieces,
  selectedPiece,
  onSelectPiece,
  onMove,
  activeColor,
  theme,
  lastMove,
  isGameOver,
}) => {
  // SVG Dimensions & Margins
  const width = 560;
  const height = 620;
  
  const padX = 40;
  const padY = 40;
  const boardW = width - padX * 2;   // 480
  const boardH = height - padY * 2;  // 540
  
  const colSpacing = boardW / 8;     // 60
  const rowSpacing = boardH / 9;     // 60

  // Calculate coordinates
  // Row 0 is at y-bottom (Red back rank), Row 9 is at y-top (Black back rank)
  const getCoords = (row: number, col: number) => {
    return {
      x: padX + col * colSpacing,
      y: padY + (9 - row) * rowSpacing,
    };
  };

  // State for hover targets
  const [hoverPosition, setHoverPosition] = useState<Position | null>(null);

  // Get active targets (legal moves) for the selected piece
  const legalTargets = selectedPiece ? getLegalMoves(selectedPiece, pieces) : [];

  const handleIntersectionClick = (row: number, col: number) => {
    if (isGameOver) return;

    // Check if clicked intersection is a legal move target
    const isTarget = legalTargets.some((t) => t.row === row && t.col === col);
    if (isTarget && selectedPiece) {
      onMove(selectedPiece, { row, col });
      onSelectPiece(null);
      return;
    }

    // Check if clicked on a piece of active turn
    const clickedPiece = pieces.find((p) => !p.captured && p.row === row && p.col === col);
    if (clickedPiece) {
      if (clickedPiece.color === activeColor) {
        onSelectPiece(clickedPiece);
      } else {
        // Can't select opponent's pieces unless it's a capture target (handled above)
        onSelectPiece(null);
      }
    } else {
      onSelectPiece(null);
    }
  };

  // Styling properties depending on active theme
  const getThemeStyles = () => {
    switch (theme) {
      case "imperial":
        return {
          bg: "fill-[#fbf7eb] stroke-neutral-800",
          gridLine: "stroke-neutral-800 opacity-80",
          palaceLine: "stroke-red-900 opacity-60",
          riverText: "fill-neutral-900 font-bold",
          border: "stroke-amber-900 stroke-[5px]",
        };
      case "modern":
        return {
          bg: "fill-[#1e293b] stroke-slate-500",
          gridLine: "stroke-slate-500 opacity-70",
          palaceLine: "stroke-cyan-500 opacity-50",
          riverText: "fill-slate-200 font-medium",
          border: "stroke-cyan-600 stroke-[4px]",
        };
      case "wooden":
      default:
        // Traditional Amber/Wood warmth
        return {
          bg: "fill-[#fcf3e3] stroke-[#6d4c41]",
          gridLine: "stroke-[#8d6e63] opacity-90",
          palaceLine: "stroke-[#d84315] opacity-60",
          riverText: "fill-[#5d4037] font-bold",
          border: "stroke-[#4e342e] stroke-[6px]",
        };
    }
  };

  const styles = getThemeStyles();

  // Rendering Chinese / Vietnamese labels
  const getPieceLabels = (type: string, color: string): { cn: string; vi: string } => {
    if (color === "red") {
      switch (type) {
        case "general": return { cn: "帥", vi: "TƯỚNG" };
        case "advisor": return { cn: "仕", vi: "SĨ" };
        case "elephant": return { cn: "相", vi: "TƯỢNG" };
        case "horse": return { cn: "傌", vi: "MÃ" };
        case "chariot": return { cn: "俥", vi: "XE" };
        case "cannon": return { cn: "炮", vi: "PHÁO" };
        case "soldier": return { cn: "兵", vi: "TỐT" };
      }
    } else {
      switch (type) {
        case "general": return { cn: "將", vi: "TƯỚNG" };
        case "advisor": return { cn: "士", vi: "SĨ" };
        case "elephant": return { cn: "象", vi: "TƯỢNG" };
        case "horse": return { cn: "馬", vi: "MÃ" };
        case "chariot": return { cn: "車", vi: "XE" };
        case "cannon": return { cn: "砲", vi: "PHÁO" };
        case "soldier": return { cn: "卒", vi: "TỐT" };
      }
    }
    return { cn: "", vi: "" };
  };

  return (
    <div className="relative select-none flex justify-center items-center w-full max-w-[560px] mx-auto aspect-[560/620]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto drop-shadow-xl rounded-lg overflow-visible"
        id="xiangqi-game-board-svg"
      >
        {/* Background Canvas */}
        <rect
          x={padX - 25}
          y={padY - 25}
          width={boardW + 50}
          height={boardH + 50}
          className={`${styles.bg} rounded-md`}
          rx={10}
          strokeWidth={1.5}
        />

        {/* Thick Outer Border */}
        <rect
          x={padX - 10}
          y={padY - 10}
          width={boardW + 20}
          height={boardH + 20}
          fill="none"
          className={styles.border}
          rx={6}
        />

        {/* 10 Horizontal Lines */}
        {Array.from({ length: 10 }).map((_, r) => {
          const { y } = getCoords(r, 0);
          return (
            <line
              key={`h-line-${r}`}
              x1={padX}
              y1={y}
              x2={width - padX}
              y2={y}
              className={styles.gridLine}
              strokeWidth={r === 0 || r === 9 ? 2.5 : 1.2}
            />
          );
        })}

        {/* 9 Vertical Lines (with break at the River) */}
        {Array.from({ length: 9 }).map((_, c) => {
          const x = padX + c * colSpacing;
          const { y: yBottom } = getCoords(0, c);
          const { y: yRiverBottom } = getCoords(4, c);
          const { y: yRiverTop } = getCoords(5, c);
          const { y: yTop } = getCoords(9, c);

          const isEdge = c === 0 || c === 8;

          return (
            <React.Fragment key={`v-line-${c}`}>
              {/* Bottom half segment */}
              <line
                x1={x}
                y1={yBottom}
                x2={x}
                y2={isEdge ? yTop : yRiverBottom}
                className={styles.gridLine}
                strokeWidth={isEdge ? 2.5 : 1.2}
              />
              {/* Top half segment */}
              {!isEdge && (
                <line
                  x1={x}
                  y1={yRiverTop}
                  x2={x}
                  y2={yTop}
                  className={styles.gridLine}
                  strokeWidth={1.2}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Palace Diagonals - Red (Cung Đỏ: rows 0-2, cols 3-5) */}
        {(() => {
          const p1 = getCoords(0, 3);
          const p2 = getCoords(2, 5);
          const p3 = getCoords(0, 5);
          const p4 = getCoords(2, 3);
          return (
            <>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={styles.palaceLine} strokeWidth={1.5} />
              <line x1={p3.x} y1={p3.y} x2={p4.x} y2={p4.y} className={styles.palaceLine} strokeWidth={1.5} />
            </>
          );
        })()}

        {/* Palace Diagonals - Black (Cung Đen: rows 7-9, cols 3-5) */}
        {(() => {
          const p1 = getCoords(7, 3);
          const p2 = getCoords(9, 5);
          const p3 = getCoords(7, 5);
          const p4 = getCoords(9, 3);
          return (
            <>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={styles.palaceLine} strokeWidth={1.5} />
              <line x1={p3.x} y1={p3.y} x2={p4.x} y2={p4.y} className={styles.palaceLine} strokeWidth={1.5} />
            </>
          );
        })()}

        {/* River Labels ("Sở Hà" on Black's side, "Hán Giới" on Red's side) */}
        {(() => {
          const { y: yRiverB } = getCoords(4, 0);
          const { y: yRiverT } = getCoords(5, 0);
          const riverCenterY = (yRiverB + yRiverT) / 2;
          return (
            <g>
              <text
                x={padX + colSpacing * 1.5}
                y={riverCenterY + 5}
                className={`${styles.riverText} text-xs font-serif`}
                textAnchor="middle"
                transform={`rotate(180, ${padX + colSpacing * 1.5}, ${riverCenterY})`}
              >
                楚 河 (Sở Hà)
              </text>
              <text
                x={padX + colSpacing * 6.5}
                y={riverCenterY + 5}
                className={`${styles.riverText} text-sm font-bold font-serif`}
                textAnchor="middle"
              >
                漢 界 (Hán Giới)
              </text>
            </g>
          );
        })()}

        {/* Last Move Tracker Highlight (Amber square outlines) */}
        {lastMove && (
          <>
            {(() => {
              const fromC = getCoords(lastMove.from.row, lastMove.from.col);
              const toC = getCoords(lastMove.to.row, lastMove.to.col);
              return (
                <g key="last-move-highlights">
                  <circle
                    cx={fromC.x}
                    cy={fromC.y}
                    r={24}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    className="opacity-75"
                  />
                  <circle
                    cx={toC.x}
                    cy={toC.y}
                    r={24}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    className="opacity-90"
                  />
                </g>
              );
            })()}
          </>
        )}

        {/* Grid Intersection Click Captures (Invisible large targets for touch accuracy) */}
        {Array.from({ length: 10 }).map((_, r) =>
          Array.from({ length: 9 }).map((__, c) => {
            const { x, y } = getCoords(r, c);
            return (
              <circle
                key={`inter-${r}-${c}`}
                cx={x}
                cy={y}
                r={22}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => handleIntersectionClick(r, c)}
              />
            );
          })
        )}

        {/* Valid Move Dots/Indicators */}
        {legalTargets.map((pos, idx) => {
          const { x, y } = getCoords(pos.row, pos.col);
          const hasPiece = pieces.some((p) => !p.captured && p.row === pos.row && p.col === pos.col);
          return (
            <g
              key={`legal-indicator-${idx}`}
              className="pointer-events-none cursor-pointer"
              onClick={() => handleIntersectionClick(pos.row, pos.col)}
            >
              {hasPiece ? (
                // Capture indicator rim
                <circle
                  cx={x}
                  cy={y}
                  r={24}
                  fill="none"
                  stroke={activeColor === "red" ? "#ef4444" : "#10b981"}
                  strokeWidth={3}
                  className="animate-pulse"
                />
              ) : (
                // Simple translucent travel target dot
                <circle
                  cx={x}
                  cy={y}
                  r={7}
                  fill={activeColor === "red" ? "#f43f5e" : "#06b6d4"}
                  className="opacity-75 fill-current"
                />
              )}
            </g>
          );
        })}

        {/* Render Active Pieces */}
        {pieces
          .filter((p) => !p.captured)
          .map((piece) => {
            const { x, y } = getCoords(piece.row, piece.col);
            const isSelected = selectedPiece?.id === piece.id;
            const labels = getPieceLabels(piece.type, piece.color);
            
            const isRed = piece.color === "red";

            // Piece styling
            const outerCircleClass = isRed
              ? "fill-red-50 stroke-red-600 shadow-md"
              : "fill-neutral-800 stroke-neutral-900 shadow-md";

            const characterClass = isRed
              ? "fill-red-700 font-extrabold"
              : "fill-yellow-500 font-extrabold";

            const subLabelClass = isRed
              ? "fill-red-800 tracking-tighter"
              : "fill-neutral-400 tracking-tighter";

            return (
              <g
                key={piece.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  handleIntersectionClick(piece.row, piece.col);
                }}
              >
                {/* Selected Ring/Pulse */}
                {isSelected && (
                  <circle
                    r={26}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={4.5}
                    className="animate-ping opacity-60"
                  />
                )}

                {/* Main Wooden/Ivory Token Base */}
                <circle
                  r={22}
                  className={`${outerCircleClass} transition-all duration-200 hover:scale-105`}
                  strokeWidth={2.5}
                  style={{
                    filter: "drop-shadow(2px 3px 3px rgba(0,0,0,0.3))"
                  }}
                />

                {/* Inner Border Ring */}
                <circle
                  r={19}
                  fill="none"
                  stroke={isRed ? "#fecaca" : "#4b5563"}
                  strokeWidth={1}
                />

                {/* Primary Traditional Chinese Character */}
                <text
                  y={4}
                  textAnchor="middle"
                  className={`${characterClass} text-[21px] font-serif`}
                  style={{ userSelect: "none" }}
                >
                  {labels.cn}
                </text>

                {/* Vietnamese helper subscript */}
                <text
                  y={15}
                  textAnchor="middle"
                  className={`${subLabelClass} text-[7px] font-sans font-bold`}
                  style={{ userSelect: "none" }}
                >
                  {labels.vi}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
};
