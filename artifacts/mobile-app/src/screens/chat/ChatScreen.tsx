import React, { useState, useEffect } from "react";
import { ArrowLeft, Send, Image as ImageIcon, Smile, MoreVertical, Phone, Video } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { mobileApi } from "../../services/api/client";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../types";

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  isMine?: boolean;
}

interface ChatListScreenProps {
  onOpenChat: (userId: string, username: string, avatarUrl?: string) => void;
  onBack: () => void;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ onOpenChat, onBack }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users/conversations from real API
    mobileApi
      .getExplorePosts({ page: 1, limit: 15 })
      .then((res) => {
        if (res.data?.posts) {
          const myId = user?._id;
          const authors = res.data.posts
            .map((p) => (typeof p.authorId === "object" ? p.authorId : p.author))
            .filter((a): a is User => Boolean(a && a._id !== myId));

          // Unique authors
          const uniqueAuthors = Array.from(new Map(authors.map((item) => [item._id, item])).values());
          setConversations(uniqueAuthors);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 text-zinc-600 dark:text-zinc-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-lg">{user?.username || "Direct"}</h2>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
            <p className="font-medium">No messages yet</p>
            <p className="text-xs mt-1">Start a conversation with friends on WhiterChat.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {conversations.map((c) => {
              const convId = c._id || c.id;
              return (
                <div
                  key={convId}
                  onClick={() => onOpenChat(convId, c.username, c.avatarUrl)}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 active:bg-zinc-200 dark:active:bg-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="relative">
                    <Avatar src={c.avatarUrl} name={c.username} size="md" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate">{c.displayName || c.username}</p>
                      <span className="text-[11px] text-zinc-400">Active</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      Tap to open end-to-end encrypted chat
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatConversationScreen: React.FC<{
  userId: string;
  username: string;
  avatarUrl?: string;
  onBack: () => void;
}> = ({ username, avatarUrl, onBack }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      senderId: "them",
      text: `Hey @${user?.username || "there"}! Welcome to WhiterChat Mobile 🚀`,
      createdAt: "10:42 AM",
    },
    {
      id: "2",
      senderId: user?._id || "me",
      text: "Thanks! Real-time messaging is super fast here.",
      createdAt: "10:43 AM",
      isMine: true,
    },
  ]);
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      senderId: user?._id || "me",
      text: inputText.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMine: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="p-1 -ml-1 text-zinc-600 dark:text-zinc-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar src={avatarUrl} name={username} size="sm" />
          <div>
            <h3 className="font-semibold text-sm leading-tight">{username}</h3>
            <span className="text-[10px] text-emerald-500 font-medium">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
          <button className="p-2 hover:text-emerald-500">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 hover:text-emerald-500">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          const isMine = m.isMine || m.senderId === user?._id;
          return (
            <div
              key={m.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? "bg-emerald-500 text-white rounded-br-xs shadow-xs"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-xs"
                }`}
              >
                <p>{m.text}</p>
                <span
                  className={`text-[9px] block mt-1 text-right ${
                    isMine ? "text-emerald-100" : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {m.createdAt}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Bar */}
      <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-2.5 flex items-center gap-2">
        <button className="p-2 text-zinc-500 hover:text-emerald-500">
          <ImageIcon className="w-5 h-5" />
        </button>
        <button className="p-2 text-zinc-500 hover:text-emerald-500">
          <Smile className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message..."
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 py-2 rounded-full text-sm outline-none border border-transparent focus:border-emerald-500"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="p-2 text-emerald-500 disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
