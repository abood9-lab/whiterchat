import { useState } from "react";
import { BarChart2, Check, Lock, CheckCircle2, Circle } from "lucide-react";
import { apiUrl } from "@/lib/api-url";

export interface PollOptionData {
  id: string;
  text: string;
  voterIds: string[];
  voteCount: number;
  hasVoted?: boolean;
}

export interface PollData {
  id: string;
  conversationId: string;
  creatorId: string;
  question: string;
  options: PollOptionData[];
  allowMultiple: boolean;
  allowVoteChange: boolean;
  isClosed: boolean;
  closedAt?: string | null;
  totalVotes: number;
  createdAt?: string;
}

interface Props {
  poll: PollData;
  myId: string;
  isMe?: boolean;
  onPollUpdated?: (updated: PollData) => void;
}

export function PollCard({ poll, myId, isMe, onPollUpdated }: Props) {
  const [isVoting, setIsVoting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const isCreator = poll.creatorId === myId;
  const totalVotes = poll.totalVotes || poll.options.reduce((sum, o) => sum + (o.voterIds?.length || 0), 0);

  const handleVote = async (optionId: string) => {
    if (poll.isClosed || isVoting) return;
    setIsVoting(true);
    setErrorText(null);

    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/polls/${poll.id}/vote`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optionId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not record vote");
      }

      onPollUpdated?.(data);
    } catch (err: any) {
      setErrorText(err.message || "An error occurred");
      setTimeout(() => setErrorText(null), 3000);
    } finally {
      setIsVoting(false);
    }
  };

  const handleClose = async () => {
    if (poll.isClosed || !isCreator || isVoting) return;
    if (!confirm("Are you sure you want to close this poll?")) return;

    setIsVoting(true);
    setErrorText(null);

    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/polls/${poll.id}/close`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not close poll");
      }

      onPollUpdated?.(data);
    } catch (err: any) {
      setErrorText(err.message || "An error occurred");
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="w-full max-w-[320px] sm:max-w-[360px] p-4 rounded-2xl bg-card border border-border shadow-xs text-foreground select-none">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <BarChart2 className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold tracking-wide uppercase text-primary">
            Poll
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {poll.isClosed ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
              <Lock className="w-3 h-3" /> Closed
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <h4 className="text-sm font-semibold mb-3 leading-snug break-words">
        {poll.question}
      </h4>

      {/* Sub-label */}
      <div className="text-[10px] text-muted-foreground mb-3 flex items-center justify-between">
        <span>{poll.allowMultiple ? "Multiple choices allowed" : "Single choice only"}</span>
        <span>{poll.allowVoteChange ? "Vote changes allowed" : "Vote is final"}</span>
      </div>

      {/* Error alert */}
      {errorText && (
        <div className="mb-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 animate-in fade-in duration-150">
          {errorText}
        </div>
      )}

      {/* Options List */}
      <div className="space-y-2 mb-3">
        {poll.options.map(option => {
          const isSelected = option.hasVoted || (option.voterIds || []).includes(myId);
          const count = option.voteCount ?? (option.voterIds?.length || 0);
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={poll.isClosed || isVoting}
              className={`relative w-full text-left overflow-hidden p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 bg-secondary/30 hover:bg-secondary/60"
              } ${poll.isClosed ? "cursor-default opacity-85" : "cursor-pointer active:scale-[0.99]"}`}
            >
              {/* Animated progress bar fill */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                  isSelected ? "bg-primary/20" : "bg-muted/40"
                }`}
                style={{ width: `${percent}%` }}
              />

              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {poll.allowMultiple ? (
                    <div
                      className={`w-4 h-4 rounded-xs border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-card"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-card"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                    </div>
                  )}
                  <span className="text-xs font-medium truncate text-foreground">
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold">
                  <span className="text-muted-foreground text-[11px] font-normal">
                    {count}
                  </span>
                  <span className={isSelected ? "text-primary font-bold" : "text-foreground"}>
                    {percent}%
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Total votes: <strong className="text-foreground">{totalVotes}</strong></span>
        {isCreator && !poll.isClosed && (
          <button
            onClick={handleClose}
            disabled={isVoting}
            className="text-[10px] font-semibold text-destructive hover:underline hover:opacity-80 transition-opacity"
          >
            Close poll
          </button>
        )}
      </div>
    </div>
  );
}
