import { useState, useEffect } from "react";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS } from "./admin-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  UserX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  MessageSquare,
  Clapperboard,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

function AdminReportsContent() {
  const { lang, token, refreshMetrics } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [reports, setReports] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Selected Report Modal
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  // Quick Action confirmation
  const [quickActionModal, setQuickActionModal] = useState<{
    action: "delete_post" | "suspend_user";
    targetId: string;
    targetName: string;
  } | null>(null);
  const [quickActionReason, setQuickActionReason] = useState("");
  const [quickActionSubmitting, setQuickActionSubmitting] = useState(false);

  const fetchReports = async (page = 1, tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getReports(
        {
          page,
          limit: pagination.limit,
          status: statusFilter !== "all" ? statusFilter : undefined,
          targetType: typeFilter !== "all" ? typeFilter : undefined,
        },
        tkn
      );
      setReports(res.reports);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1, token);
  }, [statusFilter, typeFilter, token]);

  const handleUpdateStatus = async (status: "reviewed" | "resolved" | "rejected") => {
    if (!selectedReport) return;
    try {
      setResolving(true);
      await adminApi.updateReport(
        selectedReport.id,
        { status, notes: resolutionNotes },
        token
      );
      toast.success(`Report marked as ${status}`);
      setSelectedReport(null);
      setResolutionNotes("");
      fetchReports(pagination.page, token);
      refreshMetrics?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to update report");
    } finally {
      setResolving(false);
    }
  };

  const handleExecuteQuickAction = async () => {
          if (!quickActionModal) return;
          try {
            setQuickActionSubmitting(true);
            if (quickActionModal.action === "delete_post") {
              await adminApi.deleteContent(quickActionModal.targetId, quickActionReason, token);
              toast.success("Reported content removed");
            } else if (quickActionModal.action === "suspend_user") {
              await adminApi.updateUserStatus(
                quickActionModal.targetId,
                { action: "suspend", reason: quickActionReason || "Suspended due to user reports" },
                token
              );
              toast.success("Reported user suspended");
            }

            setQuickActionModal(null);
            setQuickActionReason("");
            if (selectedReport) {
              await handleUpdateStatus("resolved");
            } else {
              fetchReports(pagination.page, token);
            }
          } catch (err: any) {
            toast.error(err.message || "Quick action failed");
          } finally {
            setQuickActionSubmitting(false);
          }
        };

        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.reports}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review flagged users, posts, reels, messages, and comments with full audit logging.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {pagination.total} Total Reports
              </Badge>
            </div>

            {/* Filter Bar */}
            <Card className="shadow-none border-border/80 p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs h-9 min-w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="reviewed">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Dismissed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="text-xs h-9 min-w-[130px]">
                    <SelectValue placeholder="Target Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Targets</SelectItem>
                    <SelectItem value="post">Posts & Reels</SelectItem>
                    <SelectItem value="user">User Accounts</SelectItem>
                    <SelectItem value="message">Direct Messages</SelectItem>
                    <SelectItem value="comment">Comments</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Reports List */}
            <Card className="shadow-none border-border/80 overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">{t.loading}</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  {t.noData}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {reports.map((r) => {
                    const isPending = r.status === "pending";
                    const targetIcon =
                      r.targetType === "post" ? (
                        <FileText className="w-4 h-4 text-amber-500" />
                      ) : r.targetType === "user" ? (
                        <User className="w-4 h-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-purple-500" />
                      );

                    return (
                      <div
                        key={r.id}
                        className="p-4 hover:bg-secondary/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        onClick={() => setSelectedReport(r)}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-secondary shrink-0 mt-0.5">
                            {targetIcon}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">
                                {r.reason}
                              </span>
                              <Badge
                                variant={
                                  r.status === "pending"
                                    ? "destructive"
                                    : r.status === "resolved"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-[10px] uppercase font-bold"
                              >
                                {r.status}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {r.targetType}
                              </Badge>
                            </div>

                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                              <span>
                                Reported by @{r.reporter?.username || "anonymous"}
                              </span>
                              <span>•</span>
                              <span>{new Date(r.createdAt).toLocaleString()}</span>
                              {r.targetUser && (
                                <>
                                  <span>•</span>
                                  <span className="text-foreground font-medium">
                                    Target: @{r.targetUser.username}
                                  </span>
                                </>
                              )}
                            </div>

                            {r.details && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1 bg-secondary/50 px-2 py-1 rounded max-w-xl">
                                "{r.details}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReport(r)}
                            className="h-8 text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    );
                  })}
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
                      onClick={() => fetchReports(pagination.page - 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchReports(pagination.page + 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Deep Report Inspection Modal */}
            <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    {t.reportDetails}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Case #{selectedReport?.id.slice(-6)} • Submitted on{" "}
                    {selectedReport ? new Date(selectedReport.createdAt).toLocaleString() : ""}
                  </DialogDescription>
                </DialogHeader>

                {selectedReport && (
                  <div className="space-y-4 py-2 text-xs">
                    {/* Reason & Details */}
                    <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1.5">
                      <div className="font-bold text-destructive text-sm">
                        Reason: {selectedReport.reason}
                      </div>
                      {selectedReport.details && (
                        <div className="text-foreground">
                          Reporter comments: "{selectedReport.details}"
                        </div>
                      )}
                      <div className="text-[11px] text-muted-foreground">
                        Reported by: @{selectedReport.reporter?.username || "unknown"} (
                        {selectedReport.reporter?.fullName || selectedReport.reporter?.email || "User"})
                      </div>
                    </div>

                    {/* Reported Target Content Preview */}
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        {t.reportedEntity} Preview
                      </h4>

                      {/* Post / Reel target */}
                      {selectedReport.targetPost && (
                        <div className="p-3 rounded-xl border border-border bg-card space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {selectedReport.targetPost.isReel ? "Reel Video" : "Feed Post"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 h-7 text-xs"
                              onClick={() =>
                                setQuickActionModal({
                                  action: "delete_post",
                                  targetId: selectedReport.targetPost.id,
                                  targetName: selectedReport.targetPost.caption || "Post",
                                })
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Delete Post
                            </Button>
                          </div>

                          {selectedReport.targetPost.mediaUrl && (
                            <div className="max-h-60 rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
                              {selectedReport.targetPost.mediaType === "video" || selectedReport.targetPost.isReel ? (
                                <video
                                  src={selectedReport.targetPost.mediaUrl}
                                  controls
                                  className="max-h-60 rounded"
                                />
                              ) : (
                                <img
                                  src={selectedReport.targetPost.mediaUrl}
                                  alt=""
                                  className="max-h-60 object-contain rounded"
                                />
                              )}
                            </div>
                          )}

                          {selectedReport.targetPost.caption && (
                            <p className="text-muted-foreground">
                              Caption: "{selectedReport.targetPost.caption}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* User Account target */}
                      {selectedReport.targetUser && (
                        <div className="p-3 rounded-xl border border-border bg-card flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-10 h-10 ring-1 ring-border">
                              <AvatarImage src={selectedReport.targetUser.avatarUrl} />
                              <AvatarFallback>
                                {selectedReport.targetUser.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground">
                                @{selectedReport.targetUser.username}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {selectedReport.targetUser.fullName || "—"}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 text-xs"
                            onClick={() =>
                              setQuickActionModal({
                                action: "suspend_user",
                                targetId: selectedReport.targetUser.id,
                                targetName: `@${selectedReport.targetUser.username}`,
                              })
                            }
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            Suspend User
                          </Button>
                        </div>
                      )}

                      {/* Message Target */}
                      {selectedReport.targetMessage && (
                        <div className="p-3 rounded-xl border border-border bg-card space-y-1">
                          <div className="font-semibold text-foreground">Reported Chat Message</div>
                          <p className="p-2 rounded bg-secondary text-foreground italic">
                            "{selectedReport.targetMessage.text}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Moderator Resolution Note */}
                    <div>
                      <label className="font-semibold text-foreground mb-1 block">
                        Resolution Notes (Logged to Audit Trail)
                      </label>
                      <Textarea
                        placeholder="Add internal notes on why this decision was taken..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="text-xs min-h-[70px]"
                      />
                    </div>
                  </div>
                )}

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus("rejected")}
                    disabled={resolving}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {t.dismissReport}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUpdateStatus("reviewed")}
                    disabled={resolving}
                  >
                    {t.markReviewed}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleUpdateStatus("resolved")}
                    disabled={resolving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {resolving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />}
                    {t.markResolved}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Quick Action Confirmation Modal */}
            <Dialog open={!!quickActionModal} onOpenChange={(open) => !open && setQuickActionModal(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-destructive">
                    {quickActionModal?.action === "delete_post" ? "Delete Reported Content" : "Suspend Reported Account"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Target: {quickActionModal?.targetName}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    This action will be immediately executed on the live platform and logged to the audit trail.
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Audit Reason
                    </label>
                    <Textarea
                      placeholder="Specify the exact policy violation..."
                      value={quickActionReason}
                      onChange={(e) => setQuickActionReason(e.target.value)}
                      className="text-xs min-h-[70px]"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setQuickActionModal(null)}>
                    {t.cancel}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={quickActionSubmitting}
                    onClick={handleExecuteQuickAction}
                  >
                    {quickActionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    Confirm Destructive Action
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
    </div>
  );
}

export default function AdminReports() {
  return (
    <AdminLayout activeTab="reports">
      <AdminReportsContent />
    </AdminLayout>
  );
}
