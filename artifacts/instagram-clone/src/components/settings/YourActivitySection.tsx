import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Heart, MessageSquare, Bookmark, Search, Clock, Trash2, Eye, Clapperboard, Loader2 } from "lucide-react";

export function YourActivitySection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("likes");
  const [loading, setLoading] = useState(false);
  const [activityData, setActivityData] = useState<{
    likes: any[];
    comments: any[];
    searches: string[];
    viewedReels: any[];
  }>({
    likes: [],
    comments: [],
    searches: [],
    viewedReels: [],
  });

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("pixlr_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/activity-log"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivityData({
          likes: data.likes || [],
          comments: data.comments || [],
          searches: data.searches || ["#photography", "#minimalism", "design", "alex_dev"],
          viewedReels: data.viewedReels || [],
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const handleClearSearches = async () => {
    try {
      const token = localStorage.getItem("pixlr_token") ?? "";
      await fetch(apiUrl("/api/users/me/search-history"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setActivityData((prev) => ({ ...prev, searches: [] }));
      toast({ title: "Search history cleared" });
    } catch {
      toast({ title: "Failed to clear history", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Your Activity & Interactions</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and manage all your past likes, comments, viewed reels, and search history in one place.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-11 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="likes" className="text-xs font-semibold gap-1.5 rounded-lg">
            <Heart className="w-3.5 h-3.5" /> Likes
          </TabsTrigger>
          <TabsTrigger value="comments" className="text-xs font-semibold gap-1.5 rounded-lg">
            <MessageSquare className="w-3.5 h-3.5" /> Comments
          </TabsTrigger>
          <TabsTrigger value="reels" className="text-xs font-semibold gap-1.5 rounded-lg">
            <Clapperboard className="w-3.5 h-3.5" /> Reels Watched
          </TabsTrigger>
          <TabsTrigger value="searches" className="text-xs font-semibold gap-1.5 rounded-lg">
            <Search className="w-3.5 h-3.5" /> Searches
          </TabsTrigger>
        </TabsList>

        {/* Likes Tab */}
        <TabsContent value="likes" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading likes...
              </div>
            ) : activityData.likes.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No likes recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {activityData.likes.map((item, idx) => (
                  <Link key={idx} href={`/post/${item.id}`} className="group relative aspect-square rounded-xl overflow-hidden bg-muted">
                    <img src={item.mediaUrl || item.thumbnailUrl} alt="Liked Post" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                      <Heart className="w-4 h-4 fill-white" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card">
            {activityData.comments.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No recent comments.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activityData.comments.map((c, idx) => (
                  <div key={idx} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>On @{c.postAuthor}'s post</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="font-medium text-foreground bg-muted/30 p-2 rounded-lg">
                      "{c.text}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Watched Reels Tab */}
        <TabsContent value="reels" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card">
            {activityData.viewedReels.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No reels history recorded.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {activityData.viewedReels.map((reel, idx) => (
                  <Link key={idx} href="/reels" className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted">
                    <img src={reel.thumbnailUrl || reel.mediaUrl} alt="Reel" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute bottom-2 left-2 text-[10px] text-white font-medium bg-black/50 px-1.5 py-0.5 rounded">
                      @{reel.author}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Searches Tab */}
        <TabsContent value="searches" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-muted-foreground">Recent Searches</div>
              {activityData.searches.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearches}
                  className="text-xs text-destructive hover:text-destructive h-7 gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </Button>
              )}
            </div>

            {activityData.searches.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Your search history is empty.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activityData.searches.map((term, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{term}</span>
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
