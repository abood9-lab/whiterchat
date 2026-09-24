import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  MessageSquare,
  Heart,
  MessageCircle,
  UserPlus,
  X,
  ExternalLink,
  Volume2,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth";

export interface ActiveNotificationModal {
  id: string;
  type: "message" | "like" | "comment" | "follow";
  title: string;
  body: string;
  senderName?: string;
  senderAvatar?: string;
  url?: string;
  timestamp?: number;
}

// Function to play subtle soft chime using Web Audio API
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5 note

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

// Trigger browser native system push notification
export function triggerSystemNotification(title: string, options: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            icon: "/favicon.png",
            badge: "/favicon.png",
            vibrate: [100, 50, 100],
            renotify: true,
            tag: "whiterchat-alert",
            ...options,
          });
        });
      } else {
        new Notification(title, {
          icon: "/favicon.png",
          badge: "/favicon.png",
          vibrate: [100, 50, 100],
          tag: "whiterchat-alert",
          ...options,
        });
      }
    } catch (e) {
      console.warn("System notification error:", e);
    }
  }
}

export function NotificationModalBanner() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeNotification, setActiveNotification] = useState<ActiveNotificationModal | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
      if (Notification.permission === "default") {
        // Show permission request banner once
        const dismissed = localStorage.getItem("whiterchat_notif_prompt_dismissed");
        if (!dismissed) {
          setShowPromptBanner(true);
        }
      }
    }

    // Register Service Worker for push background handling
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Listen for socket events to display modal + native push
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (data: any) => {
      // Ignore if the current user is the sender
      const senderId = data.senderId || data.sender?.id || data.fromUserId || data.authorId;
      if (user?.id && senderId && String(senderId) === String(user.id)) {
        return;
      }

      const senderName = data.senderName || data.sender?.fullName || data.sender?.username || "Someone";
      const senderAvatar = data.senderAvatar || data.sender?.avatarUrl;
      const body = data.content || data.text || "Sent you a message";

      const notif: ActiveNotificationModal = {
        id: "msg-" + Date.now(),
        type: "message",
        title: senderName,
        body,
        senderName,
        senderAvatar,
        url: "/messages",
      };

      showInAppAndSystem(notif);
    };

    const handleNewNotification = (data: any) => {
      // Ignore if the current user is the actor
      const actorId = data.actorId || data.senderId || data.sender?.id || data.userId;
      if (user?.id && actorId && String(actorId) === String(user.id)) {
        return;
      }

      const type = data.type === "LIKE" ? "like" : data.type === "COMMENT" ? "comment" : "follow";
      const title = data.title || "WhiterChat Notification";
      const body = data.body || data.message || "New activity on your profile";

      const notif: ActiveNotificationModal = {
        id: "notif-" + Date.now(),
        type,
        title,
        body,
        senderName: data.senderName,
        senderAvatar: data.senderAvatar,
        url: data.url || "/notifications",
      };

      showInAppAndSystem(notif);
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message", handleNewMessage);
    socket.on("notification", handleNewNotification);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message", handleNewMessage);
      socket.off("notification", handleNewNotification);
    };
  }, [user?.id]);

  const showInAppAndSystem = (notif: ActiveNotificationModal) => {
    setActiveNotification(notif);
    playChimeSound();

    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }

    // Fire native device push notification (works outside site when tab in background)
    triggerSystemNotification(notif.title, {
      body: notif.body,
      data: { url: notif.url },
    });

    // Auto dismiss modal after 6 seconds
    setTimeout(() => {
      setActiveNotification((curr) => (curr?.id === notif.id ? null : curr));
    }, 6000);
  };

  const requestNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      setShowPromptBanner(false);
      localStorage.setItem("whiterchat_notif_prompt_dismissed", "true");

      if (result === "granted") {
        showInAppAndSystem({
          id: "welcome-" + Date.now(),
          type: "message",
          title: "Push Notifications Enabled!",
          body: "You will now receive alerts for messages, likes, and follows even when away.",
          url: "/notifications",
        });
      }
    } catch (err) {
      console.warn("Error asking notification permission", err);
    }
  };

  const getTypeIcon = (type: ActiveNotificationModal["type"]) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4 text-white" />;
      case "like":
        return <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-emerald-400" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <>
      {/* 1. Device Push Permission Prompt Card (shown once if default) */}
      {showPromptBanner && permissionState === "default" && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in slide-in-from-top duration-300">
          <div className="p-4 rounded-3xl bg-neutral-900/95 border border-primary/30 text-white shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">Enable Device Notifications</p>
                <p className="text-neutral-400 text-[11px] leading-tight mt-0.5">
                  Get instant alerts for messages & activity even outside the app.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                onClick={requestNotificationPermission}
                size="sm"
                className="rounded-xl h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
              >
                Enable
              </Button>
              <button
                onClick={() => {
                  setShowPromptBanner(false);
                  localStorage.setItem("whiterchat_notif_prompt_dismissed", "true");
                }}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Stunning In-App Floating Notification Modal */}
      {activeNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in slide-in-from-top duration-300">
          <div
            onClick={() => {
              if (activeNotification.url) {
                setLocation(activeNotification.url);
              }
              setActiveNotification(null);
            }}
            className="group cursor-pointer p-4 rounded-3xl bg-neutral-900/90 hover:bg-neutral-900 border border-white/15 text-white shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3 transition-all transform hover:scale-[1.01]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="w-11 h-11 border border-white/20 shadow-md">
                  <AvatarImage src={activeNotification.senderAvatar} />
                  <AvatarFallback className="bg-primary/30 text-primary font-bold">
                    {activeNotification.senderName?.[0]?.toUpperCase() || "W"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-neutral-950 border border-neutral-800 shadow">
                  {getTypeIcon(activeNotification.type)}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white truncate">
                    {activeNotification.title}
                  </h4>
                  <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded-md shrink-0">
                    Now
                  </span>
                </div>
                <p className="text-xs text-neutral-300 truncate mt-0.5 font-medium">
                  {activeNotification.body}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-xl bg-primary/20 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNotification(null);
                }}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
