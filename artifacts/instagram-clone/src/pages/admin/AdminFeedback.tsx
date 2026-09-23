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
  MessageSquare,
  Bug,
  Lightbulb,
  Sparkles,
  Zap,
  HelpCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  Eye,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

function AdminFeedbackContent() {
  const { lang, token, refreshMetrics } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Selected Ticket Modal
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [ticketStatus, setTicketStatus] = useState("submitted");
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchFeedback = async (page = 1, tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getFeedback(
        {
          page,
          limit: pagination.limit,
          status: statusFilter !== "all" ? statusFilter : undefined,
          type: typeFilter !== "all" ? typeFilter : undefined,
        },
        tkn
      );
      setFeedbackList(res.feedback);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback(1, token);
  }, [statusFilter, typeFilter, token]);

  const handleSelectTicket = (f: any) => {
    setSelectedTicket(f);
    setTicketStatus(f.status);
    setReplyText("");
  };

  const handleSaveResponse = async () => {
          if (!selectedTicket) return;
          try {
            setSubmittingReply(true);
            await adminApi.updateFeedback(
              selectedTicket.id,
              { status: ticketStatus, replyText },
              token
            );
            toast.success("Feedback updated successfully");
            setSelectedTicket(null);
            setReplyText("");
            fetchFeedback(pagination.page, token);
            refreshMetrics?.();
          } catch (err: any) {
            toast.error(err.message || "Failed to update feedback");
          } finally {
            setSubmittingReply(false);
          }
        };

        const getTypeIcon = (type: string) => {
          switch (type) {
            case "bug":
              return <Bug className="w-4 h-4 text-destructive" />;
            case "feature":
              return <Lightbulb className="w-4 h-4 text-amber-500" />;
            case "ui_ux":
              return <Sparkles className="w-4 h-4 text-purple-500" />;
            case "performance":
              return <Zap className="w-4 h-4 text-blue-500" />;
            default:
              return <HelpCircle className="w-4 h-4 text-muted-foreground" />;
          }
        };

        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.feedback} Center
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage user suggestions, bug reports, performance tickets, and send direct administrative replies.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {pagination.total} Tickets
              </Badge>
            </div>

            {/* Filter Bar */}
            <Card className="shadow-none border-border/80 p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs h-9 min-w-[130px]">
                    <SelectValue placeholder="Ticket Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="submitted">New / Submitted</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="text-xs h-9 min-w-[130px]">
                    <SelectValue placeholder="Ticket Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="ui_ux">UI / UX</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Feedback List */}
            <Card className="shadow-none border-border/80 overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">{t.loading}</span>
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  {t.noData}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {feedbackList.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 hover:bg-secondary/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                      onClick={() => handleSelectTicket(f)}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-secondary shrink-0 mt-0.5">
                          {getTypeIcon(f.type)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">
                              {f.title}
                            </span>
                            <Badge
                              variant={
                                f.status === "submitted"
                                  ? "destructive"
                                  : f.status === "resolved"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-[10px] uppercase font-bold"
                            >
                              {f.status}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] uppercase font-medium">
                              {f.type}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {f.description}
                          </p>

                          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                            <span>by @{f.user?.username || "anonymous"}</span>
                            <span>•</span>
                            <span>{new Date(f.createdAt).toLocaleString()}</span>
                            {f.adminReplies?.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-primary font-medium">
                                  {f.adminReplies.length} response(s)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectTicket(f)}
                        className="h-8 text-xs font-medium shrink-0 self-end sm:self-center"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Inspect & Reply
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
                      onClick={() => fetchFeedback(pagination.page - 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchFeedback(pagination.page + 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Ticket Deep Inspection Modal */}
            <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    {getTypeIcon(selectedTicket?.type)}
                    <span>{selectedTicket?.title}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Ticket #{selectedTicket?.id.slice(-6)} • Submitted by @{selectedTicket?.user?.username || "anonymous"} on{" "}
                    {selectedTicket ? new Date(selectedTicket.createdAt).toLocaleString() : ""}
                  </DialogDescription>
                </DialogHeader>

                {selectedTicket && (
                  <div className="space-y-4 py-2 text-xs">
                    {/* User description */}
                    <div className="p-3.5 rounded-xl bg-secondary/50 border border-border space-y-2">
                      <div className="font-semibold text-foreground">User Description:</div>
                      <p className="text-foreground whitespace-pre-wrap">{selectedTicket.description}</p>

                      {selectedTicket.bugDetails && (
                        <div className="pt-2 border-t border-border text-[11px] text-muted-foreground space-y-1">
                          {selectedTicket.bugDetails.stepsToReproduce && (
                            <div>
                              <span className="font-semibold">Steps to reproduce:</span>{" "}
                              {selectedTicket.bugDetails.stepsToReproduce}
                            </div>
                          )}
                          {selectedTicket.bugDetails.expectedBehavior && (
                            <div>
                              <span className="font-semibold">Expected behavior:</span>{" "}
                              {selectedTicket.bugDetails.expectedBehavior}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Previous Admin Replies */}
                    {selectedTicket.adminReplies?.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-bold uppercase tracking-wider text-muted-foreground">
                          Previous Responses ({selectedTicket.adminReplies.length})
                        </div>
                        <div className="space-y-1.5">
                          {selectedTicket.adminReplies.map((r: any, idx: number) => (
                            <div key={idx} className="p-2.5 rounded-lg border border-primary/20 bg-primary/5">
                              <div className="flex items-center justify-between font-semibold text-primary mb-0.5">
                                <span>@{r.adminUsername} (Admin)</span>
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  {new Date(r.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-foreground">{r.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status Update & Reply Composer */}
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div>
                        <label className="font-semibold text-foreground mb-1 block">
                          Update Ticket Status
                        </label>
                        <Select value={ticketStatus} onValueChange={setTicketStatus}>
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="font-semibold text-foreground mb-1 block">
                          Add Response / Internal Note
                        </label>
                        <Textarea
                          placeholder="Type your response to the user or internal resolution notes..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="text-xs min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter className="gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                    {t.cancel}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={submittingReply}
                    onClick={handleSaveResponse}
                  >
                    {submittingReply && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    Save Updates
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
    </div>
  );
}

export default function AdminFeedback() {
  return (
    <AdminLayout activeTab="feedback">
      <AdminFeedbackContent />
    </AdminLayout>
  );
}
