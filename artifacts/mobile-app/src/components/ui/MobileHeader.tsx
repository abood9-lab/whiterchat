import React from "react";
import { Heart, MessageCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface MobileHeaderProps {
  title?: string;
  onNotificationsClick?: () => void;
  onMessagesClick?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  onNotificationsClick,
  onMessagesClick,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full h-14 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between px-4 select-none">
      {title ? (
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {title}
        </h1>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-base shadow-sm shadow-emerald-500/30">
            W
          </div>
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
            WhiterChat
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-95 transition-all"
          title="Toggle Theme"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          onClick={onNotificationsClick}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-95 transition-all relative"
        >
          <Heart className="w-5 h-5" />
        </button>

        <button
          onClick={onMessagesClick}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-95 transition-all relative"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
