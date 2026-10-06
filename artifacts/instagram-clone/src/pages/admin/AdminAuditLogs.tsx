import { useState, useEffect } from "react";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS } from "./admin-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ClipboardList,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  FileText,
  AlertTriangle,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

function AdminAuditLogsContent() {
  const { lang, token } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchLogs = async (page = 1, tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getAuditLogs(
        {
          page,
          limit: pagination.limit,
          search: search.trim(),
          action: actionFilter !== "all" ? actionFilter : undefined,
          targetType: typeFilter !== "all" ? typeFilter : undefined,
        },
        tkn
      );
      setLogs(res.logs);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, token);
  }, [search, actionFilter, typeFilter, token]);

  const getTargetBadgeVariant = (type: string) => {
          switch (type) {
            case "user":
              return "secondary";
            case "post":
            case "reel":
              return "outline";
            case "report":
              return "destructive";
            case "settings":
              return "default";
            default:
              return "outline";
          }
        };

        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.auditLogs}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tamper-evident, immutable audit trail recording all administrative actions on WhiterChat.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {pagination.total} Records
              </Badge>
            </div>

            {/* Filter Bar */}
            <Card className="shadow-none border-border/80 p-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by admin name, action, target, or reason..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="text-xs h-9 min-w-[130px]">
                      <SelectValue placeholder="Target Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Targets</SelectItem>
                      <SelectItem value="user">User Actions</SelectItem>
                      <SelectItem value="post">Post Moderation</SelectItem>
                      <SelectItem value="reel">Reel Moderation</SelectItem>
                      <SelectItem value="comment">Comment Moderation</SelectItem>
                      <SelectItem value="report">Report Resolutions</SelectItem>
                      <SelectItem value="feedback">Feedback Replies</SelectItem>
                      <SelectItem value="security">Security Events</SelectItem>
                      <SelectItem value="settings">Settings Changes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Logs Table */}
            <Card className="shadow-none border-border/80 overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">{t.loading}</span>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  {t.noData}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3.5 pl-4">Timestamp</th>
                        <th className="p-3.5">Admin</th>
                        <th className="p-3.5">Action</th>
                        <th className="p-3.5">Target</th>
                        <th className="p-3.5">Summary / Reason</th>
                        <th className="p-3.5 pr-4">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-secondary/30 transition-colors font-sans">
                          <td className="p-3.5 pl-4 text-muted-foreground whitespace-nowrap text-[11px] font-mono">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground">
                                @{log.adminUsername}
                              </span>
                              <Badge variant="outline" className="text-[9px] uppercase font-bold">
                                {log.adminRole}
                              </Badge>
                            </div>
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <Badge
                              variant="secondary"
                              className="font-mono text-[10px] bg-secondary text-foreground"
                            >
                              {log.action}
                            </Badge>
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <Badge
                              variant={getTargetBadgeVariant(log.targetType) as any}
                              className="text-[10px] uppercase font-bold"
                            >
                              {log.targetType}
                            </Badge>
                          </td>

                          <td className="p-3.5 min-w-[200px] max-w-md">
                            <div className="font-medium text-foreground text-xs">
                              {log.targetSummary || "—"}
                            </div>
                            {log.reason && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Reason: "{log.reason}"
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 pr-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            {log.ipAddress || "127.0.0.1"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                      onClick={() => fetchLogs(pagination.page - 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchLogs(pagination.page + 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
    </div>
  );
}

export default function AdminAuditLogs() {
  return (
    <AdminLayout activeTab="audit-logs">
      <AdminAuditLogsContent />
    </AdminLayout>
  );
}
