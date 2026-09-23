import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CallState } from "@/components/chat/CallOverlay";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth";

export interface NavigationContextValue {
  isMobile: boolean;
  // Private chat states
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  isPrivateChat: boolean;

  // Call states
  callState: CallState | null;
  setCallState: React.Dispatch<React.SetStateAction<CallState | null>>;
  isCallMinimized: boolean;
  setIsCallMinimized: (minimized: boolean) => void;
  isFullScreenCall: boolean;
  startCall: (opts: {
    conversationId?: string | null;
    targetUserId: string;
    targetUser: any;
    callType: "voice" | "video";
  }) => void;
  endCall: () => void;
  acceptCall: () => void;

  // Note composer state (Mobile-only bottom nav suppression)
  isNoteComposerOpen: boolean;
  setIsNoteComposerOpen: (open: boolean) => void;

  // Master visibility flags
  showMobileBottomNav: boolean;
  hideMobileHeader: boolean;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const { user } = useAuth();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const match = window.location.pathname.match(/^\/messages\/([^/?#]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  });

  const [callState, setCallState] = useState<CallState | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isNoteComposerOpen, setIsNoteComposerOpen] = useState(false);

  // Sync activeConversationId when pathname changes
  useEffect(() => {
    const match = location.match(/^\/messages\/([^/?#]+)/);
    if (match && match[1]) {
      setActiveConversationId(match[1]);
    } else if (location === "/messages") {
      // If navigating to base /messages, clear active conversation unless search param exists
      const search = typeof window !== "undefined" ? window.location.search : "";
      const params = new URLSearchParams(search);
      const queryId = params.get("id") || params.get("conv");
      if (!queryId) {
        setActiveConversationId(null);
      }
    } else if (!location.startsWith("/messages")) {
      // If outside /messages, private chat is inactive
      setActiveConversationId(null);
    }
  }, [location]);

  // Determine if we are inside a private conversation screen
  const isPrivateChat = useMemo(() => {
    if (!location.startsWith("/messages")) return false;
    if (location.match(/^\/messages\/[^/?#]+/)) return true;
    return activeConversationId !== null;
  }, [location, activeConversationId]);

  // Determine if a full-screen call is currently active
  // Outgoing calls or accepted calls in full-screen mode hide bottom nav
  // Incoming call ringing alert on underlying page does NOT hide bottom nav until opened/accepted
  const isFullScreenCall = useMemo(() => {
    if (!callState || !callState.active) return false;
    if (isCallMinimized) return false;
    if (callState.isIncoming && callState.status === "ringing") {
      return false;
    }
    return true;
  }, [callState, isCallMinimized]);

  // Master visibility calculation for the mobile bottom navigation bar
  // Applicable strictly to mobile layout (< 768px)
  const showMobileBottomNav = useMemo(() => {
    if (!isMobile) return true;
    if (location === "/snap") return false;
    if (isPrivateChat) return false;
    if (isFullScreenCall) return false;
    if (isNoteComposerOpen) return false;
    return true;
  }, [isMobile, location, isPrivateChat, isFullScreenCall, isNoteComposerOpen]);

  // On mobile in private chat, full call, or Reels, hide the top branding header as well
  const hideMobileHeader = useMemo(() => {
    if (!isMobile) return false;
    if (location === "/reels" || location.startsWith("/reels") || location.startsWith("/reel")) return true;
    return isPrivateChat || isFullScreenCall;
  }, [isMobile, isPrivateChat, isFullScreenCall, location]);

  // Global socket listener for incoming & call end events
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const onIncoming = (data: any) => {
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
      setIsCallMinimized(false);
    };

    const onEnd = () => {
      setCallState(null);
      setIsCallMinimized(false);
    };

    socket.on("call_incoming", onIncoming);
    socket.on("incoming_call", onIncoming);
    socket.on("call_ended", onEnd);
    socket.on("call_declined", onEnd);
    socket.on("call_cancelled", onEnd);

    return () => {
      socket.off("call_incoming", onIncoming);
      socket.off("incoming_call", onIncoming);
      socket.off("call_ended", onEnd);
      socket.off("call_declined", onEnd);
      socket.off("call_cancelled", onEnd);
    };
  }, [user]);

  const startCall = useCallback(
    (opts: {
      conversationId?: string | null;
      targetUserId: string;
      targetUser: any;
      callType: "voice" | "video";
    }) => {
      setIsCallMinimized(false);
      setCallState({
        active: true,
        conversationId: opts.conversationId ?? null,
        targetUserId: opts.targetUserId,
        targetUser: opts.targetUser,
        callType: opts.callType,
        isIncoming: false,
        status: "connecting",
      });
    },
    []
  );

  const endCall = useCallback(() => {
    setCallState(null);
    setIsCallMinimized(false);
  }, []);

  const acceptCall = useCallback(() => {
    setCallState((prev) => (prev ? { ...prev, status: "connecting" } : null));
    setIsCallMinimized(false);
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({
      isMobile: !!isMobile,
      activeConversationId,
      setActiveConversationId,
      isPrivateChat,
      callState,
      setCallState,
      isCallMinimized,
      setIsCallMinimized,
      isFullScreenCall,
      startCall,
      endCall,
      acceptCall,
      isNoteComposerOpen,
      setIsNoteComposerOpen,
      showMobileBottomNav,
      hideMobileHeader,
    }),
    [
      isMobile,
      activeConversationId,
      isPrivateChat,
      callState,
      isCallMinimized,
      isFullScreenCall,
      startCall,
      endCall,
      acceptCall,
      isNoteComposerOpen,
      showMobileBottomNav,
      hideMobileHeader,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationState() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigationState must be used within NavigationProvider");
  }
  return ctx;
}
