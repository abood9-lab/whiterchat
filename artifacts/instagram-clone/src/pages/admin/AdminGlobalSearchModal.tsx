import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { adminApi } from "./admin-api";
import { Search, User, FileText, AlertTriangle, MessageSquare, Loader2, ExternalLink } from "lucide-react";
import { ADMIN_STRINGS, type AdminLanguage } from "./admin-i18n";

interface AdminGlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: AdminLanguage;
  token?: string | null;
  onSelectUser?: (userId: string) => void;
  onSelectReport?: (reportId: string) => void;
  onSelectFeedback?: (feedbackId: string) => void;
}

export function AdminGlobalSearchModal({
  isOpen,
  onClose,
  lang,
  token,
  onSelectUser,
  onSelectReport,
  onSelectFeedback,
}: AdminGlobalSearchModalProps) {
  const t = ADMIN_STRINGS[lang];
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    users: any[];
    posts: any[];
    reports: any[];
    feedback: any[];
  }>({ users: [], posts: [], reports: [], feedback: [] });

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ users: [], posts: [], reports: [], feedback: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await adminApi.searchGlobal(query.trim(), token);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, token]);

  const hasResults =
    results.users.length > 0 ||
    results.posts.length > 0 ||
    results.reports.length > 0 ||
    results.feedback.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            {t.search}
          </DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchUsersPlaceholder}
              className="pl-9 pr-8"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!query && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Type at least 2 characters to search across users, posts, reports, and feedback.
            </div>
          )}

          {query && !loading && !hasResults && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t.noData}
            </div>
          )}

          {results.users.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {t.users} ({results.users.length})
              </div>
              <div className="space-y-1.5">
                {results.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onClose();
                      onSelectUser?.(u.id);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          @{u.username}
                          {u.isVerified && <Badge variant="secondary" className="text-[10px] py-0 px-1">Verified</Badge>}
                          {u.isSuspended && <Badge variant="destructive" className="text-[10px] py-0 px-1">Suspended</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.fullName || u.email}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{u.role}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.posts.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {t.content} ({results.posts.length})
              </div>
              <div className="space-y-1.5">
                {results.posts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {p.mediaUrl ? (
                          <img src={p.mediaUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate max-w-sm">
                          {p.caption || "[No caption]"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          by @{p.author?.username || "unknown"} • {p.isReel ? "Reel" : "Post"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.reports.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                {t.reports} ({results.reports.length})
              </div>
              <div className="space-y-1.5">
                {results.reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onClose();
                      onSelectReport?.(r.id);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-left transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Report: {r.reason} ({r.targetType})
                      </div>
                      <div className="text-[11px] text-muted-foreground">Status: {r.status}</div>
                    </div>
                    <Badge variant={r.status === "pending" ? "destructive" : "outline"} className="text-xs">
                      {r.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.feedback.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                {t.feedback} ({results.feedback.length})
              </div>
              <div className="space-y-1.5">
                {results.feedback.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onClose();
                      onSelectFeedback?.(f.id);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary text-left transition-colors"
                  >
                    <div>
                      <div className="text-xs font-semibold text-foreground">{f.title}</div>
                      <div className="text-[11px] text-muted-foreground">Type: {f.type}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{f.status}</Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
