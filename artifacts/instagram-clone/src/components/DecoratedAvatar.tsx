import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileDecorationRenderer, getDecorationById } from "./decorations/ProfileDecorations";
import { cn } from "@/lib/utils";

export type AvatarSize = 
  | "xs"      // 24px (inline / tiny comments / small tags)
  | "sm"      // 32px (lists, comment replies, compact cards)
  | "md"      // 40px (feed post author, standard messages, search)
  | "lg"      // 48px (direct messages header, group cards)
  | "xl"      // 64px (note composer, story bubbles, previews)
  | "2xl"     // 96px (medium profile, settings preview)
  | "3xl"     // 128px (main profile header desktop)
  | "profile" // Responsive profile header: 96px on mobile, 128px on sm/md
  | "custom";

interface DecoratedAvatarProps {
  avatarUrl?: string | null;
  decorationId?: string | null;
  username?: string;
  fullName?: string;
  size?: AvatarSize;
  customSize?: number;
  className?: string;
  avatarClassName?: string;
  fallbackClassName?: string;
  animated?: boolean;
  hasStory?: boolean;
  hasUnviewedStory?: boolean;
  isCloseFriendsStory?: boolean;
  onStoryClick?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

const SIZE_MAP: Record<Exclude<AvatarSize, "profile" | "custom">, { container: string; px: number }> = {
  xs: { container: "w-6 h-6", px: 24 },
  sm: { container: "w-8 h-8", px: 32 },
  md: { container: "w-10 h-10", px: 40 },
  lg: { container: "w-12 h-12", px: 48 },
  xl: { container: "w-16 h-16", px: 64 },
  "2xl": { container: "w-24 h-24", px: 96 },
  "3xl": { container: "w-32 h-32", px: 128 },
};

export function DecoratedAvatar({
  avatarUrl,
  decorationId,
  username = "User",
  fullName,
  size = "md",
  customSize,
  className = "",
  avatarClassName = "",
  fallbackClassName = "",
  animated = true,
  hasStory = false,
  hasUnviewedStory = true,
  isCloseFriendsStory = false,
  onStoryClick,
  onClick,
  children,
}: DecoratedAvatarProps) {
  const initial = (fullName?.[0] || username?.[0] || "U").toUpperCase();
  const hasDecoration = !!decorationId && decorationId !== "none" && !!getDecorationById(decorationId);

  // Determine size classes
  let sizeClass = "w-10 h-10";
  let customStyle: React.CSSProperties = {};

  if (size === "custom" && customSize) {
    customStyle = { width: `${customSize}px`, height: `${customSize}px` };
    sizeClass = "";
  } else if (size === "profile") {
    sizeClass = "w-24 h-24 sm:w-32 sm:h-32";
  } else if (size in SIZE_MAP) {
    sizeClass = SIZE_MAP[size].container;
  }

  const handleClick = (e: React.MouseEvent) => {
    if (hasStory && onStoryClick) {
      e.stopPropagation();
      onStoryClick(e);
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  const ringPaddingClass = size === "profile" || size === "3xl" || size === "2xl" ? "p-[3.5px]" : "p-[2.5px]";
  const innerGapClass = size === "profile" || size === "3xl" || size === "2xl" ? "p-[2.5px]" : "p-[1.5px]";

  const ringGradient = isCloseFriendsStory
    ? "bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-400 shadow-emerald-500/20 shadow-md"
    : hasUnviewedStory
    ? "bg-gradient-to-tr from-amber-500 via-rose-500 to-fuchsia-600 shadow-rose-500/20 shadow-md"
    : "bg-neutral-500/40";

  return (
    <div
      onClick={handleClick}
      style={customStyle}
      className={cn(
        "relative shrink-0 select-none",
        sizeClass,
        onClick || onStoryClick || hasStory ? "cursor-pointer" : "",
        className
      )}
    >
      {/* ── Story Ring Wrapper (if active story exists) ── */}
      {hasStory ? (
        <div
          className={cn(
            "w-full h-full rounded-full transition-transform active:scale-95",
            ringGradient,
            ringPaddingClass
          )}
          title={hasUnviewedStory ? "View Story" : "Story already viewed"}
        >
          <div className={cn("w-full h-full rounded-full bg-background flex items-center justify-center", innerGapClass)}>
            <Avatar
              className={cn(
                "w-full h-full rounded-full shadow-sm bg-card overflow-hidden",
                hasDecoration ? "ring-0" : "",
                avatarClassName
              )}
            >
              <AvatarImage
                src={avatarUrl || undefined}
                alt={fullName || username}
                className="aspect-square h-full w-full object-cover"
              />
              <AvatarFallback
                className={cn(
                  "text-white font-bold bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 flex items-center justify-center",
                  size === "xs" ? "text-[10px]" : "",
                  size === "sm" ? "text-xs" : "",
                  size === "md" ? "text-sm" : "",
                  size === "lg" ? "text-base" : "",
                  size === "xl" ? "text-xl" : "",
                  size === "2xl" ? "text-3xl" : "",
                  size === "3xl" || size === "profile" ? "text-3xl sm:text-4xl" : "",
                  fallbackClassName
                )}
              >
                {initial}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      ) : (
        /* ── Core Avatar without story ring ── */
        <Avatar
          className={cn(
            "w-full h-full rounded-full ring-2 ring-background/60 shadow-sm bg-card overflow-hidden",
            hasDecoration ? "ring-0" : "",
            avatarClassName
          )}
        >
          <AvatarImage
            src={avatarUrl || undefined}
            alt={fullName || username}
            className="aspect-square h-full w-full object-cover"
          />
          <AvatarFallback
            className={cn(
              "text-white font-bold bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-700 flex items-center justify-center",
              size === "xs" ? "text-[10px]" : "",
              size === "sm" ? "text-xs" : "",
              size === "md" ? "text-sm" : "",
              size === "lg" ? "text-base" : "",
              size === "xl" ? "text-xl" : "",
              size === "2xl" ? "text-3xl" : "",
              size === "3xl" || size === "profile" ? "text-3xl sm:text-4xl" : "",
              fallbackClassName
            )}
          >
            {initial}
          </AvatarFallback>
        </Avatar>
      )}

      {/* ── Independent Decoration Layer ── */}
      {hasDecoration && (
        <div
          className="absolute -inset-[15%] pointer-events-none z-10 flex items-center justify-center"
          aria-hidden="true"
        >
          <ProfileDecorationRenderer
            decorationId={decorationId!}
            animated={animated}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Children elements (e.g. Note Bubble, Online indicator, Camera button) */}
      {children}
    </div>
  );
}
