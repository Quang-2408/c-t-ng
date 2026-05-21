/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Piece, PieceType } from "../types";

interface CapturedPiecesProps {
  pieces: Piece[];
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ pieces }) => {
  // Captured bags
  const redCaptured = pieces.filter((p) => p.captured && p.color === "red");
  const blackCaptured = pieces.filter((p) => p.captured && p.color === "black");

  const getPieceLogo = (type: PieceType, color: "red" | "black"): string => {
    if (color === "red") {
      switch (type) {
        case "general": return "帥";
        case "advisor": return "仕";
        case "elephant": return "相";
        case "horse": return "傌";
        case "chariot": return "俥";
        case "cannon": return "炮";
        case "soldier": return "兵";
      }
    } else {
      switch (type) {
        case "general": return "將";
        case "advisor": return "士";
        case "elephant": return "象";
        case "horse": return "馬";
        case "chariot": return "車";
        case "cannon": return "砲";
        case "soldier": return "卒";
      }
    }
    return "";
  };

  return (
    <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 shadow text-xs space-y-3">
      {/* Red's captured trophy bag (Black pieces captured by Red) */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase font-bold text-red-500 min-w-[70px] shrink-0">
          Đỏ ăn được:
        </span>
        <div className="flex flex-wrap gap-1">
          {blackCaptured.length === 0 ? (
            <span className="text-slate-600 italic text-[10px]">Chưa ăn quân nào</span>
          ) : (
            blackCaptured.map((p) => (
              <span
                key={p.id}
                className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 text-yellow-500 font-serif flex items-center justify-center font-bold text-[11px] shadow-inner"
                title={`${p.type} (${p.color})`}
              >
                {getPieceLogo(p.type, p.color)}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Black's captured trophy bag (Red pieces captured by Black) */}
      <div className="flex items-center gap-2 border-t border-slate-800/40 pt-2.5">
        <span className="text-[10px] uppercase font-bold text-slate-400 min-w-[70px] shrink-0">
          Đen ăn được:
        </span>
        <div className="flex flex-wrap gap-1">
          {redCaptured.length === 0 ? (
            <span className="text-slate-600 italic text-[10px]">Chưa ăn quân nào</span>
          ) : (
            redCaptured.map((p) => (
              <span
                key={p.id}
                className="w-6 h-6 rounded-full bg-red-900 border border-red-800 text-red-100 font-serif flex items-center justify-center font-bold text-[11px] shadow-inner"
                title={`${p.type} (${p.color})`}
              >
                {getPieceLogo(p.type, p.color)}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
