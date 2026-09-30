import { useState, useEffect } from "react";
import { AdminLayout, useAdmin } from "./AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radio,
  Users,
  Search,
  RefreshCw,
  Trash2,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-url";
import { DecoratedAvatar } from "@/components/DecoratedAvatar";
import { DEFAULT_AUDIO_ROOM_CONFIG, type AudioRoomMetadata } from "@/types/audio-room";

export default function AdminAudioRooms() {
  const { lang } = useAdmin();
  const isRtl = lang === "ar";

  const [rooms, setRooms] = useState<AudioRoomMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Force End Room Modal
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [roomToEnd, setRoomToEnd] = useState<AudioRoomMetadata | null>(null);
  const [endReason, setEndReason] = useState("");
  const [endLoading, setEndLoading] = useState(false);

  // Settings configuration
  const [maxSpeakers, setMaxSpeakers] = useState(DEFAULT_AUDIO_ROOM_CONFIG.maxSpeakersDefault);
  const [maxListeners, setMaxListeners] = useState(DEFAULT_AUDIO_ROOM_CONFIG.maxListenersDefault);
  const [spacesEnabled, setSpacesEnabled] = useState(DEFAULT_AUDIO_ROOM_CONFIG.audioRoomsEnabled);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      const res = await fetch(apiUrl("/api/admin/audio-rooms"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : data.rooms || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleForceEndRoom = async () => {
    if (!roomToEnd) return;
    setEndLoading(true);
    try {
      const token = localStorage.getItem("pixlr_token") || localStorage.getItem("whiterchat_token") || "";
      await fetch(apiUrl(`/api/admin/audio-rooms/${roomToEnd.id}/terminate`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: endReason }),
      });
      toast.success(isRtl ? "تم إنهاء الغرفة الصوتية فورًا" : "Live space terminated successfully");
      setEndModalOpen(false);
      setRoomToEnd(null);
      fetchRooms();
    } catch {
      toast.error(isRtl ? "فشل إنهاء الغرفة" : "Failed to terminate space");
    } finally {
      setEndLoading(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title?.toLowerCase().includes(q);
      const matchHost = r.hostUser?.username?.toLowerCase().includes(q);
      if (!matchTitle && !matchHost) return false;
    }
    return true;
  });

  const activeLiveCount = rooms.filter((r) => r.status === "live").length;
  const totalAudience = rooms.reduce((acc, r) => acc + (r.listenerCount || 0), 0);

  return (
    <AdminLayout activeTab="audio-rooms">
      <div className="space-y-6">
        {/* Header & Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <Radio className="w-6 h-6 text-primary animate-pulse" />
              <span>{isRtl ? "إدارة الغرف الصوتية المباشرة (Spaces)" : "Live Audio Spaces Management"}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {isRtl
                ? "مراقبة وإدارة الغرف الصوتية النشطة، المتحدثين، المستمعين، والإنهاء الفوري للغرف المخالفة."
                : "Monitor active audio rooms, speakers, audience numbers, and moderate live stages."}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchRooms}
            disabled={loading}
            className="rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{isRtl ? "تحديث" : "Refresh"}</span>
          </Button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <p className="text-xs text-muted-foreground font-semibold">
              {isRtl ? "الغرف المباشرة الآن" : "Live Spaces Now"}
            </p>
            <p className="text-2xl font-black text-emerald-500 mt-1">{activeLiveCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <p className="text-xs text-muted-foreground font-semibold">
              {isRtl ? "إجمالي المستمعين" : "Total Audience"}
            </p>
            <p className="text-2xl font-black text-primary mt-1">{totalAudience}</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <p className="text-xs text-muted-foreground font-semibold">
              {isRtl ? "الحد الأقصى للمتحدثين" : "Max Speakers Limit"}
            </p>
            <p className="text-2xl font-black text-foreground mt-1">{maxSpeakers}</p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
            <p className="text-xs text-muted-foreground font-semibold">
              {isRtl ? "حالة النظام" : "Spaces Feature"}
            </p>
            <p className="text-sm font-bold text-emerald-500 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {isRtl ? "مفعّل" : "Active"}
            </p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 p-3 rounded-2xl bg-card border border-border">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder={isRtl ? "بحث بعنوان الغرفة أو اسم المضيف..." : "Search room title or host username..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl border-border bg-secondary/30 h-10 text-xs"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] rounded-xl text-xs h-10">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl text-xs">
              <SelectItem value="all">{isRtl ? "جميع التصنيفات" : "All Categories"}</SelectItem>
              {DEFAULT_AUDIO_ROOM_CONFIG.allowedCategories.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] rounded-xl text-xs h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl text-xs">
              <SelectItem value="all">{isRtl ? "كل الحالات" : "All Status"}</SelectItem>
              <SelectItem value="live">{isRtl ? "مباشر الآن" : "Live Now"}</SelectItem>
              <SelectItem value="ended">{isRtl ? "منتهية" : "Ended"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rooms Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">{isRtl ? "الغرفة / المضيف" : "Room / Host"}</th>
                  <th className="p-3.5">{isRtl ? "التصنيف" : "Category"}</th>
                  <th className="p-3.5">{isRtl ? "المتحدثون" : "Speakers"}</th>
                  <th className="p-3.5">{isRtl ? "المستمعون" : "Listeners"}</th>
                  <th className="p-3.5">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="p-3.5 pr-4 text-right">{isRtl ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      {isRtl ? "لا توجد غرف صوتية مطابقة" : "No live audio spaces found"}
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr key={room.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <DecoratedAvatar
                            avatarUrl={room.hostUser?.avatarUrl}
                            decorationId={room.hostUser?.activeDecorationId}
                            username={room.hostUser?.username}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate max-w-[200px]">{room.title}</p>
                            <p className="text-[10px] text-muted-foreground">Host: @{room.hostUser?.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {room.category}
                        </Badge>
                      </td>

                      <td className="p-3.5 font-semibold text-foreground">
                        {room.speakerIds?.length || 1} / {room.maxSpeakers || 8}
                      </td>

                      <td className="p-3.5 font-semibold text-primary">
                        {room.listenerCount || 0}
                      </td>

                      <td className="p-3.5">
                        {room.status === "live" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-semibold">Ended</span>
                        )}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        {room.status === "live" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 px-2.5 rounded-lg text-[11px] gap-1"
                            onClick={() => {
                              setRoomToEnd(room);
                              setEndModalOpen(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isRtl ? "إنهاء فوري" : "Terminate"}</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Force End Space Dialog */}
      <Dialog open={endModalOpen} onOpenChange={setEndModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span>{isRtl ? "إنهاء الغرفة الصوتية إداريًا" : "Terminate Live Space"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isRtl
                ? "سيؤدي هذا الإجراء إلى إغلاق الغرفة فورًا وإخراج جميع المتحدثين والمستمعين."
                : "This will forcefully terminate the live audio room and disconnect all participants."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-foreground">
              {isRtl ? "سبب الإنهاء الإداري" : "Reason for termination"}
            </label>
            <Input
              placeholder={isRtl ? "مخالفة الإرشادات، محتوى غير لائق..." : "Guideline violation, abusive content..."}
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>

          <DialogFooter className="pt-3">
            <Button variant="ghost" size="sm" onClick={() => setEndModalOpen(false)}>
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleForceEndRoom}
              disabled={endLoading}
              className="font-bold gap-1"
            >
              {endLoading ? "Terminating..." : isRtl ? "تأكيد الإنهاء" : "Confirm Termination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
