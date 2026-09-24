import { useState } from "react";
import { Gamepad2, Trophy, RotateCcw, Check, X, ShieldAlert, Sparkles, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";

export interface GameData {
  id: string;
  conversationId: string;
  gameType: "tictactoe" | "rps" | "guess_number" | "quiz" | "connect4";
  status: "invited" | "in_progress" | "completed" | "declined" | "cancelled";
  invitedBy: string;
  opponentId: string;
  players: string[];
  currentTurn?: string | null;
  winnerId?: string | null;
  isDraw?: boolean;
  gameState: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  game: GameData;
  myId: string;
  otherUserUsername: string;
  onGameUpdated?: (updated: GameData) => void;
}

const GAME_TITLES: Record<string, string> = {
  tictactoe: "Tic Tac Toe",
  rps: "Rock Paper Scissors",
  guess_number: "Guess the Number",
  quiz: "Trivia Quiz",
  connect4: "Connect 4",
};

export function GameCard({ game, myId, otherUserUsername, onGameUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [guessInput, setGuessInput] = useState("");

  const isInviter = game.invitedBy === myId;
  const isOpponent = game.opponentId === myId;
  const isMyTurn = game.currentTurn === myId;
  const isWinner = game.winnerId === myId;
  const isCompleted = game.status === "completed";

  // Respond to invitation (Accept / Decline)
  const handleRespond = async (action: "accept" | "decline") => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/games/${game.id}/respond`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Response failed");
      onGameUpdated?.(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Make a move
  const handleMove = async (payload: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/games/${game.id}/move`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid move");
      onGameUpdated?.(data);
    } catch (err: any) {
      setErrorMsg(err.message);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Rematch
  const handleRematch = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/games/${game.id}/rematch`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start rematch");
      onGameUpdated?.(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[320px] sm:max-w-[360px] p-4 rounded-2xl bg-card border border-border shadow-xs text-foreground select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-foreground">
            {GAME_TITLES[game.gameType] || game.gameType}
          </span>
        </div>

        {/* Status Pill */}
        <div>
          {game.status === "invited" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Pending Invite
            </span>
          )}
          {game.status === "declined" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              Invite Declined
            </span>
          )}
          {game.status === "in_progress" && (
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isMyTurn
                  ? "bg-primary/10 text-primary border-primary/30 animate-pulse"
                  : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              {isMyTurn ? "Your turn 🎯" : "Opponent's turn ⏳"}
            </span>
          )}
          {game.status === "completed" && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                game.isDraw
                  ? "bg-secondary text-muted-foreground border-border"
                  : isWinner
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {game.isDraw ? "Draw 🤝" : isWinner ? "You Won! 🏆" : "You Lost 💔"}
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20">
          {errorMsg}
        </div>
      )}

      {/* ── 1. INVITATION STATE ── */}
      {game.status === "invited" && (
        <div className="py-3 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            {isInviter
              ? `You sent a game invite to @${otherUserUsername}. Waiting for response...`
              : `@${otherUserUsername} invited you to play ${GAME_TITLES[game.gameType] || game.gameType}!`}
          </p>
          {isOpponent && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond("decline")}
                disabled={loading}
                className="rounded-xl text-xs"
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => handleRespond("accept")}
                disabled={loading}
                className="rounded-xl text-xs font-semibold gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Accept & Play
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── 2. DECLINED STATE ── */}
      {game.status === "declined" && (
        <div className="py-2 text-center text-xs text-muted-foreground italic">
          Game invite was declined.
        </div>
      )}

      {/* ── 3. IN-PROGRESS & COMPLETED GAMEPLAY ── */}
      {(game.status === "in_progress" || game.status === "completed") && (
        <div>
          {/* A. TIC TAC TOE */}
          {game.gameType === "tictactoe" && (
            <div className="py-2">
              <div className="grid grid-cols-3 gap-1.5 max-w-[200px] mx-auto bg-secondary/60 p-2 rounded-2xl border border-border">
                {(game.gameState.board || Array(9).fill(null)).map((cell: string | null, idx: number) => {
                  const isAvailable = cell === null && isMyTurn && !isCompleted;
                  return (
                    <button
                      key={idx}
                      onClick={() => isAvailable && handleMove({ cellIndex: idx })}
                      disabled={!isAvailable || loading}
                      className={`h-14 rounded-xl flex items-center justify-center text-xl font-black transition-all ${
                        cell === "X"
                          ? "bg-primary/20 text-primary"
                          : cell === "O"
                          ? "bg-amber-500/20 text-amber-500"
                          : isAvailable
                          ? "bg-card hover:bg-primary/10 hover:border-primary/50 border border-border/80 cursor-pointer active:scale-95"
                          : "bg-card/50 cursor-default"
                      }`}
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-center text-[11px] text-muted-foreground">
                You play as: <strong className="text-foreground">{game.gameState.symbols?.[myId] || "X"}</strong>
              </div>
            </div>
          )}

          {/* B. ROCK PAPER SCISSORS */}
          {game.gameType === "rps" && (
            <div className="py-2 space-y-3">
              {/* Scores */}
              <div className="flex items-center justify-around p-2 rounded-xl bg-secondary/50 text-xs">
                <div className="text-center">
                  <div className="text-muted-foreground text-[10px]">You</div>
                  <div className="text-base font-bold text-primary">{game.gameState.scores?.[myId] || 0}</div>
                </div>
                <div className="text-xs text-muted-foreground font-semibold">VS</div>
                <div className="text-center">
                  <div className="text-muted-foreground text-[10px]">@{otherUserUsername}</div>
                  <div className="text-base font-bold text-foreground">
                    {game.gameState.scores?.[game.players.find(id => id !== myId) || ""] || 0}
                  </div>
                </div>
              </div>

              {/* Rounds history */}
              {game.gameState.rounds && game.gameState.rounds.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground font-semibold">Previous rounds:</div>
                  <div className="flex flex-wrap gap-1">
                    {game.gameState.rounds.map((r: any, i: number) => {
                      const myMove = r.moves?.[myId];
                      const opId = game.players.find(id => id !== myId);
                      const opMove = r.moves?.[opId || ""];
                      const moveIcons: Record<string, string> = { rock: "✊", paper: "✋", scissors: "✌️" };
                      return (
                        <div key={i} className="px-2 py-1 bg-secondary rounded-lg text-[10px] flex items-center gap-1 border border-border">
                          <span>{moveIcons[myMove] || myMove}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span>{moveIcons[opMove] || opMove}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Move Buttons (Active round) */}
              {!isCompleted && (
                <div>
                  <div className="text-xs text-center font-medium mb-2">Choose your move:</div>
                  {game.gameState.currentRoundMoves?.[myId] ? (
                    <div className="text-center p-2 rounded-xl bg-secondary/60 text-xs text-muted-foreground">
                      ✅ Move selected! Waiting for opponent...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      {[
                        { id: "rock", label: "Rock", icon: "✊" },
                        { id: "paper", label: "Paper", icon: "✋" },
                        { id: "scissors", label: "Scissors", icon: "✌️" },
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleMove({ move: m.id })}
                          disabled={loading}
                          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-secondary hover:bg-primary/10 hover:border-primary/50 border border-border text-foreground transition-all active:scale-95 w-20"
                        >
                          <span className="text-2xl mb-1">{m.icon}</span>
                          <span className="text-[11px] font-semibold">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* C. GUESS THE NUMBER */}
          {game.gameType === "guess_number" && (
            <div className="py-2 space-y-3">
              <div className="text-xs text-center text-muted-foreground">
                Guess a number between <strong>1</strong> and <strong>100</strong>
              </div>

              {/* History of attempts */}
              {game.gameState.attempts && game.gameState.attempts.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {game.gameState.attempts.map((att: any, i: number) => {
                    const isMine = att.userId === myId;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                          att.hint === "correct"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold"
                            : "bg-secondary/40 border-border"
                        }`}
                      >
                        <span className="font-semibold">
                          {isMine ? "Your guess" : `@${otherUserUsername}`}: {att.guess}
                        </span>
                        <span>
                          {att.hint === "correct"
                            ? "🎯 Correct!"
                            : att.hint === "higher"
                            ? "Higher ⬆️"
                            : "Lower ⬇️"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Guess input */}
              {!isCompleted && isMyTurn && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={guessInput}
                    onChange={e => setGuessInput(e.target.value)}
                    placeholder="Enter a number (1-100)..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl bg-secondary border border-border focus:outline-none focus:border-primary"
                  />
                  <Button
                    size="sm"
                    disabled={!guessInput || loading}
                    onClick={() => {
                      const val = parseInt(guessInput, 10);
                      if (val >= 1 && val <= 100) {
                        handleMove({ guess: val });
                        setGuessInput("");
                      }
                    }}
                    className="rounded-xl text-xs font-semibold px-3"
                  >
                    Guess
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* D. QUIZ */}
          {game.gameType === "quiz" && (
            <div className="py-2 space-y-3">
              {/* Score banner */}
              <div className="flex items-center justify-around p-2 rounded-xl bg-secondary/50 text-xs">
                <div className="text-center">
                  <div className="text-muted-foreground text-[10px]">Your Score</div>
                  <div className="text-base font-bold text-primary">{game.gameState.scores?.[myId] || 0}</div>
                </div>
                <div className="text-xs text-muted-foreground font-semibold">
                  Question {(game.gameState.currentIndex || 0) + 1} of {game.gameState.questions?.length || 5}
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground text-[10px]">@{otherUserUsername}</div>
                  <div className="text-base font-bold text-foreground">
                    {game.gameState.scores?.[game.players.find(id => id !== myId) || ""] || 0}
                  </div>
                </div>
              </div>

              {/* Current Question */}
              {!isCompleted && (() => {
                const currentIdx = game.gameState.currentIndex || 0;
                const currentQ = game.gameState.questions?.[currentIdx];
                if (!currentQ) return null;

                const myAnswer = game.gameState.answers?.[currentIdx]?.[myId];
                const hasAnswered = myAnswer !== undefined;

                return (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-foreground p-2 rounded-xl bg-secondary/30">
                      {currentQ.q}
                    </div>
                    <div className="space-y-1.5">
                      {currentQ.options.map((opt: string, optIdx: number) => {
                        const isChosen = myAnswer === optIdx;
                        return (
                          <button
                            key={optIdx}
                            onClick={() => !hasAnswered && handleMove({ optionIndex: optIdx })}
                            disabled={hasAnswered || loading}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              isChosen
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : hasAnswered
                                ? "border-border/60 text-muted-foreground cursor-default"
                                : "border-border hover:border-primary/50 hover:bg-secondary cursor-pointer active:scale-[0.99]"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {hasAnswered && (
                      <div className="text-center text-[11px] text-muted-foreground pt-1">
                        ✅ Your answer was recorded! Waiting for @{otherUserUsername}...
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* E. CONNECT FOUR */}
          {game.gameType === "connect4" && (
            <div className="py-2 space-y-2">
              {/* Column drop buttons */}
              {!isCompleted && isMyTurn && (
                <div className="grid grid-cols-7 gap-1 max-w-[260px] mx-auto">
                  {[0, 1, 2, 3, 4, 5, 6].map(col => (
                    <button
                      key={col}
                      onClick={() => handleMove({ column: col })}
                      disabled={loading || game.gameState.board?.[0]?.[col] !== null}
                      className="py-1 rounded-md bg-secondary hover:bg-primary/20 text-xs font-bold text-primary flex items-center justify-center transition-colors"
                      title={`Drop in column ${col + 1}`}
                    >
                      ↓
                    </button>
                  ))}
                </div>
              )}

              {/* 6x7 Grid */}
              <div className="p-2 bg-blue-950/80 rounded-2xl border border-blue-800/60 max-w-[260px] mx-auto">
                <div className="grid grid-cols-7 gap-1.5">
                  {(game.gameState.board || Array(6).fill(null).map(() => Array(7).fill(null))).flatMap((row: any, rIdx: number) =>
                    row.map((cell: string | null, cIdx: number) => (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs shadow-inner transition-transform ${
                          cell === "red"
                            ? "bg-red-500 ring-2 ring-red-400"
                            : cell === "yellow"
                            ? "bg-amber-400 ring-2 ring-amber-300"
                            : "bg-slate-900/80 border border-slate-700/60"
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="text-center text-[10px] text-muted-foreground">
                Your color:{" "}
                <span className={game.gameState.symbols?.[myId] === "red" ? "text-red-500 font-bold" : "text-amber-400 font-bold"}>
                  {game.gameState.symbols?.[myId] === "red" ? "Red 🔴" : "Yellow 🟡"}
                </span>
              </div>
            </div>
          )}

          {/* Winner Banner & Rematch */}
          {isCompleted && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Trophy className={`w-4 h-4 ${isWinner ? "text-amber-500" : "text-muted-foreground"}`} />
                <span>
                  {game.isDraw ? "It's a Draw!" : isWinner ? "Congratulations, you won!" : `@${otherUserUsername} won!`}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRematch}
                disabled={loading}
                className="rounded-xl text-xs gap-1 h-8"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Play Again
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
