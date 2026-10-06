import { useState } from "react";
import { Lock, Unlock, HelpCircle, AlertCircle, CheckCircle2, Sparkles, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiUrl, getAuthToken } from "@/lib/api-url";

interface PuzzleData {
  type: "secret_question" | "riddle_math" | "memory_challenge";
  question: string;
  hint?: string | null;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  expiresAt?: string | null;
  revealPolicy: "permanent" | "reveal_once" | "disappear_after_read";
  isSolved: boolean;
  solvedAt?: string | null;
  memoryCards?: string[];
}

interface Props {
  messageId: string;
  conversationId: string;
  puzzle: PuzzleData;
  isMe: boolean;
  senderName: string;
  revealedText: string | null;
  onSolved?: (text: string) => void;
}

const MEMORY_SYMBOLS = ["🍎", "⭐", "🐶", "🚀", "💎", "🔥", "🍀", "🍕", "⚡", "🎸", "🌈", "👑"];

export function PuzzleMessageCard({
  messageId,
  conversationId,
  puzzle,
  isMe,
  senderName,
  revealedText,
  onSolved,
}: Props) {
  const [showSolverModal, setShowSolverModal] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [newHintText, setNewHintText] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [memoryRevealed, setMemoryRevealed] = useState(true);
  const [solving, setSolving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unlockedText, setUnlockedText] = useState<string | null>(revealedText);
  const [isUnlocked, setIsUnlocked] = useState(puzzle.isSolved || Boolean(revealedText));
  const [attemptsRemaining, setAttemptsRemaining] = useState(puzzle.attemptsRemaining);
  const [hintAvailable, setHintAvailable] = useState(puzzle.hint);

  const handleOpenSolver = () => {
    setErrorMsg(null);
    setAnswerInput("");
    setSelectedCards([]);
    if (puzzle.type === "memory_challenge") {
      setMemoryRevealed(true);
      setTimeout(() => setMemoryRevealed(false), 3000);
    }
    setShowSolverModal(true);
  };

  const handleCardClick = (symbol: string) => {
    if (selectedCards.length >= (puzzle.memoryCards?.length || 4)) return;
    setSelectedCards((prev) => [...prev, symbol]);
  };

  const handleCardReset = () => {
    setSelectedCards([]);
  };

  const handleSubmitAnswer = async () => {
    const candidateAnswer =
      puzzle.type === "memory_challenge" ? selectedCards.join(",") : answerInput.trim();

    if (!candidateAnswer) {
      setErrorMsg("Please enter an answer");
      return;
    }

    setSolving(true);
    setErrorMsg(null);

    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/messages/${messageId}/puzzle/solve`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ answer: candidateAnswer }),
      });

      const data = await resp.json();

      if (resp.ok && data.solved) {
        setIsUnlocked(true);
        setUnlockedText(data.text);
        if (onSolved) onSolved(data.text);
        setShowSolverModal(false);
      } else {
        setErrorMsg(data.error || "Incorrect answer, try again!");
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSolving(false);
    }
  };

  const handleSendHint = async () => {
    if (!newHintText.trim()) return;
    try {
      const token = getAuthToken();
      const resp = await fetch(apiUrl(`/api/messages/${messageId}/puzzle/hint`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ hint: newHintText.trim() }),
      });
      if (resp.ok) {
        setHintAvailable(newHintText.trim());
        setShowHintModal(false);
      }
    } catch {
      // silently handle
    }
  };

  const typeLabels = {
    secret_question: "Secret Question",
    riddle_math: "Riddle / Math Challenge",
    memory_challenge: "Memory Challenge",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 my-1 transition-all duration-300 select-none",
        isUnlocked
          ? "bg-gradient-to-br from-emerald-950/40 via-background to-emerald-950/20 border-emerald-500/40 text-foreground"
          : "bg-gradient-to-br from-amber-950/30 via-background to-purple-950/30 border-amber-500/30 text-foreground shadow-lg"
      )}
      role="region"
      aria-label="Puzzle-protected message"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Unlock className="w-4 h-4 animate-in zoom-in-75 duration-300" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span>{isUnlocked ? "Puzzle Solved 🔓" : "Puzzle Message 🔒"}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold uppercase tracking-wider">
                {typeLabels[puzzle.type] || "Puzzle"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isMe ? "You protected this message with a puzzle" : `From ${senderName}`}
            </p>
          </div>
        </div>

        {/* Attempts Badge */}
        {!isUnlocked && (
          <div className="text-right">
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold border",
                attemptsRemaining <= 1
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse"
                  : "bg-secondary text-muted-foreground border-border"
              )}
            >
              {attemptsRemaining === 999 ? "Unlimited" : `${attemptsRemaining} left`}
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="py-3">
        {isUnlocked ? (
          <div className="space-y-2">
            <p className="text-sm font-medium leading-relaxed break-words whitespace-pre-wrap">
              {unlockedText || "Message unlocked"}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 font-semibold pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Challenge completed successfully</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-secondary/60 rounded-xl border border-border/60">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Challenge Question:
              </div>
              <p className="text-sm font-medium text-foreground leading-snug">
                {puzzle.question}
              </p>
            </div>

            {hintAvailable && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <span className="font-bold">Hint: </span>
                  <span>{hintAvailable}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {!isMe && (
                <Button
                  size="sm"
                  onClick={handleOpenSolver}
                  className="flex-1 rounded-xl gap-2 font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black shadow-md cursor-pointer"
                  disabled={attemptsRemaining === 0}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {attemptsRemaining === 0 ? "Attempts Exhausted" : "Solve Puzzle"}
                </Button>
              )}

              {isMe && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowHintModal(true)}
                  className="rounded-xl gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {hintAvailable ? "Update Hint" : "Send Hint"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Solver Dialog / Modal */}
      <Dialog open={showSolverModal} onOpenChange={setShowSolverModal}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Lock className="w-5 h-5 text-amber-400" /> Solve the Challenge
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Answer correctly to unlock the hidden message from {senderName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 bg-neutral-800/80 rounded-2xl border border-neutral-700/80">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                Question
              </div>
              <p className="text-sm font-semibold text-white">{puzzle.question}</p>
            </div>

            {hintAvailable && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex gap-2 items-start">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Hint: {hintAvailable}</span>
              </div>
            )}

            {/* Form according to puzzle type */}
            {puzzle.type === "memory_challenge" ? (
              <div className="space-y-3">
                <div className="text-xs text-neutral-300 font-medium">
                  {memoryRevealed ? "Memorize the sequence:" : "Select the symbols in the original order:"}
                </div>

                {memoryRevealed ? (
                  <div className="flex justify-center gap-2 py-3 bg-neutral-800 rounded-2xl animate-pulse">
                    {(puzzle.memoryCards || ["🍎", "⭐", "🐶"]).map((s, idx) => (
                      <span key={idx} className="text-3xl p-2 bg-neutral-700/60 rounded-xl">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="min-h-[44px] p-2 bg-neutral-800/60 border border-neutral-700 rounded-2xl flex items-center justify-between">
                      <div className="flex gap-1.5 flex-wrap">
                        {selectedCards.map((s, idx) => (
                          <span key={idx} className="text-2xl px-2 py-1 bg-neutral-700 rounded-xl">
                            {s}
                          </span>
                        ))}
                        {selectedCards.length === 0 && (
                          <span className="text-xs text-neutral-500 p-1">Tap symbols below in sequence...</span>
                        )}
                      </div>
                      {selectedCards.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={handleCardReset} className="h-7 text-xs text-neutral-400 hover:text-white">
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-6 gap-2 pt-1">
                      {MEMORY_SYMBOLS.map((sym, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleCardClick(sym)}
                          className="text-2xl p-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-transform active:scale-95 cursor-pointer"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-300">Your Answer:</label>
                <Input
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder="Type your answer here..."
                  className="bg-neutral-800 border-neutral-700 text-white rounded-2xl h-11"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitAnswer();
                  }}
                />
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-semibold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-400 font-medium">
                Attempts remaining: <span className="font-bold text-white">{attemptsRemaining}</span>
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowSolverModal(false)} className="rounded-2xl text-neutral-400">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={solving || attemptsRemaining === 0}
                  className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-black px-5"
                >
                  {solving ? "Verifying..." : "Unlock"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hint Dialog (Sender only) */}
      <Dialog open={showHintModal} onOpenChange={setShowHintModal}>
        <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" /> Provide a Hint
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Help the recipient solve your challenge without giving away the exact answer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newHintText}
              onChange={(e) => setNewHintText(e.target.value)}
              placeholder="e.g., Think about where we ate last Friday..."
              className="bg-neutral-800 border-neutral-700 text-white rounded-2xl h-11"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowHintModal(false)} className="rounded-2xl text-neutral-400">
                Cancel
              </Button>
              <Button onClick={handleSendHint} className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-black">
                Send Hint
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
