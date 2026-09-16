import { useRoute, Link, useLocation } from "wouter";
import {
  useGetPost,
  useSavePost,
  useUpdatePost,
  useDeletePost,
  useReportPost,
  getGetPostQueryKey,
  getGetFeedQueryKey,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Trash2,
  Flag,
  Link2,
  Pencil,
  Send,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Lock,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getSocket, initSocket } from "@/lib/socket";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { PostReactionPicker } from "@/components/feed/PostReactionPicker";
import { ReactionsListModal } from "@/components/feed/ReactionsListModal";
import { RichCommentComposer, CommentSubmitData } from "@/components/feed/RichCommentComposer";
import { CommentItem, CommentData } from "@/components/feed/CommentItem";

export default function PostDetail() {
  const [, params] = useRoute("/post/:id");
  const [, setLocation] = useLocation();
  const postId = params ? (params as { id: string }).id : "";
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [editCaptionOpen, setEditCaptionOpen] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [reactionsSummary, setReactionsSummary] = useState<{ emoji: string; count: number }[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  // Replying state for top-level or nested composer
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch post data
  const { data: post, isLoading: postLoading } = useGetPost(postId, {
    query: { enabled: !!postId } as any,
  });

  const savePostMutation = useSavePost();
  const updatePostMutation = useUpdatePost();
  const deletePostMutation = useDeletePost();
  const reportPostMutation = useReportPost();

  const isOwner = post?.author?.id === user?.id;
  const commentsDisabled = post?.commentsDisabled === true;
  const isCloseFriends = post?.audience === "close_friends";
  const allMediaUrls = post
    ? ([post.mediaUrl, ...(post.additionalMediaUrls ?? [])].filter(Boolean) as string[])
    : [];

  const [mediaIndex, setMediaIndex] = useState(0);
  const mediaTouchStartX = useRef<number | null>(null);
  const mediaTouchEndX = useRef<number | null>(null);

  // Sync post data
  useEffect(() => {
    if (post) {
      setUserReaction((post as any).userReaction ?? (post.isLiked ? "❤️" : null));
      setLikesCount(post.likesCount || 0);
      setReactionsSummary((post as any).reactionsSummary ?? []);
      setIsSaved(post.isSaved);
    }
  }, [post]);

  // Load comments
  const fetchComments = async () => {
    if (!postId) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const commentsList = Array.isArray(data) ? data : Array.isArray(data?.comments) ? data.comments : [];
        setComments(commentsList);
        setInitialized(true);
      }
    } catch {
      // ignore
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId, token]);

  // Socket setup
  useEffect(() => {
    if (!postId || !token) return;
    const socket = getSocket() ?? initSocket(token);
    socket.emit("join_post", { postId });

    socket.on("new_comment", (data: { postId: string; comment: CommentData }) => {
      if (data.postId !== postId) return;
      setComments((prev) => {
        if (data.comment.replyToCommentId) {
          return prev.map((c) =>
            c.id === data.comment.replyToCommentId
              ? {
                  ...c,
                  repliesCount: (c.repliesCount ?? 0) + 1,
                  replies: [...(c.replies ?? []), data.comment],
                }
              : c
          );
        }
        if (prev.some((c) => c.id === data.comment.id)) return prev;
        return [...prev, data.comment];
      });
    });

    socket.on("delete_comment", (data: { postId: string; commentId: string }) => {
      if (data.postId !== postId) return;
      const filterTree = (list: CommentData[]): CommentData[] =>
        list
          .filter((c) => c.id !== data.commentId)
          .map((c) => ({
            ...c,
            replies: c.replies ? filterTree(c.replies) : [],
          }));
      setComments((prev) => filterTree(prev));
    });

    socket.on(
      "comment_reaction_updated",
      (data: { commentId: string; likesCount: number; reactions: any[]; userReaction: string | null }) => {
        const updateTree = (list: CommentData[]): CommentData[] =>
          list.map((c) => {
            if (c.id === data.commentId) {
              return {
                ...c,
                likesCount: data.likesCount,
                reactions: data.reactions,
                userReaction: data.userReaction,
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateTree(c.replies) };
            }
            return c;
          });
        setComments((prev) => updateTree(prev));
      }
    );

    return () => {
      socket.emit("leave_post", { postId });
      socket.off("new_comment");
      socket.off("delete_comment");
      socket.off("comment_reaction_updated");
    };
  }, [postId, token]);

  // Handle Post Reaction
  const handleReactPost = async (emoji: string) => {
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
      const res = await fetch(`/api/posts/${postId}/react`, {
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
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      }
    } catch {
      setUserReaction(prevReaction);
      setLikesCount(prevLikesCount);
    }
  };

  const handleToggleLikePost = () => {
    if (userReaction) {
      handleReactPost(userReaction);
    } else {
      handleReactPost("❤️");
    }
  };

  const handleSavePost = async () => {
    setIsSaved(!isSaved);
    try {
      await savePostMutation.mutateAsync({ postId });
    } catch {
      setIsSaved(isSaved);
    }
  };

  // Handle Submit Comment / Reply
  const handleCommentSubmit = async (data: CommentSubmitData) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newComment = await res.json();
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
        setReplyingTo(null);
        toast({ title: "Comment posted" });
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
        toast({ title: "Comment removed" });
      }
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    }
  };

  const handleEditCaption = async () => {
    try {
      await updatePostMutation.mutateAsync({ postId, data: { caption: editCaption } });
      queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
      queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      setEditCaptionOpen(false);
      toast({ title: "Caption updated" });
    } catch {
      toast({ title: "Failed to update caption", variant: "destructive" });
    }
  };

  const handleDeletePost = async () => {
    try {
      await deletePostMutation.mutateAsync({ postId });
      queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      toast({ title: "Post deleted" });
      setLocation("/");
    } catch {
      toast({ title: "Failed to delete post", variant: "destructive" });
    }
  };

  const handleReport = async () => {
    try {
      await reportPostMutation.mutateAsync({ postId, data: { reason: reportReason } });
      setReportOpen(false);
      toast({ title: "Report submitted", description: "Thanks for keeping the community safe." });
    } catch {
      toast({ title: "Failed to submit report", variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!" });
  };

  if (postLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!post) return <div className="p-8 text-center text-muted-foreground">Post not found</div>;

  return (
    <>
      <SEOHead
        title={post.caption ? `${post.caption.slice(0, 60)} | @${post.author.username} on WhiterChat` : `Post by @${post.author.username} on WhiterChat`}
        description={post.caption || `Watch this photo/video post by @${post.author.username} on WhiterChat.`}
        image={post.mediaUrl}
        canonicalPath={`/post/${post.id}`}
        type="article"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SocialMediaPosting",
          "headline": post.caption?.slice(0, 100) || `Post by ${post.author.username}`,
          "image": post.mediaUrl,
          "author": {
            "@type": "Person",
            "name": post.author.fullName || post.author.username,
            "url": `https://whiterchat.app/profile/${post.author.username}`,
          },
          "datePublished": post.createdAt,
          "interactionStatistic": [
            {
              "@type": "InteractionCounter",
              "interactionType": "https://schema.org/LikeAction",
              "userInteractionCount": likesCount,
            },
            {
              "@type": "InteractionCounter",
              "interactionType": "https://schema.org/CommentAction",
              "userInteractionCount": comments.length,
            },
          ],
        }}
      />
      <div className="max-w-5xl mx-auto w-full pt-0 pb-20 md:pt-4 md:pb-8 sm:px-4">
        {/* Mobile back button */}
        <div className="flex items-center gap-2 p-3 md:hidden">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="bg-card sm:border border-border sm:rounded-xl overflow-hidden flex flex-col md:flex-row md:min-h-[600px] md:max-h-[85vh]">
          {/* Media Carousel */}
          <div
            className="relative w-full md:w-[60%] bg-black flex items-center justify-center md:min-h-[500px] overflow-hidden"
            onTouchStart={(e) => {
              mediaTouchStartX.current = e.touches[0].clientX;
              mediaTouchEndX.current = null;
            }}
            onTouchMove={(e) => {
              mediaTouchEndX.current = e.touches[0].clientX;
            }}
            onTouchEnd={() => {
              if (mediaTouchStartX.current === null || mediaTouchEndX.current === null) return;
              const diff = mediaTouchStartX.current - mediaTouchEndX.current;
              if (diff > 40 && mediaIndex < allMediaUrls.length - 1) setMediaIndex((i) => i + 1);
              else if (diff < -40 && mediaIndex > 0) setMediaIndex((i) => i - 1);
              mediaTouchStartX.current = null;
              mediaTouchEndX.current = null;
            }}
          >
            <div
              className="flex w-full h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${mediaIndex * 100}%)` }}
            >
              {allMediaUrls.map((url, i) => (
                <div key={i} className="w-full flex-none flex items-center justify-center">
                  {post.mediaType === "video" && i === 0 ? (
                    <video
                      src={url}
                      controls
                      className="w-full h-full object-contain max-h-[60vw] md:max-h-full"
                    />
                  ) : (
                    <img
                      src={url}
                      alt={post.altText ?? post.caption ?? ""}
                      className="w-full h-full object-contain max-h-[100vw] md:max-h-full"
                      draggable={false}
                    />
                  )}
                </div>
              ))}
            </div>
            {mediaIndex > 0 && (
              <button
                onClick={() => setMediaIndex((i) => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {mediaIndex < allMediaUrls.length - 1 && (
              <button
                onClick={() => setMediaIndex((i) => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            {allMediaUrls.length > 1 && (
              <>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {allMediaUrls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMediaIndex(i)}
                      className={cn(
                        "rounded-full transition-all duration-200",
                        i === mediaIndex ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 bg-white/50 hover:bg-white/75"
                      )}
                    />
                  ))}
                </div>
                <div className="absolute top-3 right-3 bg-black/50 text-white text-xs font-medium px-2 py-0.5 rounded-full z-10">
                  {mediaIndex + 1}/{allMediaUrls.length}
                </div>
              </>
            )}
          </div>

          {/* Right panel */}
          <div className="w-full md:w-[40%] flex flex-col border-t md:border-t-0 md:border-l border-border bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <Link
                href={`/profile/${post.author.username}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
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
                  {post.location ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground leading-tight">
                      <MapPin className="h-2.5 w-2.5" />
                      <span>{post.location}</span>
                    </div>
                  ) : post.author.fullName ? (
                    <div className="text-xs text-muted-foreground leading-tight">{post.author.fullName}</div>
                  ) : null}
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
                        onClick={() => {
                          setEditCaption(post.caption ?? "");
                          setEditCaptionOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Edit caption
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => setDeletePostOpen(true)}
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

            {/* Comments list */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 py-3 space-y-3">
                {/* Caption as top post header item */}
                {post.caption && (
                  <div className="flex gap-3 pb-3 border-b border-border/40">
                    <Link href={`/profile/${post.author.username}`} className="shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={post.author.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {post.author.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 text-sm leading-snug">
                      <Link
                        href={`/profile/${post.author.username}`}
                        className="font-semibold hover:underline mr-1.5"
                      >
                        {post.author.username}
                      </Link>
                      <span className="text-foreground/90 whitespace-pre-wrap">{post.caption}</span>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                {commentsLoading && !initialized ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted rounded w-24" />
                          <div className="h-3 bg-muted rounded w-40" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground font-semibold">No comments yet</p>
                    <p className="text-xs text-muted-foreground/60">
                      Be the first to share a comment, GIF, sticker, or voice note!
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      postId={postId}
                      postAuthorId={post.author?.id}
                      onReact={handleCommentReact}
                      onEdit={handleCommentEdit}
                      onDelete={handleCommentDelete}
                      onReplySubmit={async (_, data) => {
                        await handleCommentSubmit(data);
                      }}
                      onReport={() => setReportOpen(true)}
                    />
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>
            </ScrollArea>

            {/* Actions + Rich Composer */}
            <div className="border-t border-border shrink-0">
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Reaction Button */}
                    <div className="relative">
                      <button
                        onClick={handleToggleLikePost}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setShowReactionPicker(true);
                        }}
                        className="hover:scale-110 transition-transform active:scale-95 flex items-center justify-center"
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

                      {showReactionPicker && (
                        <PostReactionPicker
                          currentReaction={userReaction}
                          onSelect={(emoji) => {
                            handleReactPost(emoji);
                            setShowReactionPicker(false);
                          }}
                          onClose={() => setShowReactionPicker(false)}
                          align="left"
                          position="top"
                        />
                      )}
                    </div>

                    <button
                      onClick={() => setReplyingTo(null)}
                      className="hover:text-muted-foreground transition-colors"
                    >
                      <MessageCircle className="h-6 w-6" />
                    </button>

                    <button className="hover:text-muted-foreground transition-colors" onClick={handleCopyLink}>
                      <Send className="h-6 w-6" />
                    </button>
                  </div>

                  <button
                    onClick={handleSavePost}
                    className="hover:scale-110 transition-transform active:scale-95"
                  >
                    <Bookmark
                      className={cn(
                        "h-6 w-6 transition-colors",
                        isSaved ? "fill-foreground text-foreground" : "hover:text-muted-foreground"
                      )}
                    />
                  </button>
                </div>

                {/* Likes & Reactions Badge */}
                {likesCount > 0 && (
                  <div className="flex items-center gap-2 mb-1">
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

                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </div>
              </div>

              {commentsDisabled ? (
                <div className="flex items-center gap-1.5 px-4 py-3 border-t border-border text-xs text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Comments are disabled
                </div>
              ) : (
                <div className="p-3 border-t border-border bg-card">
                  <RichCommentComposer
                    replyingTo={replyingTo}
                    onCancelReply={() => setReplyingTo(null)}
                    onSubmit={handleCommentSubmit}
                    autoFocus={!!replyingTo}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Reactions List Modal */}
      <ReactionsListModal
        open={showReactionsModal}
        onOpenChange={setShowReactionsModal}
        postId={postId}
        title="Post Reactions"
      />

      {/* Edit Caption Dialog */}
      <Dialog open={editCaptionOpen} onOpenChange={setEditCaptionOpen}>
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
            <Button variant="ghost" onClick={() => setEditCaptionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCaption} disabled={updatePostMutation.isPending}>
              {updatePostMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Post Confirm */}
      <AlertDialog open={deletePostOpen} onOpenChange={setDeletePostOpen}>
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
              onClick={handleDeletePost}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePostMutation.isPending ? "Deleting..." : "Delete"}
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
            {[
              "Spam",
              "Nudity or sexual activity",
              "Hate speech or symbols",
              "Violence or dangerous content",
              "Bullying or harassment",
              "Other",
            ].map((reason) => (
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
            disabled={!reportReason || reportPostMutation.isPending}
            onClick={handleReport}
          >
            {reportPostMutation.isPending ? "Submitting..." : "Submit report"}
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
