import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Hand,
  Radio,
  Users,
  X,
  Share2,
  Minimize2,
  Crown,
  Shield,
  MoreVertical,
  Check,
  Ban,
  UserMinus,
  Sparkles,
  Volume2,
  CheckCircle2,
  ShieldAlert,
  ArrowDown,
} from "lucide-react";
import { DecoratedAvatar } from "@/components/DecoratedAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAudioRoom } from "./AudioRoomContext";
import { useAuth } from "@/lib/auth";
import type { AudioRoomParticipant } from "@/types/audio-room";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const QUICK_REACTIONS = ["❤️", "👏", "🔥", "😂", "🚀", "💯", "🎉", "🎙️"];

export function AudioRoomStage() {
  const { user } = useAuth();
  const {
    session,
    isMinimized,
    setIsMinimized,
    leaveRoom,
    endRoom,
    toggleMute,
    raiseHand,
    cancelRaiseHand,
    acceptSpeakerRequest,
    rejectSpeakerRequest,
    demoteSpeakerToListener,
    muteRemoteSpeaker,
    assignCoHost,
    removeCoHost,
    kickParticipant,
    sendReaction,
    activePeerList,
  } = useAudioRoom();

  const [showDrawer, setShowDrawer] = useState(false);
  const [showReactionsPicker, setShowReactionsPicker] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [duration, setDuration] = useState(0);

  const durationTimerRef = useRef<any>(null);

  // Timer lifecycle
  useEffect(() => {
    if (session?.active) {
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [session?.active]);

  if (!session?.active || isMinimized) return null;

  const currentUserId = user?.id || "";
  const isHost = session.room.hostId === currentUserId;
  const isCoHost = session.room.coHostIds?.includes(currentUserId);
  const isPrivileged = isHost || isCoHost;
  const isSpeaker = isPrivileged || session.myRole === "speaker";

  const hostParticipant = session.participants.find((p) => p.role === "host") || {
    userId: session.room.hostId,
    username: session.room.hostUser.username,
    fullName: session.room.hostUser.fullName,
    avatarUrl: session.room.hostUser.avatarUrl,
    activeDecorationId: session.room.hostUser.activeDecorationId,
    role: "host" as const,
    isMuted: false,
    isSpeaking: false,
    isHandRaised: false,
    joinedAt: session.room.createdAt,
  };

  const coHosts = session.participants.filter((p) => p.role === "co-host");
  const speakers = session.participants.filter(
    (p) => p.role === "speaker" && p.userId !== session.room.hostId
  );
  const listeners = session.participants.filter((p) => p.role === "listener");

  const totalSpeakers = 1 + coHosts.length + speakers.length;
  const totalListeners = listeners.length;
  const pendingRequests = session.speakerRequests.filter((r) => r.status === "pending");

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/explore?space=${session.room.id}`;
      navigator.clipboard.writeText(url).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-3xl flex flex-col text-foreground overflow-hidden select-none animate-in fade-in duration-300">
      {/* ── Top Header / Room Navigation ── */}
      <header className="px-4 py-3 sm:px-6 flex items-center justify-between border-b border-border/60 bg-card/70 backdrop-blur-xl z-30 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md shadow-violet-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Space
              </span>
              <span className="text-xs text-muted-foreground font-mono font-semibold">
                {formatDuration(duration)}
              </span>
            </div>
            <h1 className="font-bold text-base text-foreground truncate mt-0.5">
              {session.room.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full hover:bg-secondary"
            onClick={handleCopyLink}
            title="Share Room Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full hover:bg-secondary relative"
            onClick={() => setShowDrawer((v) => !v)}
            title="Participants & Requests"
          >
            <Users className="w-4 h-4" />
            {isPrivileged && pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                {pendingRequests.length}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full hover:bg-secondary"
            onClick={() => setIsMinimized(true)}
            title="Minimize to Picture-in-Picture"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            onClick={isHost ? endRoom : leaveRoom}
            title={isHost ? "End Space" : "Leave Space"}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ── Main Audio Space Stage (Podiums & Listeners) ── */}
      <main className="flex-1 min-h-0 relative p-3 sm:p-6 flex flex-col items-center justify-between overflow-y-auto">
        {/* Floating live reaction bubble layer */}
        <div className="absolute bottom-24 right-6 pointer-events-none z-40 flex flex-col-reverse gap-2 items-end">
          {session.reactions.map((react) => (
            <div
              key={react.id}
              className="animate-in fade-in slide-in-from-bottom-6 duration-500 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-lg"
            >
              <span className="text-xl">{react.emoji}</span>
              <span className="text-xs font-semibold text-muted-foreground truncate max-w-[80px]">
                @{react.username}
              </span>
            </div>
          ))}
        </div>

        {/* ── Stage Area: Host, Co-Hosts, Speakers ── */}
        <div className="w-full max-w-4xl space-y-6">
          {/* Room Topic / Description Banner */}
          {session.room.description && (
            <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 text-center max-w-xl mx-auto">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {session.room.description}
              </p>
            </div>
          )}

          {/* Speakers Section Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                On Stage ({totalSpeakers} / {session.room.maxSpeakers})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              WebRTC Audio Mesh Active
            </span>
          </div>

          {/* Grid of Speakers on Stage */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-5">
            {/* Host Podium */}
            <SpeakerPodiumTile
              participant={hostParticipant}
              isSelf={hostParticipant.userId === currentUserId}
              isPrivilegedViewer={isPrivileged}
              canModerate={false}
              onDemote={() => {}}
              onMute={() => {}}
              onToggleCoHost={() => {}}
              onKick={() => {}}
            />

            {/* Co-Hosts Podiums */}
            {coHosts.map((coHost) => (
              <SpeakerPodiumTile
                key={coHost.userId}
                participant={coHost}
                isSelf={coHost.userId === currentUserId}
                isPrivilegedViewer={isPrivileged}
                canModerate={isHost}
                onDemote={() => demoteSpeakerToListener(coHost.userId)}
                onMute={() => muteRemoteSpeaker(coHost.userId)}
                onToggleCoHost={() => removeCoHost(coHost.userId)}
                onKick={() => kickParticipant(coHost.userId)}
              />
            ))}

            {/* Speakers Podiums */}
            {speakers.map((spk) => (
              <SpeakerPodiumTile
                key={spk.userId}
                participant={spk}
                isSelf={spk.userId === currentUserId}
                isPrivilegedViewer={isPrivileged}
                canModerate={isPrivileged}
                onDemote={() => demoteSpeakerToListener(spk.userId)}
                onMute={() => muteRemoteSpeaker(spk.userId)}
                onToggleCoHost={() => assignCoHost(spk.userId)}
                onKick={() => kickParticipant(spk.userId)}
              />
            ))}
          </div>

          {/* ── Listeners Section ── */}
          <div className="pt-6 border-t border-border/50">
            <div className="flex items-center justify-between px-2 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Listeners ({totalListeners})
                </h3>
              </div>
            </div>

            {listeners.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No listeners currently in the room. Invite friends with the share link!
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
                {listeners.map((listener) => (
                  <div
                    key={listener.userId}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-secondary/40 transition-all text-center group"
                  >
                    <div className="relative">
                      <DecoratedAvatar
                        avatarUrl={listener.avatarUrl}
                        decorationId={listener.activeDecorationId}
                        username={listener.username}
                        size="md"
                        className="shadow-md"
                      />
                      {listener.isHandRaised && (
                        <span className="absolute -top-1 -right-1 p-1 rounded-full bg-amber-500 text-white shadow-md animate-bounce">
                          <Hand className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-foreground truncate max-w-[70px]">
                      {listener.fullName || listener.username}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Participants & Hand Raise Requests Drawer ── */}
        {showDrawer && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 max-w-[90%] bg-card/95 backdrop-blur-2xl border-l border-border/80 z-50 p-4 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Room Audience</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full"
                onClick={() => setShowDrawer(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Speaker Requests Section for Host & Co-Hosts */}
              {isPrivileged && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Hand className="w-3.5 h-3.5" /> Speaker Requests ({pendingRequests.length})
                    </span>
                  </div>

                  {pendingRequests.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-2">No pending requests</p>
                  ) : (
                    pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <DecoratedAvatar
                            avatarUrl={req.avatarUrl}
                            decorationId={req.activeDecorationId}
                            username={req.username}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate text-foreground">
                              {req.fullName || req.username}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">@{req.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 rounded-full text-red-500 hover:bg-red-500/10"
                            onClick={() => rejectSpeakerRequest(req.id)}
                            title="Decline"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => acceptSpeakerRequest(req.id, req.userId)}
                            title="Accept as Speaker"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Connected Stage Members List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Speakers ({totalSpeakers})
                </span>
                {session.participants
                  .filter((p) => p.role !== "listener")
                  .map((spk) => (
                    <div
                      key={spk.userId}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <DecoratedAvatar
                          avatarUrl={spk.avatarUrl}
                          decorationId={spk.activeDecorationId}
                          username={spk.username}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-foreground">
                            {spk.fullName || spk.username} {spk.userId === currentUserId && "(You)"}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize">{spk.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {spk.isMuted ? (
                          <MicOff className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <Mic className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* ── Bottom Controls Bar ── */}
      <footer className="p-3 sm:p-5 flex items-center justify-between sm:justify-center gap-3 sm:gap-5 bg-card/80 backdrop-blur-2xl border-t border-border/60 z-30 shrink-0">
        {/* Left Side: Mute (for Speakers) or Raise Hand (for Listeners) */}
        <div className="flex items-center gap-2">
          {isSpeaker ? (
            <Button
              variant={session.isMuted ? "destructive" : "secondary"}
              size="icon"
              className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg transition-transform active:scale-95",
                !session.isMuted && "hover:bg-secondary/90 ring-2 ring-emerald-500/20"
              )}
              onClick={toggleMute}
              title={session.isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {session.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
          ) : (
            <Button
              variant={session.isHandRaised ? "default" : "secondary"}
              className={cn(
                "h-12 sm:h-14 px-4 sm:px-6 rounded-full shadow-lg font-bold text-xs sm:text-sm gap-2 transition-transform active:scale-95",
                session.isHandRaised
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "hover:bg-secondary/90"
              )}
              onClick={session.isHandRaised ? cancelRaiseHand : raiseHand}
            >
              <Hand className={cn("w-5 h-5", session.isHandRaised && "animate-bounce")} />
              <span>{session.isHandRaised ? "Lower Hand" : "Request to Speak"}</span>
            </Button>
          )}

          {/* Quick Reaction Launcher Popover */}
          <div className="relative">
            <Button
              variant="secondary"
              size="icon"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg hover:bg-secondary/90 transition-transform active:scale-95"
              onClick={() => setShowReactionsPicker((v) => !v)}
              title="Send Reaction"
            >
              <span className="text-xl">❤️</span>
            </Button>

            {showReactionsPicker && (
              <div className="absolute bottom-full left-0 mb-3 p-2 rounded-2xl bg-card border border-border shadow-2xl flex items-center gap-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    className="text-xl p-2 rounded-xl hover:bg-secondary hover:scale-125 transition-transform active:scale-95"
                    onClick={() => {
                      sendReaction(emoji);
                      setShowReactionsPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Leave Room or End Room */}
        <div className="flex items-center gap-2">
          {isHost ? (
            <Button
              variant="destructive"
              className="h-12 sm:h-14 px-5 sm:px-7 rounded-full shadow-xl font-bold text-xs sm:text-sm gap-2 transition-transform active:scale-95 bg-red-600 hover:bg-red-700 text-white"
              onClick={endRoom}
            >
              <span>End Space</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="h-12 sm:h-14 px-5 sm:px-7 rounded-full shadow-lg font-bold text-xs sm:text-sm gap-2 transition-transform active:scale-95 border border-border/80 hover:bg-secondary/80 text-foreground"
              onClick={leaveRoom}
            >
              <span>Leave quietly</span>
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

// ── Speaker Podium Tile with Audio Waveform Ripple Animation ───────────────
function SpeakerPodiumTile({
  participant,
  isSelf,
  isPrivilegedViewer,
  canModerate,
  onDemote,
  onMute,
  onToggleCoHost,
  onKick,
}: {
  participant: AudioRoomParticipant;
  isSelf: boolean;
  isPrivilegedViewer: boolean;
  canModerate: boolean;
  onDemote: () => void;
  onMute: () => void;
  onToggleCoHost: () => void;
  onKick: () => void;
}) {
  const isHost = participant.role === "host";
  const isCoHost = participant.role === "co-host";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-4 sm:p-5 rounded-3xl bg-secondary/35 border border-border/80 relative shadow-md transition-all duration-300 group",
        participant.isSpeaking &&
          "border-emerald-500 bg-emerald-500/[0.04] shadow-emerald-500/10 scale-102"
      )}
    >
      {/* Role Badge Top Left */}
      <div className="absolute top-3 left-3 flex items-center gap-1">
        {isHost && (
          <span className="p-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30" title="Host">
            <Crown className="w-3.5 h-3.5" />
          </span>
        )}
        {isCoHost && (
          <span className="p-1 rounded-lg bg-violet-500/15 text-violet-500 border border-violet-500/30" title="Co-Host">
            <Shield className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      {/* Moderation Dropdown Menu (Top Right) */}
      {canModerate && !isSelf && (
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl">
              <DropdownMenuItem onClick={onMute} className="gap-2 text-xs font-semibold">
                <MicOff className="w-3.5 h-3.5 text-red-500" /> Mute Speaker
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDemote} className="gap-2 text-xs font-semibold">
                <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" /> Move to Listeners
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleCoHost} className="gap-2 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5 text-violet-500" /> {isCoHost ? "Remove Co-Host" : "Make Co-Host"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onKick} className="gap-2 text-xs font-semibold text-destructive">
                <UserMinus className="w-3.5 h-3.5" /> Remove from Space
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Avatar Container with Ripple Wave */}
      <div className="relative mb-3 mt-2">
        {participant.isSpeaking && (
          <span className="absolute -inset-2 rounded-full border-2 border-emerald-500 animate-ping opacity-60 pointer-events-none" />
        )}
        <DecoratedAvatar
          avatarUrl={participant.avatarUrl}
          decorationId={participant.activeDecorationId}
          username={participant.username}
          size="2xl"
          className={cn(
            "transition-transform shadow-xl",
            participant.isSpeaking && "ring-4 ring-emerald-500 ring-offset-2 ring-offset-card"
          )}
        />
        {participant.isMuted && (
          <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-red-600 text-white shadow-md border-2 border-card">
            <MicOff className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Participant Identity Information */}
      <div className="text-center w-full min-w-0">
        <p className="font-bold text-sm text-foreground truncate">
          {participant.fullName || participant.username} {isSelf && "(You)"}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{participant.username}</p>
      </div>

      {participant.isSpeaking && (
        <span className="mt-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
          <Radio className="w-3 h-3 animate-pulse" /> Speaking
        </span>
      )}
    </div>
  );
}
