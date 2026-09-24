import { useState, useEffect } from "react";
import { Link } from "wouter";
import { X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFollowUser, useUnfollowUser } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ReactionUserItem {
  user: {
    id: string;
    username: string;
    fullName?: string | null;
    avatarUrl?: string | null;
    isFollowing?: boolean;
  };
  emoji: string;
  createdAt: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  commentId?: string;
  title?: string;
}

export function ReactionsListModal({
  open,
  onOpenChange,
  postId,
  commentId,
  title = "Reactions",
}: Props) {
  const { token, user: currentUser } = useAuth();
  const [selectedEmoji, setSelectedEmoji] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [reactions, setReactions] = useState<ReactionUserItem[]>([]);
  const [summary, setSummary] = useState<{
    likesCount: number;
    reactions: { emoji: string; count: number }[];
  }>({ likesCount: 0, reactions: [] });

  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  useEffect(() => {
    if (!open) return;
    if (!postId && !commentId) return;

    let isMounted = true;
    setLoading(true);

    const endpoint = commentId
      ? `/api/comments/${commentId}/reactions${selectedEmoji !== "all" ? `?emoji=${encodeURIComponent(selectedEmoji)}` : ""}`
      : `/api/posts/${postId}/reactions${selectedEmoji !== "all" ? `?emoji=${encodeURIComponent(selectedEmoji)}` : ""}`;

    fetch(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setReactions(data.reactions || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      })
      .catch(() => {
        if (isMounted) setReactions([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, postId, commentId, selectedEmoji, token]);

  const handleToggleFollow = async (targetUser: ReactionUserItem["user"]) => {
    try {
      if (targetUser.isFollowing) {
        await unfollowMutation.mutateAsync({ username: targetUser.username });
        setReactions((prev) =>
          prev.map((r) =>
            r.user.id === targetUser.id
              ? { ...r, user: { ...r.user, isFollowing: false } }
              : r
          )
        );
      } else {
        await followMutation.mutateAsync({ username: targetUser.username });
        setReactions((prev) =>
          prev.map((r) =>
            r.user.id === targetUser.id
              ? { ...r, user: { ...r.user, isFollowing: true } }
              : r
          )
        );
      }
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
        </DialogHeader>

        {/* Reaction Emoji Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border overflow-x-auto no-scrollbar bg-muted/20 shrink-0">
          <button
            onClick={() => setSelectedEmoji("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
              selectedEmoji === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            All {summary.likesCount > 0 ? `(${summary.likesCount})` : ""}
          </button>
          {summary.reactions?.map((r) => (
            <button
              key={r.emoji}
              onClick={() => setSelectedEmoji(r.emoji)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                selectedEmoji === r.emoji
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[220px]">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
              <p>No reactions found</p>
            </div>
          ) : (
            reactions.map((item, idx) => {
              const isMe = item.user.id === currentUser?.id;
              return (
                <div
                  key={`${item.user.id}-${idx}`}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <Link
                    href={`/profile/${item.user.username}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {item.user.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 text-sm bg-card rounded-full p-0.5 shadow-sm border border-border">
                        {item.emoji}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate leading-tight hover:underline">
                        {item.user.username}
                      </p>
                      {item.user.fullName && (
                        <p className="text-xs text-muted-foreground truncate leading-tight">
                          {item.user.fullName}
                        </p>
                      )}
                    </div>
                  </Link>

                  {!isMe && currentUser && (
                    <Button
                      size="sm"
                      variant={item.user.isFollowing ? "secondary" : "default"}
                      className="h-8 text-xs font-semibold px-4 shrink-0 rounded-full"
                      onClick={() => handleToggleFollow(item.user)}
                      disabled={followMutation.isPending || unfollowMutation.isPending}
                    >
                      {item.user.isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
