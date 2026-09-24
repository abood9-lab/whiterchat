import { useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  Heart,
  MoreHorizontal,
  Reply,
  Edit2,
  Trash2,
  Flag,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
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
import { VoicePlayer } from "@/components/chat/VoicePlayer";
import { PostReactionPicker } from "@/components/feed/PostReactionPicker";
import { ReactionsListModal } from "@/components/feed/ReactionsListModal";
import { RichCommentComposer, CommentSubmitData } from "@/components/feed/RichCommentComposer";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface CommentUser {
  id: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}

export interface CommentData {
  id: string;
  author?: CommentUser;
  user?: CommentUser;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "gif" | "sticker" | "voice" | null;
  voiceDuration?: number | null;
  isEdited?: boolean;
  replyToCommentId?: string | null;
  parentId?: string | null;
  likesCount?: number;
  reactions?: { emoji: string; count: number }[];
  userReaction?: string | null;
  myReaction?: string | null;
  repliesCount?: number;
  replies?: CommentData[];
  createdAt: string;
}

interface Props {
  comment: CommentData;
  postId: string;
  postAuthorId?: string;
  onReact: (commentId: string, emoji: string) => Promise<void> | void;
  onEdit: (commentId: string, newText: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
  onReplySubmit: (postId: string, data: CommentSubmitData) => Promise<void> | void;
  onReport?: (commentId: string) => void;
  isChild?: boolean;
}

export function CommentItem({
  comment,
  postId,
  postAuthorId,
  onReact,
  onEdit,
  onDelete,
  onReplySubmit,
  onReport,
  isChild = false,
}: Props) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const author = comment.author || comment.user || {
    id: "",
    username: "user",
    avatarUrl: null,
  };

  const [showPicker, setShowPicker] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const isMyComment = !!currentUser?.id && currentUser.id === author.id;
  const isPostOwner = !!currentUser?.id && currentUser.id === postAuthorId;
  const canDelete = isMyComment || isPostOwner;

  const currentReaction = comment.userReaction || comment.myReaction;

  const handleSaveEdit = async () => {
    if (!editText.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await onEdit(comment.id, editText.trim());
      setIsEditing(false);
    } catch {
      toast({ title: "Failed to update comment", variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCopyText = () => {
    if (comment.text) {
      navigator.clipboard.writeText(comment.text);
      toast({ title: "Comment text copied to clipboard" });
    }
  };

  // Render text with clickable @mentions and #hashtags
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const tokens = text.split(/(@[a-zA-Z0-9_\.]+|#[a-zA-Z0-9_]+)/g);
    return tokens.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Link
            key={index}
            href={`/profile/${username}`}
            className="font-semibold text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      if (part.startsWith("#")) {
        const tag = part.slice(1);
        return (
          <Link
            key={index}
            href={`/explore?tag=${encodeURIComponent(tag)}`}
            className="font-semibold text-primary/80 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className={cn("group/comment relative transition-colors", isChild ? "pl-9 pt-2" : "py-2")}>
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <Link href={`/profile/${author.username}`} className="shrink-0 mt-0.5">
          <Avatar className={cn(isChild ? "w-6 h-6" : "w-8 h-8")}>
            <AvatarImage src={author.avatarUrl || undefined} />
            <AvatarFallback className="text-[10px] font-bold">
              {author.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Content Box */}
        <div className="flex-1 min-w-0">
          <div className="bg-secondary/40 hover:bg-secondary/60 rounded-2xl px-3.5 py-2 transition-colors border border-border/40 inline-block max-w-full">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/profile/${author.username}`}
                className="font-semibold text-xs text-foreground hover:underline"
              >
                {author.username}
              </Link>
              {comment.isEdited && (
                <span className="text-[10px] text-muted-foreground/70 font-normal">
                  (edited)
                </span>
              )}
            </div>

            {/* Editing Box or Formatted Content */}
            {isEditing ? (
              <div className="mt-1 space-y-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full text-xs bg-background rounded-lg px-2 py-1.5 border border-border focus:ring-1 focus:ring-primary outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") setIsEditing(false);
                  }}
                />
                <div className="flex items-center gap-1.5 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="h-6 text-[11px] px-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit || !editText.trim()}
                    className="h-6 text-[11px] px-2.5"
                  >
                    {isSavingEdit ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Check className="w-3 h-3 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 mt-0.5">
                {comment.text && (
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">
                    {renderFormattedText(comment.text)}
                  </p>
                )}

                {/* Media Attachment */}
                {comment.mediaUrl && (
                  <div className="pt-1">
                    {comment.mediaType === "voice" ? (
                      <div className="bg-background/80 rounded-xl p-1.5 border border-border max-w-[260px]">
                        <VoicePlayer url={comment.mediaUrl} isMe={isMyComment} />
                      </div>
                    ) : comment.mediaType === "sticker" ? (
                      <img
                        src={comment.mediaUrl}
                        alt="Sticker"
                        className="w-24 h-24 object-contain animate-in zoom-in-75"
                        loading="lazy"
                      />
                    ) : comment.mediaType === "gif" ? (
                      <div className="relative rounded-xl overflow-hidden border border-border max-w-[220px]">
                        <img
                          src={comment.mediaUrl}
                          alt="GIF"
                          className="w-full h-auto max-h-48 object-cover rounded-lg"
                          loading="lazy"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1 rounded">
                          GIF
                        </span>
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-border max-w-[220px] bg-background">
                        <img
                          src={comment.mediaUrl}
                          alt="Comment attachment"
                          className="w-full h-auto max-h-48 object-cover rounded-lg"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Row below comment */}
          <div className="flex items-center gap-3 px-1 mt-1 text-[11px] text-muted-foreground font-medium select-none">
            <span>{comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt)) : "just now"} ago</span>

            {/* Reaction Button with Picker */}
            <div className="relative">
              <button
                onClick={() => setShowPicker(!showPicker)}
                className={cn(
                  "hover:text-foreground font-semibold flex items-center gap-1 transition-colors",
                  currentReaction && "text-primary"
                )}
              >
                {currentReaction ? (
                  <span>{currentReaction}</span>
                ) : (
                  <span>Like</span>
                )}
              </button>

              {showPicker && (
                <PostReactionPicker
                  currentReaction={currentReaction}
                  onSelect={(emoji) => {
                    onReact(comment.id, emoji);
                    setShowPicker(false);
                  }}
                  onClose={() => setShowPicker(false)}
                  align="left"
                  position="top"
                />
              )}
            </div>

            {/* Reply Button */}
            {!isChild && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="hover:text-foreground font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Reply</span>
              </button>
            )}

            {/* Reactions Summary Pill */}
            {(comment.likesCount ?? 0) > 0 && (
              <button
                onClick={() => setShowReactionsModal(true)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border/50 text-[10px] text-foreground font-semibold transition-all hover:scale-105"
              >
                <span>
                  {comment.reactions?.slice(0, 3).map((r) => r.emoji).join("") || "❤️"}
                </span>
                <span>{comment.likesCount}</span>
              </button>
            )}

            {/* "..." More menu */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover/comment:opacity-100 p-0.5 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-opacity">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40 text-xs">
                {comment.text && (
                  <DropdownMenuItem onClick={handleCopyText} className="gap-2">
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </DropdownMenuItem>
                )}
                {isMyComment && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(comment.id)}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                )}
                {!isMyComment && onReport && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onReport(comment.id)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Inline Reply Composer */}
          {isReplying && (
            <div className="mt-2 pl-2 border-l-2 border-primary/30">
              <RichCommentComposer
                replyingTo={{ id: comment.id, username: author.username }}
                onCancelReply={() => setIsReplying(false)}
                onSubmit={async (data) => {
                  await onReplySubmit(postId, data);
                  setIsReplying(false);
                  setShowReplies(true);
                }}
                autoFocus
              />
            </div>
          )}

          {/* Collapsible Replies Sub-tree */}
          {!isChild && (comment.repliesCount ?? 0) > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group/replies"
              >
                <div className="w-6 h-[1px] bg-border group-hover/replies:bg-muted-foreground transition-colors" />
                {showReplies ? (
                  <span className="flex items-center gap-1">
                    Hide replies <ChevronUp className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    View {comment.repliesCount} {comment.repliesCount === 1 ? "reply" : "replies"}{" "}
                    <ChevronDown className="w-3 h-3" />
                  </span>
                )}
              </button>

              {showReplies && comment.replies && comment.replies.length > 0 && (
                <div className="space-y-1 mt-1">
                  {comment.replies.map((reply, idx) => (
                    <CommentItem
                      key={reply.id ? `${reply.id}-${idx}` : `reply-${idx}`}
                      comment={reply}
                      postId={postId}
                      postAuthorId={postAuthorId}
                      onReact={onReact}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReplySubmit={onReplySubmit}
                      onReport={onReport}
                      isChild
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for viewing comment reactions */}
      <ReactionsListModal
        open={showReactionsModal}
        onOpenChange={setShowReactionsModal}
        commentId={comment.id}
        title="Comment Reactions"
      />
    </div>
  );
}
