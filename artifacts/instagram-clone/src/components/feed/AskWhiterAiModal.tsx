import React from "react";
import { AskWhiterAiPanel } from "./AskWhiterAiPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AskWhiterAiPost } from "@/context/AskWhiterAiContext";

export interface AskWhiterAiModalProps {
  post: {
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
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AskWhiterAiModal({ post, open, onOpenChange }: AskWhiterAiModalProps) {
  const isMobile = useIsMobile();

  if (!open || !post?.id) return null;

  const normalizedPost: AskWhiterAiPost = {
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
    commentsCount: post.commentsCount ?? 0,
    createdAt: post.createdAt,
  };

  return (
    <>
      {/* Background backdrop on mobile only, keeping desktop feed fully interactive */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
          onClick={() => onOpenChange(false)}
        />
      )}

      <AskWhiterAiPanel
        post={normalizedPost}
        onClose={() => onOpenChange(false)}
        variant={isMobile ? "sheet" : "drawer"}
      />
    </>
  );
}
