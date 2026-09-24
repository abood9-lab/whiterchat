import React, { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useNavigationState } from "@/lib/navigation-context";

export function IncomingCallBanner() {
  const { callState, acceptCall, endCall, isFullScreenCall } = useNavigationState();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Incoming call that is ringing and not yet opened into full-screen
  const isIncomingRinging = Boolean(
    callState &&
    callState.active &&
    callState.isIncoming &&
    callState.status === "ringing" &&
    !isFullScreenCall
  );

  // Play subtle incoming ringtone when banner is active
  useEffect(() => {
    if (!isIncomingRinging) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
        const playRing = () => {
          if (!audioCtxRef.current) return;
          try {
            const ctx = audioCtxRef.current;
            if (ctx.state === "suspended") {
              ctx.resume().catch(() => {});
            }
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.frequency.value = 440; // A4
            osc2.frequency.value = 480; // Standard ring tone frequency
            gain.gain.value = 0.08;

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start();
            setTimeout(() => {
              try {
                osc1.stop();
                osc2.stop();
              } catch {}
            }, 1200);
          } catch {}
        };

        playRing();
        ringtoneTimerRef.current = setInterval(playRing, 3500);
      }
    } catch {}

    return () => {
      if (ringtoneTimerRef.current) {
        clearInterval(ringtoneTimerRef.current);
        ringtoneTimerRef.current = null;
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
    };
  }, [isIncomingRinging]);

  if (!isIncomingRinging || !callState) return null;

  const isVideo = callState.callType === "video";
  const caller = callState.targetUser;

  return (
    <div
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-[90] animate-in slide-in-from-top-4 duration-300"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="bg-neutral-950/95 border border-neutral-800 backdrop-blur-2xl rounded-2xl shadow-2xl p-3.5 flex items-center justify-between gap-3 text-white">
        <div
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
          onClick={acceptCall}
          role="button"
          tabIndex={0}
        >
          <div className="relative shrink-0">
            <Avatar className="w-12 h-12 border-2 border-emerald-500/60 shadow-md">
              <AvatarImage src={caller?.avatarUrl} />
              <AvatarFallback className="bg-neutral-800 text-base font-bold text-white">
                {caller?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-600 rounded-full border border-neutral-950 text-white">
              {isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate text-white leading-tight">
              {caller?.fullName || caller?.username || "Incoming Call"}
            </p>
            <p className="text-xs text-neutral-400 truncate mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>Incoming {isVideo ? "video" : "voice"} call…</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="icon"
            variant="destructive"
            className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-transform shadow-lg"
            onClick={endCall}
            aria-label="Decline call"
            title="Decline"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-transform text-white shadow-lg animate-pulse"
            onClick={acceptCall}
            aria-label="Accept call"
            title="Accept"
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
