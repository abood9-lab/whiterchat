import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  VolumeX,
  Volume2,
  Play,
  Pause,
  MoreHorizontal,
  Music,
  Check,
  UserPlus,
  UserCheck,
  Eye,
  Trash2,
  Edit,
  Flag,
  Copy,
  Loader2,
  Sparkles,
  Download,
  Gauge,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PostReactionPicker } from "@/components/feed/PostReactionPicker";
import { ReportReelModal } from "@/components/reels/ReportReelModal";
import { ShareReelModal } from "@/components/reels/ShareReelModal";
import { EditReelModal } from "@/components/reels/EditReelModal";
import { useAuth } from "@/lib/auth";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ReelData {
  id: string;
  caption: string | null;
  mediaUrl: string;
  mediaType: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  audioTitle?: string | null;
  audioArtist?: string | null;
  hashtags?: string[];
  mentions?: string[];
  viewsCount: number;
  sharesCount: number;
  likesCount: number;
  commentsCount: number;
  reactions?: { emoji: string; count: number }[];
  topReactions?: string[];
  myReaction?: string | null;
  isLiked: boolean;
  isSaved: boolean;
  audience?: string;
  author: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    isFollowing?: boolean;
    isVerified?: boolean;
  };
  createdAt: string;
}

interface Props {
  reel: ReelData;
  isActive: boolean;
  isGlobalMuted: boolean;
  onToggleGlobalMute: () => void;
  onOpenComments: (reel: ReelData) => void;
  onHashtagClick?: (hashtag: string) => void;
  onAudioClick?: (audioTitle: string) => void;
  onReelDeleted?: (reelId: string) => void;
  onReelUpdated?: (reelId: string, updated: { caption: string; audience: string }) => void;
}

function formatCount(num: number): string {
  if (!num || isNaN(num)) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 10_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return num.toLocaleString();
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export function ReelCard({
  reel,
  isActive,
  isGlobalMuted,
  onToggleGlobalMute,
  onOpenComments,
  onHashtagClick,
  onAudioClick,
  onReelDeleted,
  onReelUpdated,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [progress, setProgress] = useState(0);
  const [bufferedProgress, setBufferedProgress] = useState(0);
  const [duration, setDuration] = useState(reel.duration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isFastForwarding, setIsFastForwarding] = useState(false);

  // Animated feedback states
  const [showPlayIcon, setShowPlayIcon] = useState<"play" | "pause" | null>(null);
  const [burstingHearts, setBurstingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  // Reel action states (optimistic)
  const [isLiked, setIsLiked] = useState(reel.isLiked);
  const [likesCount, setLikesCount] = useState(reel.likesCount);
  const [myReaction, setMyReaction] = useState(reel.myReaction);
  const [isSaved, setIsSaved] = useState(reel.isSaved);
  const [isFollowing, setIsFollowing] = useState(!!reel.author.isFollowing);
  const [viewsCount, setViewsCount] = useState(reel.viewsCount);
  const [isExpandedCaption, setIsExpandedCaption] = useState(false);

  // Reaction picker
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionTimeoutRef = useRef<any>(null);
  const holdSpeedTimeoutRef = useRef<any>(null);

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const isMe = user?.id === reel.author.id;

  // Sync props
  useEffect(() => {
    setIsLiked(reel.isLiked);
    setLikesCount(reel.likesCount);
    setMyReaction(reel.myReaction);
    setIsSaved(reel.isSaved);
    setIsFollowing(!!reel.author.isFollowing);
    setViewsCount(reel.viewsCount);
  }, [reel]);

  // Autoplay / Pause on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isGlobalMuted;
      video.playbackRate = isFastForwarding ? 2.0 : playbackSpeed;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch(() => {
          // Fallback with muted sound if browser autoplay restrictions apply
          video.muted = true;
          video.play().catch(() => {});
        });

      // Track view after 2 seconds of watch time
      const viewTimer = setTimeout(() => {
        const token = localStorage.getItem("whiterchat_token");
        fetch(apiUrl(`/api/reels/${reel.id}/view`), {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.viewsCount) setViewsCount(data.viewsCount);
          })
          .catch(() => {});
      }, 2000);

      return () => clearTimeout(viewTimer);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, isGlobalMuted, playbackSpeed, isFastForwarding, reel.id]);

  // Handle Mute changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isGlobalMuted;
    }
  }, [isGlobalMuted]);

  // Handle Playback speed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = isFastForwarding ? 2.0 : playbackSpeed;
    }
  }, [playbackSpeed, isFastForwarding]);

  // Toggle Play / Pause on single tap
  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setShowPlayIcon("play");
          setTimeout(() => setShowPlayIcon(null), 450);
        })
        .catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      setShowPlayIcon("pause");
      setTimeout(() => setShowPlayIcon(null), 450);
    }
  };

  // Double tap / Single tap detection
  const lastTapRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Start long-press timer for 2x speed boost
    holdSpeedTimeoutRef.current = setTimeout(() => {
      setIsFastForwarding(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 450);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (holdSpeedTimeoutRef.current) {
      clearTimeout(holdSpeedTimeoutRef.current);
    }

    if (isFastForwarding) {
      setIsFastForwarding(false);
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

      const rect = containerRef.current?.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      const x = rect ? clientX - rect.left : 180;
      const y = rect ? clientY - rect.top : 260;

      const heartId = Date.now();
      setBurstingHearts((prev) => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setBurstingHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 900);

      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

      if (!isLiked) {
        handleLike("❤️");
      }
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        handleTogglePlay();
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handlePointerCancel = () => {
    if (holdSpeedTimeoutRef.current) clearTimeout(holdSpeedTimeoutRef.current);
    setIsFastForwarding(false);
  };

  // Reaction / Like API
  const handleLike = async (customEmoji: string = "❤️") => {
    const token = localStorage.getItem("whiterchat_token");
    if (!token) {
      toast({ title: "Please sign in to react", variant: "destructive" });
      return;
    }

    const wasLiked = isLiked;
    const prevCount = likesCount;
    const prevEmoji = myReaction;

    // Optimistic update
    if (wasLiked && myReaction === customEmoji) {
      setIsLiked(false);
      setMyReaction(null);
      setLikesCount(Math.max(0, prevCount - 1));
    } else {
      setIsLiked(true);
      setMyReaction(customEmoji);
      setLikesCount(wasLiked ? prevCount : prevCount + 1);
    }

    try {
      const res = await fetch(apiUrl(`/api/reels/${reel.id}/react`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji: customEmoji }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsLiked(data.liked);
      setLikesCount(data.likesCount);
      setMyReaction(data.myReaction);
    } catch {
      // Rollback
      setIsLiked(wasLiked);
      setLikesCount(prevCount);
      setMyReaction(prevEmoji);
    }
  };

  // Save / Bookmark API
  const handleSave = async () => {
    const token = localStorage.getItem("whiterchat_token");
    if (!token) {
      toast({ title: "Please sign in to save reels", variant: "destructive" });
      return;
    }

    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      const res = await fetch(apiUrl(`/api/reels/${reel.id}/save`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsSaved(data.isSaved);
      toast({
        title: data.isSaved ? "Saved to collection" : "Removed from saved",
      });
    } catch {
      setIsSaved(!nextState);
    }
  };

  // Follow / Unfollow author
  const handleToggleFollow = async () => {
    const token = localStorage.getItem("whiterchat_token");
    if (!token) {
      toast({ title: "Please sign in to follow", variant: "destructive" });
      return;
    }

    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      const res = await fetch(apiUrl(`/api/users/${reel.author.id}/follow`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setIsFollowing(data.isFollowing);
      toast({
        title: data.isFollowing
          ? `Following @${reel.author.username}`
          : `Unfollowed @${reel.author.username}`,
      });
    } catch {
      setIsFollowing(!nextState);
    }
  };

  // Delete Reel
  const handleDeleteReel = async () => {
    if (!confirm("Are you sure you want to delete this Reel? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("whiterchat_token");
      const res = await fetch(apiUrl(`/api/reels/${reel.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Reel deleted" });
      if (onReelDeleted) onReelDeleted(reel.id);
    } catch {
      toast({ title: "Could not delete Reel", variant: "destructive" });
    }
  };

  // Download video file directly
  const handleDownload = () => {
    try {
      const a = document.createElement("a");
      a.href = reel.mediaUrl;
      a.download = `whiterchat-reel-${reel.id}.mp4`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({ title: "Downloading Reel video..." });
    } catch {
      toast({ title: "Unable to download video", variant: "destructive" });
    }
  };

  // Render clickable hashtags & mentions in caption
  const renderCaptionText = (text: string) => {
    const parts = text.split(/([#@][a-zA-Z0-9_\u0600-\u06FF]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("#")) {
        return (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick?.(part.slice(1));
            }}
            className="font-bold text-white/95 hover:text-primary hover:underline drop-shadow inline-block mr-1 transition-colors"
          >
            {part}
          </button>
        );
      }
      if (part.startsWith("@")) {
        return (
          <Link
            key={idx}
            href={`/profile/${part.slice(1)}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bold text-sky-300 hover:text-sky-200 hover:underline drop-shadow inline-block mr-1 transition-colors"
          >
            {part}
          </Link>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={reel.mediaUrl}
        poster={reel.thumbnailUrl || undefined}
        className="w-full h-full object-cover cursor-pointer"
        loop
        playsInline
        preload="auto"
        muted={isGlobalMuted}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onTimeUpdate={() => {
          if (videoRef.current && !isScrubbing) {
            const cur = videoRef.current.currentTime;
            const dur = videoRef.current.duration || 1;
            setCurrentTime(cur);
            setProgress((cur / dur) * 100);

            // Calculate buffer
            if (videoRef.current.buffered.length > 0) {
              const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
              setBufferedProgress((bufferedEnd / dur) * 100);
            }
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsBuffering(false);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
      />

      {/* Buffering Spinner */}
      {isBuffering && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/25 backdrop-blur-[1px]">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {/* 2X Speed Boost Floating Indicator */}
      {isFastForwarding && (
        <div className="absolute top-14 inset-x-0 flex justify-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/75 text-amber-300 font-bold text-xs tracking-wide backdrop-blur-md border border-amber-500/40 shadow-xl ring-2 ring-amber-400/20">
            <Zap className="w-3.5 h-3.5 fill-amber-300 animate-pulse" />
            <span>2X SPEED</span>
          </div>
        </div>
      )}

      {/* Play / Pause Animated Icon Overlay */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-150">
          <div className="p-4 sm:p-5 rounded-full bg-black/60 text-white backdrop-blur-md shadow-2xl border border-white/15">
            {showPlayIcon === "play" ? (
              <Play className="w-9 h-9 fill-white translate-x-0.5" />
            ) : (
              <Pause className="w-9 h-9 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Double Tap Bursting Hearts Animation */}
      {burstingHearts.map((heart) => (
        <div
          key={heart.id}
          style={{ left: heart.x - 36, top: heart.y - 36 }}
          className="absolute pointer-events-none z-30 animate-in zoom-in-50 fade-out-0 duration-700"
        >
          <Heart className="w-18 h-18 fill-red-500 text-red-500 filter drop-shadow-[0_4px_12px_rgba(239,68,68,0.7)] animate-bounce" />
        </div>
      ))}

      {/* Subtle Top & Bottom Cinematic Gradient Shadows */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none z-10" />

      {/* Top Header Controls: Audio Tag & Sound Mute Toggle */}
      <div className="absolute top-3.5 inset-x-3.5 flex items-center justify-between z-20">
        {/* Audio Track Tag Pill */}
        <button
          type="button"
          onClick={() => reel.audioTitle && onAudioClick?.(reel.audioTitle)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white/95 backdrop-blur-md text-[11px] font-medium border border-white/15 transition-all max-w-[210px] truncate shadow-md group"
        >
          <Music className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate">{reel.audioTitle || "Original audio"}</span>
        </button>

        {/* Global Sound Volume Mute / Unmute Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleGlobalMute();
          }}
          className="h-8.5 w-8.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/15 shadow-md active:scale-95 transition-all"
          aria-label={isGlobalMuted ? "Unmute audio" : "Mute audio"}
        >
          {isGlobalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </Button>
      </div>

      {/* Right Side Vertical Action Dock */}
      <div className="absolute right-2.5 sm:right-3.5 bottom-14 sm:bottom-16 z-20 flex flex-col items-center gap-3 sm:gap-4">
        {/* Creator Avatar with Follow Mini-Badge */}
        <div className="relative mb-1">
          <Link href={`/profile/${reel.author.username}`} onClick={(e) => e.stopPropagation()}>
            <Avatar className="w-10.5 h-10.5 sm:w-11 sm:h-11 border-2 border-white shadow-xl ring-2 ring-black/40 hover:scale-105 transition-transform">
              <AvatarImage src={reel.author.avatarUrl || undefined} />
              <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">
                {reel.author.username[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          {!isMe && !isFollowing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFollow();
              }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-125 active:scale-95 transition-all ring-2 ring-black"
              title="Follow creator"
              aria-label="Follow creator"
            >
              <UserPlus className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Reaction / Like Button */}
        <div className="relative flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLike(myReaction || "❤️");
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowReactionPicker(true);
            }}
            onTouchStart={() => {
              reactionTimeoutRef.current = setTimeout(() => setShowReactionPicker(true), 400);
            }}
            onTouchEnd={() => {
              if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
            }}
            className={cn(
              "w-10.5 h-10.5 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white transition-all active:scale-85 shadow-lg",
              isLiked && "text-red-500 border-red-500/40 shadow-red-500/20"
            )}
            title="Like or react (Hold for emojis)"
            aria-label="Like reel"
          >
            {myReaction && myReaction !== "❤️" ? (
              <span className="text-xl animate-in zoom-in-75">{myReaction}</span>
            ) : (
              <Heart className={cn("w-5 h-5 transition-transform", isLiked && "fill-red-500 text-red-500 scale-110")} />
            )}
          </button>
          <span className="text-white text-[11px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {formatCount(likesCount)}
          </span>

          {/* Quick Emoji Reaction Popup on Long Press / Hover */}
          {showReactionPicker && (
            <PostReactionPicker
              currentReaction={myReaction}
              onSelect={(emoji) => {
                handleLike(emoji);
                setShowReactionPicker(false);
              }}
              onClose={() => setShowReactionPicker(false)}
              align="right"
              position="top"
              className="bottom-12 right-0"
            />
          )}
        </div>

        {/* Comments Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(reel);
            }}
            className="w-10.5 h-10.5 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white transition-all active:scale-85 shadow-lg"
            title="View & write comments"
            aria-label="View comments"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <span className="text-white text-[11px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {formatCount(reel.commentsCount)}
          </span>
        </div>

        {/* Save / Bookmark Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSave();
          }}
          className={cn(
            "w-10.5 h-10.5 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white transition-all active:scale-85 shadow-lg",
            isSaved && "text-primary border-primary/50"
          )}
          title="Save Reel"
          aria-label="Save reel"
        >
          <Bookmark className={cn("w-5 h-5 transition-transform", isSaved && "fill-primary text-primary scale-110")} />
        </button>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShareModalOpen(true);
            }}
            className="w-10.5 h-10.5 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white transition-all active:scale-85 shadow-lg"
            title="Share Reel"
            aria-label="Share reel"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {reel.sharesCount > 0 && (
            <span className="text-white text-[11px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {formatCount(reel.sharesCount)}
            </span>
          )}
        </div>

        {/* More Options Menu (Dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="w-10.5 h-10.5 rounded-full flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md border border-white/15 text-white transition-all active:scale-85 shadow-lg"
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="left" className="w-52 text-xs z-50 rounded-xl shadow-2xl">
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/reels?reelId=${reel.id}`
                );
                toast({ title: "Link copied to clipboard!" });
              }}
              className="gap-2.5 cursor-pointer py-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Reel Link</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setShareModalOpen(true)}
              className="gap-2.5 cursor-pointer py-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Direct Message</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleSave} className="gap-2.5 cursor-pointer py-2">
              <Bookmark className="w-4 h-4" />
              <span>{isSaved ? "Remove from Saved" : "Save Reel"}</span>
            </DropdownMenuItem>

            {/* Playback Speed Submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2.5 cursor-pointer py-2">
                <Gauge className="w-4 h-4" />
                <span>Playback Speed ({playbackSpeed}x)</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36 text-xs">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                  <DropdownMenuItem
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={cn(
                      "justify-between cursor-pointer py-1.5",
                      playbackSpeed === speed && "font-bold text-primary"
                    )}
                  >
                    <span>{speed}x {speed === 1.0 && "(Normal)"}</span>
                    {playbackSpeed === speed && <Check className="w-3.5 h-3.5" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem onClick={handleDownload} className="gap-2.5 cursor-pointer py-2">
              <Download className="w-4 h-4" />
              <span>Download Video</span>
            </DropdownMenuItem>

            {!isMe && (
              <DropdownMenuItem onClick={handleToggleFollow} className="gap-2.5 cursor-pointer py-2">
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Unfollow @{reel.author.username}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow @{reel.author.username}</span>
                  </>
                )}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {isMe ? (
              <>
                <DropdownMenuItem
                  onClick={() => setEditModalOpen(true)}
                  className="gap-2.5 cursor-pointer py-2"
                >
                  <Edit className="w-4 h-4 text-primary" />
                  <span>Edit Caption</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeleteReel}
                  className="gap-2.5 cursor-pointer py-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Reel</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => setReportModalOpen(true)}
                className="gap-2.5 cursor-pointer py-2 text-destructive focus:text-destructive"
              >
                <Flag className="w-4 h-4" />
                <span>Report Reel</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Rotating Music Disc Animation */}
        <div className="relative mt-0.5">
          <div
            onClick={(e) => {
              e.stopPropagation();
              reel.audioTitle && onAudioClick?.(reel.audioTitle);
            }}
            className={cn(
              "w-8.5 h-8.5 rounded-full border-2 border-white/40 bg-zinc-900 flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform ring-1 ring-black/60",
              isPlaying && "animate-spin [animation-duration:3.5s]"
            )}
            title={`Audio: ${reel.audioTitle || "Original audio"}`}
          >
            <div className="w-3 h-3 rounded-full bg-primary ring-1 ring-white/50" />
          </div>
        </div>
      </div>

      {/* Bottom Information Overlay (Author + Follow + Caption + Views) */}
      <div className="absolute bottom-2.5 inset-x-3.5 pr-16 z-20 flex flex-col gap-1.5 select-text pointer-events-auto">
        {/* Creator Info & Follow Button */}
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${reel.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 font-bold text-white text-xs sm:text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] hover:underline"
          >
            <span>@{reel.author.username}</span>
            {reel.author.isVerified && (
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold shadow">
                ✓
              </span>
            )}
          </Link>

          {!isMe && (
            <Button
              size="sm"
              variant={isFollowing ? "secondary" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFollow();
              }}
              className={cn(
                "h-6 px-2.5 rounded-full text-[10px] font-semibold backdrop-blur-md transition-all shadow",
                isFollowing
                  ? "bg-white/20 text-white border-white/30 hover:bg-white/30"
                  : "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}

          {/* Views Counter */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ml-auto">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatCount(viewsCount)}</span>
          </div>
        </div>

        {/* Caption */}
        {reel.caption && (
          <div className="text-white text-xs leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] max-w-md">
            <p className={cn(!isExpandedCaption && "line-clamp-2")}>
              {renderCaptionText(reel.caption)}
            </p>
            {reel.caption.length > 85 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpandedCaption(!isExpandedCaption);
                }}
                className="text-[11px] font-semibold text-white/85 hover:text-white mt-0.5 drop-shadow"
              >
                {isExpandedCaption ? "Show less" : "...more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Scrub Time Floating Pill (Appears while dragging/seeking) */}
      {isScrubbing && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none z-40">
          <div className="px-3 py-1 rounded-full bg-black/80 text-white text-xs font-mono font-bold backdrop-blur-md border border-white/20 shadow-xl">
            {formatTime(scrubTime)} / {formatTime(duration)}
          </div>
        </div>
      )}

      {/* Live Video Bottom Progress / Scrub Bar */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsScrubbing(true);
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const targetTime = pct * duration;
          setScrubTime(targetTime);
          setProgress(pct * 100);
          if (videoRef.current) videoRef.current.currentTime = targetTime;
        }}
        onPointerMove={(e) => {
          if (!isScrubbing) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const targetTime = pct * duration;
          setScrubTime(targetTime);
          setProgress(pct * 100);
          if (videoRef.current) videoRef.current.currentTime = targetTime;
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setIsScrubbing(false);
        }}
        className="absolute bottom-0 inset-x-0 h-1.5 hover:h-2.5 cursor-pointer transition-all z-30 group"
      >
        {/* Background Track */}
        <div className="w-full h-full bg-white/20 relative">
          {/* Buffered track */}
          <div
            style={{ width: `${bufferedProgress}%` }}
            className="h-full bg-white/30 absolute left-0 top-0 transition-all duration-300"
          />
          {/* Current progress track */}
          <div
            style={{ width: `${progress}%` }}
            className="h-full bg-primary relative transition-all"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-md group-hover:scale-125 transition-transform" />
          </div>
        </div>
      </div>

      {/* Attached Modals */}
      <ReportReelModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        reelId={reel.id}
      />
      <ShareReelModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        reelId={reel.id}
        reelCaption={reel.caption}
        authorUsername={reel.author.username}
      />
      <EditReelModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        reelId={reel.id}
        initialCaption={reel.caption}
        initialAudience={reel.audience}
        onSuccess={(updated) => {
          if (onReelUpdated) onReelUpdated(reel.id, updated);
        }}
      />
    </div>
  );
}
