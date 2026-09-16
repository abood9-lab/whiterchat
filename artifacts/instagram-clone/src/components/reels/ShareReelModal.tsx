import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import {
  Copy,
  Check,
  Share2,
  Search,
  Send,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reelId: string;
  reelCaption?: string | null;
  authorUsername?: string;
}

interface UserOption {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export function ShareReelModal({
  open,
  onOpenChange,
  reelId,
  reelCaption,
  authorUsername,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentToMap, setSentToMap] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const shareUrl = `${window.location.origin}/reels?reelId=${reelId}`;

  // Fetch following / suggested users for quick sharing
  useEffect(() => {
    if (!open) return;
    setLoadingUsers(true);
    const token = localStorage.getItem("whiterchat_token");
    fetch(apiUrl(`/api/users/suggested`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else if (Array.isArray(data.users)) {
          setUsers(data.users);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [open]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reel by @${authorUsername || "user"} on WhiterChat`,
          text: reelCaption || "Watch this Reel on WhiterChat!",
          url: shareUrl,
        });
        // Call backend share counter
        fetch(apiUrl(`/api/reels/${reelId}/share`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("whiterchat_token") || ""}`,
          },
        }).catch(() => {});
        onOpenChange(false);
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  const handleSendToUser = async (targetUserId: string) => {
    setSendingTo(targetUserId);
    try {
      const token = localStorage.getItem("whiterchat_token");
      const res = await fetch(apiUrl(`/api/reels/${reelId}/share`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ recipientId: targetUserId }),
      });

      if (!res.ok) throw new Error("Failed to send");

      setSentToMap((prev) => ({ ...prev, [targetUserId]: true }));
      toast({ title: "Reel sent in chat!" });
    } catch {
      toast({ title: "Failed to send reel", variant: "destructive" });
    } finally {
      setSendingTo(null);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.fullName && u.fullName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            Share Reel
          </DialogTitle>
        </DialogHeader>

        {/* Search users */}
        <div className="p-3 border-b border-border/60 bg-muted/20">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people to send to..."
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>
        </div>

        {/* User list to send directly in chat */}
        <div className="max-h-60 overflow-y-auto px-3 py-2 space-y-1 divide-y divide-border/20">
          {loadingUsers ? (
            <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading contacts...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No contacts found
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSent = sentToMap[u.id];
              const isSending = sendingTo === u.id;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-2 px-1 hover:bg-muted/40 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback className="text-[11px] font-bold">
                        {u.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {u.username}
                      </p>
                      {u.fullName && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {u.fullName}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isSent ? "secondary" : "default"}
                    disabled={isSending || isSent}
                    onClick={() => handleSendToUser(u.id)}
                    className={cn(
                      "h-7 px-3 text-xs rounded-full gap-1 shrink-0",
                      isSent && "bg-secondary text-muted-foreground font-normal"
                    )}
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSent ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        Sent
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Quick Action Bar */}
        <div className="p-3 bg-muted/40 border-t border-border flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="flex-1 text-xs gap-1.5 rounded-xl h-9"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Link
              </>
            )}
          </Button>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              size="sm"
              onClick={handleNativeShare}
              className="flex-1 text-xs gap-1.5 rounded-xl h-9 bg-primary text-primary-foreground"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Via...
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
