import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { ShieldOff, VolumeX, ShieldAlert, Search, UserCheck, Loader2 } from "lucide-react";

interface ManagedUser {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
}

export function BlockedMutedRestrictedSection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"blocked" | "muted" | "restricted">("blocked");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [blockedUsers, setBlockedUsers] = useState<ManagedUser[]>([]);
  const [mutedUsers, setMutedUsers] = useState<ManagedUser[]>([]);
  const [restrictedUsers, setRestrictedUsers] = useState<ManagedUser[]>([]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/safety-lists"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedUsers(data.blocked || []);
        setMutedUsers(data.muted || []);
        setRestrictedUsers(data.restricted || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUnblock = async (username: string) => {
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/users/${username}/unblock`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBlockedUsers((prev) => prev.filter((u) => u.username !== username));
        toast({ title: `Unblocked @${username}` });
      }
    } catch {
      toast({ title: "Failed to unblock user", variant: "destructive" });
    }
  };

  const handleUnmute = async (username: string) => {
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/users/${username}/unmute`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMutedUsers((prev) => prev.filter((u) => u.username !== username));
        toast({ title: `Unmuted @${username}` });
      }
    } catch {
      toast({ title: "Failed to unmute user", variant: "destructive" });
    }
  };

  const handleUnrestrict = async (username: string) => {
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl(`/api/users/${username}/unrestrict`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRestrictedUsers((prev) => prev.filter((u) => u.username !== username));
        toast({ title: `Unrestricted @${username}` });
      }
    } catch {
      toast({ title: "Failed to unrestrict user", variant: "destructive" });
    }
  };

  const filterList = (list: ManagedUser[]) => {
    const safe = Array.isArray(list) ? list.filter((u) => Boolean(u && u.username)) : [];
    if (!searchQuery.trim()) return safe;
    const q = searchQuery.trim().toLowerCase();
    return safe.filter(
      (u) => (u.username || "").toLowerCase().includes(q) || (u.fullName || "").toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Blocked, Muted & Restricted Accounts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage accounts you have blocked, muted stories or posts from, or restricted interactions.
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accounts..."
          className="pl-9 h-10 text-xs"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full h-11 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="blocked" className="text-xs font-semibold gap-1.5 rounded-lg">
            <ShieldOff className="w-3.5 h-3.5" /> Blocked ({blockedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="muted" className="text-xs font-semibold gap-1.5 rounded-lg">
            <VolumeX className="w-3.5 h-3.5" /> Muted ({mutedUsers.length})
          </TabsTrigger>
          <TabsTrigger value="restricted" className="text-xs font-semibold gap-1.5 rounded-lg">
            <ShieldAlert className="w-3.5 h-3.5" /> Restricted ({restrictedUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Blocked Tab */}
        <TabsContent value="blocked" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading blocked accounts...
              </div>
            ) : filterList(blockedUsers).length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No blocked accounts found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filterList(blockedUsers).map((u) => (
                  <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">@{u.username}</div>
                        {u.fullName && <div className="text-xs text-muted-foreground">{u.fullName}</div>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnblock(u.username)}
                      className="text-xs font-semibold h-8"
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Muted Tab */}
        <TabsContent value="muted" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading muted accounts...
              </div>
            ) : filterList(mutedUsers).length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No muted accounts found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filterList(mutedUsers).map((u) => (
                  <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">@{u.username}</div>
                        {u.fullName && <div className="text-xs text-muted-foreground">{u.fullName}</div>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnmute(u.username)}
                      className="text-xs font-semibold h-8"
                    >
                      Unmute
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Restricted Tab */}
        <TabsContent value="restricted" className="mt-4">
          <div className="p-4 rounded-2xl border border-border bg-card">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading restricted accounts...
              </div>
            ) : filterList(restrictedUsers).length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No restricted accounts found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filterList(restrictedUsers).map((u) => (
                  <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={u.avatarUrl} />
                        <AvatarFallback>{u.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">@{u.username}</div>
                        {u.fullName && <div className="text-xs text-muted-foreground">{u.fullName}</div>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnrestrict(u.username)}
                      className="text-xs font-semibold h-8"
                    >
                      Unrestrict
                    </Button>
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
