import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
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
  const [location] = useLocation();

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
  const [isGlobalMuted, setIsGlobalMuted] = useState(false);

  // Modals & Panels
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activeCommentsReel, setActiveCommentsReel] = useState<ReelData | null>(null);

  // Comments state for side panel
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch Reels
  const fetchReels = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      if (pageNum === 1) {
        if (!append) setLoading(true);
      }
      try {
        const token = localStorage.getItem("whiterchat_token");
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

        // If direct reel ID requested, put it at front if exists
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
          setReels((prev) => [...prev, ...incomingReels]);
        } else {
          setReels(incomingReels);
          setActiveIndex(0);
        }

        setHasMore(data.hasMore);
        setPage(pageNum);
      } catch {
        toast({
          title: "Error loading reels",
          description: "Could not fetch the latest reels. Please pull to refresh.",
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
              // Preload more when reaching 2 from the end
              if (index >= reels.length - 2 && hasMore && !loading) {
                fetchReels(page + 1, true);
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.65,
      }
    );

    reelRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reels, hasMore, loading, page, fetchReels]);

  // Keyboard navigation (ArrowUp, ArrowDown, Space, M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
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
        setIsGlobalMuted((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, reels.length]);

  const scrollToReel = (index: number) => {
    if (index < 0 || index >= reels.length) return;
    const targetEl = reelRefs.current[index];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Fetch comments when comments side panel opens
  const handleOpenComments = async (reel: ReelData) => {
    setActiveCommentsReel(reel);
    setCommentsOpen(true);
    setCommentsLoading(true);
    try {
      const token = localStorage.getItem("whiterchat_token");
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
    const token = localStorage.getItem("whiterchat_token");
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
    const token = localStorage.getItem("whiterchat_token");
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
    const token = localStorage.getItem("whiterchat_token");
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
    const token = localStorage.getItem("whiterchat_token");
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
      <div className="relative w-full h-[calc(100dvh-4rem)] md:h-[100dvh] bg-background flex flex-col items-center overflow-hidden">
      {/* Top Header Bar */}
      <header className="absolute top-0 inset-x-0 h-14 bg-background/85 backdrop-blur-md border-b border-border/40 z-40 px-4 flex items-center justify-between">
        {/* Left side: Tag / Audio Indicator or Title */}
        <div className="flex items-center gap-2">
          {selectedTag || selectedAudio ? (
            <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1 rounded-full text-xs font-semibold text-foreground">
              {selectedTag ? (
                <>
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  <span>#{selectedTag}</span>
                </>
              ) : (
                <>
                  <Music className="w-3.5 h-3.5 text-primary" />
                  <span className="max-w-[140px] truncate">{selectedAudio}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedTag(null);
                  setSelectedAudio(null);
                }}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              <span className="font-bold text-base tracking-tight text-foreground">
                Reels
              </span>
            </div>
          )}
        </div>

        {/* Center: Feed Tabs (For You vs Following) */}
        {!selectedTag && !selectedAudio && (
          <div className="flex items-center bg-secondary/70 p-0.5 rounded-full text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("for_you");
                setPage(1);
              }}
              className={cn(
                "px-3.5 py-1 rounded-full transition-all",
                activeTab === "for_you"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
                "px-3.5 py-1 rounded-full transition-all",
                activeTab === "following"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Following
            </button>
          </div>
        )}

        {/* Right side: Create Reel Button & Refresh */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setRefreshing(true);
              fetchReels(1, false);
            }}
            disabled={refreshing}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            title="Refresh feed"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin text-primary")} />
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-8 px-3 rounded-full text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create Reel</span>
          </Button>
        </div>
      </header>

      {/* Main Snap Scroll Container */}
      <div
        ref={containerRef}
        className="w-full flex-1 pt-14 overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col items-center"
        style={{ scrollSnapStop: "always" }}
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span>Loading Reels...</span>
          </div>
        ) : reels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Film className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {selectedTag
                  ? `No Reels found with #${selectedTag}`
                  : selectedAudio
                  ? `No Reels found with this audio`
                  : activeTab === "following"
                  ? "No Reels from creators you follow"
                  : "No Reels yet"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeTab === "following"
                  ? "Follow more creators to see their latest vertical video clips here."
                  : "Be the first creator to publish an engaging Reel!"}
              </p>
            </div>

            <Button
              onClick={() => setCreateModalOpen(true)}
              className="rounded-full text-xs font-semibold gap-1.5 px-6"
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
              className="w-full max-w-[420px] h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4.5rem)] my-2 md:my-3 snap-center snap-always flex items-center justify-center shrink-0 px-2 sm:px-0"
            >
              <div className="w-full h-full rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-border/40 bg-black relative">
                <ReelCard
                  reel={reel}
                  isActive={index === activeIndex}
                  isGlobalMuted={isGlobalMuted}
                  onToggleGlobalMute={() => setIsGlobalMuted((prev) => !prev)}
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

      {/* Desktop Vertical Navigation Floating Arrows */}
      {reels.length > 1 && (
        <div className="hidden lg:flex flex-col gap-2 fixed right-8 bottom-12 z-30">
          <Button
            variant="secondary"
            size="icon"
            disabled={activeIndex === 0}
            onClick={() => scrollToReel(activeIndex - 1)}
            className="h-10 w-10 rounded-full shadow-lg border border-border bg-card/80 backdrop-blur hover:bg-card text-foreground"
            title="Previous Reel (Up Arrow)"
          >
            <ChevronUp className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            disabled={activeIndex === reels.length - 1}
            onClick={() => scrollToReel(activeIndex + 1)}
            className="h-10 w-10 rounded-full shadow-lg border border-border bg-card/80 backdrop-blur hover:bg-card text-foreground"
            title="Next Reel (Down Arrow)"
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
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

      {/* Comments Side Panel / Bottom Sheet */}
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
