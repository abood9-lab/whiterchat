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
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Search,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

function AdminCommentsContent() {
  const { lang, token } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [comments, setComments] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [commentToDelete, setCommentToDelete] = useState<any | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const fetchComments = async (page = 1, tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getComments(
        { page, limit: pagination.limit, search: search.trim() },
        tkn
      );
      setComments(res.comments);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(1, token);
  }, [search, token]);

  const handleDelete = async () => {
          if (!commentToDelete) return;
          try {
            setDeleting(true);
            await adminApi.deleteComment(
              commentToDelete.postId,
              commentToDelete.id,
              deleteReason,
              token
            );
            toast.success("Comment removed from post");
            setCommentToDelete(null);
            setDeleteReason("");
            fetchComments(pagination.page, token);
          } catch (err: any) {
            toast.error(err.message || "Failed to remove comment");
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
                  {t.comments} Moderation
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Monitor and moderate platform-wide discussion threads and comments.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {pagination.total} Comments
              </Badge>
            </div>

            {/* Search Bar */}
            <Card className="shadow-none border-border/80 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search comment contents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </Card>

            {/* Comments Table */}
            <Card className="shadow-none border-border/80 overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">{t.loading}</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  {t.noData}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 hover:bg-secondary/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar className="w-8 h-8 ring-1 ring-border shrink-0 mt-0.5">
                          <AvatarImage src={c.author?.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {c.author?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-foreground">
                              @{c.author?.username || "unknown"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                            <Badge variant="outline" className="text-[9px]">
                              {c.isReel ? "Reel" : "Post"} #{c.postId.slice(-6)}
                            </Badge>
                          </div>

                          <p className="text-xs text-foreground mt-1 bg-secondary/40 p-2 rounded-lg break-words">
                            "{c.text}"
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 h-7 text-xs px-2 shrink-0 self-end sm:self-center"
                        onClick={() => setCommentToDelete(c)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchComments(pagination.page - 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchComments(pagination.page + 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Delete Modal */}
            <Dialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-destructive">
                    {t.deleteComment}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Comment by @{commentToDelete?.author?.username}: "{commentToDelete?.text}"
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Audit Reason
                    </label>
                    <Textarea
                      placeholder="e.g. Harassment / hate speech / spam"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="text-xs min-h-[70px]"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setCommentToDelete(null)}>
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

export default function AdminComments() {
  return (
    <AdminLayout activeTab="comments">
      <AdminCommentsContent />
    </AdminLayout>
  );
}
