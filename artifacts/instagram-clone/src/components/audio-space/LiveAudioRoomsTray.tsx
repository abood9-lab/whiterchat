import { useState, useEffect } from "react";
import { Radio, Plus, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveAudioRoomCard } from "./LiveAudioRoomCard";
import { CreateAudioRoomModal } from "./CreateAudioRoomModal";
import { useAudioRoom } from "./AudioRoomContext";
import { apiUrl } from "@/lib/api-url";
import { getSocket } from "@/lib/socket";
import type { AudioRoomMetadata } from "@/types/audio-room";
import { cn } from "@/lib/utils";

interface LiveAudioRoomsTrayProps {
  className?: string;
  limit?: number;
  showStartButton?: boolean;
}

export function LiveAudioRoomsTray({
  className,
  limit = 4,
  showStartButton = true,
}: LiveAudioRoomsTrayProps) {
  const { isCreateModalOpen, setIsCreateModalOpen, session } = useAudioRoom();
  const [rooms, setRooms] = useState<AudioRoomMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch active live rooms from API
  useEffect(() => {
    let isMounted = true;
    const fetchRooms = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
        const res = await fetch(apiUrl("/api/audio-rooms?status=live"), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.rooms || [];
          setRooms(list);
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRooms();

    // Listen to real-time room creation & end events on socket
    const socket = getSocket();
    if (socket) {
      const onRoomCreated = (data: any) => {
        if (data?.room) {
          setRooms((prev) => {
            if (prev.some((r) => r.id === data.room.id)) return prev;
            return [data.room, ...prev];
          });
        }
      };

      const onRoomEnded = (data: any) => {
        if (data?.roomId) {
          setRooms((prev) => prev.filter((r) => r.id !== data.roomId));
        }
      };

      socket.on("audio_room_created", onRoomCreated);
      socket.on("audio_room_ended", onRoomEnded);

      return () => {
        isMounted = false;
        socket.off("audio_room_created", onRoomCreated);
        socket.off("audio_room_ended", onRoomEnded);
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Include local active room if not yet returned in API
  const displayedRooms = [...rooms];
  if (session?.active && !displayedRooms.some((r) => r.id === session.room.id)) {
    displayedRooms.unshift(session.room);
  }

  const finalRooms = limit ? displayedRooms.slice(0, limit) : displayedRooms;

  if (finalRooms.length === 0 && !showStartButton) {
    return null;
  }

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* Header with Title and Start Space Button */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
              Live Audio Spaces
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-[11px] text-muted-foreground">Join real-time conversations & stages</p>
          </div>
        </div>

        {showStartButton && (
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-full text-xs font-bold px-3.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start a Space</span>
          </Button>
        )}
      </div>

      {/* Grid of Active Live Spaces */}
      {finalRooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {finalRooms.map((room) => (
            <LiveAudioRoomCard key={room.id} room={room} />
          ))}
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-secondary/20 border border-border/60 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            No live spaces right now. Be the first to start a conversation!
          </p>
          {showStartButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-full text-xs font-semibold"
            >
              <Radio className="w-3.5 h-3.5 mr-1.5 text-primary" /> Start Live Space
            </Button>
          )}
        </div>
      )}

      {/* Create Room Modal */}
      <CreateAudioRoomModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
