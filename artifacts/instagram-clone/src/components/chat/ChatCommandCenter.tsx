import { useMemo, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  Check,
  ChevronRight,
  Clipboard,
  Command,
  Copy,
  Focus,
  Image as ImageIcon,
  Pin,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./MessageBubble";

export interface ChatCommandCenterConversation {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
}

export interface ChatCommandCenterProps {
  conversation: ChatCommandCenterConversation;
  messages?: ChatMessage[];
  pinnedMessages?: ChatMessage[];
  starredMessages?: ChatMessage[];
  sharedMedia?: ChatMessage[];
  quickReplies?: string[];
  focusMode?: boolean;
  isExporting?: boolean;
  isCopying?: boolean;
  onSearch: (query: string) => void;
  onSelectMessage?: (message: ChatMessage) => void;
  onViewMedia?: (message: ChatMessage) => void;
  onExportChat: () => void;
  onCopyChat: () => void;
  onSendQuickReply: (reply: string) => void;
  onFocusModeChange: (enabled: boolean) => void;
  onClose?: () => void;
}

type CenterView = "overview" | "search" | "pinned" | "starred" | "media";

const DEFAULT_QUICK_REPLIES = [
  "Sounds good",
  "I’ll be there",
  "Thanks for sending this",
  "Can we talk later?",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function messageLabel(message: ChatMessage) {
  if (message.isDeleted) return "Message removed";
  if (message.text?.trim()) return message.text;
  if (message.mediaType?.startsWith("video")) return "Video";
  if (message.mediaType?.startsWith("audio")) return "Voice message";
  if (message.mediaType) return "Shared image";
  return "Attachment";
}

function messageDate(message: ChatMessage) {
  const date = new Date(message.createdAt);
  return Number.isNaN(date.getTime()) ? "" : format(date, "MMM d, h:mm a");
}

function SearchResultRow({
  message,
  onSelect,
}: {
  message: ChatMessage;
  onSelect?: (message: ChatMessage) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`button-search-result-${message.id}`}
      onClick={() => onSelect?.(message)}
      disabled={!onSelect}
      className="group flex w-full items-start gap-3 border-b border-border/70 px-4 py-3 text-left transition-colors hover:bg-secondary/55 disabled:cursor-default disabled:opacity-100"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm leading-5 text-foreground">{messageLabel(message)}</span>
        <span className="mt-1 block text-[11px] text-muted-foreground">{messageDate(message)}</span>
      </span>
      {onSelect && (
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function MessageRow({
  message,
  icon,
  onSelect,
}: {
  message: ChatMessage;
  icon: "pin" | "star";
  onSelect?: (message: ChatMessage) => void;
}) {
  const Icon = icon === "pin" ? Pin : Star;
  return (
    <button
      type="button"
      data-testid={`button-command-message-${message.id}`}
      onClick={() => onSelect?.(message)}
      disabled={!onSelect}
      className="group flex w-full items-start gap-3 border-b border-border/70 px-4 py-3.5 text-left transition-colors hover:bg-secondary/55 disabled:cursor-default disabled:opacity-100"
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          icon === "pin" ? "bg-primary/10 text-primary" : "bg-amber-500/12 text-amber-600 dark:text-amber-400",
        )}
      >
        <Icon className="h-3.5 w-3.5" fill={icon === "star" ? "currentColor" : "none"} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm leading-5 text-foreground">{messageLabel(message)}</span>
        <span className="mt-1 block text-[11px] text-muted-foreground">{messageDate(message)}</span>
      </span>
      {onSelect && (
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof Pin;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center" data-testid={`empty-${title.toLowerCase().replaceAll(" ", "-")}`}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">{copy}</p>
    </div>
  );
}

export function ChatCommandCenter({
  conversation,
  messages = [],
  pinnedMessages = [],
  starredMessages = [],
  sharedMedia = [],
  quickReplies = DEFAULT_QUICK_REPLIES,
  focusMode = false,
  isExporting = false,
  isCopying = false,
  onSearch,
  onSelectMessage,
  onViewMedia,
  onExportChat,
  onCopyChat,
  onSendQuickReply,
  onFocusModeChange,
  onClose,
}: ChatCommandCenterProps) {
  const [view, setView] = useState<CenterView>("overview");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return messages.filter((message) => messageLabel(message).toLowerCase().includes(normalizedQuery));
  }, [messages, query]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleCopy = () => {
    setCopied(true);
    onCopyChat();
    window.setTimeout(() => setCopied(false), 1800);
  };

  const openView = (nextView: CenterView) => {
    setView(nextView);
    if (nextView !== "search" && query) {
      setQuery("");
      onSearch("");
    }
  };

  const viewTitle: Record<CenterView, string> = {
    overview: "Command center",
    search: "Search conversation",
    pinned: "Pinned messages",
    starred: "Starred messages",
    media: "Shared media",
  };

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-card text-card-foreground md:w-[360px] md:border-l md:border-border/80"
      aria-label={`Conversation tools for ${conversation.name}`}
      data-testid="chat-command-center"
    >
      <div className="shrink-0 border-b border-border/80 bg-card/95 px-4 pb-4 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {conversation.avatarUrl ? (
              <img
                src={conversation.avatarUrl}
                alt=""
                data-testid="img-command-center-avatar"
                className="h-10 w-10 shrink-0 rounded-[14px] object-cover ring-2 ring-primary/10"
              />
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary text-xs font-bold text-primary-foreground ring-2 ring-primary/10"
                data-testid="avatar-command-center-fallback"
                aria-hidden="true"
              >
                {initials(conversation.name)}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-bold tracking-[-0.01em]" data-testid="text-command-center-title">
                  {view === "overview" ? "Command center" : viewTitle[view]}
                </h2>
                {conversation.isOnline && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" title="Online" aria-label="Online" />
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground" data-testid="text-command-center-conversation">
                {conversation.username ? `@${conversation.username}` : conversation.name}
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Close command center"
              data-testid="button-close-command-center"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        {view !== "overview" && (
          <button
            type="button"
            data-testid="button-command-center-back"
            onClick={() => openView("overview")}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
            Back to tools
          </button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {view === "search" ? (
          <div className="pb-5">
            <div className="sticky top-0 z-10 bg-card/95 px-4 py-3 backdrop-blur">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search words or phrases"
                  aria-label="Search this conversation"
                  data-testid="input-search-conversation"
                  className="h-10 rounded-xl border-border/80 bg-secondary/55 pl-9 pr-9 text-sm shadow-none focus-visible:ring-primary/30"
                />
                {query && (
                  <button
                    type="button"
                    data-testid="button-clear-conversation-search"
                    onClick={() => handleSearchChange("")}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            {!query ? (
              <EmptyState icon={Search} title="Find a moment" copy="Search the words, links, and notes shared in this conversation." />
            ) : searchResults.length === 0 ? (
              <EmptyState icon={Search} title="No matches" copy={`Nothing in this conversation matches “${query}”.`} />
            ) : (
              <div data-testid="list-search-results">
                <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {searchResults.length} {searchResults.length === 1 ? "result" : "results"}
                </p>
                {searchResults.map((message) => (
                  <SearchResultRow key={message.id} message={message} onSelect={onSelectMessage} />
                ))}
              </div>
            )}
          </div>
        ) : view === "pinned" ? (
          pinnedMessages.length ? (
            <div className="pb-5" data-testid="list-pinned-messages">
              {pinnedMessages.map((message) => (
                <MessageRow key={message.id} message={message} icon="pin" onSelect={onSelectMessage} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Pin} title="Nothing pinned" copy="Keep an important detail close by from the message menu." />
          )
        ) : view === "starred" ? (
          starredMessages.length ? (
            <div className="pb-5" data-testid="list-starred-messages">
              {starredMessages.map((message) => (
                <MessageRow key={message.id} message={message} icon="star" onSelect={onSelectMessage} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Star} title="Nothing starred" copy="Star a message when you want to return to it later." />
          )
        ) : view === "media" ? (
          sharedMedia.length ? (
            <div className="grid grid-cols-3 gap-1.5 p-4" data-testid="grid-shared-media">
              {sharedMedia.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  data-testid={`button-shared-media-${message.id}`}
                  onClick={() => onViewMedia?.(message)}
                  disabled={!onViewMedia}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-secondary transition-transform hover:scale-[1.02] disabled:cursor-default"
                  aria-label={`Open ${messageLabel(message)}`}
                >
                  {message.mediaUrl ? (
                    <img src={message.mediaUrl} alt={messageLabel(message)} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  )}
                  {message.mediaType?.startsWith("video") && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-foreground/75 px-1.5 py-0.5 text-[9px] font-semibold text-background">
                      Video
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={ImageIcon} title="No shared media" copy="Photos, videos, and files from this chat will show up here." />
          )
        ) : (
          <div className="space-y-5 px-4 pb-6 pt-4">
            <section aria-labelledby="quick-actions-heading">
              <div className="mb-2.5 flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Shortcuts</p>
                  <h3 id="quick-actions-heading" className="mt-1 text-base font-bold tracking-[-0.02em]">
                    Keep the thread tidy
                  </h3>
                </div>
                <Command className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ToolButton icon={Search} label="Search" hint="Find a message" onClick={() => openView("search")} testId="button-open-chat-search" />
                <ToolButton
                  icon={Pin}
                  label="Pinned"
                  count={pinnedMessages.length}
                  hint="Important moments"
                  onClick={() => openView("pinned")}
                  testId="button-open-pinned-messages"
                />
                <ToolButton
                  icon={Star}
                  label="Starred"
                  count={starredMessages.length}
                  hint="Saved for later"
                  onClick={() => openView("starred")}
                  testId="button-open-starred-messages"
                  iconClassName="text-amber-600 dark:text-amber-400"
                />
                <ToolButton
                  icon={ImageIcon}
                  label="Media"
                  count={sharedMedia.length}
                  hint="Photos and files"
                  onClick={() => openView("media")}
                  testId="button-open-shared-media"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-border/80 bg-secondary/35 p-3.5" aria-labelledby="focus-heading">
              <div className="flex items-start gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", focusMode ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                  <Focus className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 id="focus-heading" className="text-sm font-bold">Focus mode</h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={focusMode}
                      data-testid="button-toggle-focus-mode"
                      onClick={() => onFocusModeChange(!focusMode)}
                      className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", focusMode ? "bg-primary" : "bg-muted-foreground/25")}
                    >
                      <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-transform", focusMode ? "translate-x-5" : "translate-x-1")} />
                      <span className="sr-only">{focusMode ? "Turn off focus mode" : "Turn on focus mode"}</span>
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {focusMode ? "Notifications are quiet while you stay in this thread." : "Quiet the rest of WhiterChat while you catch up here."}
                  </p>
                </div>
              </div>
            </section>

            <section aria-labelledby="quick-replies-heading">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reply shelf</p>
                  <h3 id="quick-replies-heading" className="mt-1 text-sm font-bold">Say it faster</h3>
                </div>
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={`${reply}-${index}`}
                    type="button"
                    data-testid={`button-quick-reply-${index}`}
                    onClick={() => onSendQuickReply(reply)}
                    className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="truncate">{reply}</span>
                    <Send className="h-3 w-3 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="chat-actions-heading">
              <div className="mb-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Take it with you</p>
                <h3 id="chat-actions-heading" className="mt-1 text-sm font-bold">Chat utilities</h3>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80">
                <ActionRow
                  icon={isCopying || copied ? Check : Copy}
                  label={copied ? "Copied chat" : "Copy chat"}
                  detail="Plain text transcript"
                  onClick={handleCopy}
                  disabled={isCopying}
                  testId="button-copy-chat"
                />
                <ActionRow
                  icon={ArrowDownToLine}
                  label={isExporting ? "Preparing export" : "Export chat"}
                  detail="Download a conversation file"
                  onClick={onExportChat}
                  disabled={isExporting}
                  testId="button-export-chat"
                  last
                />
              </div>
            </section>

            <div className="flex items-start gap-2 px-1 text-[11px] leading-4 text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <p data-testid="text-command-center-privacy">Only this conversation is included in chat actions.</p>
            </div>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

function ToolButton({
  icon: Icon,
  label,
  hint,
  count,
  onClick,
  testId,
  iconClassName,
}: {
  icon: typeof Search;
  label: string;
  hint: string;
  count?: number;
  onClick: () => void;
  testId: string;
  iconClassName?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="group relative flex min-h-[86px] flex-col items-start justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-3 text-left transition-transform hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm"
    >
      <span className="flex w-full items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
        </span>
        {typeof count === "number" && <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{count}</span>}
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

function ActionRow({
  icon: Icon,
  label,
  detail,
  onClick,
  disabled,
  testId,
  last = false,
}: {
  icon: typeof Copy;
  label: string;
  detail: string;
  onClick: () => void;
  disabled?: boolean;
  testId: string;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-secondary/55 disabled:cursor-wait disabled:opacity-65",
        !last && "border-b border-border/70",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

export default ChatCommandCenter;