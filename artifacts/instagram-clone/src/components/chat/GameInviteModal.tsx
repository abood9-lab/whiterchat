import { useState } from "react";
import { X, Gamepad2, Sparkles, HelpCircle, Trophy, Disc, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-url";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  otherUserUsername: string;
  onGameCreated?: (game: any) => void;
}

const AVAILABLE_GAMES = [
  {
    id: "tictactoe",
    title: "Tic Tac Toe",
    desc: "Classic game of Xs and Os. Get three in a row to win.",
    icon: "❌⭕",
    badge: "Classic",
  },
  {
    id: "rps",
    title: "Rock Paper Scissors",
    desc: "Fast rounds! First player to reach 3 points wins.",
    icon: "✊✋✌️",
    badge: "Fast-Paced",
  },
  {
    id: "connect4",
    title: "Connect 4",
    desc: "Connect 4 discs in a row vertically, horizontally, or diagonally.",
    icon: "🔴🟡",
    badge: "Strategy",
  },
  {
    id: "guess_number",
    title: "Guess the Number",
    desc: "Secret number between 1 and 100 with higher/lower hints.",
    icon: "🔢🎯",
    badge: "Challenge",
  },
  {
    id: "quiz",
    title: "Trivia Quiz",
    desc: "5 trivia questions. Test your knowledge against your friend.",
    icon: "🧠💡",
    badge: "Trivia",
  },
];

export function GameInviteModal({ isOpen, onClose, conversationId, otherUserUsername, onGameCreated }: Props) {
  const [selectedGame, setSelectedGame] = useState<string>("tictactoe");
  const [isInviting, setIsInviting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendInvite = async () => {
    setIsInviting(true);
    setErrorText(null);

    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/games/invite`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameType: selectedGame }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send game invite");
      }

      onGameCreated?.(data);
      onClose();
    } catch (err: any) {
      setErrorText(err.message || "An error occurred");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Chat Games</h3>
              <p className="text-xs text-muted-foreground">Challenge @{otherUserUsername} to a game</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 overflow-y-auto">
          {errorText && (
            <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20">
              {errorText}
            </div>
          )}

          <div className="space-y-2">
            {AVAILABLE_GAMES.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGame(g.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3.5 ${
                  selectedGame === g.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                    : "border-border/70 hover:bg-secondary/40 hover:border-primary/30"
                }`}
              >
                <div className="text-2xl p-2 rounded-xl bg-secondary/80 shrink-0">
                  {g.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">{g.title}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                      {g.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                    {g.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isInviting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendInvite}
              disabled={isInviting}
              className="rounded-xl text-xs font-semibold px-4 gap-1.5"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              {isInviting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
