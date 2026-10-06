import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

export interface AskWhiterAiPost {
  id: string;
  caption?: string | null;
  mediaUrl?: string | null;
  mediaType?: string;
  additionalMediaUrls?: string[];
  author: {
    id?: string;
    username: string;
    fullName?: string;
    avatarUrl?: string | null;
  };
  location?: string | null;
  commentsCount?: number;
  createdAt?: string;
}

interface AskWhiterAiContextValue {
  selectedPost: AskWhiterAiPost | null;
  isOpen: boolean;
  isMinimized: boolean;
  openAskWhiterAi: (post: any) => void;
  closeAskWhiterAi: () => void;
  minimizeAskWhiterAi: () => void;
  maximizeAskWhiterAi: () => void;
  toggleMinimize: () => void;
}

const AskWhiterAiContext = createContext<AskWhiterAiContextValue | null>(null);

export function AskWhiterAiProvider({ children }: { children: React.ReactNode }) {
  const [selectedPost, setSelectedPost] = useState<AskWhiterAiPost | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openAskWhiterAi = useCallback((post: any) => {
    if (!post?.id) return;
    const normalized: AskWhiterAiPost = {
      id: post.id,
      caption: post.caption ?? null,
      mediaUrl: post.mediaUrl ?? null,
      mediaType: post.mediaType ?? "image",
      additionalMediaUrls: post.additionalMediaUrls ?? [],
      author: {
        id: post.author?.id,
        username: post.author?.username ?? "unknown",
        fullName: post.author?.fullName,
        avatarUrl: post.author?.avatarUrl ?? null,
      },
      location: post.location ?? null,
      commentsCount: post.commentsCount ?? (Array.isArray(post.comments) ? post.comments.length : 0),
      createdAt: post.createdAt,
    };

    setSelectedPost(normalized);
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeAskWhiterAi = useCallback(() => {
    setIsOpen(false);
    setSelectedPost(null);
    setIsMinimized(false);
  }, []);

  const minimizeAskWhiterAi = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const maximizeAskWhiterAi = useCallback(() => {
    setIsMinimized(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // Listen to escape key on desktop to close if open and not minimized
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isMinimized) {
        // Only close if not currently typing in an input
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          closeAskWhiterAi();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMinimized, closeAskWhiterAi]);

  const value = useMemo(
    () => ({
      selectedPost,
      isOpen,
      isMinimized,
      openAskWhiterAi,
      closeAskWhiterAi,
      minimizeAskWhiterAi,
      maximizeAskWhiterAi,
      toggleMinimize,
    }),
    [selectedPost, isOpen, isMinimized, openAskWhiterAi, closeAskWhiterAi, minimizeAskWhiterAi, maximizeAskWhiterAi, toggleMinimize]
  );

  return (
    <AskWhiterAiContext.Provider value={value}>
      {children}
    </AskWhiterAiContext.Provider>
  );
}

export function useAskWhiterAi() {
  const ctx = useContext(AskWhiterAiContext);
  if (!ctx) {
    throw new Error("useAskWhiterAi must be used within an AskWhiterAiProvider");
  }
  return ctx;
}
