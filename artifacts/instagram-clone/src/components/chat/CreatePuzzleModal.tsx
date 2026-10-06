import { useState } from "react";
import { Lock, HelpCircle, Sparkles, Check, ChevronRight, Brain, Calculator, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSendPuzzle: (payload: {
    text: string;
    puzzle: {
      type: "secret_question" | "riddle_math" | "memory_challenge";
      question: string;
      answer: string | string[];
      hint?: string | null;
      maxAttempts: number;
      expiresAt?: string | null;
      revealPolicy: "permanent" | "reveal_once" | "disappear_after_read";
      memoryCards?: string[];
    };
  }) => void;
}

const MEMORY_SYMBOLS = ["🍎", "⭐", "🐶", "🚀", "💎", "🔥", "🍀", "🍕", "⚡", "🎸", "🌈", "👑"];

export function CreatePuzzleModal({ open, onClose, onSendPuzzle }: Props) {
  const [step, setStep] = useState<"config" | "preview">("config");
  const [puzzleType, setPuzzleType] = useState<"secret_question" | "riddle_math" | "memory_challenge">("secret_question");
  const [secretMessage, setSecretMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [selectedMemoryCards, setSelectedMemoryCards] = useState<string[]>(["🍎", "⭐", "🐶"]);
  const [hint, setHint] = useState("");
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [expiration, setExpiration] = useState<string>("none");
  const [revealPolicy, setRevealPolicy] = useState<"permanent" | "reveal_once" | "disappear_after_read">("permanent");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setStep("config");
    setPuzzleType("secret_question");
    setSecretMessage("");
    setQuestion("");
    setTextAnswer("");
    setSelectedMemoryCards(["🍎", "⭐", "🐶"]);
    setHint("");
    setMaxAttempts(3);
    setExpiration("none");
    setRevealPolicy("permanent");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleToggleCard = (sym: string) => {
    if (selectedMemoryCards.includes(sym)) {
      if (selectedMemoryCards.length > 3) {
        setSelectedMemoryCards(selectedMemoryCards.filter((s) => s !== sym));
      }
    } else {
      if (selectedMemoryCards.length < 6) {
        setSelectedMemoryCards([...selectedMemoryCards, sym]);
      }
    }
  };

  const handleProceedToPreview = () => {
    if (!secretMessage.trim()) {
      setError("Please write the secret message to protect");
      return;
    }
    if (puzzleType !== "memory_challenge" && !question.trim()) {
      setError("Please enter a challenge question or riddle");
      return;
    }
    if (puzzleType !== "memory_challenge" && !textAnswer.trim()) {
      setError("Please enter the correct answer");
      return;
    }
    if (puzzleType === "memory_challenge" && selectedMemoryCards.length < 3) {
      setError("Please select at least 3 symbols for the memory challenge");
      return;
    }

    setError(null);
    setStep("preview");
  };

  const handleConfirmSend = () => {
    let expiresDate: string | null = null;
    if (expiration === "1h") expiresDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    else if (expiration === "6h") expiresDate = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    else if (expiration === "24h") expiresDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    else if (expiration === "3d") expiresDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const finalQuestion =
      puzzleType === "memory_challenge"
        ? question.trim() || "Remember and repeat the sequence of symbols!"
        : question.trim();

    const finalAnswer =
      puzzleType === "memory_challenge"
        ? selectedMemoryCards
        : textAnswer.trim();

    onSendPuzzle({
      text: secretMessage.trim(),
      puzzle: {
        type: puzzleType,
        question: finalQuestion,
        answer: finalAnswer,
        hint: hint.trim() || null,
        maxAttempts,
        expiresAt: expiresDate,
        revealPolicy,
        memoryCards: puzzleType === "memory_challenge" ? selectedMemoryCards : undefined,
      },
    });

    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-neutral-900 border-neutral-800 text-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <Lock className="w-5 h-5 text-amber-400" /> Create Puzzle Message
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400">
            Lock your message behind an interactive puzzle. The recipient must solve it to reveal the content.
          </DialogDescription>
        </DialogHeader>

        {step === "config" ? (
          <div className="space-y-4 py-2">
            {/* Secret Message input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-200">
                Secret Message Content <span className="text-amber-400">*</span>
              </label>
              <Textarea
                value={secretMessage}
                onChange={(e) => setSecretMessage(e.target.value)}
                placeholder="What secret message do you want to hide?"
                className="bg-neutral-800 border-neutral-700 text-white rounded-2xl min-h-[75px] text-sm"
              />
            </div>

            {/* Puzzle Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-200">Choose Puzzle Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "secret_question", label: "Secret Q", icon: HelpCircle, desc: "Personal trivia" },
                  { id: "riddle_math", label: "Riddle / Math", icon: Calculator, desc: "Logic puzzle" },
                  { id: "memory_challenge", label: "Memory Cards", icon: Brain, desc: "Symbol sequence" },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = puzzleType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPuzzleType(item.id as any)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer",
                        active
                          ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md"
                          : "bg-neutral-800/60 border-neutral-700 hover:bg-neutral-800 text-neutral-300"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 mb-1", active ? "text-amber-400" : "text-neutral-400")} />
                      <span className="text-xs">{item.label}</span>
                      <span className="text-[10px] text-neutral-400 font-normal">{item.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type-Specific Fields */}
            {puzzleType !== "memory_challenge" ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-200">
                    Challenge Question / Riddle <span className="text-amber-400">*</span>
                  </label>
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={
                      puzzleType === "secret_question"
                        ? "e.g., What was the name of our first vacation hotel?"
                        : "e.g., What is 17 + 25? or A riddle..."
                    }
                    className="bg-neutral-800 border-neutral-700 text-white rounded-2xl h-11 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-200">
                    Correct Answer <span className="text-amber-400">*</span>
                  </label>
                  <Input
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Case-insensitive answer..."
                    className="bg-neutral-800 border-neutral-700 text-white rounded-2xl h-11 text-sm"
                  />
                  <p className="text-[11px] text-neutral-400">
                    We automatically normalize whitespace, case, and punctuation.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-neutral-200">
                  Select Sequence Symbols (3 to 6 cards):
                </label>
                <div className="flex gap-2 p-2.5 bg-neutral-800 rounded-2xl border border-neutral-700 min-h-[48px] items-center">
                  {selectedMemoryCards.map((sym, idx) => (
                    <span key={idx} className="text-2xl p-1 bg-neutral-700 rounded-xl">
                      {sym}
                    </span>
                  ))}
                  <span className="text-xs text-neutral-400 ml-auto">
                    {selectedMemoryCards.length} selected
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2 pt-1">
                  {MEMORY_SYMBOLS.map((sym, idx) => {
                    const isSelected = selectedMemoryCards.includes(sym);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleToggleCard(sym)}
                        className={cn(
                          "text-2xl p-2 rounded-2xl border transition-all active:scale-95 cursor-pointer",
                          isSelected
                            ? "bg-amber-500/20 border-amber-500 scale-105"
                            : "bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
                        )}
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hint */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-200">Optional Hint</label>
              <Input
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="e.g., Look at our photo album from 2023..."
                className="bg-neutral-800 border-neutral-700 text-white rounded-2xl h-10 text-sm"
              />
            </div>

            {/* Extra Options: Attempts & Expiration */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Max Attempts</label>
                <select
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-2xl h-10 px-3 text-xs"
                >
                  <option value={3}>3 Attempts (Standard)</option>
                  <option value={5}>5 Attempts</option>
                  <option value={0}>Unlimited</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Expiration</label>
                <select
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white rounded-2xl h-10 px-3 text-xs"
                >
                  <option value="none">No Expiration</option>
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="3d">3 Days</option>
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-rose-400 font-semibold">{error}</p>}

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <Button variant="ghost" onClick={handleClose} className="rounded-2xl text-neutral-400">
                Cancel
              </Button>
              <Button
                onClick={handleProceedToPreview}
                className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-black px-6 gap-1.5 cursor-pointer"
              >
                Preview Challenge <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Preview Step */
          <div className="space-y-4 py-2">
            <div className="p-4 bg-gradient-to-br from-amber-950/40 via-neutral-900 to-purple-950/40 border border-amber-500/30 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  <span>Preview Puzzle Card</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20">
                  {puzzleType.replace("_", " ")}
                </span>
              </div>

              <div className="p-3 bg-neutral-800/80 rounded-xl border border-neutral-700">
                <p className="text-xs text-neutral-400 font-semibold uppercase mb-1">Challenge Question</p>
                <p className="text-sm font-bold text-white">
                  {puzzleType === "memory_challenge" ? "Repeat the sequence of symbols" : question}
                </p>
              </div>

              {hint && (
                <p className="text-xs text-amber-300/90 flex gap-1.5 items-center">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hint: {hint}</span>
                </p>
              )}

              <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
                <p className="text-xs text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Secret Message (revealed on solve)
                </p>
                <p className="text-xs text-neutral-200 whitespace-pre-wrap">{secretMessage}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="ghost" onClick={() => setStep("config")} className="rounded-2xl text-neutral-400">
                Back
              </Button>
              <Button
                onClick={handleConfirmSend}
                className="rounded-2xl font-bold bg-amber-500 hover:bg-amber-600 text-black px-6 gap-1.5 shadow-lg cursor-pointer"
              >
                Send Puzzle Message 🔒
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
