import { DecoratedAvatar } from "@/components/DecoratedAvatar";
import { Button } from "@/components/ui/button";
import { Radio, Users, Sparkles, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AudioRoomMetadata } from "@/types/audio-room";
import { useAudioRoom } from "./AudioRoomContext";

interface LiveAudioRoomCardProps {
  room: AudioRoomMetadata;
  className?: string;
}

export function LiveAudioRoomCard({ room, className }: LiveAudioRoomCardProps) {
  const { joinRoom, session } = useAudioRoom();

  const isCurrentRoom = session?.active && session.room.id === room.id;

  return (
    <div
      className={cn(
        "p-4 rounded-3xl bg-gradient-to-br from-card via-card to-secondary/30 border border-border/80 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden",
        isCurrentRoom && "ring-2 ring-emerald-500",
        className
      )}
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-500/10 transition-colors" />

      <div>
        {/* Top badges: Live indicator & Category */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Space
          </span>

          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/60">
            {room.category}
          </span>
        </div>

        {/* Room Title */}
        <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1.5">
          {room.title}
        </h3>

        {/* Room Description (if exists) */}
        {room.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
            {room.description}
          </p>
        )}
      </div>

      {/* Host & Audience Footer */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-2 min-w-0">
          <DecoratedAvatar
            avatarUrl={room.hostUser.avatarUrl}
            decorationId={room.hostUser.activeDecorationId}
            username={room.hostUser.username}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">
              {room.hostUser.fullName || room.hostUser.username}
            </p>
            <p className="text-[10px] text-muted-foreground">Host</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>{room.listenerCount || 1}</span>
          </div>

          <Button
            size="sm"
            className="rounded-full text-xs font-bold px-3.5 h-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/20 gap-1.5"
            onClick={() => joinRoom(room)}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{isCurrentRoom ? "Open Space" : "Listen Live"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
