import { useState, useEffect } from "react";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { adminApi } from "./admin-api";
import { ADMIN_STRINGS } from "./admin-i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Users,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";

function AdminSecurityContent() {
  const { lang, token } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSecurity = async (tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getSecurityEvents(tkn);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurity(token);
  }, [token]);

  const stats = data?.stats;
  const administrators = data?.administrators || [];
  const recentActions = data?.recentSecurityActions || [];

  return (
    <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.security} Center
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Platform-wide authentication health, 2FA adoption, administrator roster, and session security.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSecurity(token)}
                className="h-8 text-xs gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Security Stats</span>
              </Button>
            </div>

            {loading && !data ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <span className="text-xs text-muted-foreground">{t.loading}</span>
              </div>
            ) : (
              <>
                {/* Security Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        2FA Adoption Rate
                      </CardTitle>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-2xl font-bold text-foreground">
                        {stats?.twoFactorAdoptionRate || 0}%
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {stats?.twoFactorCount || 0} of {stats?.totalUsers || 0} accounts protected
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Active User Sessions
                      </CardTitle>
                      <Smartphone className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-2xl font-bold text-foreground">
                        {stats?.totalActiveSessions?.toLocaleString() || 0}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Across web & mobile devices
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Suspended Accounts
                      </CardTitle>
                      <ShieldAlert className="w-4 h-4 text-destructive" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-2xl font-bold text-destructive">
                        {stats?.suspendedCount || 0}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Restricted from live platform
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-none border-border/80">
                    <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        Active Staff / Admins
                      </CardTitle>
                      <Users className="w-4 h-4 text-purple-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                      <div className="text-2xl font-bold text-foreground">
                        {administrators.length}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Privileged personnel
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Administrators Roster */}
                <Card className="shadow-none border-border/80 overflow-hidden">
                  <CardHeader className="p-4 border-b border-border bg-secondary/20">
                    <CardTitle className="text-sm font-semibold">
                      Privileged Staff & Administrators Roster
                    </CardTitle>
                    <CardDescription className="text-xs">
                      All accounts with administrative access to the WhiterChat platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border text-xs">
                      {administrators.map((admin: any) => (
                        <div
                          key={admin.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 ring-1 ring-border">
                              <AvatarFallback className="font-bold text-xs bg-primary text-primary-foreground">
                                {admin.username[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-1.5">
                                @{admin.username}
                                <Badge
                                  variant={admin.role === "superadmin" ? "destructive" : "default"}
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {admin.role}
                                </Badge>
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {admin.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              {admin.twoFactorEnabled ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> 2FA Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-500 font-medium">
                                  <AlertTriangle className="w-3.5 h-3.5" /> 2FA Disabled
                                </span>
                              )}
                            </div>
                            <div className="text-[11px]">
                              {admin.activeSessions} active session(s)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Suspensions History */}
                {recentActions.length > 0 && (
                  <Card className="shadow-none border-border/80 overflow-hidden">
                    <CardHeader className="p-4 border-b border-border bg-secondary/20">
                      <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Recent Account Suspensions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border text-xs">
                        {recentActions.map((action: any) => (
                          <div key={action.id} className="p-3.5 flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-foreground">
                                {action.targetSummary}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Reason: "{action.reason}" • Executed by @{action.adminUsername}
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {new Date(action.createdAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
    </div>
  );
}

export default function AdminSecurity() {
  return (
    <AdminLayout activeTab="security">
      <AdminSecurityContent />
    </AdminLayout>
  );
}
