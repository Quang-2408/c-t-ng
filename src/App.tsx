/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Piece, MatchMove, Position, GameStatus, GameMode, GameSettings } from "./types";
import { getInitialPieces, isKingInCheck, isCheckmate, isStalemate, getVietnameseMoveNotation } from "./engine/board";
import { playAIMove } from "./ai/minimax";
import { sounds } from "./utils/audio";
import { Board } from "./components/Board";
import { MoveHistory } from "./components/MoveHistory";
import { CapturedPieces } from "./components/CapturedPieces";
import { AICoachPanel } from "./components/AICoachPanel";
import {
  Swords,
  Users,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  Sliders,
  Play,
  RotateCw,
  Trophy,
  AlertCircle,
  HelpCircle,
  Loader2,
  X
} from "lucide-react";

export default function App() {
  // Core game states
  const [pieces, setPieces] = useState<Piece[]>(() => getInitialPieces());
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [activeColor, setActiveColor] = useState<"red" | "black">("red"); // Red moves first
  const [history, setHistory] = useState<MatchMove[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);

  // Takeback / Undo stacks
  const [boardHistoryStack, setBoardHistoryStack] = useState<Piece[][]>([]);
  const [lastMoveStack, setLastMoveStack] = useState<({ from: Position; to: Position } | null)[]>([]);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    mode: "vs_ai",
    aiDifficulty: "medium",
    theme: "wooden"
  });

  // Clocks/Timers (10 minutes defaults)
  const [redTime, setRedTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [timerActive, setTimerActive] = useState<boolean>(true);

  // App UI panels & helpers
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [aiIsThinking, setAiIsThinking] = useState<boolean>(false);

  // Status warnings
  const [gameStatus, setGameStatus] = useState<GameStatus>("active");
  const [winnerMessage, setWinnerMessage] = useState<string | null>(null);

  // 1. Game Clock Timer Execution
  useEffect(() => {
    let interval: any = null;
    if (timerActive && gameStatus === "active" && !aiIsThinking) {
      interval = setInterval(() => {
        if (activeColor === "red") {
          setRedTime((prev) => {
            if (prev <= 1) {
              setGameStatus("checkmate");
              setWinnerMessage("Hết giờ! Màu Đen thắng cuộc bằng thời gian.");
              if (soundEnabled) sounds.playWin();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 1) {
              setGameStatus("checkmate");
              setWinnerMessage("Hết giờ! Màu Đỏ thắng cuộc bằng thời gian.");
              if (soundEnabled) sounds.playWin();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameStatus, activeColor, aiIsThinking, soundEnabled]);

  // 2. Automated AI Turn Trigger
  useEffect(() => {
    // If it's vs AI mode, and Black's turn, trigger the Minimax AI
    if (settings.mode === "vs_ai" && activeColor === "black" && gameStatus === "active") {
      setAiIsThinking(true);
      
      const timeout = setTimeout(() => {
        const bestMoveResult = playAIMove(pieces, "black", settings.aiDifficulty);
        
        if (bestMoveResult) {
          executeMove(bestMoveResult.piece, bestMoveResult.to);
        } else {
          // If no legal moves available for AI, handle draw/stalemate
          setGameStatus("stalemate");
          setWinnerMessage("Sư phụ nhận thua bất lực! Đại thắng chúc mừng!");
          if (soundEnabled) sounds.playWin();
        }
        setAiIsThinking(false);
      }, 800); // realistic think buffer delay

      return () => clearTimeout(timeout);
    }
  }, [activeColor, settings.mode, settings.aiDifficulty, gameStatus, pieces, soundEnabled]);

  // Core move executor function
  const executeMove = (piece: Piece, to: Position) => {
    const from: Position = { row: piece.row, col: piece.col };

    // Register Undo history capture BEFORE mutating current board
    setBoardHistoryStack((prev) => [...prev, pieces.map((p) => ({ ...p }))]);
    setLastMoveStack((prev) => [...prev, lastMove]);

    // Track capture status
    let capturedPiece: Piece | undefined;
    const nextPieces = pieces.map((p) => {
      // Find piece being moved
      if (p.id === piece.id) {
        return { ...p, row: to.row, col: to.col };
      }
      // Check capture collision spot
      if (!p.captured && p.row === to.row && p.col === to.col) {
        capturedPiece = p;
        return { ...p, captured: true };
      }
      return p;
    });

    // Sound effect
    if (soundEnabled) {
      if (capturedPiece) {
        sounds.playCapture();
      } else {
        sounds.playMove();
      }
    }

    // Process notation
    const moveNotation = getVietnameseMoveNotation(piece, from, to, pieces);
    const newMoveRecord: MatchMove = {
      piece,
      from,
      to,
      capturedPiece,
      notation: moveNotation,
      timestamp: Date.now(),
    };

    const nextColor: "red" | "black" = piece.color === "red" ? "black" : "red";

    // Update board state
    setPieces(nextPieces);
    setLastMove({ from, to });
    setHistory((prev) => [...prev, newMoveRecord]);
    setSelectedPiece(null);

    // Evaluate Next Game Status (checks / checkmates)
    const inCheck = isKingInCheck(nextColor, nextPieces);
    if (inCheck) {
      const isCheckmateState = isCheckmate(nextColor, nextPieces);
      if (isCheckmateState) {
        setGameStatus("checkmate");
        const winner = piece.color === "red" ? "MÀU ĐỎ (Red)" : "MÀU ĐEN (Black)";
        setWinnerMessage(`CHIẾU BÍ! Trận đấu kết thúc, chiến thắng thuộc về ${winner}.`);
        if (soundEnabled) sounds.playWin();
      } else {
        setGameStatus("check");
        if (soundEnabled) sounds.playCheck();
      }
    } else {
      // Verify stalemate
      const isStalemateState = isStalemate(nextColor, nextPieces);
      if (isStalemateState) {
        setGameStatus("stalemate");
        setWinnerMessage("HÒA CỪ (Stalemate)! Một bên không còn nước cờ hợp lệ.");
      } else {
        setGameStatus("active");
      }
    }

    // Toggle active turn
    setActiveColor(nextColor);
  };

  // Turn reset / restart match
  const handleRestart = () => {
    setPieces(getInitialPieces());
    setSelectedPiece(null);
    setActiveColor("red");
    setHistory([]);
    setLastMove(null);
    setBoardHistoryStack([]);
    setLastMoveStack([]);
    setRedTime(600);
    setBlackTime(600);
    setGameStatus("active");
    setWinnerMessage(null);
    setAiIsThinking(false);
  };

  // Takeback / Undo step implementation
  const handleUndo = () => {
    // If vs AI, we should undo two steps so we return to our active Red turn!
    const stepsToUndo = settings.mode === "vs_ai" ? 2 : 1;

    let targetBoardHistory = [...boardHistoryStack];
    let targetLastMoveHistory = [...lastMoveStack];
    let targetHistoryMove = [...history];

    if (targetBoardHistory.length < stepsToUndo) return;

    let poppedBoard: Piece[] | undefined;
    let poppedLast: { from: Position; to: Position } | null = null;

    for (let i = 0; i < stepsToUndo; i++) {
      poppedBoard = targetBoardHistory.pop();
      poppedLast = targetLastMoveHistory.pop() || null;
      targetHistoryMove.pop();
    }

    if (poppedBoard) {
      setPieces(poppedBoard);
      setLastMove(poppedLast);
      setHistory(targetHistoryMove);
      setBoardHistoryStack(targetBoardHistory);
      setLastMoveStack(targetLastMoveHistory);
      setSelectedPiece(null);
      setGameStatus("active");
      setWinnerMessage(null);

      // Restore color turn appropriately
      if (settings.mode === "vs_ai") {
        setActiveColor("red"); // ALWAYS user turn in vs AI undo
      } else {
        // Multi-player pass and play toggles appropriately
        setActiveColor(activeColor === "red" ? "black" : "red");
      }

      if (soundEnabled) sounds.playMove();
    }
  };

  // Convert minutes countdown beautifully
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* 1. Header Navigation Bar */}
      <header className="border-b border-slate-800 bg-[#0f172a] px-4 py-3.5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-900/20">
              <span className="text-xl font-bold text-white font-serif">帥</span>
            </div>
            <div>
              <h1 className="text-base md:text-lg font-extrabold tracking-wide text-neutral-50 flex items-center gap-2">
                Kỳ Vương Trí Bản
                <span className="text-xs bg-red-600/20 text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-500/20">
                  Cờ Tướng
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-serif tracking-wider">
                Elite Chinese Chess with Grandmaster Coach
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="flex items-center gap-2.5">
            
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:text-amber-400 border border-slate-700/50 transition-all cursor-pointer"
              title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
              id="sound-trigger-btn"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-500" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Quick Rules */}
            <button
              onClick={() => setShowInstructions(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:text-amber-400 border border-slate-700/50 transition-all flex items-center gap-1 cursor-pointer text-xs font-semibold"
              title="Hướng dẫn luật chơi"
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">Luật Chơi</span>
            </button>

            {/* Game Options Modal Trigger */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:text-amber-400 border border-slate-700/50 transition-all flex items-center gap-1 cursor-pointer text-xs font-semibold"
              title="Cài đặt trận đấu"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Trận Đấu</span>
            </button>

          </div>
        </div>
      </header>

      {/* 2. Primary Playfield Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Game Board, State banner, Timer clocks (col-span-12 to col-span-7) */}
        <section className="lg:col-span-7 flex flex-col items-center gap-4">
          
          {/* Active Banner Alerts (for Checks & Wins) */}
          {(gameStatus === "check" || gameStatus === "checkmate" || gameStatus === "stalemate" || winnerMessage) && (
            <div className={`w-full p-3.5 rounded-xl border flex items-center gap-3 animate-bounce shadow-lg ${
              gameStatus === "checkmate" || gameStatus === "stalemate" || winnerMessage
                ? "bg-amber-950/40 border-amber-800 text-amber-200"
                : "bg-red-950/40 border-red-800 text-red-200"
            }`}>
              {gameStatus === "checkmate" ? (
                <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
              )}
              <div className="text-xs">
                <span className="font-bold block uppercase tracking-wider">
                  {gameStatus === "checkmate" ? "KẾT THÚC TRẬN ĐẤU" : "QUY QUÂN BÁO ĐỘNG"}
                </span>
                <p className="font-medium">{winnerMessage || "TƯỚNG QUÂN ĐANG BỊ CHIẾU! Hãy hộ giá phòng vệ ngay."}</p>
              </div>
              {winnerMessage && (
                <button
                  onClick={handleRestart}
                  className="ml-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                >
                  Chơi Lại
                </button>
              )}
            </div>
          )}

          {/* Player Clocks Status & Quick Mode Indicator */}
          <div className="w-full grid grid-cols-2 gap-4">
            
            {/* Red Player (Visitor/User) Card */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeColor === "red" && gameStatus === "active"
                ? "bg-red-950/20 border-red-500/50 shadow-md ring-1 ring-red-500/30"
                : "bg-slate-900/60 border-slate-800"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-md animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">NAM ĐỎ (Bạn)</span>
                </div>
                <span className={`text-base font-mono font-bold ${activeColor === "red" ? "text-red-400" : "text-slate-400"}`}>
                  {formatTime(redTime)}
                </span>
              </div>
            </div>

            {/* Black Player (AI or Local Friend) Card */}
            <div className={`p-3 rounded-xl border transition-all ${
              activeColor === "black" && gameStatus === "active"
                ? "bg-neutral-800 border-yellow-500/50 shadow-md ring-1 ring-yellow-500/30"
                : "bg-slate-900/60 border-slate-800"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-100 shadow-md animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">
                    {settings.mode === "vs_ai" ? `SƯ PHỤ ĐEN (${settings.aiDifficulty.toUpperCase()})` : "BẮC ĐEN (Bên Kia)"}
                  </span>
                </div>
                {aiIsThinking ? (
                  <span className="text-xs text-amber-400 font-semibold animate-pulse">Sư phụ nghĩ...</span>
                ) : (
                  <span className={`text-base font-mono font-bold ${activeColor === "black" ? "text-amber-400" : "text-slate-400"}`}>
                    {formatTime(blackTime)}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* SVG Board wrapper */}
          <div className="p-3 bg-slate-900/40 rounded-2xl border border-slate-800/80 w-full flex items-center justify-center relative overflow-hidden">
            
            {/* AI Calculation Overlay */}
            {aiIsThinking && (
              <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-3">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center text-center animate-pulse gap-2 max-w-[220px]">
                  <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                  <span className="text-xs text-amber-400 font-mono">Sư Phụ đang đi nước cờ...</span>
                </div>
              </div>
            )}

            <Board
              pieces={pieces}
              selectedPiece={selectedPiece}
              onSelectPiece={setSelectedPiece}
              onMove={executeMove}
              activeColor={activeColor}
              theme={settings.theme}
              lastMove={lastMove}
              isGameOver={gameStatus === "checkmate" || gameStatus === "stalemate"}
            />
          </div>

          {/* Bottom Action Controls Button Rail */}
          <div className="w-full flex justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-red-400 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4.5 h-4.5" />
              Chơi Mới
            </button>
            
            <button
              onClick={handleUndo}
              disabled={boardHistoryStack.length === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-amber-400 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:hover:text-slate-300 disabled:cursor-not-allowed"
            >
              <RotateCw className="w-4.5 h-4.5" />
              Đi Lại (Undo)
            </button>

            <button
              onClick={() => setTimerActive(!timerActive)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-blue-400 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {timerActive ? "Dừng Đồng Hồ" : "Nhấp Giờ Chơi"}
            </button>
          </div>

        </section>

        {/* Right Side: Moves history, Captured bag, and Sư Phụ Coaching Panel (col-span-12 to col-span-5) */}
        <section className="lg:col-span-5 flex flex-col gap-5">
          
          {/* Captured list */}
          <CapturedPieces pieces={pieces} />

          {/* AI Master Intelligence helper coach */}
          <AICoachPanel pieces={pieces} history={history} turn={activeColor} />

          {/* Move History Ledger */}
          <MoveHistory history={history} />

        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-[#070a13] py-4 px-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p>© 2026 Kỳ Vương Trí Bản. Sản xuất dành riêng cho Việt Chess Cộng Đồng.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-amber-500 transition-all">Quy chế giải đấu</a>
            <a href="#" className="hover:text-amber-500 transition-all">Phản hồi lỗi Kỳ đài</a>
          </div>
        </div>
      </footer>

      {/* 3. RULE MODAL DIALOG */}
      {showInstructions && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-text">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <span className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-serif font-bold flex items-center justify-center rounded">
                書
              </span>
              <h3 className="font-extrabold text-base tracking-wide text-white uppercase">
                Bảng Hướng Dẫn Luật Chơi Cờ Tướng
              </h3>
            </div>

            <div className="space-y-4 text-slate-350 text-xs leading-relaxed">
              <div>
                <h4 className="font-bold text-amber-400 mb-1">Mục Tiêu Trận Đấu</h4>
                <p>Chiếu chết Tướng đối phương hoặc đẩy đối phương vào thế Bí (Stalemate) là thắng cuộc.</p>
              </div>

              <div>
                <h4 className="font-bold text-amber-400 mb-1">Quy Tắc Di Chuyển Các Quân</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Tướng:</strong> Đi dọc/ngang 1 ô trong Cung (nhà 3x3). Hai Tướng không được để lộ mặt đối diện thẳng hàng mà không có quân cản (Luật Lộ mặt Tướng). Nuớc đi phạm luật này sẽ thua ngay.</li>
                  <li><strong>Sĩ:</strong> Đi chéo 1 ô, luôn nằm trong Cung làm cận vệ.</li>
                  <li><strong>Tượng:</strong> Đi chéo 2 ô (hình chữ Điền), không được qua sông. Bị cản nếu có quân nằm tại tâm ô chéo (Cản mắt Tượng).</li>
                  <li><strong>Mã:</strong> Đi thẳng 1 ô rồi đi chéo 1 ô. Bị cản nếu có bất kỳ quân nào kề sát cạnh hướng đi thẳng đầu tiên (Cản chân Mã).</li>
                  <li><strong>Xe:</strong> Đi dọc/ngang vô hạn ô nếu không vướng quân cản.</li>
                  <li><strong>Pháo:</strong> Đi dọc/ngang tự do như Xe khi không ăn quân. Khi ăn quân, phải nhảy qua đúng một quân trung gian làm ngòi (Bắn khống dã pháo).</li>
                  <li><strong>Tốt:</strong> Chỉ đi tiến 1 ô khi chưa qua sông. Sau khi qua sông, có thể đi tiến hoặc đi ngang 1 ô. Không được đi thối (lùi).</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-amber-400 mb-1">Luật Bổ Sung Tiêu Chuẩn</h4>
                <p><strong>Bí (Stalemate):</strong> Trong bản cài đặt này, nếu Kỳ hữu không bị chiếu nhưng tới lượt đi không còn bất kỳ nước cờ đi hợp lệ nào, ván đấu theo thiết chế đồng thuận sẽ tính là một trận Hòa đẹp.</p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Rõ Luật, Trở Lại Trận Đấu!
            </button>
          </div>
        </div>
      )}

      {/* 4. SETTINGS MODAL DIALOG */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-5 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-base tracking-wide text-white uppercase">
                Cài Đặt Trận Đấu
              </h3>
            </div>

            <div className="space-y-4">
              
              {/* Game Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">Chế Độ Trận</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, mode: "vs_ai" }));
                      handleRestart();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      settings.mode === "vs_ai"
                        ? "bg-amber-600/20 border-amber-500 text-amber-400"
                        : "bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    Đấu Trí AI
                  </button>
                  <button
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, mode: "pass_and_play" }));
                      handleRestart();
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                      settings.mode === "pass_and_play"
                        ? "bg-amber-600/20 border-amber-500 text-amber-400"
                        : "bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    Chơi Hai Người
                  </button>
                </div>
              </div>

              {/* AI Difficulty */}
              {settings.mode === "vs_ai" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 block">Độ Khó Của Sư Phụ AI</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["easy", "medium", "hard"] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setSettings((prev) => ({ ...prev, aiDifficulty: diff }))}
                        className={`p-2 rounded-lg border text-[11px] font-bold text-center capitalize transition-all cursor-pointer ${
                          settings.aiDifficulty === diff
                            ? "bg-amber-600/20 border-amber-500 text-amber-400"
                            : "bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {diff === "easy" ? "Nhập Môn" : diff === "medium" ? "Trung Cấp" : "Khổ Luyện"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Theme Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 block">Giao Diện Kỳ Đài</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["wooden", "imperial", "modern"] as const).map((themeType) => (
                    <button
                      key={themeType}
                      onClick={() => setSettings((prev) => ({ ...prev, theme: themeType }))}
                      className={`p-2 rounded-lg border text-[11px] font-bold text-center capitalize transition-all cursor-pointer ${
                        settings.theme === themeType
                          ? "bg-amber-600/20 border-amber-500 text-amber-400"
                          : "bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      {themeType === "wooden" ? "Mộc Bản" : themeType === "imperial" ? "Hoàng Tộc" : "Đương Đại"}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Áp Dụng Thiết Lập
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
