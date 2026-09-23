import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Film,
  Plus,
  Compass,
  Users,
  Sparkles,
  ArrowLeft,
  X,
  RefreshCw,
  Hash,
  Music,
  Loader2,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Keyboard,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReelCard, ReelData } from "@/components/reels/ReelCard";
import { CreateReelModal } from "@/components/reels/CreateReelModal";
import { CommentsSidePanel } from "@/components/feed/CommentsSidePanel";
import { CommentData } from "@/components/feed/CommentItem";
import { CommentSubmitData } from "@/components/feed/RichCommentComposer";
import { useAuth } from "@/lib/auth";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SEOHead } from "@/components/SEOHead";

type FeedTab = "for_you" | "following";

export default function ReelsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // URL Query params parsing
  const urlParams = new URLSearchParams(window.location.search);
  const initialReelId = urlParams.get("reelId");
  const initialTag = urlParams.get("tag");
  const initialAudio = urlParams.get("audio");

  // State
  const [activeTab, setActiveTab] = useState<FeedTab>("for_you");
  const [selectedTag, setSelectedTag] = useState<string | null>(initialTag);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(initialAudio);

  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  // Global sound state (persisted)
  const [isGlobalMuted, setIsGlobalMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("whiterchat_reels_muted") === "true";
    } catch {
      return false;
    }
  });

  const toggleGlobalMute = useCallback(() => {
    setIsGlobalMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("whiterchat_reels_muted", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Modals & Panels
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeCommentsReel, setActiveCommentsReel] = useState<ReelData | null>(null);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);

  // Comments state for side panel
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const getAuthToken = () => {
    return localStorage.getItem("whiterchat_token") || localStorage.getItem("pixlr_token");
  };

  // Fetch Reels feed
  const fetchReels = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (pageNum === 1 && !append) {
        setLoading(true);
      }
      try {
        const token = getAuthToken();
        const query = new URLSearchParams();
        query.set("page", pageNum.toString());
        query.set("limit", "10");

        if (selectedTag) {
          query.set("tag", selectedTag);
        } else if (selectedAudio) {
          query.set("audio", selectedAudio);
        } else {
          query.set("feed", activeTab);
        }

        const res = await fetch(apiUrl(`/api/reels?${query.toString()}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) throw new Error("Failed to fetch reels");

        const data = await res.json();
        const incomingReels: ReelData[] = data.reels || [];

        // If direct reel ID requested on initial load, prioritize it at index 0
        if (initialReelId && pageNum === 1 && !selectedTag && !selectedAudio) {
          const directReelRes = await fetch(apiUrl(`/api/reels/${initialReelId}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).catch(() => null);

          if (directReelRes && directReelRes.ok) {
            const directReel = await directReelRes.json();
            const filtered = incomingReels.filter((r) => r.id !== directReel.id);
            setReels([directReel, ...filtered]);
            setHasMore(data.hasMore);
            setPage(pageNum);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        }

        if (append) {
          setReels((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const fresh = incomingReels.filter((r) => !existingIds.has(r.id));
            return [...prev, ...fresh];
          });
        } else {
          setReels(incomingReels);
          setActiveIndex(0);
        }

        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch {
        toast({
          title: "Error loading reels",
          description: "Could not load video feed. Pull or click refresh to retry.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, selectedTag, selectedAudio, initialReelId, toast]
  );

  // Initial load and filter change trigger
  useEffect(() => {
    fetchReels(1, false);
  }, [fetchReels]);

  // Scroll detection & Intersection Observer for active Reel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(index)) {
              setActiveIndex(index);
              // Preload more reels when 2 items from end
              if (index >= reels.length - 2 && hasMore && !loading) {
                fetchReels(page + 1, true);
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.7,
      }
    );

    reelRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reels, hasMore, loading, page, fetchReels]);

  // Preload next reel's video for instantaneous playback
  useEffect(() => {
    if (reels[activeIndex + 1]?.mediaUrl) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = reels[activeIndex + 1].mediaUrl;
      document.head.appendChild(link);
      return () => {
        try {
          document.head.removeChild(link);
        } catch {}
      };
    }
  }, [activeIndex, reels]);

  // Keyboard navigation on desktop (ArrowUp, ArrowDown, Space, M, L, C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === "ArrowDown" || e.key === "j" || e.key === "PageDown") {
        e.preventDefault();
        scrollToReel(activeIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "PageUp") {
        e.preventDefault();
        scrollToReel(activeIndex - 1);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleGlobalMute();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        if (reels[activeIndex]) {
          if (commentsOpen) {
            setCommentsOpen(false);
          } else {
            handleOpenComments(reels[activeIndex]);
          }
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setShowKeyboardHints((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, reels, commentsOpen, toggleGlobalMute]);

  const scrollToReel = (index: number) => {
    if (index < 0 || index >= reels.length) return;
    const targetEl = reelRefs.current[index];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  // Fetch comments when comments panel opens
  const handleOpenComments = async (reel: ReelData) => {
    setActiveCommentsReel(reel);
    setCommentsOpen(true);
    setCommentsLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl(`/api/reels/${reel.id}/comments`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {}
    setCommentsLoading(false);
  };

  // Submit comment
  const handleCommentSubmit = async (data: CommentSubmitData) => {
    if (!activeCommentsReel) return;
    const token = getAuthToken();
    if (!token) {
      toast({ title: "Please sign in to comment", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/reels/${activeCommentsReel.id}/comments`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to post comment");
      const newComment = await res.json();

      setComments((prev) => [newComment, ...prev]);
      // Increment comment count
      setReels((prev) =>
        prev.map((r) =>
          r.id === activeCommentsReel.id
            ? { ...r, commentsCount: r.commentsCount + 1 }
            : r
        )
      );
      if (activeCommentsReel) {
        setActiveCommentsReel((prev) =>
          prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null
        );
      }
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    }
  };

  // React to comment
  const handleReactComment = async (commentId: string, emoji: string) => {
    if (!activeCommentsReel) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(apiUrl(`/api/posts/${activeCommentsReel.id}/comments/${commentId}/react`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });
      // Refresh comments
      const res = await fetch(apiUrl(`/api/reels/${activeCommentsReel.id}/comments`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setComments(await res.json());
    } catch {}
  };

  // Edit comment
  const handleEditComment = async (commentId: string, newText: string) => {
    if (!activeCommentsReel) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(apiUrl(`/api/posts/${activeCommentsReel.id}/comments/${commentId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newText }),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, text: newText } : c))
      );
      toast({ title: "Comment updated" });
    } catch {
      toast({ title: "Failed to update comment", variant: "destructive" });
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!activeCommentsReel) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(apiUrl(`/api/posts/${activeCommentsReel.id}/comments/${commentId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setReels((prev) =>
        prev.map((r) =>
          r.id === activeCommentsReel.id
            ? { ...r, commentsCount: Math.max(0, r.commentsCount - 1) }
            : r
        )
      );
      if (activeCommentsReel) {
        setActiveCommentsReel((prev) =>
          prev ? { ...prev, commentsCount: Math.max(0, prev.commentsCount - 1) } : null
        );
      }
      toast({ title: "Comment deleted" });
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    }
  };

  return (
    <>
      <SEOHead
        title="Watch Trending Reels & Viral Short Videos – WhiterChat"
        description="Immerse in endless entertainment with top creator reels, music, viral clips, and creative shorts on WhiterChat."
        canonicalPath="/reels"
        type="video.other"
      />

      <div className="relative w-full h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] md:h-[100dvh] bg-black md:bg-background flex flex-col items-center overflow-hidden select-none">
        {/* Floating Ambient Header Bar (Translucent gradient overlay) */}
        <header className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-black/85 via-black/40 to-transparent z-40 px-3 sm:px-6 flex items-center justify-between pointer-events-auto">
          {/* Left: Branding or Active Filter Pill */}
          <div className="flex items-center gap-2">
            {selectedTag || selectedAudio ? (
              <div className="flex items-center gap-2 bg-black/60 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/20 shadow-md">
                {selectedTag ? (
                  <>
                    <Hash className="w-3.5 h-3.5 text-primary" />
                    <span>#{selectedTag}</span>
                  </>
                ) : (
                  <>
                    <Music className="w-3.5 h-3.5 text-primary" />
                    <span className="max-w-[120px] sm:max-w-[160px] truncate">{selectedAudio}</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag(null);
                    setSelectedAudio(null);
                  }}
                  className="p-0.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white ml-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link href="/reels" className="flex items-center gap-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] hover:opacity-90 transition-opacity">
                <Film className="w-5 h-5 text-primary fill-primary/30" />
                <span className="font-bold text-base tracking-tight drop-shadow">
                  Reels
                </span>
              </Link>
            )}
          </div>

          {/* Center: For You vs Following Pills */}
          {!selectedTag && !selectedAudio && (
            <div className="flex items-center bg-black/50 backdrop-blur-md p-0.5 rounded-full text-xs font-semibold border border-white/15 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("for_you");
                  setPage(1);
                }}
                className={cn(
                  "px-3.5 py-1 rounded-full transition-all text-xs font-bold",
                  activeTab === "for_you"
                    ? "bg-white text-black shadow-md scale-105"
                    : "text-white/75 hover:text-white"
                )}
              >
                For You
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("following");
                  setPage(1);
                }}
                className={cn(
                  "px-3.5 py-1 rounded-full transition-all text-xs font-bold",
                  activeTab === "following"
                    ? "bg-white text-black shadow-md scale-105"
                    : "text-white/75 hover:text-white"
                )}
              >
                Following
              </button>
            </div>
          )}

          {/* Right: Refresh & Create Reel Button */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRefreshing(true);
                fetchReels(1, false);
              }}
              disabled={refreshing}
              className="h-8.5 w-8.5 text-white hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full border border-white/15 shadow-md"
              title="Refresh Reels Feed"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-primary")} />
            </Button>

            <Button
              size="sm"
              onClick={() => setCreateModalOpen(true)}
              className="h-8.5 px-3 rounded-full text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </div>
        </header>

        {/* Snap Scroll Viewport Container */}
        <div
          ref={containerRef}
          className={cn(
            "w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col items-center touch-pan-y",
            "md:py-4 md:space-y-6"
          )}
          style={{ scrollSnapStop: "always" }}
        >
          {loading ? (
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-white/80 text-xs">
              <Loader2 className="w-9 h-9 animate-spin text-primary" />
              <span className="font-semibold tracking-wide">Loading Reels...</span>
            </div>
          ) : reels.length === 0 ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm text-white">
              <div className="w-16 h-16 rounded-full bg-white/10 text-primary flex items-center justify-center mx-auto shadow-xl">
                <Film className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold">
                  {selectedTag
                    ? `No Reels found with #${selectedTag}`
                    : selectedAudio
                    ? `No Reels found with this audio`
                    : activeTab === "following"
                    ? "No Reels from creators you follow"
                    : "No Reels yet"}
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  {activeTab === "following"
                    ? "Follow more creators or switch to 'For You' to explore trending videos."
                    : "Be the first creator to share a vertical Reel with the community!"}
                </p>
              </div>

              <Button
                onClick={() => setCreateModalOpen(true)}
                className="rounded-full text-xs font-semibold gap-1.5 px-6 bg-primary text-primary-foreground shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Create First Reel
              </Button>
            </div>
          ) : (
            reels.map((reel, index) => (
              <div
                key={reel.id}
                ref={(el) => {
                  reelRefs.current[index] = el;
                }}
                data-index={index}
                className={cn(
                  "w-full snap-start snap-always shrink-0 flex items-center justify-center relative",
                  // Mobile: 100% full screen edge-to-edge
                  "h-full",
                  // Desktop: Centered 9:16 vertical card with rounded borders and ambient shadow
                  "md:h-[calc(100dvh-2.5rem)] md:max-w-[420px] lg:max-w-[440px]"
                )}
              >
                {/* Desktop Ambient Glow Backdrop */}
                <div className="hidden md:block absolute -inset-2 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-xl -z-10" />

                <div className={cn(
                  "w-full h-full overflow-hidden bg-black relative",
                  "md:rounded-3xl md:shadow-2xl md:border md:border-white/10"
                )}>
                  <ReelCard
                    reel={reel}
                    isActive={index === activeIndex}
                    isGlobalMuted={isGlobalMuted}
                    onToggleGlobalMute={toggleGlobalMute}
                    onOpenComments={handleOpenComments}
                    onHashtagClick={(tag) => setSelectedTag(tag)}
                    onAudioClick={(audio) => setSelectedAudio(audio)}
                    onReelDeleted={(id) => {
                      setReels((prev) => prev.filter((r) => r.id !== id));
                    }}
                    onReelUpdated={(id, updated) => {
                      setReels((prev) =>
                        prev.map((r) =>
                          r.id === id ? { ...r, ...updated } : r
                        )
                      );
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Vertical Navigation Floating Dock */}
        {reels.length > 1 && (
          <div className="hidden md:flex flex-col items-center gap-2.5 fixed right-6 lg:right-10 bottom-8 z-30 animate-in fade-in duration-300">
            {/* Keyboard Shortcuts Hint Button */}
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowKeyboardHints((prev) => !prev)}
              className="h-9 w-9 rounded-full shadow-xl border border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/80"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </Button>

            {/* Scroll Up Arrow */}
            <Button
              variant="secondary"
              size="icon"
              disabled={activeIndex === 0}
              onClick={() => scrollToReel(activeIndex - 1)}
              className="h-11 w-11 rounded-full shadow-2xl border border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/80 disabled:opacity-30 active:scale-95 transition-all"
              title="Previous Reel (↑ or k)"
            >
              <ChevronUp className="w-5 h-5" />
            </Button>

            {/* Scroll Down Arrow */}
            <Button
              variant="secondary"
              size="icon"
              disabled={activeIndex === reels.length - 1}
              onClick={() => scrollToReel(activeIndex + 1)}
              className="h-11 w-11 rounded-full shadow-2xl border border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/80 disabled:opacity-30 active:scale-95 transition-all"
              title="Next Reel (↓ or j)"
            >
              <ChevronDown className="w-5 h-5" />
            </Button>

            {/* Global Sound Quick Toggle */}
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleGlobalMute}
              className="h-9 w-9 rounded-full shadow-xl border border-white/20 bg-black/60 text-white backdrop-blur hover:bg-black/80 mt-1"
              title={isGlobalMuted ? "Unmute all (M)" : "Mute all (M)"}
            >
              {isGlobalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </Button>
          </div>
        )}

        {/* Keyboard Shortcuts Floating Tooltip Modal */}
        {showKeyboardHints && (
          <div className="fixed bottom-24 right-6 lg:right-10 z-50 p-4 rounded-2xl bg-card/95 text-foreground backdrop-blur-md border border-border shadow-2xl w-64 space-y-2 animate-in zoom-in-95 fade-in duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-primary" />
                Keyboard Controls
              </span>
              <button
                onClick={() => setShowKeyboardHints(false)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Next Reel</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold">↓ / J</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Previous Reel</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold">↑ / K</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mute / Unmute</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold">M</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Comments</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono font-bold">C</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Double Tap Video</span>
                <span className="font-semibold text-red-500">❤️ Like</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Hold Video</span>
                <span className="font-semibold text-amber-400">⚡ 2x Speed</span>
              </div>
            </div>
          </div>
        )}

        {/* Create Reel Modal */}
        <CreateReelModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onReelCreated={(newReel) => {
            setReels((prev) => [newReel, ...prev]);
            setActiveIndex(0);
            scrollToReel(0);
          }}
        />

        {/* Comments Side Panel (Bottom Sheet on Mobile, Side Panel on Desktop) */}
        {activeCommentsReel && (
          <CommentsSidePanel
            open={commentsOpen}
            onOpenChange={setCommentsOpen}
            postId={activeCommentsReel.id}
            postAuthor={activeCommentsReel.author}
            postCaption={activeCommentsReel.caption}
            postCreatedAt={activeCommentsReel.createdAt}
            commentsCount={activeCommentsReel.commentsCount}
            comments={comments}
            commentsLoading={commentsLoading}
            onReactComment={handleReactComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            onCommentSubmit={handleCommentSubmit}
          />
        )}
      </div>
    </>
  );
}
