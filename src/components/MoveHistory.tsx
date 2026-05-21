/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { MatchMove } from "../types";
import { ScrollText } from "lucide-react";

interface MoveHistoryProps {
  history: MatchMove[];
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({ history }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the list when moves are performed
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  // Group history in pairs of Red and Black moves
  const pairs: { red?: MatchMove; black?: MatchMove }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    pairs.push({
      red: history[i],
      black: history[i + 1],
    });
  }

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 h-full flex flex-col justify-between shadow-lg text-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-2">
        <ScrollText className="w-5 h-5 text-amber-500 animate-pulse" />
        <h3 className="font-semibold text-sm tracking-wide text-slate-100 uppercase">
          Biên Bản Trận Đấu
        </h3>
        <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
          {history.length} nước
        </span>
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-10 transition-all text-xs">
          <p className="italic text-center">Chưa có nước đi nào.</p>
          <p className="text-[10px] text-slate-600 mt-1">Chọn quân đỏ đi trước</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto max-h-[180px] md:max-h-[300px] space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
        >
          {pairs.map((pair, idx) => (
            <div
              key={`move-pair-${idx}`}
              className="grid grid-cols-12 text-xs py-1.5 px-2 hover:bg-slate-800/40 rounded transition-all items-center border-b border-slate-800/20"
            >
              {/* Index */}
              <div className="col-span-2 text-slate-500 font-mono text-center">
                {idx + 1}.
              </div>

              {/* Red Move */}
              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shrink-0 shadow" />
                <span className="font-medium text-red-50 font-sans truncate">
                  {pair.red?.notation}
                </span>
              </div>

              {/* Black Move */}
              <div className="col-span-5 flex items-center gap-1.5">
                {pair.black ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-100 inline-block shrink-0 shadow" />
                    <span className="font-medium text-slate-200 font-sans truncate">
                      {pair.black.notation}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-600 italic">...Đang nghĩ</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notation helper footnote */}
      <div className="border-t border-slate-800 pt-2.5 mt-2.5 text-[9px] text-slate-500 leading-normal">
        <p className="font-semibold text-[10px] mb-1">Cách đọc biên bản:</p>
        <p>Xe 2 tấn 3 (Xe cột 2 đi tới 3 ô)</p>
        <p>Pháo 5 bình 6 (Pháo cột 5 di chuyển ngang qua cột 6)</p>
      </div>
    </div>
  );
};
