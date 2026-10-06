import React from "react";
import { Users, Edit3, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CoWriteData {
  draftId?: string | null;
  authorIds: string[];
  authorUsernames: string[];
}

interface Props {
  text: string | null;
  coWrite: CoWriteData;
  isMe: boolean;
  onOpenDraft?: (draftId: string) => void;
}

export function CoWriteCard({ text, coWrite, isMe, onOpenDraft }: Props) {
  const authorNames = coWrite.authorUsernames?.length > 0
    ? coWrite.authorUsernames.join(", ")
    : "Collaborative Authors";

  return (
    <div
      className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-background to-purple-950/30 p-4 my-1 select-none shadow-md"
      role="region"
      aria-label="Collaborative message"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
            <Users className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
              <span>👥 Collaborative Message</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Written together by <span className="font-semibold text-violet-400">{authorNames}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Message content */}
      <div className="py-2.5">
        <p className="text-sm font-medium leading-relaxed break-words whitespace-pre-wrap text-foreground">
          {text}
        </p>
      </div>

      {/* Footer / Re-open draft info if available */}
      {coWrite.draftId && onOpenDraft && (
        <div className="pt-2 border-t border-border/40 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenDraft(coWrite.draftId!)}
            className="h-7 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-xl gap-1"
          >
            <Edit3 className="w-3 h-3" /> View Collaborative Draft
          </Button>
        </div>
      )}
    </div>
  );
}
