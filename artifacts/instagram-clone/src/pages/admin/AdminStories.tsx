import { useState, useEffect } from "react";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS } from "./admin-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  History,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

function AdminStoriesContent() {
  const { lang, token } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [stories, setStories] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 16, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [storyToDelete, setStoryToDelete] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [previewStory, setPreviewStory] = useState<any | null>(null);

  const fetchStories = async (page = 1, tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getStories({ page, limit: pagination.limit }, tkn);
      setStories(res.stories);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || "Failed to load stories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories(1, token);
  }, [token]);

  const handleDelete = async () => {
          if (!storyToDelete) return;
          try {
            setDeleting(true);
            await adminApi.deleteStory(storyToDelete.id, deleteReason, token);
            toast.success("Story removed successfully");
            setStoryToDelete(null);
            setDeleteReason("");
            fetchStories(pagination.page, token);
          } catch (err: any) {
            toast.error(err.message || "Failed to delete story");
          } finally {
            setDeleting(false);
          }
        };

        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.stories} Moderation
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review active and expiring 24-hour stories published by platform users.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {pagination.total} Stories
              </Badge>
            </div>

            {/* Stories Grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <span className="text-xs text-muted-foreground">{t.loading}</span>
              </div>
            ) : stories.length === 0 ? (
              <Card className="shadow-none border-border/80 py-16 text-center text-muted-foreground text-sm">
                {t.noData}
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {stories.map((story) => (
                  <Card
                    key={story.id}
                    className="shadow-none border-border/80 overflow-hidden flex flex-col group relative"
                  >
                    <div
                      className="relative aspect-[9/16] bg-muted cursor-pointer overflow-hidden flex items-center justify-center"
                      onClick={() => setPreviewStory(story)}
                    >
                      {story.mediaType === "video" ? (
                        <video src={story.mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-2.5 flex flex-col justify-between text-white">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="w-5 h-5 ring-1 ring-white/50">
                            <AvatarImage src={story.author?.avatarUrl} />
                            <AvatarFallback className="text-[8px] bg-primary">
                              {story.author?.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-semibold truncate drop-shadow">
                            @{story.author?.username}
                          </span>
                        </div>

                        <div>
                          {story.caption && (
                            <p className="text-[10px] line-clamp-1 drop-shadow mb-1">
                              {story.caption}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-white/80">
                            <span>{story.viewsCount} views</span>
                            <span>{new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 flex items-center justify-end bg-card border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-destructive hover:bg-destructive/10 px-2"
                        onClick={() => setStoryToDelete(story)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Story Preview Modal */}
            <Dialog open={!!previewStory} onOpenChange={(open) => !open && setPreviewStory(null)}>
              <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-black text-white border-0">
                {previewStory && (
                  <div className="relative aspect-[9/16] w-full flex items-center justify-center bg-black">
                    {previewStory.mediaType === "video" ? (
                      <video src={previewStory.mediaUrl} autoPlay controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={previewStory.mediaUrl} alt="" className="w-full h-full object-contain" />
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Story Delete Modal */}
            <Dialog open={!!storyToDelete} onOpenChange={(open) => !open && setStoryToDelete(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-destructive">
                    {t.deleteStory}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Story by @{storyToDelete?.author?.username}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Audit Reason
                    </label>
                    <Textarea
                      placeholder="e.g. Inappropriate content"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="text-xs min-h-[70px]"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setStoryToDelete(null)}>
                    {t.cancel}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    Confirm Deletion
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
    </div>
  );
}

export default function AdminStories() {
  return (
    <AdminLayout activeTab="stories">
      <AdminStoriesContent />
    </AdminLayout>
  );
}
