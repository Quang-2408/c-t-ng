/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AICoachFeedback, Piece, MatchMove } from "../types";
import { Sparkles, MessageCircle, AlertTriangle, Lightbulb, Compass, Loader2 } from "lucide-react";

interface AICoachPanelProps {
  pieces: Piece[];
  history: MatchMove[];
  turn: "red" | "black";
}

export const AICoachPanel: React.FC<AICoachPanelProps> = ({ pieces, history, turn }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<AICoachFeedback | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ready template prompts for effortless mobile clicks
  const templatePrompts = [
    { label: "Mẹo đi tiếp theo", prompt: "Sư Phụ ơi, phe tôi nên đi nước cờ nào hay nhất lúc này và tại sao?" },
    { label: "Cảnh báo nguy cơ", prompt: "Có điểm yếu chí mạng hay cạm bẫy nào hiểm hóc từ đối phương đang nhắm vào Tướng không ạ?" },
    { label: "Châm biếm thế cờ", prompt: "Sư Phụ hãy châm biếm một câu dí dỏm về thực trạng trận đấu và thế cờ hiện tại đi ạ!" },
  ];

  const askCoach = async (questionText: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          boardState: pieces.filter((p) => !p.captured),
          history: history.map((h) => h.notation),
          customQuestion: questionText,
          turn: turn,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gặp lỗi khi liên hệ với Sư Phụ.");
      }

      const data = await response.json();
      setFeedback(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Sư phụ đang bận đánh cờ trà, quý hữu vui lòng thử lại sau!");
    } finally {
      setLoading(false);
    }
  };

  const handleCustomQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    askCoach(customQuestion);
    setCustomQuestion("");
  };

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-200">
      
      {/* Sư Phụ Avatar and Greeting */}
      <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
        {/* SVG Grandmaster Coach avatar */}
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-500/40 p-1 flex items-center justify-center shrink-0 relative">
          <svg className="w-10 h-10 fill-amber-500" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-sm text-yellow-500 font-serif">Kỳ Vương Sư Phụ</h4>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              AI Coach
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            "Xe mười, Mã bảy, Pháo ba. Muốn thắng hiền hữu cứ thưa Kỳ Vương!"
          </p>
        </div>
      </div>

      {/* Main Analysis Display */}
      <div className="min-h-[140px] flex flex-col justify-center bg-slate-950/60 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-6 animate-pulse">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-xs font-medium italic mt-2 text-amber-400">
              Sư phụ đang vuốt râu bốc quẻ thế trận...
            </p>
          </div>
        ) : errorMsg ? (
          <div className="text-center text-red-400 text-xs py-4 space-y-2">
            <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
            <p className="font-semibold">{errorMsg}</p>
            <p className="text-[10px] text-slate-500">
              Kiểm tra thiết lập GEMINI_API_KEY trong cấu hình Secrets.
            </p>
          </div>
        ) : feedback ? (
          <div className="space-y-4 text-xs select-text">
            {/* Commentary */}
            <div className="flex gap-2">
              <MessageCircle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-300 block mb-0.5">Lời Sư Phụ bình:</span>
                <p className="text-slate-200 leading-relaxed italic">"{feedback.generalCommentary}"</p>
              </div>
            </div>

            {/* Warning indicator if any */}
            {feedback.warning && feedback.warning.toLowerCase() !== "none" && (
              <div className="flex gap-2 bg-red-950/40 border border-red-900/40 p-2.5 rounded-lg">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0" />
                <div>
                  <span className="font-bold text-red-300 block">Cảnh báo Thế Cờ:</span>
                  <p className="text-red-200">{feedback.warning}</p>
                </div>
              </div>
            )}

            {/* Suggested Move */}
            <div className="flex gap-2 bg-cyan-950/40 border border-cyan-900/40 p-2.5 rounded-lg">
              <Lightbulb className="w-4.5 h-4.5 text-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-cyan-300 block">Gợi Ý Nước Đi:</span>
                <p className="text-cyan-100 font-medium">{feedback.suggestedMove}</p>
              </div>
            </div>

            {/* Strategy rule label */}
            <div className="flex gap-2">
              <Compass className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-400 block mb-0.5">Bí thư tâm pháp:</span>
                <p className="text-emerald-300 font-serif font-semibold">{feedback.strategyTip}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 space-y-2 py-4">
            <Sparkles className="w-10 h-10 mx-auto text-amber-500/20" />
            <p className="text-xs">Chưa bốc quẻ phân tích. Nhấp chọn một mẫu gợi ý bên dưới hoặc gửi thắc mắc của bạn!</p>
          </div>
        )}
      </div>

      {/* Template Quick Chips */}
      <div className="flex flex-wrap gap-2">
        {templatePrompts.map((p, idx) => (
          <button
            key={`template-${idx}`}
            onClick={() => askCoach(p.prompt)}
            disabled={loading}
            className="text-[10px] md:text-xs font-medium bg-slate-800 hover:bg-amber-600/20 hover:border-amber-500/40 border border-slate-700/60 rounded-full px-3 py-1.5 text-slate-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Freeform Question Form */}
      <form onSubmit={handleCustomQuestionSubmit} className="flex gap-2">
        <input
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          placeholder="Hỏi Sư Phụ điều gì về thế cờ..."
          disabled={loading}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500/60 transition-all text-slate-200 placeholder-slate-600 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !customQuestion.trim()}
          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Hỏi Cố Vấn
        </button>
      </form>

    </div>
  );
};
