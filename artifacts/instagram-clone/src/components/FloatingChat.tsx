import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGetConversations, useMarkConversationRead } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  MessageCircle, X, ArrowLeft, Send, Search, Plus,
  CheckCheck, Wifi, WifiOff, UserPlus, Inbox, Clock,
  Sparkles, Check, Image as ImageIcon, Mic, BarChart2,
  Gamepad2, MapPin, FileText, Smile, ShieldAlert,
  ChevronRight, RefreshCw, MessageSquare
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { apiUrl } from "@/lib/api-url";
import { MessageBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";

// ── Helpers ──────────────────────────────────────────────────────────────────
async function apiReq<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("whiterchat_token") ?? "";
  const r = await fetch(apiUrl(`/api/${path}`), {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  });
  if (!r.ok) {
    const errBody = await r.json().catch(() => ({}));
    throw new Error((errBody as any).error ?? `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

function fmtTime(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function initials(name?: string) {
  return (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getMessagePreview(lastMsg: string | null | undefined): { text: string; icon?: any } {
  if (!lastMsg) return { text: "Start a conversation" };
  if (lastMsg === "Message deleted") return { text: "Message deleted" };
  if (lastMsg.startsWith("[image]")) return { text: "Photo", icon: ImageIcon };
  if (lastMsg.startsWith("[video]")) return { text: "Video", icon: ImageIcon };
  if (lastMsg.startsWith("[gif]")) return { text: "GIF", icon: Smile };
  if (lastMsg.startsWith("[voice]")) return { text: "Voice message", icon: Mic };
  if (lastMsg.startsWith("[file]")) return { text: "Attachment", icon: FileText };
  if (lastMsg.startsWith("[poll]")) return { text: "Poll", icon: BarChart2 };
  if (lastMsg.startsWith("[game]")) return { text: "Game invite", icon: Gamepad2 };
  if (lastMsg.startsWith("[location]")) return { text: "Location shared", icon: MapPin };
  return { text: lastMsg };
}

// ── Types ────────────────────────────────────────────────────────────────────
type HubView = "list" | "new" | "chat";
type FilterTab = "all" | "unread" | "requests";

interface NotificationToastData {
  id: string;
  senderName: string;
  avatarUrl?: string | null;
  text: string;
  conversationId: string;
}

// ── Main Component: Communication Hub ───────────────────────────────────────
export function FloatingChat() {
  const { user } = useAuth();
  const [location] = useLocation();
  const queryClient = useQueryClient();

  // Hub UI state
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<HubView>("list");
  const [tab, setTab] = useState<FilterTab>("all");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Messaging state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);

  // Pagination state
  const [visibleConvLimit, setVisibleConvLimit] = useState(15);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Realtime & status state
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(true);
  const [notificationToast, setNotificationToast] = useState<NotificationToastData | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConvRef = useRef<string | null>(null);

  // API hooks
  const { data: conversationsData } = useGetConversations();
  const markRead = useMarkConversationRead();

  // All conversations excluding vault
  const conversations = useMemo(() => {
    return (Array.isArray(conversationsData) ? (conversationsData as any[]) : []).filter((c: any) => !c.isVault);
  }, [conversationsData]);

  // Active conversation object
  const activeConv = useMemo(() => {
    return conversations.find((c: any) => c.id === activeConvId);
  }, [conversations, activeConvId]);

  // Total unread count
  const totalUnread = useMemo(() => {
    return conversations.reduce((acc: number, c: any) => acc + (c.unreadCount ?? 0), 0);
  }, [conversations]);

  // Unread requests count
  const requestsCount = useMemo(() => {
    return conversations.filter((c: any) => c.isRequest).length;
  }, [conversations]);

  // Filtered conversation list
  const filteredConversations = useMemo(() => {
    let list = conversations;
    // Tab filtering
    if (tab === "unread") {
      list = list.filter((c: any) => c.unreadCount > 0);
    } else if (tab === "requests") {
      list = list.filter((c: any) => c.isRequest);
    } else {
      list = list.filter((c: any) => !c.isRequest);
    }
    // Search filtering
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((c: any) => {
        const name = c.isGroup ? c.groupName : `${c.otherUser?.fullName ?? ""} ${c.otherUser?.username ?? ""}`;
        const lastMsg = c.lastMessage ?? "";
        return name.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
      });
    }
    return list;
  }, [conversations, tab, debouncedSearch]);

  // ── Debounce Search Input ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // ── Search Users via API when searching or in "new" view ───────────────────
  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q || q.length < 2) {
      setUserSearchResults([]);
      return;
    }
    let cancelled = false;
    setIsSearchingUsers(true);
    apiReq<any[]>(`search/users?q=${encodeURIComponent(q)}&limit=10`)
      .then((data) => {
        if (!cancelled) {
          setUserSearchResults(Array.isArray(data) ? data : []);
          setIsSearchingUsers(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUserSearchResults([]);
          setIsSearchingUsers(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // ── Socket Events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onOnline = ({ userId }: { userId: string }) =>
      setOnline((prev) => new Set([...prev, userId]));
    const onOffline = ({ userId }: { userId: string }) =>
      setOnline((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    
    const onTyping = ({ userId, conversationId }: any) => {
      if (conversationId === activeConvId && userId !== user?.id) {
        setTypingUsers((prev) => new Set([...prev, userId]));
      }
    };
    const onStopTyping = ({ userId, conversationId }: any) => {
      if (conversationId === activeConvId) {
        setTypingUsers((prev) => { const s = new Set(prev); s.delete(userId); return s; });
      }
    };

    const onNewMsg = (msg: ChatMessage & { conversationId: string; clientId?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });

      if (msg.conversationId === activeConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          if (msg.clientId && prev.some((m) => m.id === msg.clientId)) {
            return prev.map((m) => (m.id === msg.clientId ? { ...msg } : m));
          }
          return [...prev, msg];
        });
        setTypingUsers(new Set());
        markRead.mutate({ id: msg.conversationId });
      } else if (!open && msg.senderId !== user?.id) {
        // Show subtle notification toast when hub is closed
        const senderName = (msg as any).senderName || "New message";
        setNotificationToast({
          id: msg.id,
          senderName,
          text: msg.text || (msg.mediaUrl ? `[${msg.mediaType ?? "media"}]` : "Sent a message"),
          conversationId: msg.conversationId,
        });
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setNotificationToast(null), 6000);
      }
    };

    const onMsgDeleted = (msg: ChatMessage & { conversationId: string }) => {
      if (msg.conversationId === activeConvId) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isDeleted: true, text: null, mediaUrl: null } : m)));
      }
    };

    const onMsgEdited = (msg: ChatMessage & { conversationId: string }) => {
      if (msg.conversationId === activeConvId) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, text: msg.text, isEdited: true } : m)));
      }
    };

    const onMsgReaction = (msg: ChatMessage & { conversationId: string }) => {
      if (msg.conversationId === activeConvId) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, reactions: msg.reactions } : m)));
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("user_online", onOnline);
    socket.on("user_offline", onOffline);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("new_message", onNewMsg);
    socket.on("message_deleted", onMsgDeleted);
    socket.on("message_edited", onMsgEdited);
    socket.on("message_reaction", onMsgReaction);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("user_online", onOnline);
      socket.off("user_offline", onOffline);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.off("new_message", onNewMsg);
      socket.off("message_deleted", onMsgDeleted);
      socket.off("message_edited", onMsgEdited);
      socket.off("message_reaction", onMsgReaction);
    };
  }, [activeConvId, open, user?.id, queryClient, markRead]);

  // ── Open Conversation ──────────────────────────────────────────────────────
  const openConv = useCallback(async (convId: string) => {
    const socket = getSocket();
    if (prevConvRef.current && prevConvRef.current !== convId) {
      socket?.emit("leave_conversation", { conversationId: prevConvRef.current });
    }
    prevConvRef.current = convId;
    setActiveConvId(convId);
    setView("chat");
    setMessages([]);
    setReplyTo(null);
    setEditingMsg(null);
    setMessageText("");
    setTypingUsers(new Set());

    socket?.emit("join_conversation", { conversationId: convId });

    try {
      const res = await apiReq<{ messages: ChatMessage[]; hasMore: boolean }>(
        `conversations/${convId}/messages?limit=30`
      );
      setMessages(res.messages ?? []);
      setHasMoreMessages(res.hasMore ?? false);
      markRead.mutate({ id: convId });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch {
      /* silent */
    }
  }, [queryClient, markRead]);

  // ── Load Older Messages (Pagination) ───────────────────────────────────────
  const loadOlderMessages = async () => {
    if (!activeConvId || !hasMoreMessages || isLoadingMore || messages.length === 0) return;
    setIsLoadingMore(true);
    const oldestId = messages[0].id;
    try {
      const res = await apiReq<{ messages: ChatMessage[]; hasMore: boolean }>(
        `conversations/${activeConvId}/messages?limit=30&before=${oldestId}`
      );
      if (res.messages && res.messages.length > 0) {
        setMessages((prev) => [...res.messages, ...prev]);
        setHasMoreMessages(res.hasMore ?? false);
      } else {
        setHasMoreMessages(false);
      }
    } catch {
      /* silent */
    } finally {
      setIsLoadingMore(false);
    }
  };

  // ── Create Conversation with User ──────────────────────────────────────────
  const startConversationWithUser = async (username: string) => {
    try {
      const conv = await apiReq<any>("conversations", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      openConv(conv.id);
    } catch (err: any) {
      console.error("Failed to start conversation:", err);
    }
  };

  // ── Mark All as Read ────────────────────────────────────────────────────────
  const markAllAsRead = async () => {
    const unreadConvs = conversations.filter((c: any) => c.unreadCount > 0);
    if (unreadConvs.length === 0) return;
    try {
      await Promise.all(
        unreadConvs.map((c: any) =>
          apiReq(`conversations/${c.id}/read`, { method: "POST" })
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // ── Send Message Handler ───────────────────────────────────────────────────
  const handleSendMessage = async (opts?: { mediaUrl?: string; mediaType?: string; fileName?: string }) => {
    if (!activeConvId) return;
    const textToSend = messageText.trim();
    if (!textToSend && !opts?.mediaUrl) return;

    const clientId = `hub-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload: any = {
      text: textToSend || null,
      mediaUrl: opts?.mediaUrl || null,
      mediaType: opts?.mediaType || null,
      fileName: opts?.fileName || null,
      replyToId: replyTo?.id || null,
      clientId,
    };

    setMessageText("");
    setReplyTo(null);

    // Optimistic insert
    const optimisticMsg: ChatMessage = {
      id: clientId,
      conversationId: activeConvId,
      senderId: user!.id,
      text: payload.text,
      mediaUrl: payload.mediaUrl,
      mediaType: payload.mediaType,
      fileName: payload.fileName,
      isRead: false,
      isEdited: false,
      isDeleted: false,
      reactions: {},
      isPinned: false,
      starredBy: [],
      clientId,
      replyToId: payload.replyToId,
      replyTo: replyTo ? { id: replyTo.id, senderId: replyTo.senderId, text: replyTo.text, mediaType: replyTo.mediaType } : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const sent = await apiReq<ChatMessage>(`conversations/${activeConvId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessages((prev) => prev.map((m) => (m.id === clientId ? sent : m)));
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== clientId));
      setMessageText(textToSend);
    }
  };

  // ── Edit Message Handler ───────────────────────────────────────────────────
  const handleEditSave = async (newText: string) => {
    if (!editingMsg) return;
    const msgId = editingMsg.id;
    setEditingMsg(null);
    try {
      const updated = await apiReq<ChatMessage>(`messages/${msgId}`, {
        method: "PATCH",
        body: JSON.stringify({ text: newText }),
      });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
    } catch {
      /* silent */
    }
  };

  // ── Delete Message Handler ─────────────────────────────────────────────────
  const handleDeleteMsg = async (msgId: string) => {
    try {
      await apiReq(`messages/${msgId}`, { method: "DELETE" });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, isDeleted: true, text: null, mediaUrl: null } : m)));
    } catch {
      /* silent */
    }
  };

  // ── Message Reaction Handler ───────────────────────────────────────────────
  const handleReactMsg = async (msgId: string, emoji: string) => {
    try {
      const updated = await apiReq<ChatMessage>(`messages/${msgId}/react`, {
        method: "POST",
        body: JSON.stringify({ emoji }),
      });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
    } catch {
      /* silent */
    }
  };

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    if (activeConvId) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, activeConvId]);

  // ── Escape key listener ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // ── Back to Conversations List ─────────────────────────────────────────────
  const backToList = () => {
    const socket = getSocket();
    if (activeConvId) socket?.emit("leave_conversation", { conversationId: activeConvId });
    prevConvRef.current = null;
    setActiveConvId(null);
    setView("list");
    setMessages([]);
    setReplyTo(null);
    setEditingMsg(null);
    setTypingUsers(new Set());
  };

  // ── Strictly Hidden on Mobile / Certain Pages ──────────────────────────────
  if (!user || location === "/messages" || location === "/snap") return null;

  const otherUser = activeConv?.otherUser;
  const isOtherOnline = otherUser?.id ? online.has(otherUser.id) : false;
  const isSomeoneTyping = typingUsers.size > 0;

  return (
    <>
      {/* ── Notification Toast Preview (Desktop Only) ──────────────── */}
      <AnimatePresence>
        {!open && notificationToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "fixed z-[101] hidden md:flex items-center gap-3 p-3 rounded-xl",
              "bg-card/95 backdrop-blur-md border border-border shadow-xl",
              "bottom-24 right-6 w-80 cursor-pointer hover:border-primary/50 transition-colors"
            )}
            onClick={() => {
              setOpen(true);
              openConv(notificationToast.conversationId);
              setNotificationToast(null);
            }}
          >
            <Avatar className="w-10 h-10 border border-border shrink-0">
              <AvatarImage src={notificationToast.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                {initials(notificationToast.senderName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground truncate">{notificationToast.senderName}</p>
                <span className="text-[10px] text-muted-foreground font-medium">Just now</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{notificationToast.text}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotificationToast(null);
              }}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Chat Button (Desktop Only: hidden md:flex) ─────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed z-[100] hidden md:flex items-center justify-center w-14 h-14 rounded-full shadow-2xl",
          "bg-primary text-primary-foreground",
          "transition-all duration-200 hover:scale-105 active:scale-95",
          "bottom-6 right-6 ring-4 ring-primary/10"
        )}
        aria-label="Toggle Communication Hub"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Total Unread Badge */}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-extrabold flex items-center justify-center shadow-md animate-pulse">
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
        )}
      </button>

      {/* ── Communication Hub Panel (Desktop Only: hidden md:flex) ──── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="communication-hub-panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className={cn(
              "fixed z-[99] hidden md:flex flex-col overflow-hidden",
              "bg-card border border-border rounded-2xl shadow-2xl",
              "bottom-24 right-6",
              "w-[320px] md:w-[340px] h-[450px]"
            )}
          >
            {/* ── HEADER TOOLBAR ────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
              {view === "chat" ? (
                /* Thread Header */
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={backToList}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    aria-label="Back to messages"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative shrink-0">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={otherUser?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {initials(otherUser?.fullName ?? otherUser?.username)}
                      </AvatarFallback>
                    </Avatar>
                    {isOtherOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-none truncate">
                      {activeConv?.isGroup ? activeConv.groupName : (otherUser?.fullName ?? `@${otherUser?.username}`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {isSomeoneTyping ? (
                        <span className="text-primary font-medium animate-pulse">typing…</span>
                      ) : isOtherOnline ? (
                        <span className="text-emerald-500 font-medium">Active now</span>
                      ) : (
                        `@${otherUser?.username || "user"}`
                      )}
                    </p>
                  </div>
                </div>
              ) : view === "new" ? (
                /* New Message Header */
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => {
                      setView("list");
                      setSearch("");
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="font-bold text-sm text-foreground">New Message</span>
                </div>
              ) : (
                /* Hub Main Header */
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-foreground">Communication Hub</span>
                  <div className="flex items-center gap-1.5 ml-auto mr-2">
                    {connected ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-destructive" title="Offline" />
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-1 shrink-0">
                {view === "list" && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      title="Mark all as read"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setView("new")}
                      title="New message"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── BODY VIEWS ────────────────────────────────────────── */}
            <AnimatePresence mode="wait" initial={false}>
              {view === "list" ? (
                /* ── LIST VIEW ────────────────────────────────────── */
                <motion.div
                  key="view-list"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 p-2 border-b border-border bg-card shrink-0">
                    <button
                      onClick={() => setTab("all")}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors text-center",
                        tab === "all"
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTab("unread")}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors text-center flex items-center justify-center gap-1.5",
                        tab === "unread"
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <span>Unread</span>
                      {totalUnread > 0 && (
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center">
                          {totalUnread}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setTab("requests")}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors text-center flex items-center justify-center gap-1.5",
                        tab === "requests"
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                    >
                      <span>Requests</span>
                      {requestsCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                          {requestsCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="px-3 py-2 border-b border-border shrink-0">
                    <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-1.5 border border-border/50">
                      <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        placeholder="Search conversations or users…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-transparent text-xs outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                      />
                      {search && (
                        <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Conversations List */}
                  <ScrollArea className="flex-1">
                    {/* User Directory Search Results (when searching) */}
                    {debouncedSearch.trim() && userSearchResults.length > 0 && (
                      <div className="p-2 border-b border-border bg-muted/20">
                        <p className="px-2 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Users Found
                        </p>
                        {userSearchResults.map((u: any) => (
                          <button
                            key={u.id}
                            onClick={() => startConversationWithUser(u.username)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-left"
                          >
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarImage src={u.avatarUrl ?? undefined} />
                              <AvatarFallback className="text-xs font-bold">{initials(u.fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{u.fullName || `@${u.username}`}</p>
                              <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                            </div>
                            <UserPlus className="w-4 h-4 text-primary shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Conversations */}
                    {filteredConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
                          <Inbox className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold text-foreground">
                          {search ? "No conversations found" : tab === "unread" ? "No unread messages" : tab === "requests" ? "No message requests" : "No active chats"}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                          {search ? "Try searching for a user username." : "Start a new conversation to connect!"}
                        </p>
                        {!search && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-4 rounded-xl text-xs gap-1.5"
                            onClick={() => setView("new")}
                          >
                            <Plus className="w-3.5 h-3.5" /> Start Chat
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-border/40">
                        {filteredConversations.slice(0, visibleConvLimit).map((conv: any) => {
                          const other = conv.otherUser;
                          const isOn = other?.id ? online.has(other.id) : false;
                          const preview = getMessagePreview(conv.lastMessage);
                          const Icon = preview.icon;

                          return (
                            <button
                              key={conv.id}
                              onClick={() => openConv(conv.id)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left group",
                                conv.unreadCount > 0 && "bg-primary/5"
                              )}
                            >
                              <div className="relative shrink-0">
                                <Avatar className="w-10 h-10 border border-border/60">
                                  <AvatarImage src={other?.avatarUrl ?? undefined} />
                                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                    {initials(other?.fullName ?? other?.username)}
                                  </AvatarFallback>
                                </Avatar>
                                {isOn && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <p
                                    className={cn(
                                      "text-xs truncate",
                                      conv.unreadCount > 0 ? "font-extrabold text-foreground" : "font-medium text-foreground/90"
                                    )}
                                  >
                                    {conv.isGroup ? conv.groupName : (other?.fullName ?? `@${other?.username}`)}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                                    {fmtTime(conv.lastMessageAt)}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 mt-0.5">
                                  <div className="flex items-center gap-1 min-w-0">
                                    {Icon && <Icon className="w-3 h-3 text-muted-foreground shrink-0" />}
                                    <p
                                      className={cn(
                                        "text-[11px] truncate",
                                        conv.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                                      )}
                                    >
                                      {preview.text}
                                    </p>
                                  </div>

                                  {conv.unreadCount > 0 && (
                                    <span className="shrink-0 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center">
                                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}

                        {/* Pagination / Load More */}
                        {filteredConversations.length > visibleConvLimit && (
                          <div className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground hover:text-foreground rounded-xl"
                              onClick={() => setVisibleConvLimit((v) => v + 15)}
                            >
                              Load more conversations ({filteredConversations.length - visibleConvLimit} remaining)
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </motion.div>
              ) : view === "new" ? (
                /* ── NEW MESSAGE USER SEARCH ───────────────────────────── */
                <motion.div
                  key="view-new"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col flex-1 min-h-0"
                >
                  <div className="p-3 border-b border-border shrink-0">
                    <div className="flex items-center gap-2 bg-secondary/60 rounded-xl px-3 py-2 border border-border/50">
                      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search username or name…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-transparent text-xs outline-none flex-1 text-foreground placeholder:text-muted-foreground"
                      />
                      {search && (
                        <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-2">
                    {isSearchingUsers ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      </div>
                    ) : userSearchResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <UserPlus className="w-8 h-8 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {search ? "No users matching search" : "Type a username to find people"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {userSearchResults.map((u: any) => (
                          <button
                            key={u.id}
                            onClick={() => startConversationWithUser(u.username)}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary transition-colors text-left group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="w-9 h-9 shrink-0">
                                <AvatarImage src={u.avatarUrl ?? undefined} />
                                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                  {initials(u.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{u.fullName || `@${u.username}`}</p>
                                <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </motion.div>
              ) : (
                /* ── QUICK CONVERSATION CHAT VIEW ─────────────────────── */
                <motion.div
                  key="view-chat"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col flex-1 min-h-0 bg-background/50"
                >
                  {/* Messages Scroll Area */}
                  <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* Load Older Messages Trigger */}
                    {hasMoreMessages && (
                      <div className="text-center py-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isLoadingMore}
                          onClick={loadOlderMessages}
                          className="text-[11px] h-7 px-3 text-muted-foreground rounded-full"
                        >
                          {isLoadingMore ? "Loading..." : "Load older messages"}
                        </Button>
                      </div>
                    )}

                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Avatar className="w-14 h-14 mb-2">
                          <AvatarImage src={otherUser?.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                            {initials(otherUser?.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-bold text-foreground">
                          {otherUser?.fullName || `@${otherUser?.username}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">Say hello to start chatting! 👋</p>
                      </div>
                    ) : (
                      messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.id;
                        const isLast = idx === messages.length - 1;

                        return (
                          <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isMe={isMe}
                            isLast={isLast}
                            isLastMine={isMe && isLast}
                            showAvatar={!isMe}
                            isGroupEnd={true}
                            otherUserAvatarUrl={otherUser?.avatarUrl ?? undefined}
                            otherUserUsername={otherUser?.username ?? "user"}
                            myId={user.id}
                            onReact={handleReactMsg}
                            onReply={(m) => setReplyTo(m)}
                            onEdit={(m) => setEditingMsg(m)}
                            onDelete={handleDeleteMsg}
                            onPin={() => {}}
                            onStar={() => {}}
                            onForward={() => {}}
                            compactMode={true}
                          />
                        );
                      })
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Message Input with Rich Attachment Menu [+] */}
                  <div className="border-t border-border bg-card">
                    <MessageInput
                      value={messageText}
                      onChange={setMessageText}
                      onSend={(opts) => handleSendMessage(opts)}
                      onTypingStart={() => {
                        const socket = getSocket();
                        if (socket && activeConvId) socket.emit("typing", { conversationId: activeConvId });
                      }}
                      onTypingStop={() => {
                        const socket = getSocket();
                        if (socket && activeConvId) socket.emit("stop_typing", { conversationId: activeConvId });
                      }}
                      replyTo={replyTo}
                      onCancelReply={() => setReplyTo(null)}
                      editingMsg={editingMsg}
                      onCancelEdit={() => setEditingMsg(null)}
                      onEditSave={handleEditSave}
                      otherUserUsername={otherUser?.username ?? "user"}
                      myId={user.id}
                      conversationId={activeConvId || undefined}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
