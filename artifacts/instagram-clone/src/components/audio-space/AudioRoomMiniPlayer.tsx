import { useAudioRoom } from "./AudioRoomContext";
import { DecoratedAvatar } from "@/components/DecoratedAvatar";
import { Button } from "@/components/ui/button";
import { Maximize2, Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function AudioRoomMiniPlayer() {
  const { session, isMinimized, setIsMinimized, toggleMute, leaveRoom } = useAudioRoom();

  if (!session?.active || !isMinimized) return null;

  const isSpeaker = session.myRole !== "listener";
  const speakers = session.participants.filter((p) => p.role !== "listener");
  const totalListeners = session.participants.filter((p) => p.role === "listener").length;

  return (
    <div
      onClick={() => setIsMinimized(false)}
      className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden cursor-pointer hover:scale-102 transition-all select-none animate-in fade-in slide-in-from-bottom-4 group"
    >
      {/* Top bar with Live indicator & room title */}
      <div className="p-2.5 px-3 flex items-center justify-between gap-3 border-b border-border/40 bg-secondary/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-bold text-xs truncate text-foreground">{session.room.title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {totalListeners} listening
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 rounded-full hover:bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            title="Expand Space"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content Area with Speaker Avatars & Audio Action */}
      <div className="p-3 flex items-center justify-between gap-2">
        <div className="flex -space-x-2 overflow-hidden">
          {speakers.slice(0, 4).map((spk) => (
            <DecoratedAvatar
              key={spk.userId}
              avatarUrl={spk.avatarUrl}
              decorationId={spk.activeDecorationId}
              username={spk.username}
              size="sm"
              className={cn("ring-2 ring-card", spk.isSpeaking && "ring-emerald-500")}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isSpeaker && (
            <Button
              variant={session.isMuted ? "destructive" : "secondary"}
              size="icon"
              className="w-8 h-8 rounded-full shadow"
              onClick={toggleMute}
              title={session.isMuted ? "Unmute" : "Mute"}
            >
              {session.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full text-red-500 hover:bg-red-500/10"
            onClick={leaveRoom}
            title="Leave quietly"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
