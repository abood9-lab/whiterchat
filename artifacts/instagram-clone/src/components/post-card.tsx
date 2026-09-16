import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Flag,
  Link2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Lock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useLikePost,
  useSavePost,
  useDeletePost,
  useUpdatePost,
  useReportPost,
  getGetFeedQueryKey,
  useGetFollowing,
  useCreateConversation,
  useSendMessage,
  useCreateStory,
} from "@workspace/api-client-react";
import type { Post, UserSummary } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PostReactionPicker } from "@/components/feed/PostReactionPicker";
import { ReactionsListModal } from "@/components/feed/ReactionsListModal";
import { RichCommentComposer, CommentSubmitData } from "@/components/feed/RichCommentComposer";
import { CommentItem, CommentData } from "@/components/feed/CommentItem";
import { CommentsSidePanel } from "@/components/feed/CommentsSidePanel";
import { VoicePlayer } from "@/components/chat/VoicePlayer";

function MediaCarousel({
  mediaUrls,
  mediaType,
  altText,
  caption,
  onDoubleTap,
}: {
  mediaUrls: string[];
  mediaType: string;
  altText?: string | null;
  caption?: string | null;
  onDoubleTap: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const total = mediaUrls.length;
  const canPrev = current > 0;
  const canNext = current < total - 1;

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(total - 1, c + 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 40 && canNext) next();
    else if (diff < -40 && canPrev) prev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div
      className="relative bg-black w-full overflow-hidden select-none"
      onDoubleClick={onDoubleTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {mediaUrls.map((url, i) =>
          mediaType === "video" && i === 0 ? (
            <div key={i} className="w-full flex-none">
              <video
                src={url}
                controls
                className="w-full max-h-[585px] object-contain"
              />
            </div>
          ) : (
            <div key={i} className="w-full flex-none">
              <img
                src={url}
                alt={altText ?? caption ?? "Post image"}
                className="w-full max-h-[585px] object-contain"
                draggable={false}
              />
            </div>
          )
        )}
      </div>

      {canPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canNext && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {mediaUrls.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={cn(
                "rounded-full transition-all duration-200",
                i === current
                  ? "w-2 h-2 bg-white"
                  : "w-1.5 h-1.5 bg-white/50 hover:bg-white/75"
              )}
            />
          ))}
        </div>
      )}

      {total > 1 && (
        <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2 py-0.5 rounded-full z-10">
          {current + 1}/{total}
        </div>
      )}
    </div>
  );
}

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [userReaction, setUserReaction] = useState<string | null>(
    (post as any).userReaction ?? (post.isLiked ? "❤️" : null)
  );
  const [likesCount, setLikesCount] = useState<number>(post.likesCount || 0);
  const [reactionsSummary, setReactionsSummary] = useState<
    { emoji: string; count: number }[]
  >((post as any).reactionsSummary ?? []);

  const [isSaved, setIsSaved] = useState(post.isSaved);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);
  const [comments, setComments] = useState<CommentData[]>((post as any).comments || []);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);

  const [editOpen, setEditOpen] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState("");
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const saveMutation = useSavePost();
  const deleteMutation = useDeletePost();
  const updateMutation = useUpdatePost();
  const reportMutation = useReportPost();
  const createConvMutation = useCreateConversation();
  const sendMessageMutation = useSendMessage();
  const createStoryMutation = useCreateStory();

  const { data: followingData } = useGetFollowing(user?.username ?? "", {
    query: { enabled: !!user?.username && shareOpen } as any,
  });
  const followingList: UserSummary[] = (followingData as any) ?? [];
  const filteredFollowing = followingList.filter(
    (u) =>
      u.username.toLowerCase().includes(shareSearch.toLowerCase()) ||
      (u.fullName ?? "").toLowerCase().includes(shareSearch.toLowerCase())
  );

  const isOwner = post.author?.id === user?.id;
  const captionLong = (post.caption?.length ?? 0) > 100;
  const commentsDisabled = post.commentsDisabled === true;
  const isCloseFriends = post.audience === "close_friends";

  const allMediaUrls = [
    post.mediaUrl,
    ...(post.additionalMediaUrls ?? []),
  ].filter(Boolean) as string[];

  // Fetch comments when sheet opens
  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const commentsList = Array.isArray(data) ? data : Array.isArray(data?.comments) ? data.comments : [];
        setComments(commentsList);
      }
    } catch {
      // ignore
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleOpenComments = () => {
    setShowCommentsSheet(true);
    loadComments();
  };

  // React with Emoji
  const handleReact = async (emoji: string) => {
    const prevReaction = userReaction;
    const prevLikesCount = likesCount;
    const isTogglingOff = prevReaction === emoji;

    const newReaction = isTogglingOff ? null : emoji;
    const newLikesCount = isTogglingOff
      ? Math.max(0, prevLikesCount - 1)
      : prevReaction
      ? prevLikesCount
      : prevLikesCount + 1;

    setUserReaction(newReaction);
    setLikesCount(newLikesCount);

    try {
      const res = await fetch(`/api/posts/${post.id}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserReaction(data.userReaction);
        setLikesCount(data.likesCount);
        setReactionsSummary(data.reactions);
      }
    } catch {
      setUserReaction(prevReaction);
      setLikesCount(prevLikesCount);
    }
  };

  const handleToggleLike = () => {
    if (userReaction) {
      handleReact(userReaction);
    } else {
      handleReact("❤️");
    }
  };

  const handleDoubleTapLike = () => {
    if (!userReaction) handleReact("❤️");
  };

  const handleSave = async () => {
    setIsSaved(!isSaved);
    try {
      await saveMutation.mutateAsync({ postId: post.id });
    } catch {
      setIsSaved(isSaved);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ postId: post.id });
      queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  const handleEditCaption = async () => {
    try {
      await updateMutation.mutateAsync({
        postId: post.id,
        data: { caption: editCaption },
      });
      queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      setEditOpen(false);
      toast({ title: "Caption updated" });
    } catch {
      toast({ title: "Failed to update caption", variant: "destructive" });
    }
  };

  const handleReport = async () => {
    try {
      await reportMutation.mutateAsync({
        postId: post.id,
        data: { reason: reportReason },
      });
      setReportOpen(false);
      toast({
        title: "Report submitted",
        description: "Thanks for keeping the community safe.",
      });
    } catch {
      toast({ title: "Failed to submit report", variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast({ title: "Link copied!" });
  };

  const handleShare = () => {
    setShareOpen(true);
  };

  const handleShareToUser = async (targetUser: UserSummary) => {
    setSendingTo(targetUser.id);
    try {
      const conv = await createConvMutation.mutateAsync({
        data: { otherUsername: targetUser.username },
      });
      await sendMessageMutation.mutateAsync({
        data: {
          conversationId: conv.id,
          text: `${window.location.origin}/post/${post.id}`,
        },
      });
      toast({ title: `Sent to @${targetUser.username}!` });
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSendingTo(null);
    }
  };

  const handleShareToStory = async () => {
    try {
      const mediaUrl = post.mediaUrl || post.additionalMediaUrls?.[0];
      if (!mediaUrl) {
        toast({ title: "No media to share" });
        return;
      }
      await createStoryMutation.mutateAsync({
        data: {
          mediaUrl,
          mediaType: post.mediaType === "video" ? "video" : "image",
          caption: post.caption ?? undefined,
        },
      });
      toast({ title: "Shared to your story!" });
      setShareOpen(false);
    } catch {
      toast({ title: "Failed to share to story", variant: "destructive" });
    }
  };

  // Submit Comment / Reply
  const handleCommentSubmit = async (data: CommentSubmitData) => {
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newComment = await res.json();
        setCommentsCount((prev) => prev + 1);
        if (data.replyToCommentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === data.replyToCommentId
                ? {
                    ...c,
                    repliesCount: (c.repliesCount ?? 0) + 1,
                    replies: [...(c.replies ?? []), newComment],
                  }
                : c
            )
          );
        } else {
          setComments((prev) => [...prev, newComment]);
        }
        toast({ title: "Comment posted" });
      }
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    }
  };

  // React to Comment
  const handleCommentReact = async (commentId: string, emoji: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        const updateTree = (list: CommentData[]): CommentData[] =>
          list.map((c) => {
            if (c.id === commentId) {
              return {
                ...c,
                userReaction: data.userReaction,
                likesCount: data.likesCount,
                reactions: data.reactions,
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateTree(c.replies) };
            }
            return c;
          });
        setComments((prev) => updateTree(prev));
      }
    } catch {
      // ignore
    }
  };

  // Edit Comment
  const handleCommentEdit = async (commentId: string, newText: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: newText }),
    });
    if (res.ok) {
      const updated = await res.json();
      const updateTree = (list: CommentData[]): CommentData[] =>
        list.map((c) => {
          if (c.id === commentId) {
            return { ...c, text: updated.text, isEdited: true };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateTree(c.replies) };
          }
          return c;
        });
      setComments((prev) => updateTree(prev));
    }
  };

  // Delete Comment
  const handleCommentDelete = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const filterTree = (list: CommentData[]): CommentData[] =>
          list
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies ? filterTree(c.replies) : [],
            }));
        setComments((prev) => filterTree(prev));
        setCommentsCount((prev) => Math.max(0, prev - 1));
        toast({ title: "Comment removed" });
      }
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    }
  };

  return (
    <>
      <div className="bg-card border-b sm:border border-border sm:rounded-xl overflow-hidden max-w-[470px] mx-auto w-full mb-0 sm:mb-4">

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <Link href={`/profile/${post.author.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={post.author.avatarUrl || undefined} />
                <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  {post.author.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isCloseFriends && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-card">
                  <Lock className="h-2 w-2 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm leading-tight">{post.author.username}</span>
                {isCloseFriends && (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full leading-none">
                    Close Friends
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground leading-tight">
                {post.location && (
                  <>
                    <MapPin className="h-2.5 w-2.5" />
                    <span>{post.location}</span>
                    <span className="mx-0.5">·</span>
                  </>
                )}
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isOwner ? (
                <>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => { setEditCaption(post.caption ?? ""); setEditOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" /> Edit caption
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete post
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag className="h-4 w-4" /> Report post
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleCopyLink}>
                <Link2 className="h-4 w-4" /> Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Media Carousel */}
        <MediaCarousel
          mediaUrls={allMediaUrls}
          mediaType={post.mediaType}
          altText={post.altText}
          caption={post.caption}
          onDoubleTap={handleDoubleTapLike}
        />

        {/* Actions */}
        <div className="px-3 pt-2.5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* Like / Reaction Button */}
              <div className="relative">
                <button
                  onClick={handleToggleLike}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowReactionPicker(true);
                  }}
                  className="hover:scale-110 transition-transform active:scale-90 flex items-center justify-center"
                >
                  {userReaction ? (
                    userReaction === "❤️" ? (
                      <Heart className="h-6 w-6 fill-red-500 text-red-500 transition-colors animate-in zoom-in-50" />
                    ) : (
                      <span className="text-2xl leading-none animate-in zoom-in-50 drop-shadow-sm">
                        {userReaction}
                      </span>
                    )
                  ) : (
                    <Heart className="h-6 w-6 text-foreground hover:text-muted-foreground transition-colors" />
                  )}
                </button>

                {/* Floating Reaction Picker */}
                {showReactionPicker && (
                  <PostReactionPicker
                    currentReaction={userReaction}
                    onSelect={(emoji) => {
                      handleReact(emoji);
                      setShowReactionPicker(false);
                    }}
                    onClose={() => setShowReactionPicker(false)}
                    align="left"
                    position="top"
                  />
                )}
              </div>

              {!commentsDisabled && (
                <button
                  onClick={handleOpenComments}
                  className="hover:text-muted-foreground transition-colors cursor-pointer"
                >
                  <MessageCircle className="h-6 w-6" />
                </button>
              )}

              <button onClick={handleShare} className="hover:text-muted-foreground transition-colors">
                <Send className="h-6 w-6" />
              </button>
            </div>

            <button
              onClick={handleSave}
              className="hover:scale-110 transition-transform active:scale-90"
            >
              <Bookmark className={cn("h-6 w-6 transition-colors", isSaved ? "fill-foreground text-foreground" : "hover:text-muted-foreground")} />
            </button>
          </div>

          {/* Likes & Reaction Summary */}
          {likesCount > 0 && (
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <button
                onClick={() => setShowReactionsModal(true)}
                className="font-semibold text-sm hover:underline"
              >
                {likesCount.toLocaleString()} {likesCount === 1 ? "like" : "likes"}
              </button>

              {reactionsSummary.length > 0 && (
                <button
                  onClick={() => setShowReactionsModal(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border/50 text-xs font-medium transition-all hover:scale-105"
                >
                  <span className="text-xs">
                    {reactionsSummary.slice(0, 4).map((r) => r.emoji).join("")}
                  </span>
                </button>
              )}
            </div>
          )}

          {post.caption && (
            <div className="text-sm mb-1.5 leading-snug">
              <Link href={`/profile/${post.author.username}`} className="font-semibold hover:underline mr-1.5">
                {post.author.username}
              </Link>
              <span className="text-foreground/90">
                {captionLong && !captionExpanded
                  ? `${post.caption.slice(0, 100)}...`
                  : post.caption}
              </span>
              {captionLong && (
                <button
                  onClick={() => setCaptionExpanded(!captionExpanded)}
                  className="ml-1 text-muted-foreground text-xs hover:text-foreground transition-colors"
                >
                  {captionExpanded ? "less" : "more"}
                </button>
              )}
            </div>
          )}

          {!commentsDisabled && commentsCount > 0 && (
            <button
              onClick={handleOpenComments}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors block mb-1 text-left"
            >
              View all {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
            </button>
          )}

          {/* Comments Preview directly on the feed card */}
          {!commentsDisabled && comments.length > 0 && (
            <div className="space-y-1.5 my-1.5">
              {comments.slice(-2).map((c, idx) => (
                <div key={c.id ? `${c.id}-${idx}` : `preview-${idx}`} className="text-sm leading-snug flex items-start gap-1.5">
                  <Link href={`/profile/${c.author?.username}`} className="font-semibold hover:underline shrink-0 text-foreground">
                    {c.author?.username}
                  </Link>
                  <div className="flex-1 min-w-0">
                    {c.text && <span className="text-foreground/90 break-words">{c.text}</span>}
                    {c.mediaUrl && (
                      <div className="mt-1">
                        {c.mediaType === "voice" ? (
                          <VoicePlayer url={c.mediaUrl} />
                        ) : (
                          <img src={c.mediaUrl} alt="Attachment" className="max-h-24 rounded-lg object-contain border border-border" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {commentsDisabled && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MessageCircle className="h-3 w-3" />
              Comments are disabled
            </div>
          )}

          {/* Quick inline comment input on card */}
          {!commentsDisabled && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <RichCommentComposer
                placeholder="Add a comment… (GIFs, stickers, voice, @mentions)"
                onSubmit={handleCommentSubmit}
              />
            </div>
          )}
        </div>
      </div>

      {/* Post Reactions List Modal */}
      <ReactionsListModal
        open={showReactionsModal}
        onOpenChange={setShowReactionsModal}
        postId={post.id}
        title="Post Reactions"
      />

      {/* Responsive Comments Side Panel on Desktop & Bottom Sheet on Mobile */}
      <CommentsSidePanel
        open={showCommentsSheet}
        onOpenChange={setShowCommentsSheet}
        postId={post.id}
        postAuthor={post.author}
        postCaption={post.caption}
        postCreatedAt={post.createdAt}
        commentsCount={commentsCount}
        comments={comments}
        commentsLoading={commentsLoading}
        onReactComment={handleCommentReact}
        onEditComment={handleCommentEdit}
        onDeleteComment={handleCommentDelete}
        onCommentSubmit={handleCommentSubmit}
        onReportComment={() => setReportOpen(true)}
      />

      {/* Edit Caption Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit caption</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            placeholder="Write a caption..."
            className="min-h-[100px] resize-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCaption} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your post and all its comments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Sheet */}
      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Report post</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            {["Spam", "Nudity or sexual activity", "Hate speech or symbols", "Violence or dangerous content", "Bullying or harassment", "Other"].map((reason) => (
              <button
                key={reason}
                onClick={() => setReportReason(reason)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm transition-colors border",
                  reportReason === reason
                    ? "bg-primary/10 border-primary text-primary font-medium"
                    : "border-border hover:bg-muted"
                )}
              >
                {reason}
              </button>
            ))}
          </div>
          <Button
            className="w-full mt-4"
            disabled={!reportReason || reportMutation.isPending}
            onClick={handleReport}
          >
            {reportMutation.isPending ? "Submitting..." : "Submit report"}
          </Button>
        </SheetContent>
      </Sheet>

      {/* ── Share Sheet ────────────────────────────────────────────────── */}
      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col">
          <SheetHeader className="mb-3">
            <SheetTitle>Share</SheetTitle>
          </SheetHeader>

          {/* Quick actions */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                toast({ title: "Link copied!" });
              }}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors"
            >
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium">Copy link</span>
            </button>
            <button
              onClick={handleShareToStory}
              disabled={createStoryMutation.isPending}
              className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted transition-colors disabled:opacity-50"
            >
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center">
                <span className="text-white text-[8px] font-black">+</span>
              </div>
              <span className="text-xs font-medium">Share to story</span>
            </button>
          </div>

          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Send to</div>

          {/* Search */}
          <input
            value={shareSearch}
            onChange={e => setShareSearch(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none mb-3 focus:ring-2 focus:ring-primary/30"
          />

          {/* Following list */}
          <div className="overflow-y-auto flex-1 space-y-1 pb-4">
            {filteredFollowing.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {shareSearch ? "No results" : "Follow people to share with them"}
              </p>
            )}
            {filteredFollowing.map(user => (
              <div key={user.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                      : <span className="text-white text-sm font-bold">{user.username[0].toUpperCase()}</span>
                    }
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.username}</p>
                  {user.fullName && <p className="text-xs text-muted-foreground truncate">{user.fullName}</p>}
                </div>
                <button
                  onClick={() => handleShareToUser(user)}
                  disabled={sendingTo === user.id}
                  className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {sendingTo === user.id ? "Sending…" : "Send"}
                </button>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
