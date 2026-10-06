import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Archive, RotateCcw, Grid3X3, Clapperboard, Loader2, Sparkles, MessageCircle, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface ArchivedPost {
  id: string;
  mediaUrl: string;
  caption?: string;
  mediaType: "image" | "video";
  archivedAt: string;
}

interface ArchivedStory {
  id: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  viewsCount: number;
  createdAt: string;
  expiresAt: string;
}

interface ArchivedChat {
  id: string;
  isGroup: boolean;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageDate: string;
  isArchived: boolean;
}

export function ArchiveSection() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"stories" | "posts" | "reels" | "chats">(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const sub = p.get("sub");
      if (sub === "chats" || sub === "posts" || sub === "reels" || sub === "stories") return sub;
    }
    return "stories";
  });
  const [archivedPosts, setArchivedPosts] = useState<ArchivedPost[]>([]);
  const [archivedStories, setArchivedStories] = useState<ArchivedStory[]>([]);
  const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
  const [loading, setLoading] = useState(false);

  const getToken = () => localStorage.getItem("whiterchat_token") || localStorage.getItem("pixlr_token") || "";

  const fetchArchivedPosts = async () => {
    try {
      const token = getToken();
      const res = await fetch(apiUrl("/api/users/me/archive"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArchivedPosts(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchArchivedStories = async () => {
    try {
      const token = getToken();
      const res = await fetch(apiUrl("/api/stories/archive"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArchivedStories(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchArchivedChats = async () => {
    try {
      const token = getToken();
      const res = await fetch(apiUrl("/api/users/me/archive/chats"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArchivedChats(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchArchivedPosts(), fetchArchivedStories(), fetchArchivedChats()]).finally(() => setLoading(false));
  }, []);

  const handleUnarchive = async (id: string) => {
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/users/me/archive/${id}/restore`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setArchivedPosts((prev) => prev.filter((item) => item.id !== id));
        toast({ title: "Post restored to profile!" });
      }
    } catch {
      toast({ title: "Failed to restore post", variant: "destructive" });
    }
  };

  const handleUnarchiveChat = async (chatId: string) => {
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/users/me/archive/chats/${chatId}/restore`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setArchivedChats((prev) => prev.filter((c) => c.id !== chatId));
        toast({ title: "Chat unarchived and moved back to inbox!" });
      }
    } catch {
      toast({ title: "Failed to unarchive chat", variant: "destructive" });
    }
  };

  const filteredPosts = archivedPosts.filter((item) =>
    activeTab === "posts" ? item.mediaType === "image" : item.mediaType === "video"
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Stories, Media & Chats Archive</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Only you can see your archived stories, posts, reels, and chat conversations. Past stories and archived chats are preserved in your private vault.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-11 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="stories" className="text-xs font-semibold gap-1.5 rounded-lg">
            <Sparkles className="w-3.5 h-3.5" /> Stories
          </TabsTrigger>
          <TabsTrigger value="posts" className="text-xs font-semibold gap-1.5 rounded-lg">
            <Grid3X3 className="w-3.5 h-3.5" /> Posts
          </TabsTrigger>
          <TabsTrigger value="reels" className="text-xs font-semibold gap-1.5 rounded-lg">
            <Clapperboard className="w-3.5 h-3.5" /> Reels
          </TabsTrigger>
          <TabsTrigger value="chats" className="text-xs font-semibold gap-1.5 rounded-lg">
            <MessageCircle className="w-3.5 h-3.5" /> Chats ({archivedChats.length})
          </TabsTrigger>
        </TabsList>

        {/* Stories Archive Tab */}
        <TabsContent value="stories" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card min-h-[260px]">
            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading story memories...
              </div>
            ) : archivedStories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <Archive className="w-10 h-10 opacity-30" />
                <div className="font-semibold text-sm">No archived stories yet</div>
                <div className="text-xs text-muted-foreground max-w-xs">
                  Stories you publish will automatically appear here once their 24-hour duration finishes.
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                {archivedStories.map((story) => (
                  <div key={story.id} className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted border border-border">
                    {story.mediaType === "video" ? (
                      <video src={story.mediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={story.mediaUrl} alt="Story" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {format(new Date(story.createdAt), "MMM d")}
                    </div>
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white">
                      {story.viewsCount} views
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Posts & Reels Archive Tab */}
        {(activeTab === "posts" || activeTab === "reels") && (
          <TabsContent value={activeTab} className="mt-4">
            <div className="p-4 rounded-2xl border border-border bg-card min-h-[220px]">
              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading archive...
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                  <Archive className="w-10 h-10 opacity-30" />
                  <div className="font-semibold text-sm">No archived {activeTab}</div>
                  <div className="text-xs text-muted-foreground">
                    You haven't archived any {activeTab} yet.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {filteredPosts.map((item) => (
                    <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                      <img src={item.mediaUrl} alt="Archived" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUnarchive(item.id)}
                          className="h-8 text-xs font-semibold gap-1 w-full bg-white/90 text-black hover:bg-white"
                        >
                          <RotateCcw className="w-3 h-3" /> Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* Archived Chats Tab */}
        <TabsContent value="chats" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card min-h-[220px]">
            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading archived chats...
              </div>
            ) : archivedChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-2">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <div className="font-semibold text-sm">No archived chats</div>
                <div className="text-xs text-muted-foreground max-w-xs">
                  When you archive a chat in direct messages, it will appear here safely out of your main inbox.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {archivedChats.map((chat) => (
                  <div key={chat.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="w-11 h-11 shrink-0">
                        <AvatarImage src={chat.avatarUrl || undefined} />
                        <AvatarFallback>{chat.name[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                          {chat.name}
                          {chat.username && <span className="text-xs font-normal text-muted-foreground">@{chat.username}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {chat.lastMessage}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnarchiveChat(chat.id)}
                        className="text-xs font-semibold h-8 gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Unarchive
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/messages/${chat.id}`)}
                        className="text-xs font-semibold h-8 gap-1 px-2.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
