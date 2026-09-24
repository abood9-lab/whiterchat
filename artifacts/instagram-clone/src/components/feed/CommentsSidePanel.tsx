import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  X,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommentItem, CommentData } from "@/components/feed/CommentItem";
import { RichCommentComposer, CommentSubmitData } from "@/components/feed/RichCommentComposer";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postAuthor?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  postCaption?: string | null;
  postCreatedAt?: string;
  commentsCount: number;
  comments: CommentData[];
  commentsLoading: boolean;
  onReactComment: (commentId: string, emoji: string) => Promise<void> | void;
  onEditComment: (commentId: string, newText: string) => Promise<void> | void;
  onDeleteComment: (commentId: string) => Promise<void> | void;
  onCommentSubmit: (data: CommentSubmitData) => Promise<void> | void;
  onReportComment?: (commentId: string) => void;
}

export function CommentsSidePanel({
  open,
  onOpenChange,
  postId,
  postAuthor,
  postCaption,
  commentsCount,
  comments,
  commentsLoading,
  onReactComment,
  onEditComment,
  onDeleteComment,
  onCommentSubmit,
  onReportComment,
}: Props) {
  const [isRtl, setIsRtl] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Touch drag-to-dismiss states for mobile bottom sheet
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);

  // Keyboard offset tracking with VisualViewport
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Check RTL direction
  useEffect(() => {
    const dir = document.documentElement.getAttribute("dir") || document.body.getAttribute("dir") || "ltr";
    setIsRtl(dir === "rtl");
  }, [open]);

  // Handle Mobile Virtual Keyboard via VisualViewport API
  useEffect(() => {
    if (!open) return;

    const handleResize = () => {
      if (window.visualViewport) {
        const offset = window.innerHeight - window.visualViewport.height;
        setKeyboardOffset(offset > 50 ? offset : 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
    };
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Handle Touch drag on sheet header/handle
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    touchCurrentY.current = e.touches[0].clientY;
    const deltaY = touchCurrentY.current - touchStartY.current;
    if (deltaY > 0) {
      // Dragging down - apply subtle damping resistance
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const deltaY = touchCurrentY.current - touchStartY.current;
    if (deltaY > 80) {
      // Dismiss sheet if pulled down sufficiently
      onOpenChange(false);
      setTimeout(() => setDragY(0), 200);
    } else {
      // Snap back to top
      setDragY(0);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex select-none pointer-events-auto">
      {/* Backdrop Overlay - Keeps feed & post recognizable behind it */}
      <div
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 bg-black/45 md:bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 animate-in fade-in-0"
        aria-hidden="true"
      />

      {/* Main Container: 80% Bottom Sheet on Mobile (<768px), Side Panel on Desktop (>=768px) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-panel-title"
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined,
        }}
        className={cn(
          "relative z-[100] flex flex-col bg-background shadow-2xl overflow-hidden select-text",
          // Mobile: Bottom Sheet taking ~80% of screen height
          "inset-x-0 bottom-0 mt-auto w-full h-[80dvh] max-h-[82dvh] rounded-t-3xl border-t border-border animate-in slide-in-from-bottom duration-300",
          // Desktop: Side Panel (RTL vs LTR aware)
          "md:inset-y-0 md:mt-0 md:h-full md:max-h-full md:rounded-none md:border-t-0 md:w-[420px] lg:w-[460px] md:max-w-[90vw]",
          isRtl
            ? "md:left-0 md:right-auto md:border-r md:border-border md:animate-in md:slide-in-from-left"
            : "md:right-0 md:left-auto md:border-l md:border-border md:animate-in md:slide-in-from-right"
        )}
      >
        {/* Mobile Drag Handle & Header Area (Supports touch swipe-down to dismiss) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="shrink-0 cursor-grab active:cursor-grabbing select-none"
        >
          {/* Touch Drag Pill Bar (Visible & Accessible on Mobile) */}
          <div className="md:hidden pt-3 pb-1.5 flex items-center justify-center">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/35 hover:bg-muted-foreground/60 transition-colors" />
          </div>

          {/* Fixed Header: Comments Title + Count Badge + Close Button */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/80 bg-card/60 backdrop-blur shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h2 id="comments-panel-title" className="text-sm font-bold text-foreground truncate">
                Comments
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-[11px] font-semibold text-muted-foreground shrink-0">
                {commentsCount}
              </span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Close comments"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Post Summary Preview on Desktop for clear context */}
        {postAuthor && (
          <div className="hidden md:flex items-start gap-3 px-4 py-3 bg-muted/20 border-b border-border/40 shrink-0 text-xs">
            <Link href={`/profile/${postAuthor.username}`} className="shrink-0 mt-0.5">
              <Avatar className="w-7 h-7">
                <AvatarImage src={postAuthor.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px] font-bold">
                  {postAuthor.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/profile/${postAuthor.username}`}
                className="font-bold text-foreground hover:underline mr-1"
              >
                {postAuthor.username}
              </Link>
              {postCaption && (
                <span className="text-muted-foreground line-clamp-2 leading-relaxed">
                  {postCaption}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Comments List Container (Independently scrollable) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2.5 divide-y divide-border/20 -webkit-overflow-scrolling-touch"
        >
          {commentsLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs font-medium">Loading comments…</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground px-4">
              <div className="w-12 h-12 rounded-full bg-secondary/80 flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1">No comments yet</p>
              <p className="text-xs max-w-xs mx-auto text-muted-foreground leading-relaxed">
                Be the first to share your thoughts, send a voice note, or drop a GIF!
              </p>
            </div>
          ) : (
            comments.map((comment, idx) => (
              <CommentItem
                key={comment.id ? `${comment.id}-${idx}` : `comment-${idx}`}
                comment={comment}
                postId={postId}
                postAuthorId={postAuthor?.id}
                onReact={onReactComment}
                onEdit={onEditComment}
                onDelete={onDeleteComment}
                onReplySubmit={async (_, data) => {
                  await onCommentSubmit(data);
                }}
                onReport={onReportComment}
              />
            ))
          )}
        </div>

        {/* Sticky Fixed Bottom Rich Composer (Always pinned at bottom of sheet) */}
        <div className="sticky bottom-0 shrink-0 p-2.5 sm:p-3 border-t border-border bg-card/98 backdrop-blur z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <RichCommentComposer
            placeholder="Write a comment…"
            onSubmit={onCommentSubmit}
            autoFocus={false}
          />
        </div>
      </div>
    </div>
  );
}
