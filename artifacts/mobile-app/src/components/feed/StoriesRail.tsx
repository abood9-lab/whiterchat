import React from "react";
import { Plus } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import type { Story, User } from "../../types";

interface StoriesRailProps {
  currentUser?: User | null;
  stories: Story[];
  onStoryClick: (story: Story) => void;
  onAddStoryClick: () => void;
}

export const StoriesRail: React.FC<StoriesRailProps> = ({
  currentUser,
  stories,
  onStoryClick,
  onAddStoryClick,
}) => {
  // Group stories by author
  const authorStoryMap = new Map<string, { author: User; story: Story }>();
  stories.forEach((s) => {
    const author = typeof s.authorId === "object" ? s.authorId : s.author;
    if (author && author._id && !authorStoryMap.has(author._id)) {
      authorStoryMap.set(author._id, { author, story: s });
    }
  });

  const uniqueAuthors = Array.from(authorStoryMap.values());

  return (
    <div className="w-full bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80 py-3.5 px-3 overflow-x-auto no-scrollbar select-none">
      <div className="flex items-center gap-3.5 min-w-max">
        {/* Your Story item */}
        <div
          onClick={onAddStoryClick}
          className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
        >
          <div className="relative">
            <Avatar
              src={currentUser?.avatarUrl}
              name={currentUser?.displayName || currentUser?.username || "You"}
              size="md"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-xs">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[64px]">
            Your story
          </span>
        </div>

        {/* Other Users' Stories */}
        {uniqueAuthors.map(({ author, story }) => (
          <div
            key={author._id}
            onClick={() => onStoryClick(story)}
            className="flex flex-col items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
          >
            <Avatar
              src={author.avatarUrl}
              name={author.displayName || author.username}
              size="md"
              hasStory={true}
              isStoryViewed={story.isViewed}
              isVerified={author.isVerified}
            />
            <span className="text-[11px] font-medium text-zinc-800 dark:text-zinc-300 truncate max-w-[64px]">
              {author.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
