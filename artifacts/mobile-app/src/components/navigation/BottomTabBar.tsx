import React from "react";
import { Home, Compass, PlusSquare, Film, User as UserIcon } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";

export type MobileTab = "home" | "explore" | "create" | "reels" | "profile";

interface BottomTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-around px-2 max-w-lg mx-auto select-none safe-area-pb">
      <button
        onClick={() => onTabChange("home")}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl active:scale-90 transition-all ${
          activeTab === "home"
            ? "text-emerald-500 font-bold"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
        title="Home"
      >
        <Home className={`w-6 h-6 ${activeTab === "home" ? "stroke-[2.5]" : ""}`} />
      </button>

      <button
        onClick={() => onTabChange("explore")}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl active:scale-90 transition-all ${
          activeTab === "explore"
            ? "text-emerald-500 font-bold"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
        title="Explore"
      >
        <Compass className={`w-6 h-6 ${activeTab === "explore" ? "stroke-[2.5]" : ""}`} />
      </button>

      <button
        onClick={() => onTabChange("create")}
        className="flex flex-col items-center justify-center w-12 h-12 rounded-2xl text-white bg-gradient-to-tr from-emerald-600 to-teal-400 active:scale-90 shadow-md shadow-emerald-500/20 transition-all"
        title="Create"
      >
        <PlusSquare className="w-6 h-6 stroke-[2.2]" />
      </button>

      <button
        onClick={() => onTabChange("reels")}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl active:scale-90 transition-all ${
          activeTab === "reels"
            ? "text-emerald-500 font-bold"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
        title="Reels"
      >
        <Film className={`w-6 h-6 ${activeTab === "reels" ? "stroke-[2.5]" : ""}`} />
      </button>

      <button
        onClick={() => onTabChange("profile")}
        className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl active:scale-90 transition-all ${
          activeTab === "profile" ? "p-0.5 rounded-full ring-2 ring-emerald-500" : ""
        }`}
        title="Profile"
      >
        <Avatar
          src={user?.avatarUrl}
          name={user?.displayName || user?.username || "You"}
          size="xs"
        />
      </button>
    </nav>
  );
};
