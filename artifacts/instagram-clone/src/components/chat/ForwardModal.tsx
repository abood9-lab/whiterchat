import { useState, useMemo } from "react";
import { X, Search, Check, Send, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConvItem {
  id: string;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string | null;
  otherUser?: { id: string; username?: string; fullName?: string; avatarUrl?: string | null } | null;
}

interface Props {
  conversations: ConvItem[];
  onForward: (conversationId: string) => Promise<void>;
  onClose: () => void;
}

export function ForwardModal({ conversations, onForward, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const safeConversations = useMemo(
    () => (Array.isArray(conversations) ? conversations.filter(Boolean) : []),
    [conversations]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return safeConversations.filter(c => {
      if (!c) return false;
      const title = c.isGroup
        ? (c.groupName || "Group Chat")
        : (c.otherUser?.fullName || c.otherUser?.username || "Chat");
      const username = c.otherUser?.username || "";
      if (!q) return true;
      return title.toLowerCase().includes(q) || username.toLowerCase().includes(q);
    });
  }, [safeConversations, search]);

  const handleSend = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onForward(selected);
      onClose();
    } catch {
      // silently catch or let parent handle
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "75vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="font-semibold text-sm">Forward Message</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 h-9 rounded-full text-sm bg-secondary border-transparent"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">No conversations found</div>
          )}
          {filtered.map(conv => {
            const isGroup = Boolean(conv.isGroup);
            const displayName = isGroup
              ? (conv.groupName || "Group Chat")
              : (conv.otherUser?.fullName || conv.otherUser?.username || "Unknown User");
            const displaySub = isGroup
              ? "Group"
              : conv.otherUser?.username ? `@${conv.otherUser.username}` : "";
            const avatarSrc = isGroup
              ? (conv.groupAvatar || undefined)
              : (conv.otherUser?.avatarUrl || undefined);
            const fallbackChar = (displayName[0] || "?").toUpperCase();

            return (
              <button
                key={conv.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 w-full hover:bg-secondary/60 transition-colors text-left",
                  selected === conv.id && "bg-secondary"
                )}
                onClick={() => setSelected(prev => (prev === conv.id ? null : conv.id))}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="font-semibold">
                      {isGroup ? <Users className="w-5 h-5 text-muted-foreground" /> : fallbackChar}
                    </AvatarFallback>
                  </Avatar>
                  {selected === conv.id && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {displayName}
                  </div>
                  {displaySub && (
                    <div className="text-xs text-muted-foreground truncate">{displaySub}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Send button */}
        <div className="p-4 border-t border-border shrink-0">
          <Button
            onClick={handleSend}
            disabled={!selected || loading}
            className="w-full rounded-full gap-2"
          >
            <Send className="w-4 h-4" />
            {loading ? "Forwarding..." : "Forward"}
          </Button>
        </div>
      </div>
    </div>
  );
}
