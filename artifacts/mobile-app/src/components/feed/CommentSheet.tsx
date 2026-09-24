import React, { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { Avatar } from "../ui/Avatar";
import { mobileApi } from "../../services/api/client";
import type { Post, Comment, User } from "../../types";

interface CommentSheetProps {
  post: Post | null;
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentSheet: React.FC<CommentSheetProps> = ({
  post,
  currentUser,
  isOpen,
  onClose,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && post?._id) {
      setLoading(true);
      mobileApi
        .getPostComments(post._id)
        .then((res) => {
          if (res.data?.comments) {
            setComments(res.data.comments);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, post?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post?._id || submitting) return;

    setSubmitting(true);
    const res = await mobileApi.addComment(post._id, newComment.trim());
    if (res.data?.comment) {
      setComments((prev) => [res.data!.comment, ...prev]);
      setNewComment("");
    }
    setSubmitting(false);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Comments">
      <div className="flex flex-col h-[50vh]">
        {/* Comment List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 text-xs">
              No comments yet. Start the conversation!
            </div>
          ) : (
            comments.map((c) => (
              <div key={c._id} className="flex items-start gap-3">
                <Avatar
                  src={c.author?.avatarUrl}
                  name={c.author?.displayName || c.author?.username}
                  size="sm"
                  isVerified={c.author?.isVerified}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {c.author?.username}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2"
        >
          <Avatar
            src={currentUser?.avatarUrl}
            name={currentUser?.displayName || "You"}
            size="sm"
          />
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 h-10 px-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="p-2 text-emerald-500 disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </BottomSheet>
  );
};
