import { useState, useEffect } from "react";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS } from "./admin-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Clapperboard,
  Search,
  Trash2,
  Eye,
  Heart,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface AdminContentProps {
  forcedType?: "post" | "reel";
}

function AdminContentInner({ forcedType }: AdminContentProps) {
  const { lang, token } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [contentList, setContentList] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 16, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>(forcedType || "all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");

  // Delete Action Modal
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  const fetchContent = async (page = 1, tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getContent(
        {
          page,
          limit: pagination.limit,
          type: forcedType || (typeFilter !== "all" ? typeFilter : undefined),
          search: search.trim(),
          sortBy,
        },
        tkn
      );
      setContentList(res.content);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || "Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent(1, token);
  }, [forcedType, typeFilter, search, sortBy, token]);

  const handleDelete = async () => {
          if (!itemToDelete) return;
          try {
            setDeleting(true);
            await adminApi.deleteContent(itemToDelete.id, deleteReason, token);
            toast.success("Content removed from live platform");
            setItemToDelete(null);
            setDeleteReason("");
            fetchContent(pagination.page, token);
          } catch (err: any) {
            toast.error(err.message || "Failed to delete content");
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
                  {forcedType === "reel" ? t.reels : t.content} Moderation
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Inspect and moderate all user posts and short-form video reels in real-time.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {pagination.total} Items
              </Badge>
            </div>

            {/* Filter Bar */}
            <Card className="shadow-none border-border/80 p-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t.searchContentPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {!forcedType && (
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="text-xs h-9 min-w-[120px]">
                        <SelectValue placeholder="Content Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Content</SelectItem>
                        <SelectItem value="post">Posts Only</SelectItem>
                        <SelectItem value="reel">Reels Only</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="text-xs h-9 min-w-[120px]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Latest</SelectItem>
                      <SelectItem value="views">Most Viewed</SelectItem>
                      <SelectItem value="likes">Most Liked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Content Grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <span className="text-xs text-muted-foreground">{t.loading}</span>
              </div>
            ) : contentList.length === 0 ? (
              <Card className="shadow-none border-border/80 py-16 text-center text-muted-foreground text-sm">
                {t.noData}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {contentList.map((item) => (
                  <Card
                    key={item.id}
                    className="shadow-none border-border/80 overflow-hidden flex flex-col group"
                  >
                    {/* Media Thumbnail */}
                    <div
                      className="relative aspect-square bg-muted cursor-pointer overflow-hidden flex items-center justify-center"
                      onClick={() => setPreviewItem(item)}
                    >
                      {item.mediaType === "video" || item.isReel ? (
                        <video
                          src={item.mediaUrl}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <img
                          src={item.mediaUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      {/* Type badge */}
                      <div className="absolute top-2 left-2">
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-background/80 backdrop-blur-sm shadow-sm"
                        >
                          {item.isReel ? "Reel" : "Post"}
                        </Badge>
                      </div>

                      {/* Hover Overlay with Stats */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-xs">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 fill-white" />
                          <span>{item.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4 fill-white" />
                          <span>{item.commentsCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Meta Section */}
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2 text-xs">
                      <div>
                        {/* Author */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Avatar className="w-5 h-5 ring-1 ring-border">
                              <AvatarImage src={item.author?.avatarUrl} />
                              <AvatarFallback className="text-[9px]">
                                {item.author?.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground truncate">
                              @{item.author?.username || "unknown"}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Caption preview */}
                        <p className="text-muted-foreground line-clamp-2 text-[11px]">
                          {item.caption || <span className="italic">No caption</span>}
                        </p>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
                        <div className="text-[10px] text-muted-foreground">
                          {item.viewsCount > 0 && `${item.viewsCount} views`}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setItemToDelete(item)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-3 border border-border rounded-xl bg-card flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchContent(pagination.page - 1, token)}
                    className="h-7 w-7"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchContent(pagination.page + 1, token)}
                    className="h-7 w-7"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Media Preview Modal */}
            <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold flex items-center gap-2">
                    <span>{previewItem?.isReel ? "Reel Preview" : "Post Preview"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      by @{previewItem?.author?.username}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                {previewItem && (
                  <div className="space-y-3 py-2 text-xs">
                    <div className="max-h-96 rounded-xl overflow-hidden bg-black/5 flex items-center justify-center">
                      {previewItem.mediaType === "video" || previewItem.isReel ? (
                        <video src={previewItem.mediaUrl} controls autoPlay className="max-h-96 w-full object-contain" />
                      ) : (
                        <img src={previewItem.mediaUrl} alt="" className="max-h-96 w-full object-contain" />
                      )}
                    </div>

                    {previewItem.caption && (
                      <p className="p-2.5 rounded-lg bg-secondary text-foreground text-xs">
                        "{previewItem.caption}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-muted-foreground text-xs pt-2">
                      <div className="flex items-center gap-3">
                        <span>❤️ {previewItem.likesCount} likes</span>
                        <span>💬 {previewItem.commentsCount} comments</span>
                        <span>👁️ {previewItem.viewsCount} views</span>
                      </div>
                      <span>{new Date(previewItem.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Deletion Modal */}
            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    {t.deleteContent}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    This will permanently remove the {itemToDelete?.isReel ? "reel" : "post"} created by @
                    {itemToDelete?.author?.username}.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Audit Reason (Required)
                    </label>
                    <Textarea
                      placeholder="e.g. Violation of community safety standards / spam"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="text-xs min-h-[70px]"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setItemToDelete(null)}>
                    {t.cancel}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting || !deleteReason.trim()}
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

export default function AdminContent({ forcedType }: AdminContentProps) {
  return (
    <AdminLayout activeTab={forcedType === "reel" ? "reels" : "content"}>
      <AdminContentInner forcedType={forcedType} />
    </AdminLayout>
  );
}
