import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  useGetConversations,
  useSendMessage,
  useCreateConversation,
  getGetConversationsQueryKey,
  useMarkConversationRead,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, PencilLine, ArrowLeft, Search, X,
  Archive, BellOff, Bell, WifiOff, Lock, Info,
  UserCheck, Inbox, Users, SlidersHorizontal, Settings2, LayoutList, PenLine,
  Maximize2, Minimize2, ArrowDown, CheckCircle2,
  ChevronRight, ListChecks, Copy, Trash2, Phone, Video,
} from "lucide-react";
import { VaultScreen } from "@/components/chat/VaultScreen";
import { NotesTray } from "@/components/chat/NotesTray";
import { ForwardModal } from "@/components/chat/ForwardModal";
import { ConversationInfoPanel } from "@/components/chat/ConversationInfoPanel";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { GroupInfoPanel } from "@/components/chat/GroupInfoPanel";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { MessageBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { apiUrl } from "@/lib/api-url";
import { ChatCommandCenter } from "@/components/chat/ChatCommandCenter";
import { CallOverlay, type CallState } from "@/components/chat/CallOverlay";
import { MusicPickerModal } from "@/components/chat/MusicPickerModal";
import { GiphyPickerModal } from "@/components/chat/GiphyPickerModal";
import { UserContextMenu, type UserMenuTarget } from "@/components/chat/UserContextMenu";

async function apiRequest(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("whiterchat_token") ?? "";
  const r = await fetch(apiUrl(`/api/${path}`), {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function safeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatConvTime(dateStr: string | null | undefined) {
  const d = safeDate(dateStr);
  if (!d) return "";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function generateClientId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface QueuedMessage {
  clientId: string;
  conversationId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  replyToId?: string;
}

type TabType = "inbox" | "requests";
type ConversationFilter = "all" | "unread" | "groups" | "archived";

const QUICK_REPLIES = [
  "Sounds good",
  "I’ll be there",
  "Thanks for sending this",
  "Can we talk later?",
];

export default function Messages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Conversation state
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherTypingVoice, setOtherTypingVoice] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvUsername, setNewConvUsername] = useState("");
  const [tab, setTab] = useState<TabType>("inbox");
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("all");
  const [conversationQuery, setConversationQuery] = useState("");
  const [showChatTools, setShowChatTools] = useState(false);
  const [focusMode, setFocusMode] = useState(() => {
    try { return localStorage.getItem("whiterchat-chat-focus") === "1"; } catch { return false; }
  });
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [compactMode, setCompactMode] = useState(() => {
    try { return localStorage.getItem("whiterchat-chat-compact") === "1"; } catch { return false; }
  });
  const [chatTheme, setChatTheme] = useState<"default" | "violet" | "mint" | "sunset">(() => {
    try {
      const stored = localStorage.getItem("whiterchat-chat-theme");
      return stored === "violet" || stored === "mint" || stored === "sunset" ? stored : "default";
    } catch { return "default"; }
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [messageDetails, setMessageDetails] = useState<ChatMessage | null>(null);
  const draftLoadedForRef = useRef<string | null>(null);

  // Messages feature state
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<ChatMessage[]>([]);
  const [starredMessages, setStarredMessages] = useState<ChatMessage[]>([]);
  const [sharedMedia, setSharedMedia] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeen, setLastSeen] = useState<Record<string, string>>({});
  const [isConnected, setIsConnected] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<QueuedMessage[]>([]);

  // Forward
  const [forwardingMsg, setForwardingMsg] = useState<ChatMessage | null>(null);

  // WebRTC Call & Pickers state
  const [callState, setCallState] = useState<CallState | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);

  // User Context Menu state
  const [userMenuTarget, setUserMenuTarget] = useState<UserMenuTarget | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Info panel
  const [showInfo, setShowInfo] = useState(false);
  const [mediaViewer, setMediaViewer] = useState<{ url: string; type: string } | null>(null);

  // Vault
  const [showVault, setShowVault] = useState(false);
  const [vaultAddConvId, setVaultAddConvId] = useState<string | null>(null);
  const [vaultAddConvUser, setVaultAddConvUser] = useState<string | null>(null);

  // Group chat
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupTypingUsers, setGroupTypingUsers] = useState<Record<string, string>>({});
  const groupTypingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Messages pagination
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Conversation-level disappearAfter state (updated from socket)
  const [disappearAfterMap, setDisappearAfterMap] = useState<Record<string, string | null>>({});

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topObserverRef = useRef<IntersectionObserver | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // API hooks
  const { data: allConversations } = useGetConversations();
  const sendMutation = useSendMessage();
  const markReadMutation = useMarkConversationRead();
  const createConvMutation = useCreateConversation();

  const conversations = useMemo(() => {
    const query = conversationQuery.trim().toLowerCase();
    return (allConversations as any[] ?? []).filter((c: any) => {
      if (tab === "requests" ? !c.isRequest : c.isRequest) return false;
      if (conversationFilter === "unread" && !(c.unreadCount > 0)) return false;
      if (conversationFilter === "groups" && !c.isGroup) return false;
      if (conversationFilter === "archived" && !c.isArchived) return false;
      if (!query) return true;
      const name = c.isGroup ? c.groupName : `${c.otherUser?.fullName ?? ""} ${c.otherUser?.username ?? ""}`;
      return `${name} ${c.lastMessage ?? ""}`.toLowerCase().includes(query);
    });
  }, [allConversations, tab, conversationFilter, conversationQuery]);

  const activeConv = (allConversations as any[] ?? []).find((c: any) => c.id === activeConvId);
  const activeConvRef = useRef<any>(null);
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => {
    try { localStorage.setItem("whiterchat-chat-focus", focusMode ? "1" : "0"); } catch {}
  }, [focusMode]);
  useEffect(() => {
    try {
      localStorage.setItem("whiterchat-chat-compact", compactMode ? "1" : "0");
      localStorage.setItem("whiterchat-chat-theme", chatTheme);
    } catch {}
  }, [compactMode, chatTheme]);

  // Keep a private draft for every conversation. Loading is tracked separately
  // so switching threads never overwrites a saved draft with the previous one.
  useEffect(() => {
    if (!activeConvId) {
      draftLoadedForRef.current = null;
      setMessageText("");
      return;
    }
    let saved = "";
    try { saved = localStorage.getItem(`whiterchat-draft:${activeConvId}`) ?? ""; } catch {}
    draftLoadedForRef.current = activeConvId;
    setMessageText(saved);
    setDraftSaved(Boolean(saved));
  }, [activeConvId]);

  useEffect(() => {
    if (!activeConvId || draftLoadedForRef.current !== activeConvId) return;
    try {
      if (messageText.trim()) {
        localStorage.setItem(`whiterchat-draft:${activeConvId}`, messageText);
        setDraftSaved(true);
      } else {
        localStorage.removeItem(`whiterchat-draft:${activeConvId}`);
        setDraftSaved(false);
      }
    } catch {}
  }, [activeConvId, messageText]);

  // For group chats, build a map of userId → { avatarUrl, username } from group members
  const senderInfoMap = useMemo<Record<string, { avatarUrl?: string; username: string }>>(() => {
    if (!activeConv?.isGroup || !activeConv.members) return {};
    const map: Record<string, { avatarUrl?: string; username: string }> = {};
    for (const m of activeConv.members) map[m.id] = { avatarUrl: m.avatarUrl ?? undefined, username: m.username };
    return map;
  }, [activeConv?.isGroup, activeConv?.members]);

  const otherUserId = activeConv?.otherUser?.id ?? null;
  const isOtherOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
  const disappearAfter = activeConvId ? (disappearAfterMap[activeConvId] ?? activeConv?.disappearAfter ?? null) : null;
  const isBlocked = activeConv?.isBlocked ?? false;
  const isBlockedBy = activeConv?.isBlockedBy ?? false;
  const myTimeoutUntil: string | null = activeConv?.myTimeoutUntil ?? null;
  const otherTimeoutUntil: string | null = activeConv?.otherTimeoutUntil ?? null;
  const isMyTimeoutActive = myTimeoutUntil ? new Date(myTimeoutUntil) > new Date() : false;

  // Load messages
  useEffect(() => {
    if (!activeConvId) { setLocalMessages([]); return; }
    setLocalMessages([]);
    setHasMoreMessages(false);
    apiRequest(`conversations/${activeConvId}/messages?limit=40`)
      .then((res: any) => {
        setLocalMessages(Array.isArray(res.messages) ? res.messages : []);
        setHasMoreMessages(res.hasMore ?? false);
      })
      .catch(() => {});
  }, [activeConvId]);

  // Infinite scroll
  useEffect(() => {
    if (!messagesTopRef.current) return;
    topObserverRef.current?.disconnect();
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMoreMessages && !isLoadingMore && localMessages.length > 0) {
        const oldest = localMessages[0];
        if (!oldest) return;
        setIsLoadingMore(true);
        apiRequest(`conversations/${activeConvId}/messages?limit=30&before=${oldest.id}`)
          .then((res: any) => {
            const older: ChatMessage[] = Array.isArray(res.messages) ? res.messages : [];
            setLocalMessages(prev => [...older, ...prev]);
            setHasMoreMessages(res.hasMore ?? false);
          })
          .catch(() => {})
          .finally(() => setIsLoadingMore(false));
      }
    }, { threshold: 0.1 });
    observer.observe(messagesTopRef.current);
    topObserverRef.current = observer;
    return () => observer.disconnect();
  }, [activeConvId, hasMoreMessages, isLoadingMore, localMessages.length]);

  // Load pinned, starred, media
  const loadPinned = useCallback((convId: string) => {
    apiRequest(`conversations/${convId}/pinned`).then(setPinnedMessages).catch(() => {});
  }, []);
  const loadStarred = useCallback((convId: string) => {
    apiRequest(`conversations/${convId}/starred`).then(setStarredMessages).catch(() => {});
  }, []);
  const loadMedia = useCallback((convId: string) => {
    apiRequest(`conversations/${convId}/media`).then(setSharedMedia).catch(() => {});
  }, []);

  // Mark read + join socket room
  useEffect(() => {
    const socket = getSocket();
    if (!activeConvId) return;
    socket?.emit("join_conversation", { conversationId: activeConvId });
    markReadMutation.mutateAsync({ id: activeConvId }).catch(() => {});
    socket?.emit("mark_read", { conversationId: activeConvId });
    queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    loadPinned(activeConvId);
    if (otherUserId) {
      socket?.emit("get_presence", { userIds: [otherUserId] }, (res: Record<string, boolean>) => {
        if (res[otherUserId]) setOnlineUsers(prev => new Set([...prev, otherUserId]));
      });
    }
    return () => { socket?.emit("leave_conversation", { conversationId: activeConvId }); };
  }, [activeConvId]);

  // Retry offline queue
  useEffect(() => {
    if (isConnected && offlineQueue.length > 0) {
      const queue = [...offlineQueue];
      setOfflineQueue([]);
      queue.forEach(item => {
        const body: any = { clientId: item.clientId };
        if (item.text) body.text = item.text;
        if (item.mediaUrl) body.mediaUrl = item.mediaUrl;
        if (item.mediaType) body.mediaType = item.mediaType;
        if (item.replyToId) body.replyToId = item.replyToId;
        apiRequest(`conversations/${item.conversationId}/messages`, { method: "POST", body: JSON.stringify(body) })
          .then((msg: ChatMessage) => {
            setLocalMessages(prev => [...prev.filter(m => m.clientId !== item.clientId), msg]);
            queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
          })
          .catch(() => {});
      });
    }
  }, [isConnected]);

  // Socket events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onNewMessage = (msg: ChatMessage) => {
      if (msg.conversationId === activeConvId) {
        setLocalMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          if (msg.clientId && prev.some(m => m.clientId === msg.clientId)) {
            return prev.map(m => m.clientId === msg.clientId ? msg : m);
          }
          return [...prev, msg];
        });
        socket.emit("mark_read", { conversationId: activeConvId });
         markReadMutation.mutateAsync({ id: activeConvId! }).catch(() => {});
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    };

    const onMsgEdited = (msg: ChatMessage) =>
      setLocalMessages(prev => prev.map(m => m.id === msg.id ? msg : m));

    const onMsgDeleted = (msg: ChatMessage) =>
      setLocalMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isDeleted: true, text: null, mediaUrl: null } : m));

    const onMsgReaction = (msg: ChatMessage) =>
      setLocalMessages(prev => prev.map(m => m.id === msg.id ? { ...m, reactions: msg.reactions } : m));

    const onMsgPinned = (msg: ChatMessage) => {
      setLocalMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isPinned: msg.isPinned } : m));
      if (activeConvId) loadPinned(activeConvId);
    };

    const onTyping = (data: { userId: string; conversationId: string; isVoice?: boolean }) => {
      if (data.conversationId === activeConvId && data.userId !== user?.id) {
        if (activeConvRef.current?.isGroup) {
          const member = (activeConvRef.current.members ?? []).find((m: any) => m.id === data.userId);
          const name = member?.username ?? data.userId;
          setGroupTypingUsers(prev => ({ ...prev, [data.userId]: name }));
          if (groupTypingTimeoutsRef.current[data.userId]) clearTimeout(groupTypingTimeoutsRef.current[data.userId]);
          groupTypingTimeoutsRef.current[data.userId] = setTimeout(() => {
            setGroupTypingUsers(prev => { const next = { ...prev }; delete next[data.userId]; return next; });
            delete groupTypingTimeoutsRef.current[data.userId];
          }, 3000);
        } else {
          setOtherTyping(true);
          setOtherTypingVoice(!!data.isVoice);
        }
      }
    };

    const onStopTyping = (data: { conversationId: string; userId?: string }) => {
      if (data.conversationId === activeConvId) {
        if (activeConvRef.current?.isGroup && data.userId) {
          setGroupTypingUsers(prev => { const next = { ...prev }; delete next[data.userId!]; return next; });
          if (groupTypingTimeoutsRef.current[data.userId]) {
            clearTimeout(groupTypingTimeoutsRef.current[data.userId]);
            delete groupTypingTimeoutsRef.current[data.userId];
          }
        } else {
          setOtherTyping(false);
          setOtherTypingVoice(false);
        }
      }
    };

    const onMessageRead = (data: { conversationId: string }) => {
      if (data.conversationId === activeConvId) {
        setLocalMessages(prev => prev.map(m => ({ ...m, isRead: true })));
      }
    };

    const onUserOnline = (data: { userId: string }) =>
      setOnlineUsers(prev => new Set([...prev, data.userId]));

    const onUserOffline = (data: { userId: string; lastSeen: string }) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(data.userId); return s; });
      setLastSeen(prev => ({ ...prev, [data.userId]: data.lastSeen }));
    };

    const onDisappearChanged = (data: { conversationId: string; disappearAfter: string | null }) => {
      setDisappearAfterMap(prev => ({ ...prev, [data.conversationId]: data.disappearAfter }));
    };

    const onBlockChanged = (_data: { conversationId: string; blockerId: string; isBlocked: boolean }) => {
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    };

    const onTimeoutChanged = (_data: { conversationId: string; restrictedUserId: string; until: string | null }) => {
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    };

    const onGroupCreated = () => queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    const onGroupUpdated = () => queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    const onGroupMembersChanged = () => queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    const onGroupRemoved = (data: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      if (data.conversationId === activeConvId) setActiveConvId(null);
    };
    const onGroupDeleted = (data: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      if (data.conversationId === activeConvId) setActiveConvId(null);
    };

    const onPollUpdated = (poll: any) => {
      setLocalMessages(prev =>
        prev.map(m => (m.pollId === poll.id || m.poll?.id === poll.id ? { ...m, poll } : m))
      );
    };

    const onGameUpdated = (game: any) => {
      setLocalMessages(prev =>
        prev.map(m => (m.gameId === game.id || m.game?.id === game.id ? { ...m, game } : m))
      );
    };

    const onCallIncoming = (data: any) => {
      setCallState({
        active: true,
        conversationId: data.conversationId,
        targetUserId: data.callerId,
        targetUser: data.caller,
        callType: data.callType,
        isIncoming: true,
        status: "ringing",
        offer: data.offer,
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);
    socket.on("message_edited", onMsgEdited);
    socket.on("message_deleted", onMsgDeleted);
    socket.on("message_reaction", onMsgReaction);
    socket.on("message_pinned", onMsgPinned);
    socket.on("poll_updated", onPollUpdated);
    socket.on("game_updated", onGameUpdated);
    socket.on("call_incoming", onCallIncoming);
    socket.on("incoming_call", onCallIncoming);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("message_read", onMessageRead);
    socket.on("user_online", onUserOnline);
    socket.on("user_offline", onUserOffline);
    socket.on("disappear_changed", onDisappearChanged);
    socket.on("block_changed", onBlockChanged);
    socket.on("timeout_changed", onTimeoutChanged);
    socket.on("group_created", onGroupCreated);
    socket.on("group_updated", onGroupUpdated);
    socket.on("group_members_changed", onGroupMembersChanged);
    socket.on("group_removed", onGroupRemoved);
    socket.on("group_deleted", onGroupDeleted);

    return () => {
      socket.off("connect", onConnect); socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage); socket.off("message_edited", onMsgEdited);
      socket.off("message_deleted", onMsgDeleted); socket.off("message_reaction", onMsgReaction);
      socket.off("message_pinned", onMsgPinned);
      socket.off("poll_updated", onPollUpdated);
      socket.off("game_updated", onGameUpdated);
      socket.off("call_incoming", onCallIncoming);
      socket.off("incoming_call", onCallIncoming);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping); socket.off("message_read", onMessageRead);
      socket.off("user_online", onUserOnline); socket.off("user_offline", onUserOffline);
      socket.off("disappear_changed", onDisappearChanged);
      socket.off("block_changed", onBlockChanged);
      socket.off("timeout_changed", onTimeoutChanged);
      socket.off("group_created", onGroupCreated);
      socket.off("group_updated", onGroupUpdated);
      socket.off("group_members_changed", onGroupMembersChanged);
      socket.off("group_removed", onGroupRemoved);
      socket.off("group_deleted", onGroupDeleted);
    };
  }, [activeConvId, user?.id, queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (localMessages.length) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [localMessages.length]);

  // Typing indicator
  const handleTypingStart = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeConvId) return;
    if (!isTyping) { setIsTyping(true); socket.emit("typing", { conversationId: activeConvId, isVoice: false }); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("stop_typing", { conversationId: activeConvId });
    }, 1500);
  }, [activeConvId, isTyping]);

  const handleTypingStop = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeConvId) return;
    setIsTyping(false);
    socket.emit("stop_typing", { conversationId: activeConvId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [activeConvId]);

  const handleInputChange = (val: string) => {
    setMessageText(val);
    if (val) handleTypingStart(); else handleTypingStop();
  };

  // Send message
  const handleSend = useCallback(async (opts?: {
    text?: string;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    messageType?: string;
    spotifyTrack?: any;
    gifInfo?: any;
    stickerInfo?: any;
  }) => {
    if (!activeConvId) return;
    const text = (opts?.text ?? messageText).trim();
    if (!text && !opts?.mediaUrl && !opts?.spotifyTrack && !opts?.gifInfo && !opts?.stickerInfo && !opts?.messageType) return;
    setMessageText(""); setReplyTo(null); handleTypingStop();
    const clientId = generateClientId();
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`, conversationId: activeConvId, senderId: user!.id,
      text: text || null, mediaUrl: opts?.mediaUrl ?? null, mediaType: opts?.mediaType ?? null,
      fileName: opts?.fileName ?? null,
      messageType: opts?.messageType,
      spotifyTrack: opts?.spotifyTrack ?? null,
      gifInfo: opts?.gifInfo ?? null,
      stickerInfo: opts?.stickerInfo ?? null,
      isRead: false, isEdited: false, isDeleted: false, isForwarded: false,
      reactions: {}, isPinned: false, starredBy: [], clientId,
      replyToId: replyTo?.id ?? null,
      replyTo: replyTo ? { id: replyTo.id, senderId: replyTo.senderId, text: replyTo.text, mediaType: replyTo.mediaType } : null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: "sending",
    };
    setLocalMessages(prev => [...prev, optimistic]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    const body: any = { clientId };
    if (text) body.text = text;
    if (opts?.mediaUrl) body.mediaUrl = opts.mediaUrl;
    if (opts?.mediaType) body.mediaType = opts.mediaType;
    if (opts?.fileName) body.fileName = opts.fileName;
    if (opts?.messageType) body.messageType = opts.messageType;
    if (opts?.spotifyTrack) body.spotifyTrack = opts.spotifyTrack;
    if (opts?.gifInfo) body.gifInfo = opts.gifInfo;
    if (opts?.stickerInfo) body.stickerInfo = opts.stickerInfo;
    if (replyTo?.id) body.replyToId = replyTo.id;
    try {
      const msg: ChatMessage = await apiRequest(`conversations/${activeConvId}/messages`, { method: "POST", body: JSON.stringify(body) });
      setLocalMessages(prev => prev.map(m => m.clientId === clientId ? msg : m));
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
    } catch {
      setLocalMessages(prev => prev.map(m => m.clientId === clientId ? { ...m, status: "failed" } : m));
      if (!isConnected) setOfflineQueue(prev => [...prev, { clientId, conversationId: activeConvId, text: text || undefined, ...opts, replyToId: replyTo?.id }]);
    }
  }, [activeConvId, messageText, replyTo, user, isConnected, handleTypingStop]);

  const handleSendQuickReply = useCallback((reply: string) => {
    void handleSend({ text: reply });
  }, [handleSend]);

  const handleStartCall = useCallback((callType: "voice" | "video") => {
    if (!activeConv || !otherUserId) return;
    setCallState({
      active: true,
      conversationId: activeConv.id,
      targetUserId: otherUserId,
      targetUser: activeConv.otherUser,
      callType,
      isIncoming: false,
      status: "ringing",
    });
  }, [activeConv, otherUserId]);

  const chatTranscript = useMemo(() => {
    const nameFor = (senderId: string) => senderId === user?.id
      ? "You"
      : (activeConv?.isGroup ? "Member" : activeConv?.otherUser?.username ?? "Other");
    return localMessages
      .filter(message => !message.isDeleted)
      .map(message => {
        const when = safeDate(message.createdAt);
        const stamp = when ? format(when, "yyyy-MM-dd HH:mm") : "";
        const content = message.text?.trim() || (message.mediaType ? `[${message.mediaType}]` : "[attachment]");
        return `[${stamp}] ${nameFor(message.senderId)}: ${content}`;
      })
      .join("\n");
  }, [localMessages, user?.id, activeConv?.isGroup, activeConv?.otherUser?.username]);

  const handleCopyChat = useCallback(async () => {
    if (!chatTranscript) return;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(chatTranscript);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = chatTranscript;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    } finally {
      setIsCopying(false);
    }
  }, [chatTranscript]);

  const handleExportChat = useCallback(() => {
    if (!chatTranscript) return;
    setIsExporting(true);
    try {
      const blob = new Blob([chatTranscript], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `whiterchat-${activeConv?.otherUser?.username ?? activeConv?.groupName ?? "chat"}-${format(new Date(), "yyyy-MM-dd")}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      window.setTimeout(() => setIsExporting(false), 450);
    }
  }, [chatTranscript, activeConv?.otherUser?.username, activeConv?.groupName]);

  const handleSelectMessage = useCallback((message: ChatMessage) => {
    setShowChatTools(false);
    setShowInfo(false);
    setHighlightedMessageId(message.id);
    window.setTimeout(() => {
      const element = document.querySelector(`[data-message-id="${message.id}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    window.setTimeout(() => setHighlightedMessageId(null), 1800);
  }, []);

  const handleToggleMessageSelection = useCallback((message: ChatMessage) => {
    setSelectedMessageIds(previous => {
      const next = new Set(previous);
      if (next.has(message.id)) next.delete(message.id);
      else next.add(message.id);
      return next;
    });
  }, []);

  const handleExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, []);

  const selectedMessages = useMemo(
    () => localMessages.filter(message => selectedMessageIds.has(message.id)),
    [localMessages, selectedMessageIds],
  );

  const handleCopySelected = useCallback(async () => {
    const text = selectedMessages
      .filter(message => !message.isDeleted)
      .map(message => message.text || (message.mediaType ? `[${message.mediaType}]` : "[attachment]"))
      .join("\n");
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch {}
    handleExitSelection();
  }, [selectedMessages, handleExitSelection]);

  const handleDeleteSelected = useCallback(async () => {
    const mine = selectedMessages.filter(message => message.senderId === user?.id && !message.isDeleted);
    if (!mine.length || !window.confirm(`Delete ${mine.length} selected message${mine.length === 1 ? "" : "s"}?`)) return;
    await Promise.all(mine.map(message => apiRequest(`messages/${message.id}`, { method: "DELETE" }).catch(() => null)));
    setLocalMessages(previous => previous.map(message => mine.some(item => item.id === message.id)
      ? { ...message, isDeleted: true, text: null, mediaUrl: null }
      : message));
    handleExitSelection();
  }, [selectedMessages, user?.id, handleExitSelection]);

  const handleOpenTools = useCallback(() => {
    setShowInfo(false);
    setShowChatTools(true);
    if (activeConvId) {
      loadMedia(activeConvId);
      loadStarred(activeConvId);
      loadPinned(activeConvId);
    }
  }, [activeConvId, loadMedia, loadStarred, loadPinned]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowChatTools(false);
        setShowInfo(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && activeConvId) {
        event.preventDefault();
        handleOpenTools();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeConvId, handleOpenTools]);

  // Edit
  const handleEditSave = useCallback(async (text: string) => {
    if (!editingMsg) return;
    const oldText = editingMsg.text;
    setEditingMsg(null);
    setLocalMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, text, isEdited: true } : m));
    try { await apiRequest(`messages/${editingMsg.id}`, { method: "PATCH", body: JSON.stringify({ text }) }); }
    catch { setLocalMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, text: oldText, isEdited: false } : m)); }
  }, [editingMsg]);

  const handleDelete = useCallback(async (msgId: string) => {
    setLocalMessages(prev => prev.map(m => m.id === msgId ? { ...m, isDeleted: true, text: null, mediaUrl: null } : m));
    await apiRequest(`messages/${msgId}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const handleReact = useCallback(async (msgId: string, emoji: string) => {
    const meId = user!.id;
    setLocalMessages(prev => prev.map(m => {
      if (String(m.id) !== String(msgId)) return m;
      const reactions = { ...m.reactions };
      const users = reactions[emoji] ?? [];
      if (users.includes(meId)) {
        reactions[emoji] = users.filter(id => id !== meId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else { reactions[emoji] = [...users, meId]; }
      return { ...m, reactions };
    }));
    await apiRequest(`messages/${msgId}/react`, { method: "POST", body: JSON.stringify({ emoji }) }).catch(() => {});
  }, [user]);

  const handlePin = useCallback(async (msgId: string) => {
    setLocalMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: !m.isPinned } : m));
    await apiRequest(`messages/${msgId}/pin`, { method: "POST" }).catch(() => {});
    if (activeConvId) loadPinned(activeConvId);
  }, [activeConvId, loadPinned]);

  const handleStar = useCallback(async (msgId: string) => {
    const meId = user!.id;
    setLocalMessages(prev => prev.map(m => {
      if (String(m.id) !== String(msgId)) return m;
      const starredBy = m.starredBy.includes(meId) ? m.starredBy.filter(id => id !== meId) : [...m.starredBy, meId];
      return { ...m, starredBy };
    }));
    await apiRequest(`messages/${msgId}/star`, { method: "POST" }).catch(() => {});
  }, [user]);

  // Forward
  const handleForward = useCallback(async (conversationId: string) => {
    if (!forwardingMsg) return;
    await apiRequest(`messages/${forwardingMsg.id}/forward`, { method: "POST", body: JSON.stringify({ conversationId }) });
    queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
  }, [forwardingMsg, queryClient]);

  // Disappearing messages
  const handleDisappearChange = useCallback(async (value: string | null) => {
    if (!activeConvId) return;
    setDisappearAfterMap(prev => ({ ...prev, [activeConvId]: value }));
    await apiRequest(`conversations/${activeConvId}/disappear`, { method: "PATCH", body: JSON.stringify({ disappearAfter: value }) }).catch(() => {});
  }, [activeConvId]);

  // Archive / Mute
  const handleArchive = useCallback(async (convId: string, isArchived: boolean) => {
    await apiRequest(`conversations/${convId}`, { method: "PATCH", body: JSON.stringify({ action: isArchived ? "unarchive" : "archive" }) }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
  }, [queryClient]);

  const handleMute = useCallback(async (convId: string, isMuted: boolean) => {
    await apiRequest(`conversations/${convId}`, { method: "PATCH", body: JSON.stringify({ action: isMuted ? "unmute" : "mute" }) }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
  }, [queryClient]);

  // Block / Unblock / Timeout
  const handleBlock = useCallback(async () => {
    if (!activeConvId) return;
    await apiRequest(`conversations/${activeConvId}/block`, { method: "POST" }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
  }, [activeConvId, queryClient]);

  const handleUnblock = useCallback(async () => {
    if (!activeConvId) return;
    await apiRequest(`conversations/${activeConvId}/unblock`, { method: "POST" }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
  }, [activeConvId, queryClient]);

  const handleTimeout = useCallback(async (duration: string | null) => {
    if (!activeConvId) return;
    await apiRequest(`conversations/${activeConvId}/timeout`, { method: "POST", body: JSON.stringify({ duration }) }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
  }, [activeConvId, queryClient]);

  // Search
  useEffect(() => {
    if (!activeConvId || !searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const timer = setTimeout(() => {
      apiRequest(`conversations/${activeConvId}/search?q=${encodeURIComponent(searchQuery)}`)
        .then((results: ChatMessage[]) => setSearchResults(results))
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeConvId]);

  // New conversation
  const handleNewConv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConvUsername.trim()) return;
    try {
      const conv = await createConvMutation.mutateAsync({ data: { otherUsername: newConvUsername.trim() } });
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      setNewConvOpen(false); setNewConvUsername(""); setActiveConvId(conv.id);
    } catch (err: any) {
      alert(err?.message || "User not found");
    }
  };

  const handleSelectConv = (convId: string) => {
    setActiveConvId(convId);
    setOtherTyping(false); setReplyTo(null); setEditingMsg(null);
    setSearchMode(false); setSearchQuery(""); setShowInfo(false); setShowChatTools(false);
    setShowPreferences(false);
    setSelectionMode(false); setSelectedMessageIds(new Set()); setMessageDetails(null);
    setStarredMessages([]); setSharedMedia([]);
    setGroupTypingUsers({});
    Object.values(groupTypingTimeoutsRef.current).forEach(clearTimeout);
    groupTypingTimeoutsRef.current = {};
  };

  const handleCreateGroup = async (groupData: { name: string; description: string; memberUsernames: string[]; avatarData?: string }) => {
    try {
      const conv = await apiRequest("groups", { method: "POST", body: JSON.stringify(groupData) });
      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
      setCreateGroupOpen(false);
      setActiveConvId(conv.id);
    } catch (err: any) {
      alert(err?.message || "Failed to create group");
    }
  };

  const lastMineIdx = useMemo(() => {
    for (let i = localMessages.length - 1; i >= 0; i--) {
      if (localMessages[i].senderId === user?.id) return i;
    }
    return -1;
  }, [localMessages, user?.id]);

  const otherStatusText = useMemo(() => {
    if (otherTyping) return otherTypingVoice ? "Recording voice…" : "typing…";
    if (isOtherOnline) return "Active now";
    if (otherUserId && lastSeen[otherUserId]) {
      const d = safeDate(lastSeen[otherUserId]);
      return d ? `Last seen ${formatDistanceToNow(d, { addSuffix: true })}` : null;
    }
    return null;
  }, [otherTyping, otherTypingVoice, isOtherOnline, otherUserId, lastSeen]);

  // Info panel open → load media/starred/pinned
  const handleOpenInfo = () => {
    setShowInfo(true);
    if (activeConvId) { loadMedia(activeConvId); loadStarred(activeConvId); loadPinned(activeConvId); }
  };

  const requestCount = useMemo(
    () => (allConversations as any[] ?? []).filter((c: any) => c.isRequest).length,
    [allConversations]
  );

  return (
    <>
    {/* Main layout */}
    <div className="ig-messages flex h-[calc(100dvh-4rem)] md:h-dvh bg-background overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className={cn(
        "w-full md:w-[349px] lg:w-[380px] border-r border-border flex flex-col bg-card shrink-0",
        focusMode && activeConvId && "lg:hidden",
        activeConvId ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">{user?.username}</h2>
            <div className="flex gap-0.5">
              {!isConnected && (
                <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 rounded-full px-2 py-1 mr-1">
                  <WifiOff className="w-3 h-3" /> Offline
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={() => { setVaultAddConvId(null); setVaultAddConvUser(null); setShowVault(true); }} className="rounded-full w-9 h-9" title="Secret Vault">
                <Lock className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCreateGroupOpen(true)} className="rounded-full w-9 h-9" title="New Group">
                <Users className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setNewConvOpen(true)} className="rounded-full w-9 h-9" title="New Message">
                <PencilLine className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Tabs: Inbox / Requests */}
          <div className="flex gap-1 bg-secondary rounded-xl p-1">
            <button
              onClick={() => setTab("inbox")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                tab === "inbox" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Inbox className="w-3.5 h-3.5" /> Inbox
            </button>
            <button
              onClick={() => setTab("requests")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all relative",
                tab === "requests" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Requests
              {requestCount > 0 && tab !== "requests" && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                  {requestCount > 9 ? "9+" : requestCount}
                </span>
              )}
            </button>
          </div>

          {/* Inbox tools: live search and smart filters */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={conversationQuery}
              onChange={e => setConversationQuery(e.target.value)}
              placeholder="Search chats and messages…"
              className="h-9 rounded-full pl-9 pr-9 text-xs bg-secondary/60 border-transparent focus-visible:border-primary/30"
              aria-label="Search conversations"
            />
            {conversationQuery && (
              <button
                type="button"
                onClick={() => setConversationQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary"
                aria-label="Clear conversation search"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {([
              ["all", "All"],
              ["unread", "Unread"],
              ["groups", "Groups"],
              ["archived", "Archived"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setConversationFilter(value)}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  conversationFilter === value
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                {value === "unread" && (allConversations as any[] ?? []).filter((c: any) => c.unreadCount > 0).length > 0 && (
                  <span className="ml-1 tabular-nums">
                    {(allConversations as any[] ?? []).filter((c: any) => c.unreadCount > 0).length}
                  </span>
                )}
              </button>
            ))}
            <span className="ml-auto shrink-0 self-center text-[10px] text-muted-foreground tabular-nums">
              {conversations.length} chat{conversations.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* New conversation form */}
        {newConvOpen && (
          <div className="p-3 border-b border-border bg-secondary/30 shrink-0">
            <form onSubmit={handleNewConv} className="flex gap-2">
              <Input
                autoFocus
                placeholder="Username…"
                value={newConvUsername}
                onChange={e => setNewConvUsername(e.target.value)}
                className="flex-1 h-9 text-sm rounded-full"
              />
              <Button type="submit" size="sm" className="rounded-full" disabled={createConvMutation.isPending}>
                {createConvMutation.isPending ? "…" : "Start"}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full px-2"
                onClick={() => { setNewConvOpen(false); setNewConvUsername(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}

        {/* Notes tray — only on Inbox tab */}
        {tab === "inbox" && (
          <NotesTray
            myId={user?.id ?? ""}
            onOpenConversation={async (username) => {
              try {
                const conv = await createConvMutation.mutateAsync({ data: { otherUsername: username } });
                queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
                setActiveConvId(conv.id);
              } catch {}
            }}
          />
        )}

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {conversations?.length === 0 && (
            <div className="text-center py-14 text-muted-foreground text-sm px-6">
              {tab === "requests"
                ? "No message requests"
                : "No conversations yet. Tap the pencil icon to start one."}
            </div>
          )}
          {(conversations as any[])?.map((conv: any) => (
            <div
              key={conv.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors group relative",
                activeConvId === conv.id && "bg-secondary",
                conv.isArchived && "opacity-60"
              )}
              onClick={() => handleSelectConv(conv.id)}
            >
              {/* Avatar: group uses gradient icon, 1:1 uses user avatar */}
              <div className="relative shrink-0">
                {conv.isGroup ? (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0 overflow-hidden">
                    {conv.groupAvatarUrl
                      ? <img src={conv.groupAvatarUrl} alt="" className="h-full w-full object-cover" />
                      : <Users className="w-5 h-5 text-white" />}
                  </div>
                ) : (
                  <>
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conv.otherUser?.avatarUrl || undefined} />
                      <AvatarFallback className="text-base font-bold">
                        {conv.otherUser?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {onlineUsers.has(conv.otherUser?.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn("text-sm truncate flex items-center gap-1", conv.unreadCount > 0 ? "font-bold" : "font-semibold")}>
                    {conv.isGroup
                      ? <>{conv.groupName ?? "Group"}</>
                      : (conv.otherUser?.fullName || conv.otherUser?.username)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {conv.isMuted && <BellOff className="w-3 h-3 text-muted-foreground" />}
                    {conv.lastMessageAt && (
                      <span className="text-[11px] text-muted-foreground">{formatConvTime(conv.lastMessageAt)}</span>
                    )}
                  </div>
                </div>
                <div className={cn("text-xs truncate", conv.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {conv.isGroup
                    ? (conv.lastMessage || `${(conv.members ?? []).length} members`)
                    : (conv.lastMessage || "Start a conversation")}
                </div>
              </div>

              {conv.unreadCount > 0 && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[9px] text-primary-foreground font-bold">{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</span>
                </div>
              )}

              {/* Quick actions on hover */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5 bg-card shadow-md rounded-full px-1.5 py-1 border border-border z-10">
                {!conv.isGroup && (
                  <button
                    onClick={e => { e.stopPropagation(); setVaultAddConvId(conv.id); setVaultAddConvUser(conv.otherUser?.fullName || conv.otherUser?.username); setShowVault(true); }}
                    className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground" title="Hide in Vault"
                  ><Lock className="w-3.5 h-3.5" /></button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); handleArchive(conv.id, conv.isArchived); }}
                  className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground" title={conv.isArchived ? "Unarchive" : "Archive"}
                ><Archive className="w-3.5 h-3.5" /></button>
                <button
                  onClick={e => { e.stopPropagation(); handleMute(conv.id, conv.isMuted); }}
                  className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground" title={conv.isMuted ? "Unmute" : "Mute"}
                >{conv.isMuted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}</button>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* ── Chat area ──────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex overflow-hidden",
        focusMode && activeConvId ? "w-full" : "",
        !activeConvId ? "hidden md:flex items-center justify-center bg-secondary/10" : "flex"
      )}>
        {!activeConvId ? (
          <div className="text-center text-muted-foreground px-4">
            <div className="w-20 h-20 rounded-full border-2 border-foreground/20 flex items-center justify-center mx-auto mb-5">
              <MessageCircle className="w-10 h-10 text-foreground/40" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">Your Messages</h3>
            <p className="text-sm mb-5">Send private messages to friends.</p>
            <Button onClick={() => setNewConvOpen(true)} size="sm" className="rounded-full">Send message</Button>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden relative min-w-0">
            {/* Main chat column */}
            <div className={cn(
              "flex flex-col flex-1 overflow-hidden transition-all min-w-0",
              showInfo || showChatTools ? "hidden lg:flex" : "flex"
            )}>
              {/* Chat header */}
              <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 bg-card shrink-0">
                <Button variant="ghost" size="icon" className="md:hidden rounded-full w-9 h-9 shrink-0" onClick={() => setActiveConvId(null)}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>

                <button
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                  onClick={handleOpenInfo}
                >
                  <div className="relative shrink-0">
                    {activeConv?.isGroup ? (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center overflow-hidden">
                        {activeConv.groupAvatarUrl
                          ? <img src={activeConv.groupAvatarUrl} alt="" className="h-full w-full object-cover" />
                          : <Users className="w-4 h-4 text-white" />}
                      </div>
                    ) : (
                      <>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={activeConv?.otherUser?.avatarUrl || undefined} />
                          <AvatarFallback className="text-sm font-bold">
                            {activeConv?.otherUser?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOtherOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                        )}
                      </>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm leading-tight truncate">
                      {activeConv?.isGroup
                        ? (activeConv.groupName ?? "Group")
                        : activeConv?.otherUser?.username}
                    </div>
                    {activeConv?.isGroup ? (
                      <div className="text-xs leading-tight truncate text-muted-foreground">
                        {Object.keys(groupTypingUsers).length > 0
                          ? `${Object.values(groupTypingUsers).join(", ")} ${Object.keys(groupTypingUsers).length === 1 ? "is" : "are"} typing…`
                          : `${(activeConv.members ?? []).length} members`}
                      </div>
                    ) : otherStatusText ? (
                      <div className={cn(
                        "text-xs leading-tight truncate",
                        otherTyping ? "text-primary" : isOtherOnline ? "text-green-500" : "text-muted-foreground"
                      )}>
                        {otherStatusText}
                      </div>
                    ) : null}
                    {draftSaved && messageText.trim() && (
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-primary">
                        <PenLine className="h-2.5 w-2.5" /> Draft saved
                      </div>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                  {!activeConv?.isGroup && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-8 h-8 sm:w-9 sm:h-9 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
                        onClick={() => handleStartCall("voice")}
                        title="Start voice call"
                        aria-label="Start voice call"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-8 h-8 sm:w-9 sm:h-9 text-indigo-500 hover:bg-indigo-500/10 hover:text-indigo-600"
                        onClick={() => handleStartCall("video")}
                        title="Start video call"
                        aria-label="Start video call"
                      >
                        <Video className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 sm:w-9 sm:h-9" onClick={() => setSearchMode(v => !v)}>
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("rounded-full w-9 h-9", showChatTools && "bg-secondary")}
                    onClick={() => showChatTools ? setShowChatTools(false) : handleOpenTools()}
                    title="Chat command center (Ctrl/Cmd + K)"
                    aria-label="Open chat command center"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("rounded-full w-9 h-9", showInfo && "bg-secondary")}
                    onClick={() => showInfo ? setShowInfo(false) : (setShowChatTools(false), handleOpenInfo())}
                    title="Conversation details"
                    aria-label="Open conversation details"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("rounded-full w-9 h-9", selectionMode && "bg-primary/10 text-primary")}
                    onClick={() => selectionMode ? handleExitSelection() : setSelectionMode(true)}
                    title={selectionMode ? "Exit selection" : "Select messages"}
                    aria-label={selectionMode ? "Exit message selection" : "Select messages"}
                  >
                    <ListChecks className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("rounded-full w-9 h-9", showPreferences && "bg-secondary")}
                    onClick={() => setShowPreferences(value => !value)}
                    title="Chat preferences"
                    aria-label="Open chat preferences"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {selectionMode && (
                <div className="flex shrink-0 items-center gap-2 border-b border-primary/15 bg-primary/[0.05] px-4 py-2">
                  <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {selectedMessages.length}
                  </div>
                  <span className="flex-1 text-xs font-semibold">
                    {selectedMessages.length ? "messages selected" : "Tap messages to select"}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopySelected()}
                    disabled={!selectedMessages.length}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSelected()}
                    disabled={!selectedMessages.some(message => message.senderId === user?.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}

              {showPreferences && (
                <div className="absolute right-3 top-14 z-30 w-[min(290px,calc(100%-1.5rem))] rounded-2xl border border-border bg-card p-3 shadow-2xl">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">Chat preferences</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Make this thread feel like yours.</p>
                    </div>
                    <button type="button" onClick={() => setShowPreferences(false)} className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close preferences">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setCompactMode(value => !value)}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-secondary/70"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <LayoutList className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">Compact messages</span>
                        <span className="block text-[10px] text-muted-foreground">Fit more of the conversation on screen</span>
                      </span>
                      <span className={cn("relative h-5 w-9 rounded-full transition-colors", compactMode ? "bg-primary" : "bg-muted-foreground/25")}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform", compactMode ? "translate-x-4" : "translate-x-0.5")} />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFocusMode(value => !value)}
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-secondary/70"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">Focus mode</span>
                        <span className="block text-[10px] text-muted-foreground">Give this conversation the whole stage</span>
                      </span>
                      <span className={cn("relative h-5 w-9 rounded-full transition-colors", focusMode ? "bg-primary" : "bg-muted-foreground/25")}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform", focusMode ? "translate-x-4" : "translate-x-0.5")} />
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Conversation color</p>
                    <div className="flex gap-2 px-2.5">
                      {([
                        ["default", "bg-primary"],
                        ["violet", "bg-violet-500"],
                        ["mint", "bg-emerald-500"],
                        ["sunset", "bg-orange-500"],
                      ] as const).map(([value, swatch]) => (
                        <button
                          type="button"
                          key={value}
                          onClick={() => setChatTheme(value)}
                          className={cn("h-7 w-7 rounded-full transition-transform hover:scale-110", swatch, chatTheme === value && "ring-2 ring-foreground ring-offset-2 ring-offset-card")}
                          aria-label={`${value} conversation color`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* The latest pinned message stays visible without opening a panel. */}
              {pinnedMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectMessage(pinnedMessages[0])}
                  className="flex shrink-0 items-center gap-2 border-b border-border bg-primary/[0.04] px-4 py-2 text-left transition-colors hover:bg-primary/[0.08]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Pinned in this chat</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {pinnedMessages[0].text || (pinnedMessages[0].mediaType ? `Shared ${pinnedMessages[0].mediaType}` : "Pinned message")}
                    </span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              )}

              {/* Disappearing messages banner */}
              {disappearAfter && (
                <div className="flex items-center justify-center gap-1.5 py-1.5 bg-secondary/50 border-b border-border text-xs text-muted-foreground">
                  <span className="text-base">⏱</span>
                  Messages disappear after {disappearAfter === "1h" ? "1 hour" : disappearAfter === "24h" ? "24 hours" : "7 days"}
                </div>
              )}

              {/* Block / restriction banners */}
              {isBlockedBy && (
                <div className="flex items-center justify-center gap-1.5 py-2 bg-destructive/10 border-b border-border text-xs text-destructive font-medium">
                  You can't reply to this conversation.
                </div>
              )}
              {!isBlockedBy && isBlocked && (
                <div className="flex items-center justify-center gap-1.5 py-2 bg-secondary/50 border-b border-border text-xs text-muted-foreground">
                  You've blocked @{activeConv?.otherUser?.username}.{" "}
                  <button onClick={handleUnblock} className="text-primary font-semibold ml-1">Unblock</button>
                </div>
              )}
              {!isBlockedBy && !isBlocked && isMyTimeoutActive && (
                <div className="flex items-center justify-center gap-1.5 py-2 bg-secondary/50 border-b border-border text-xs text-muted-foreground">
                  @{activeConv?.otherUser?.username} restricted you from sending messages until{" "}
                  {myTimeoutUntil ? format(new Date(myTimeoutUntil), "MMM d, h:mm a") : ""}.
                </div>
              )}

              {/* Search bar */}
              {searchMode && (
                <div className="px-4 py-2 border-b border-border bg-card shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search in conversation…"
                      className="pl-9 pr-9 h-9 rounded-full text-sm"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  {isSearching && <p className="text-xs text-muted-foreground mt-1 ml-1">Searching…</p>}
                  {!isSearching && searchQuery.length >= 2 && (
                    <p className="text-xs text-muted-foreground mt-1 ml-1">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""}</p>
                  )}
                </div>
              )}

              {/* Messages area */}
              {searchMode && searchResults.length > 0 ? (
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Search results</p>
                  {searchResults.map(msg => (
                    <div key={msg.id} className="bg-secondary/50 rounded-xl px-4 py-3">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        {msg.senderId === user?.id ? "You" : activeConv?.otherUser?.username} · {safeDate(msg.createdAt) ? format(safeDate(msg.createdAt)!, "MMM d, h:mm a") : ""}
                      </div>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  ref={messagesContainerRef}
                  onScroll={event => {
                    const target = event.currentTarget;
                    setShowJumpToLatest(target.scrollHeight - target.scrollTop - target.clientHeight > 220);
                  }}
                  className={cn(
                    "ig-messages-list relative flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4 transition-colors",
                    chatTheme === "violet" && "bg-violet-50/45 dark:bg-violet-950/10",
                    chatTheme === "mint" && "bg-emerald-50/45 dark:bg-emerald-950/10",
                    chatTheme === "sunset" && "bg-orange-50/45 dark:bg-orange-950/10",
                  )}
                >
                  <div ref={messagesTopRef} className="h-4">
                    {isLoadingMore && <div className="text-center py-2 text-xs text-muted-foreground">Loading older messages…</div>}
                  </div>

                  {localMessages.length === 0 && !isLoadingMore && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={activeConv?.otherUser?.avatarUrl || undefined} />
                        <AvatarFallback className="text-xl font-bold">
                          {activeConv?.otherUser?.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-semibold text-foreground">{activeConv?.otherUser?.username}</p>
                      <p className="text-xs mt-1">Say hi! 👋</p>
                    </div>
                  )}

                  <div className="min-w-0">
                    {localMessages.map((msg, idx) => {
                      const isMe = msg.senderId === user?.id;
                      const prevMsg = idx > 0 ? localMessages[idx - 1] : null;
                      const nextMsg = idx < localMessages.length - 1 ? localMessages[idx + 1] : null;
                      const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);
                      const isGroupEnd = !nextMsg || nextMsg.senderId !== msg.senderId;
                      const isLastMine = idx === lastMineIdx;
                      const msgDate = safeDate(msg.createdAt);
                      const prevMsgDate = prevMsg ? safeDate(prevMsg.createdAt) : null;
                      const showDate = msgDate && (!prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString());

                      return (
                          <div
                            key={msg.clientId ?? msg.id}
                            className={cn(
                              "min-w-0 rounded-xl transition-colors duration-500",
                              highlightedMessageId === msg.id && "bg-primary/10 ring-2 ring-primary/30"
                            )}
                            data-message-id={msg.id}
                          >
                          {showDate && msgDate && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-[11px] text-muted-foreground">
                                {isToday(msgDate) ? "Today" : isYesterday(msgDate) ? "Yesterday" : format(msgDate, "MMMM d, yyyy")}
                              </span>
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          )}
                          <MessageBubble
                            msg={msg} isMe={isMe} isLast={idx === localMessages.length - 1}
                            isLastMine={isLastMine} showAvatar={showAvatar} isGroupEnd={isGroupEnd}
                            compactMode={compactMode}
                            otherUserAvatarUrl={
                              activeConv?.isGroup
                                ? (senderInfoMap[msg.senderId]?.avatarUrl)
                                : (activeConv?.otherUser?.avatarUrl || undefined)
                            }
                            otherUserUsername={
                              activeConv?.isGroup
                                ? (senderInfoMap[msg.senderId]?.username ?? "")
                                : (activeConv?.otherUser?.username ?? "")
                            }
                            myId={user!.id}
                            selectionMode={selectionMode}
                            selected={selectedMessageIds.has(msg.id)}
                            onToggleSelect={handleToggleMessageSelection}
                            onDetails={setMessageDetails}
                            onReact={handleReact} onReply={setReplyTo}
                            onEdit={setEditingMsg} onDelete={handleDelete}
                            onPin={handlePin} onStar={handleStar}
                            onForward={setForwardingMsg}
                            onPollUpdated={(updated) => {
                              setLocalMessages(prev =>
                                prev.map(m => (m.pollId === updated.id || m.poll?.id === updated.id ? { ...m, poll: updated } : m))
                              );
                            }}
                            onGameUpdated={(updated) => {
                              setLocalMessages(prev =>
                                prev.map(m => (m.gameId === updated.id || m.game?.id === updated.id ? { ...m, game: updated } : m))
                              );
                            }}
                          />
                        </div>
                      );
                    })}

                    {/* Typing indicator — 1:1 */}
                    {!activeConv?.isGroup && otherTyping && (
                      <div className="flex items-end gap-2 justify-start mb-3">
                        <div className="w-7 shrink-0">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={activeConv?.otherUser?.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">{activeConv?.otherUser?.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="bg-secondary rounded-[22px] rounded-bl-md px-4 py-3 flex gap-1 items-center">
                          {otherTypingVoice ? (
                            <span className="text-xs text-muted-foreground">Recording voice…</span>
                          ) : (
                            <>
                              <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:300ms]" />
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Typing indicator — group */}
                    {activeConv?.isGroup && Object.keys(groupTypingUsers).length > 0 && (
                      <div className="flex items-end gap-2 justify-start mb-3">
                        <div className="bg-secondary rounded-[22px] rounded-bl-md px-4 py-3 flex gap-1 items-center">
                          <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-bounce [animation-delay:300ms]" />
                          <span className="text-xs text-muted-foreground ml-1">
                            {Object.values(groupTypingUsers).slice(0, 2).join(", ")}
                            {Object.keys(groupTypingUsers).length > 2 && " & others"} typing…
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                  {showJumpToLatest && (
                    <button
                      type="button"
                      onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                      className="sticky bottom-3 left-full ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg transition-transform hover:-translate-y-0.5"
                      aria-label="Jump to latest message"
                      title="Jump to latest"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Message input */}
              <MessageInput
                value={messageText} onChange={handleInputChange}
                onSend={handleSend} onTypingStart={handleTypingStart} onTypingStop={handleTypingStop}
                replyTo={replyTo} onCancelReply={() => setReplyTo(null)}
                editingMsg={editingMsg} onCancelEdit={() => setEditingMsg(null)} onEditSave={handleEditSave}
                otherUserUsername={activeConv?.otherUser?.username ?? ""}
                myId={user?.id ?? ""}
                disabled={isBlocked || isBlockedBy || isMyTimeoutActive}
                conversationId={activeConvId ?? undefined}
                onPollCreated={() => queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() })}
                onGameCreated={() => queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() })}
                onOpenMusicModal={() => setShowMusicPicker(true)}
                onOpenGiphyModal={() => setShowGiphyPicker(true)}
                onStartVoiceCall={() => handleStartCall("voice")}
                onStartVideoCall={() => handleStartCall("video")}
              />
            </div>

            {/* ── Info panel (slide-in on desktop, fullscreen on mobile) ── */}
            {showInfo && (
              <div className={cn(
                "flex-col bg-card border-l border-border",
                "absolute inset-0 lg:static lg:inset-auto flex w-full lg:w-[320px] lg:shrink-0"
              )}>
                {activeConv?.isGroup ? (
                  <GroupInfoPanel
                    group={{
                      id: activeConv.id,
                      groupName: activeConv.groupName ?? "Group",
                      groupAvatarUrl: activeConv.groupAvatarUrl ?? null,
                      groupDescription: activeConv.groupDescription ?? null,
                      memberCount: activeConv.memberCount ?? (activeConv.members ?? []).length,
                      members: activeConv.members ?? [],
                      adminIds: activeConv.adminIds ?? [],
                      isAdmin: activeConv.isAdmin ?? false,
                      createdBy: activeConv.createdBy ?? "",
                      onlyAdminsCanSend: activeConv.onlyAdminsCanSend ?? false,
                      disappearAfter: disappearAfter,
                      isMuted: activeConv.isMuted ?? false,
                      isArchived: activeConv.isArchived ?? false,
                    }}
                    myId={user?.id ?? ""}
                    sharedMedia={sharedMedia}
                    pinnedMessages={pinnedMessages}
                    starredMessages={starredMessages}
                    onClose={() => setShowInfo(false)}
                    onUpdateGroup={async (data) => {
                      await apiRequest(`groups/${activeConvId}`, { method: "PATCH", body: JSON.stringify(data) });
                      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
                    }}
                    onAddMembers={() => setCreateGroupOpen(true)}
                    onRemoveMember={async (userId) => {
                      await apiRequest(`groups/${activeConvId}/members/${userId}`, { method: "DELETE" });
                      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
                    }}
                    onPromote={async (userId) => {
                      await apiRequest(`groups/${activeConvId}/promote`, { method: "POST", body: JSON.stringify({ userId }) });
                      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
                    }}
                    onDemote={async (userId) => {
                      await apiRequest(`groups/${activeConvId}/demote`, { method: "POST", body: JSON.stringify({ userId }) });
                      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
                    }}
                    onDisappearChange={handleDisappearChange}
                    onLeave={async () => {
                      await apiRequest(`groups/${activeConvId}/leave`, { method: "POST" });
                      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
                      setActiveConvId(null); setShowInfo(false);
                    }}
                    onDelete={async () => {
                      await apiRequest(`groups/${activeConvId}`, { method: "DELETE" });
                      queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
                      setActiveConvId(null); setShowInfo(false);
                    }}
                    onToggleMute={() => handleMute(activeConvId, activeConv?.isMuted ?? false)}
                    onToggleArchive={() => handleArchive(activeConvId, activeConv?.isArchived ?? false)}
                    onViewMedia={(url, type) => setMediaViewer({ url, type })}
                  />
                ) : (
                  <ConversationInfoPanel
                    otherUser={activeConv?.otherUser}
                    isOnline={isOtherOnline}
                    disappearAfter={disappearAfter}
                    isMuted={activeConv?.isMuted ?? false}
                    isArchived={activeConv?.isArchived ?? false}
                    sharedMedia={sharedMedia}
                    pinnedMessages={pinnedMessages}
                    starredMessages={starredMessages}
                    myId={user?.id ?? ""}
                    isBlocked={isBlocked}
                    isBlockedBy={isBlockedBy}
                    myTimeoutUntil={myTimeoutUntil}
                    otherTimeoutUntil={otherTimeoutUntil}
                    onBlock={handleBlock}
                    onUnblock={handleUnblock}
                    onTimeout={handleTimeout}
                    onClose={() => setShowInfo(false)}
                    onDisappearChange={handleDisappearChange}
                    onToggleMute={() => handleMute(activeConvId, activeConv?.isMuted ?? false)}
                    onToggleArchive={() => handleArchive(activeConvId, activeConv?.isArchived ?? false)}
                    onNavigateToProfile={() => {
                      setLocation(`/profile/${activeConv?.otherUser?.username}`);
                      setShowInfo(false);
                    }}
                    onViewMedia={(url, type) => setMediaViewer({ url, type })}
                  />
                )}
              </div>
            )}
            {showChatTools && activeConv && (
              <div className="flex-col bg-card border-l border-border absolute inset-0 lg:static lg:inset-auto flex w-full lg:w-[360px] lg:shrink-0">
                <ChatCommandCenter
                  conversation={{
                    id: activeConv.id,
                    name: activeConv.isGroup ? (activeConv.groupName ?? "Group") : (activeConv.otherUser?.fullName ?? activeConv.otherUser?.username ?? "Conversation"),
                    username: activeConv.isGroup ? undefined : activeConv.otherUser?.username,
                    avatarUrl: activeConv.isGroup ? activeConv.groupAvatarUrl : activeConv.otherUser?.avatarUrl,
                    isOnline: !activeConv.isGroup && isOtherOnline,
                  }}
                  messages={localMessages}
                  pinnedMessages={pinnedMessages}
                  starredMessages={starredMessages}
                  sharedMedia={sharedMedia}
                  quickReplies={QUICK_REPLIES}
                  focusMode={focusMode}
                  isExporting={isExporting}
                  isCopying={isCopying}
                  onSearch={query => {
                    setSearchMode(Boolean(query));
                    setSearchQuery(query);
                  }}
                  onSelectMessage={handleSelectMessage}
                  onViewMedia={message => {
                    if (message.mediaUrl) setMediaViewer({ url: message.mediaUrl, type: message.mediaType ?? "image" });
                  }}
                  onExportChat={handleExportChat}
                  onCopyChat={handleCopyChat}
                  onSendQuickReply={handleSendQuickReply}
                  onFocusModeChange={setFocusMode}
                  onClose={() => setShowChatTools(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* ── Overlays ─────────────────────────────────────────────────────── */}

    {/* Vault */}
    {showVault && (
      <VaultScreen
        onClose={() => { setShowVault(false); setVaultAddConvId(null); setVaultAddConvUser(null); }}
        onOpenConversation={convId => { setShowVault(false); setVaultAddConvId(null); setVaultAddConvUser(null); handleSelectConv(convId); }}
        addConversationId={vaultAddConvId}
        addConversationUser={vaultAddConvUser}
        onAddComplete={() => queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() })}
      />
    )}

    {/* Forward modal */}
    {forwardingMsg && (
      <ForwardModal
        conversations={(allConversations as any[] ?? []).filter((c: any) => c.id !== activeConvId)}
        onForward={handleForward}
        onClose={() => setForwardingMsg(null)}
      />
    )}

    {/* Media viewer */}
    {mediaViewer && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setMediaViewer(null)}>
        <button className="absolute top-4 right-4 text-white p-2" onClick={() => setMediaViewer(null)}>
          <X className="w-6 h-6" />
        </button>
        {mediaViewer.type === "video" ? (
          <video src={mediaViewer.url} controls className="max-w-full max-h-[90vh] rounded-xl" onClick={e => e.stopPropagation()} />
        ) : (
          <img src={mediaViewer.url} alt="" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        )}
      </div>
    )}

    {messageDetails && (
      <MessageDetailsModal
        message={messageDetails}
        isMine={messageDetails.senderId === user?.id}
        onClose={() => setMessageDetails(null)}
      />
    )}

    {/* Create / Add-to Group modal */}
    {createGroupOpen && (
      <CreateGroupModal
        onClose={() => setCreateGroupOpen(false)}
        onCreate={handleCreateGroup}
        addToGroupId={showInfo && activeConv?.isGroup ? activeConvId ?? undefined : undefined}
        existingMemberIds={showInfo && activeConv?.isGroup ? (activeConv.members ?? []).map((m: any) => m.id) : undefined}
        onAddMembers={showInfo && activeConv?.isGroup ? async (memberUsernames) => {
          await apiRequest(`groups/${activeConvId}/members`, { method: "POST", body: JSON.stringify({ usernames: memberUsernames }) });
          queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
          setCreateGroupOpen(false);
        } : undefined}
      />
    )}
    {/* WebRTC Voice & Video Call Overlay */}
    <CallOverlay
      callState={callState}
      onClose={() => setCallState(null)}
      myUserId={user?.id ?? ""}
      myUser={user}
      onStatusChange={(status) => {
        setCallState((prev) => (prev ? { ...prev, status } : null));
      }}
    />

    {/* Spotify Music Picker */}
    <MusicPickerModal
      open={showMusicPicker}
      onClose={() => setShowMusicPicker(false)}
      onSelectTrack={(track) => {
        handleSend({
          messageType: "spotify",
          spotifyTrack: track,
        });
      }}
    />

    {/* GIPHY & Stickers Picker */}
    <GiphyPickerModal
      open={showGiphyPicker}
      onClose={() => setShowGiphyPicker(false)}
      onSelectGif={(gif) => {
        handleSend({
          messageType: "gif",
          gifInfo: gif,
        });
      }}
      onSelectSticker={(sticker) => {
        handleSend({
          messageType: "sticker",
          stickerInfo: sticker,
        });
      }}
    />

    {/* User Action Sheet Context Menu */}
    <UserContextMenu
      target={userMenuTarget}
      open={showUserMenu}
      onClose={() => setShowUserMenu(false)}
      onMuteToggle={(t) => handleMute(t.conversationId ?? activeConvId, t.isMuted ?? false)}
      onBlock={(t) => handleBlock()}
      onReport={(t) => {}}
      onDeleteConversation={(t) => {
        if (t.conversationId) {
          apiRequest(`conversations/${t.conversationId}`, { method: "DELETE" }).then(() => {
            queryClient.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
            if (activeConvId === t.conversationId) setActiveConvId(null);
          }).catch(() => {});
        }
      }}
    />
    </>
  );
}

function MessageDetailsModal({
  message,
  isMine,
  onClose,
}: {
  message: ChatMessage;
  isMine: boolean;
  onClose: () => void;
}) {
  const createdAt = safeDate(message.createdAt);
  const updatedAt = safeDate(message.updatedAt);
  const content = message.text || (message.mediaType ? `Shared ${message.mediaType}` : "Attachment");
  const readBy = Array.isArray((message as ChatMessage & { readBy?: string[] }).readBy)
    ? (message as ChatMessage & { readBy?: string[] }).readBy?.length ?? 0
    : message.isRead ? 1 : 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full overflow-hidden rounded-t-[26px] border border-border bg-card shadow-2xl sm:max-w-sm sm:rounded-[26px]" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Message details</p>
            <h2 className="mt-1 text-base font-bold">Delivery information</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close details">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div className={cn("rounded-2xl px-4 py-3 text-sm leading-6", isMine ? "bg-primary/10 text-foreground" : "bg-secondary text-foreground")}>
            <p className="break-words">{content}</p>
            {message.isEdited && <span className="mt-1 block text-[10px] text-muted-foreground">Edited</span>}
          </div>
          <div className="space-y-2.5 rounded-2xl border border-border/80 bg-secondary/25 p-3.5">
            <DetailRow label="Sent" value={createdAt ? format(createdAt, "MMM d, yyyy · h:mm a") : "—"} />
            {message.isEdited && <DetailRow label="Edited" value={updatedAt ? format(updatedAt, "MMM d, yyyy · h:mm a") : "—"} />}
            <DetailRow label="Message type" value={message.mediaType ? message.mediaType : "Text"} />
            <DetailRow label="Read status" value={message.isRead || readBy > 0 ? "Read" : "Delivered"} />
            {message.isPinned && <DetailRow label="Saved state" value="Pinned in this chat" />}
            {message.starredBy.length > 0 && <DetailRow label="Starred by" value={`${message.starredBy.length} ${message.starredBy.length === 1 ? "person" : "people"}`} />}
          </div>
          <p className="text-center text-[10px] text-muted-foreground">Only participants in this conversation can see this information.</p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}
