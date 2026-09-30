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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  MoreVertical,
  UserCheck,
  UserX,
  Lock,
  LogOut,
  Loader2,
  Calendar,
  Mail,
  Smartphone,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

function AdminUsersContent() {
  const { lang, token, admin } = useAdmin();
  const t = ADMIN_STRINGS[lang];

  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");

  // Selected User Drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Action Dialogs
  const [actionModal, setActionModal] = useState<{
    type: "suspend" | "unsuspend" | "change_role" | "terminate_sessions" | "toggle_verify";
    user: any;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchUsers = async (page = 1, tkn: string | null) => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers(
        {
          page,
          limit: pagination.limit,
          search: search.trim(),
          role: roleFilter !== "all" ? roleFilter : undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          verified: verifiedFilter !== "all" ? verifiedFilter : undefined,
        },
        tkn
      );
      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err: any) {
      toast.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (id: string, tkn: string | null) => {
    try {
      setLoadingDetails(true);
      const res = await adminApi.getUserDetails(id, tkn);
      setSelectedUserDetails(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load user details");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, token);
  }, [search, roleFilter, statusFilter, verifiedFilter, token]);

  const handleOpenDetails = (u: any) => {
    setSelectedUserId(u.id);
    fetchUserDetails(u.id, token);
  };

  const handleExecuteAction = async () => {
          if (!actionModal) return;
          const { type, user: targetUser } = actionModal;

          try {
            setActionSubmitting(true);
            if (type === "suspend") {
              if (!actionReason.trim()) {
                toast.error("Please provide a suspension reason");
                return;
              }
              await adminApi.updateUserStatus(targetUser.id, { action: "suspend", reason: actionReason }, token);
              toast.success(`User @${targetUser.username} suspended`);
            } else if (type === "unsuspend") {
              await adminApi.updateUserStatus(targetUser.id, { action: "unsuspend", reason: actionReason }, token);
              toast.success(`User @${targetUser.username} unsuspended`);
            } else if (type === "toggle_verify") {
              await adminApi.updateUserStatus(
                targetUser.id,
                { action: "set_verified", isVerified: !targetUser.isVerified, reason: actionReason },
                token
              );
              toast.success(`Verification updated for @${targetUser.username}`);
            } else if (type === "change_role") {
              await adminApi.updateUserRole(targetUser.id, { role: newRole, reason: actionReason }, token);
              toast.success(`Role updated to ${newRole} for @${targetUser.username}`);
            } else if (type === "terminate_sessions") {
              await adminApi.terminateUserSessions(targetUser.id, actionReason, token);
              toast.success(`All active sessions terminated for @${targetUser.username}`);
            }

            setActionModal(null);
            setActionReason("");
            fetchUsers(pagination.page, token);
            if (selectedUserId === targetUser.id) {
              fetchUserDetails(targetUser.id, token);
            }
          } catch (err: any) {
            toast.error(err.message || "Action failed");
          } finally {
            setActionSubmitting(false);
          }
        };

        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.users}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage accounts, verification status, roles, and disciplinary actions.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {pagination.total.toLocaleString()} Total Accounts
              </Badge>
            </div>

            {/* Filter Bar */}
            <Card className="shadow-none border-border/80 p-3">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t.searchUsersPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
                  {/* Role filter */}
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="text-xs h-9 min-w-[120px]">
                      <SelectValue placeholder={t.filterByRole} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="creator">Creator</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="text-xs h-9 min-w-[120px]">
                      <SelectValue placeholder={t.filterByStatus} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Verified filter */}
                  <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                    <SelectTrigger className="text-xs h-9 min-w-[110px]">
                      <SelectValue placeholder="Verification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Verified</SelectItem>
                      <SelectItem value="false">Unverified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Users Table */}
            <Card className="shadow-none border-border/80 overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                  <span className="text-xs text-muted-foreground">{t.loading}</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  {t.noData}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/50 border-b border-border text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-3.5 pl-4">User</th>
                        <th className="p-3.5">Email</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Followers</th>
                        <th className="p-3.5">Joined</th>
                        <th className="p-3.5 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map((u) => {
                        const isSuspended = u.isSuspended;
                        const isDeactivated = u.isDeactivated;

                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-secondary/30 transition-colors cursor-pointer"
                            onClick={() => handleOpenDetails(u)}
                          >
                            <td className="p-3.5 pl-4">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="w-8 h-8 ring-1 ring-border">
                                  <AvatarImage src={u.avatarUrl} />
                                  <AvatarFallback className="text-xs font-bold">
                                    {u.username[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-foreground flex items-center gap-1">
                                    @{u.username}
                                    {u.isVerified && (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 inline fill-blue-500 text-white" />
                                    )}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                                    {u.fullName || "—"}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                              {u.email}
                            </td>

                            <td className="p-3.5">
                              <Badge
                                variant={
                                  u.role === "superadmin"
                                    ? "destructive"
                                    : u.role === "admin"
                                    ? "default"
                                    : u.role === "moderator"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-[10px] font-semibold uppercase"
                              >
                                {u.role}
                              </Badge>
                            </td>

                            <td className="p-3.5">
                              {isSuspended ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  Suspended
                                </Badge>
                              ) : isDeactivated ? (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  Deactivated
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
                                  Active
                                </Badge>
                              )}
                            </td>

                            <td className="p-3.5 text-muted-foreground font-medium">
                              {u.followersCount.toLocaleString()}
                            </td>

                            <td className="p-3.5 text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>

                            <td className="p-3.5 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetails(u)}
                                  className="h-7 text-xs px-2"
                                >
                                  Inspect
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
                      onClick={() => fetchUsers(pagination.page - 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchUsers(pagination.page + 1, token)}
                      className="h-7 w-7"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* User Details Drawer */}
            <Sheet open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
              <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
                <SheetHeader className="p-5 pb-3 border-b border-border">
                  <SheetTitle className="text-base font-bold flex items-center justify-between">
                    <span>{t.userDetails}</span>
                    {selectedUserDetails?.user && (
                      <Badge variant="outline" className="text-xs font-mono uppercase">
                        {selectedUserDetails.user.role}
                      </Badge>
                    )}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Deep inspection of account data, security, and disciplinary history.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {loadingDetails || !selectedUserDetails ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                      <span className="text-xs text-muted-foreground">Loading details...</span>
                    </div>
                  ) : (
                    <>
                      {/* Identity Card */}
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-secondary/40 border border-border">
                        <Avatar className="w-16 h-16 ring-2 ring-border">
                          <AvatarImage src={selectedUserDetails.user.avatarUrl} />
                          <AvatarFallback className="text-lg font-bold">
                            {selectedUserDetails.user.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-base text-foreground">
                            <span>@{selectedUserDetails.user.username}</span>
                            {selectedUserDetails.user.isVerified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500 inline fill-blue-500 text-white" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            {selectedUserDetails.user.fullName || "No display name"}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            {selectedUserDetails.user.email}
                          </div>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {selectedUserDetails.user.isSuspended ? (
                              <Badge variant="destructive" className="text-[10px]">
                                Suspended
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-emerald-600">
                                Active Account
                              </Badge>
                            )}
                            {selectedUserDetails.user.twoFactorEnabled && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                2FA Enabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Suspension Notice if Suspended */}
                      {selectedUserDetails.user.isSuspended && (
                        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                          <div className="font-bold flex items-center gap-1.5 mb-1">
                            <ShieldAlert className="w-4 h-4" />
                            Account Suspended
                          </div>
                          <div>Reason: {selectedUserDetails.user.suspensionReason || "Violated terms"}</div>
                          {selectedUserDetails.user.suspendedAt && (
                            <div className="text-[11px] text-destructive/80 mt-0.5">
                              Suspended on {new Date(selectedUserDetails.user.suspendedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Statistics Matrix */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Activity Matrix
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="text-base font-bold">{selectedUserDetails.user.postsCount}</div>
                            <div className="text-[10px] text-muted-foreground">Posts</div>
                          </div>
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="text-base font-bold">{selectedUserDetails.user.reelsCount}</div>
                            <div className="text-[10px] text-muted-foreground">Reels</div>
                          </div>
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="text-base font-bold">{selectedUserDetails.user.storiesCount}</div>
                            <div className="text-[10px] text-muted-foreground">Stories</div>
                          </div>
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="text-base font-bold">{selectedUserDetails.user.followersCount}</div>
                            <div className="text-[10px] text-muted-foreground">Followers</div>
                          </div>
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="text-base font-bold">{selectedUserDetails.user.followingCount}</div>
                            <div className="text-[10px] text-muted-foreground">Following</div>
                          </div>
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="text-base font-bold text-destructive">
                              {selectedUserDetails.user.reportsTargetingUserCount}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Reports Received</div>
                          </div>
                        </div>
                      </div>

                      {/* Administrative Action Suite */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Administrative Controls
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedUserDetails.user.isSuspended ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-medium text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                              onClick={() =>
                                setActionModal({ type: "unsuspend", user: selectedUserDetails.user })
                              }
                            >
                              <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                              {t.unsuspendAccount}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() =>
                                setActionModal({ type: "suspend", user: selectedUserDetails.user })
                              }
                            >
                              <UserX className="w-3.5 h-3.5 mr-1.5" />
                              {t.suspendAccount}
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-medium"
                            onClick={() =>
                              setActionModal({ type: "toggle_verify", user: selectedUserDetails.user })
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                            {selectedUserDetails.user.isVerified ? t.removeVerification : t.verifyAccount}
                          </Button>

                          {admin?.role === "superadmin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-medium"
                              onClick={() => {
                                setNewRole(selectedUserDetails.user.role || "user");
                                setActionModal({ type: "change_role", user: selectedUserDetails.user });
                              }}
                            >
                              <Shield className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                              {t.changeRole}
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs font-medium text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                            onClick={() =>
                              setActionModal({ type: "terminate_sessions", user: selectedUserDetails.user })
                            }
                          >
                            <LogOut className="w-3.5 h-3.5 mr-1.5" />
                            {t.terminateSessions}
                          </Button>
                        </div>
                      </div>

                      {/* Recent Audit Actions for User */}
                      {selectedUserDetails.auditLogs?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            Recent Admin Actions
                          </h4>
                          <div className="space-y-1.5">
                            {selectedUserDetails.auditLogs.map((l: any) => (
                              <div key={l.id} className="p-2.5 rounded-lg border border-border bg-secondary/30 text-xs">
                                <div className="flex items-center justify-between font-semibold">
                                  <span>{l.action}</span>
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    {new Date(l.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  by @{l.adminUsername} ({l.adminRole}) • {l.reason || "No reason given"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Action Confirmation Modal */}
            <Dialog open={!!actionModal} onOpenChange={(open) => !open && setActionModal(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">
                    {actionModal?.type === "suspend" && t.suspendAccount}
                    {actionModal?.type === "unsuspend" && t.unsuspendAccount}
                    {actionModal?.type === "toggle_verify" && "Update Verification Status"}
                    {actionModal?.type === "change_role" && t.changeRole}
                    {actionModal?.type === "terminate_sessions" && t.terminateSessions}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Target account: @{actionModal?.user?.username} ({actionModal?.user?.email})
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {actionModal?.type === "change_role" && (
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Select New Role
                      </label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="creator">Creator</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Justification Reason (Logged to Immutable Audit Trail)
                    </label>
                    <Textarea
                      placeholder={t.reasonPlaceholder}
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="text-xs min-h-[80px]"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" size="sm" onClick={() => setActionModal(null)}>
                    {t.cancel}
                  </Button>
                  <Button
                    variant={actionModal?.type === "suspend" ? "destructive" : "default"}
                    size="sm"
                    disabled={actionSubmitting}
                    onClick={handleExecuteAction}
                  >
                    {actionSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                    {t.confirm}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
    </div>
  );
}

export default function AdminUsers() {
  return (
    <AdminLayout activeTab="users">
      <AdminUsersContent />
    </AdminLayout>
  );
}
