import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CheckCircle2 } from "lucide-react";

interface AvatarProps {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isVerified?: boolean;
  hasStory?: boolean;
  isStoryViewed?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = "User",
  size = "md",
  isVerified = false,
  hasStory = false,
  isStoryViewed = false,
  className,
  onClick,
}) => {
  const sizes = {
    xs: "w-7 h-7 text-xs",
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-24 h-24 text-2xl",
  };

  const badgeSizes = {
    xs: "w-3 h-3 -bottom-0.5 -right-0.5",
    sm: "w-3.5 h-3.5 -bottom-0.5 -right-0.5",
    md: "w-4 h-4 bottom-0 right-0",
    lg: "w-5 h-5 bottom-0 right-0",
    xl: "w-6 h-6 bottom-1 right-1",
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const ringStyles = hasStory
    ? isStoryViewed
      ? "p-[2px] rounded-full border-2 border-zinc-400 dark:border-zinc-600"
      : "p-[2px] rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300"
    : "";

  return (
    <div
      onClick={onClick}
      className={twMerge(
        clsx(
          "relative inline-flex items-center justify-center shrink-0 select-none",
          ringStyles,
          onClick && "cursor-pointer active:scale-95 transition-transform",
          className
        )
      )}
    >
      <div
        className={clsx(
          "rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300",
          sizes[size]
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image and fallback to initials
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {isVerified && (
        <div
          className={clsx(
            "absolute bg-white dark:bg-zinc-950 rounded-full text-emerald-500 flex items-center justify-center",
            badgeSizes[size]
          )}
        >
          <CheckCircle2 className="w-full h-full fill-emerald-500 text-white dark:text-zinc-950" />
        </div>
      )}
    </div>
  );
};
