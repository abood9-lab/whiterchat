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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Animated feedback states
  const [showPlayIcon, setShowPlayIcon] = useState<"play" | "pause" | null>(null);
  const [burstingHearts, setBurstingHearts] = useState<{ id: number; x: number; y: number }[]>([]);

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
      video.play().then(() => {
        setIsPlaying(true);
        setIsBuffering(false);
      }).catch(() => {
        // Fallback with sound off if autoplay policy requires muted
        video.muted = true;
        video.play().catch(() => {});
      });

      // Track view after 2.5 seconds of active watch
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
      }, 2500);

      return () => clearTimeout(viewTimer);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, isGlobalMuted, reel.id]);

  // Handle Mute changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isGlobalMuted;
    }
  }, [isGlobalMuted]);

  // Toggle Play / Pause on single tap
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setShowPlayIcon("play");
        setTimeout(() => setShowPlayIcon(null), 500);
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      setShowPlayIcon("pause");
      setTimeout(() => setShowPlayIcon(null), 500);
    }
  };

  // Double tap to like with animated bursting heart
  const lastTapRef = useRef<number>(0);
  const handleVideoTouch = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      const rect = containerRef.current?.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      const x = rect ? clientX - rect.left : 150;
      const y = rect ? clientY - rect.top : 250;

      const heartId = Date.now();
      setBurstingHearts((prev) => [...prev, { id: heartId, x, y }]);
      setTimeout(() => {
        setBurstingHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 1000);

      if (!isLiked) {
        handleLike();
      }
    } else {
      handleTogglePlay(e as any);
    }
    lastTapRef.current = now;
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
        title: data.isSaved ? "Reel saved to bookmarks" : "Reel removed from saved",
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
          ? `Now following @${reel.author.username}`
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
            className="font-bold text-white hover:underline drop-shadow inline-block mr-1 text-primary-300"
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
            className="font-bold text-white hover:underline drop-shadow inline-block mr-1 text-blue-300"
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
      {/* HTML5 Video Player */}
      <video
        ref={videoRef}
        src={reel.mediaUrl}
        poster={reel.thumbnailUrl || undefined}
        className="w-full h-full object-cover cursor-pointer"
        loop
        playsInline
        preload="auto"
        muted={isGlobalMuted}
        onClick={handleVideoTouch}
        onTimeUpdate={() => {
          if (videoRef.current) {
            const cur = videoRef.current.currentTime;
            const dur = videoRef.current.duration || 1;
            setCurrentTime(cur);
            setProgress((cur / dur) * 100);
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
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
          <Loader2 className="w-10 h-10 text-white/80 animate-spin" />
        </div>
      )}

      {/* Play / Pause Animated Icon Overlay */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in-50 fade-in duration-200">
          <div className="p-4 rounded-full bg-black/60 text-white backdrop-blur shadow-2xl">
            {showPlayIcon === "play" ? (
              <Play className="w-10 h-10 fill-white" />
            ) : (
              <Pause className="w-10 h-10 fill-white" />
            )}
          </div>
        </div>
      )}

      {/* Double Tap Bursting Hearts Animation */}
      {burstingHearts.map((heart) => (
        <div
          key={heart.id}
          style={{ left: heart.x - 30, top: heart.y - 30 }}
          className="absolute pointer-events-none animate-in zoom-in-50 fade-out-0 duration-700 fill-red-500 text-red-500"
        >
          <Heart className="w-16 h-16 fill-red-500 filter drop-shadow-lg animate-bounce" />
        </div>
      ))}

      {/* Subtle Top & Bottom Gradient Shadows for clear readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

      {/* Top Header Controls: Audio Tag & Sound Mute Toggle */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
        {/* Audio Track Marquee Pill */}
        <button
          type="button"
          onClick={() => reel.audioTitle && onAudioClick?.(reel.audioTitle)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 hover:bg-black/65 text-white/90 backdrop-blur-md text-[11px] font-medium border border-white/10 transition-colors max-w-[200px] truncate"
        >
          <Music className="w-3 h-3 text-primary shrink-0 animate-spin [animation-duration:4s]" />
          <span className="truncate">{reel.audioTitle || "Original audio"}</span>
        </button>

        {/* Sound Volume Mute / Unmute Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleGlobalMute();
          }}
          className="h-8 w-8 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md border border-white/10"
          aria-label={isGlobalMuted ? "Unmute audio" : "Mute audio"}
        >
          {isGlobalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Right Side Vertical Action Dock */}
      <div className="absolute right-2.5 sm:right-3.5 bottom-16 sm:bottom-20 z-20 flex flex-col items-center gap-3.5 sm:gap-4.5">
        {/* Creator Avatar with Follow Mini-Badge */}
        <div className="relative mb-1">
          <Link href={`/profile/${reel.author.username}`}>
            <Avatar className="w-10 h-10 sm:w-11 sm:h-11 border-2 border-white shadow-lg ring-1 ring-black/30">
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
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:scale-110 transition-transform"
              title="Follow creator"
              aria-label="Follow creator"
            >
              <UserPlus className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Reaction / Like Button */}
        <div className="relative flex flex-col items-center gap-1">
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
              "w-10 h-10 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white transition-all active:scale-90",
              isLiked && "text-red-500 border-red-500/30"
            )}
            title="Like or react to Reel (Hold for more emojis)"
            aria-label="Like reel"
          >
            {myReaction && myReaction !== "❤️" ? (
              <span className="text-xl animate-in zoom-in-50">{myReaction}</span>
            ) : (
              <Heart className={cn("w-5 h-5", isLiked && "fill-red-500 text-red-500")} />
            )}
          </button>
          <span className="text-white text-[11px] font-bold drop-shadow">
            {likesCount}
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
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(reel);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white transition-all active:scale-90"
            title="View & write comments"
            aria-label="View comments"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <span className="text-white text-[11px] font-bold drop-shadow">
            {reel.commentsCount}
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
            "w-10 h-10 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white transition-all active:scale-90",
            isSaved && "text-primary border-primary/40"
          )}
          title="Save Reel"
          aria-label="Save reel"
        >
          <Bookmark className={cn("w-5 h-5", isSaved && "fill-primary text-primary")} />
        </button>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShareModalOpen(true);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white transition-all active:scale-90"
            title="Share Reel"
            aria-label="Share reel"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {reel.sharesCount > 0 && (
            <span className="text-white text-[11px] font-bold drop-shadow">
              {reel.sharesCount}
            </span>
          )}
        </div>

        {/* More Options Menu (Dropdown) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white transition-all active:scale-90"
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="left" className="w-48 text-xs z-50">
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/reels?reelId=${reel.id}`
                );
                toast({ title: "Link copied to clipboard!" });
              }}
              className="gap-2 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Link</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setShareModalOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share to Chat</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={handleSave} className="gap-2 cursor-pointer">
              <Bookmark className="w-4 h-4" />
              <span>{isSaved ? "Remove from Saved" : "Save Reel"}</span>
            </DropdownMenuItem>

            {!isMe && (
              <DropdownMenuItem onClick={handleToggleFollow} className="gap-2 cursor-pointer">
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
                  className="gap-2 cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-primary" />
                  <span>Edit Caption</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDeleteReel}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Reel</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                onClick={() => setReportModalOpen(true)}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <Flag className="w-4 h-4" />
                <span>Report Reel</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Rotating Music Disc Animation */}
        <div className="relative mt-1">
          <div
            onClick={(e) => {
              e.stopPropagation();
              reel.audioTitle && onAudioClick?.(reel.audioTitle);
            }}
            className={cn(
              "w-8 h-8 rounded-full border border-white/30 bg-gray-900 flex items-center justify-center shadow-lg cursor-pointer",
              isPlaying && "animate-spin [animation-duration:3s]"
            )}
          >
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
        </div>
      </div>

      {/* Bottom Information Overlay (Author + Follow + Caption + Views) */}
      <div className="absolute bottom-3 inset-x-3 pr-16 z-10 flex flex-col gap-1.5 select-text pointer-events-auto">
        {/* Creator Info & Follow Button */}
        <div className="flex items-center gap-2">
          <Link
            href={`/profile/${reel.author.username}`}
            className="flex items-center gap-1.5 font-bold text-white text-xs sm:text-sm drop-shadow hover:underline"
          >
            <span>@{reel.author.username}</span>
            {reel.author.isVerified && (
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">
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
                "h-6 px-2.5 rounded-full text-[10px] font-semibold backdrop-blur-md transition-all",
                isFollowing
                  ? "bg-white/20 text-white border-white/20 hover:bg-white/30"
                  : "bg-primary text-primary-foreground border-transparent hover:bg-primary/90"
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}

          {/* Real Views Counter */}
          <div className="flex items-center gap-1 text-[10px] font-medium text-white/70 drop-shadow ml-auto">
            <Eye className="w-3 h-3" />
            <span>{viewsCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Caption */}
        {reel.caption && (
          <div className="text-white text-xs leading-relaxed drop-shadow max-w-md">
            <p className={cn(!isExpandedCaption && "line-clamp-2")}>
              {renderCaptionText(reel.caption)}
            </p>
            {reel.caption.length > 90 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpandedCaption(!isExpandedCaption);
                }}
                className="text-[10px] font-semibold text-white/80 hover:text-white mt-0.5"
              >
                {isExpandedCaption ? "Show less" : "...more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live Video Bottom Progress Bar (Seekable) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const pct = clickX / rect.width;
          if (videoRef.current && duration > 0) {
            videoRef.current.currentTime = pct * duration;
          }
        }}
        className="absolute bottom-0 inset-x-0 h-1 bg-white/20 hover:h-2 cursor-pointer transition-all z-30"
      >
        <div
          style={{ width: `${progress}%` }}
          className="h-full bg-primary relative transition-all"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow" />
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
