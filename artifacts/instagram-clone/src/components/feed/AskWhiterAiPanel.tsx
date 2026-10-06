import React, { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import {
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  X,
  MessageSquare,
  Bot,
  User as UserIcon,
  HelpCircle,
  AlertCircle,
  Square,
  RotateCcw,
  Minus,
  Maximize2,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AskWhiterAiPost } from "@/context/AskWhiterAiContext";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  isError?: boolean;
}

interface AskWhiterAiPanelProps {
  post: AskWhiterAiPost;
  onClose: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  variant?: "inline" | "drawer" | "sheet";
  className?: string;
}

export function AskWhiterAiPanel({
  post,
  onClose,
  onMinimize,
  isMinimized = false,
  variant = "inline",
  className,
}: AskWhiterAiPanelProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [summary, setSummary] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [questionText, setQuestionText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentPostIdRef = useRef<string>(post.id);

  const getToken = () =>
    localStorage.getItem("whiterchat_token") || localStorage.getItem("pixlr_token") || "";

  // Auto-scroll to bottom of conversation
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "nearest" });
  }, []);

  // Fetch or regenerate summary
  const fetchSummary = useCallback(
    async (refresh = false, summarizeComments = false) => {
      if (!post?.id) return;
      setLoadingSummary(true);
      setSummaryError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const token = getToken();
        const res = await fetch(apiUrl(`/api/ai/posts/${post.id}/summary`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ refresh, summarizeComments }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Summary request failed (${res.status})`);
        }

        const data = await res.json();
        const rawSum = (data.summary || "").trim();

        // Sanitize out debug prefixes if any
        const cleanSum = rawSum
          .replace(/Post Author:\s*@[^\n]+\n?/gi, "")
          .replace(/Post Format:\s*[^\n]+\n?/gi, "")
          .replace(/Caption:\s*"?[\s\S]*?"?\n?/gi, "")
          .trim();

        setSummary(cleanSum || `This post was shared by @${post.author.username} on WhiterChat.`);

        if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
          setSuggestedQuestions(data.suggestedQuestions);
        } else {
          const isAr = /[\u0600-\u06FF]/.test(post.caption || "");
          setSuggestedQuestions(
            isAr
              ? [
                  "ما هي الفكرة الرئيسية في هذا المنشور؟",
                  "اشرح المنشور بكلمات بسيطة",
                  "ماذا يحدث في هذا المنشور؟",
                  "تلخيص المنشور في جملة واحدة",
                ]
              : [
                  "What is this post about?",
                  "Explain it simply",
                  "What are the main points?",
                  "Summarize this in one sentence",
                ]
          );
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setSummaryError(err.message || "Could not analyze post");
      } finally {
        setLoadingSummary(false);
      }
    },
    [post.id, post.caption, post.author.username]
  );

  // When post changes, clean up old state & trigger fresh analysis
  useEffect(() => {
    if (currentPostIdRef.current !== post.id) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      currentPostIdRef.current = post.id;
      setMessages([]);
      setQuestionText("");
      setSummary(null);
      setSummaryError(null);
      setIsGenerating(false);
    }

    fetchSummary();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [post.id, fetchSummary]);

  // Handle asking a question (streaming SSE)
  const handleAsk = async (textToAsk?: string) => {
    const q = (textToAsk || questionText).trim();
    if (!q || isGenerating) return;

    setQuestionText("");
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `ai-${Date.now()}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: "user", content: q, timestamp: new Date().toISOString() },
    ];
    setMessages(newMessages);
    setIsGenerating(true);

    setTimeout(() => scrollToBottom(), 50);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build history for multi-turn grounding
    const historyPayload = newMessages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/ai/posts/${post.id}/ask`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: q,
          history: historyPayload,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed (${res.status})`);
      }

      // If SSE stream
      if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        setMessages([
          ...newMessages,
          {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
            isStreaming: true,
          },
        ]);

        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === "chunk" && data.text) {
                    accumulatedText += data.text;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
                      )
                    );
                    scrollToBottom("auto");
                  } else if (data.type === "done") {
                    if (data.answer && !accumulatedText) {
                      accumulatedText = data.answer;
                    }
                  } else if (data.type === "error") {
                    throw new Error(data.error);
                  }
                } catch {
                  // ignore non-json line
                }
              }
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: accumulatedText || "Analysis complete.",
                  isStreaming: false,
                }
              : m
          )
        );
      } else {
        // Standard JSON
        const data = await res.json();
        setMessages([
          ...newMessages,
          {
            id: assistantMsgId,
            role: "assistant",
            content: data.answer || "No response received.",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          )
        );
        return;
      }

      toast({
        title: "Could not answer question",
        description: err.message || "Failed to generate answer",
        variant: "destructive",
      });

      setMessages([
        ...newMessages,
        {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${err.message || "Failed to generate answer. Please try again."}`,
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setIsGenerating(false);
      setTimeout(() => scrollToBottom(), 50);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Minimized Floating Pill on desktop
  if (isMinimized && !isMobile) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onMinimize}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-card/90 backdrop-blur-xl border border-indigo-500/40 shadow-2xl hover:border-indigo-400 text-xs font-semibold text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span>Ask Whiter AI • @{post.author.username}</span>
          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground ml-1" />
        </button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl text-foreground select-text transition-all duration-300",
        // Mobile layout: full-height sheet
        isMobile
          ? "fixed inset-x-0 bottom-0 top-10 z-50 rounded-t-3xl border-t border-border flex flex-col overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          : variant === "inline"
          ? "sticky top-16 lg:top-20 h-[calc(100vh-5.5rem)] w-[420px] lg:w-[440px] xl:w-[460px] shrink-0 rounded-2xl overflow-hidden"
          : "fixed top-16 right-4 z-40 h-[calc(100vh-5rem)] w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden",
        className
      )}
      aria-label="Ask Whiter AI Analysis Panel"
    >
      {/* Mobile Top Drag Handle Indicator */}
      {isMobile && (
        <div className="w-full pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-secondary/20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-400 p-[1.5px] shadow-sm shrink-0">
            <div className="w-full h-full bg-card rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm tracking-tight">
              <span>Ask Whiter AI</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                Assistant
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Analysis for @{post.author.username}'s post
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {!isMobile && onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              title="Minimize panel"
              aria-label="Minimize Ask Whiter AI panel"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
            title="Close panel"
            aria-label="Close Ask Whiter AI panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── SELECTED POST CONTEXT BANNER ───────────────────────────────────── */}
      <div className="px-3.5 py-2.5 bg-secondary/30 border-b border-border/60 shrink-0 flex items-center gap-2.5">
        <Avatar className="w-8 h-8 border border-border/80 shrink-0">
          <AvatarImage src={post.author.avatarUrl || undefined} />
          <AvatarFallback className="text-[11px] font-bold">
            {post.author.username?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold truncate">
            <span>@{post.author.username}</span>
            {post.location && (
              <span className="text-[10px] font-normal text-muted-foreground truncate">
                • {post.location}
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {post.caption?.trim() ? post.caption : "(No written caption)"}
          </div>
        </div>

        {/* Media Thumbnail Indicator */}
        {post.mediaUrl && (
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/40 border border-border/60 shrink-0 relative group">
            {post.mediaType === "video" ? (
              <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
            ) : (
              <img src={post.mediaUrl} alt="Post preview" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {post.mediaType === "video" ? (
                <Film className="w-3.5 h-3.5 text-white" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-white" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN SCROLLABLE CONTENT AREA ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scroll-smooth">
        {/* ── 1. ANALYSIS STATE ("Analyzing Post") ───────────────────────────── */}
        {loadingSummary && !summary && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-secondary/20 to-purple-950/20 border border-indigo-500/20 text-center space-y-2.5">
            <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
            </div>

            <div>
              <div className="font-bold text-xs sm:text-sm text-foreground tracking-tight">
                Analyzing Post
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Synthesizing natural-language summary...
              </div>
            </div>
          </div>
        )}

        {/* ── 2. ERROR STATE ─────────────────────────────────────────────────── */}
        {summaryError && !summary && (
          <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Could not complete post analysis</span>
            </div>
            <p className="text-[11px] leading-relaxed text-destructive/90">{summaryError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchSummary(true)}
              className="h-8 text-xs font-semibold gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/20 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Analysis Again
            </Button>
          </div>
        )}

        {/* ── 3. GROUNDED SUMMARY CARD ───────────────────────────────────────── */}
        {summary && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-secondary/30 border border-indigo-500/25 shadow-sm space-y-2 relative group transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>AI Summary</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => copyToClipboard(summary, "summary")}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                  title="Copy summary"
                  aria-label="Copy AI summary"
                >
                  {copiedId === "summary" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fetchSummary(true)}
                  disabled={loadingSummary}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                  title="Regenerate summary"
                  aria-label="Regenerate AI summary"
                >
                  <RefreshCw
                    className={cn(
                      "w-3.5 h-3.5",
                      loadingSummary && "animate-spin text-indigo-400"
                    )}
                  />
                </button>
              </div>
            </div>

            <p
              className={cn(
                "text-foreground/90 leading-relaxed font-normal text-xs sm:text-[13px]",
                /[\u0600-\u06FF]/.test(summary) && "text-right"
              )}
            >
              {summary}
            </p>
          </div>
        )}

        {/* ── 4. CONTEXT-AWARE SUGGESTED QUESTIONS ───────────────────────────── */}
        {suggestedQuestions.length > 0 && messages.length === 0 && (
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-indigo-400" />
              <span>Suggested questions:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAsk(q)}
                  disabled={isGenerating}
                  className="text-left px-2.5 py-1.5 rounded-xl bg-secondary/50 hover:bg-secondary text-slate-300 hover:text-white border border-border/40 text-xs transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {q}
                </button>
              ))}

              {(post.commentsCount ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => handleAsk("Summarize what people are saying in the comments")}
                  disabled={isGenerating}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  <MessageSquare className="w-3 h-3 text-indigo-400" />
                  <span>Summarize comments</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 5. INTERACTIVE CHAT THREAD ─────────────────────────────────────── */}
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={cn(
                "flex gap-2.5 max-w-[92%]",
                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  isUser
                    ? "bg-primary text-primary-foreground font-bold text-[10px]"
                    : "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white"
                )}
              >
                {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={cn(
                  "p-3 rounded-2xl text-xs leading-relaxed relative group shadow-sm transition-all",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : m.isError
                    ? "bg-destructive/10 border border-destructive/30 text-destructive rounded-tl-sm"
                    : "bg-card border border-border/80 text-foreground rounded-tl-sm",
                  /[\u0600-\u06FF]/.test(m.content) && "text-right"
                )}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.isStreaming && (
                  <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse rounded-full" />
                )}

                {!isUser && !m.isStreaming && !m.isError && (
                  <div className="flex items-center justify-end gap-1 mt-1.5 pt-1 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(m.content, m.id)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── 6. THINKING STATE INDICATOR ────────────────────────────────────── */}
        {isGenerating && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-secondary/40 border border-indigo-500/20 text-xs text-foreground animate-in fade-in duration-200">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-3 h-3 animate-spin" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-bold text-xs text-indigo-400">Whiter AI</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <span>Thinking about your request...</span>
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" />
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={stopGeneration}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive text-[10px] font-semibold transition-colors shrink-0 cursor-pointer"
            >
              <Square className="w-2.5 h-2.5 fill-current" /> Stop
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── BOTTOM STICKY INPUT BAR ────────────────────────────────────────── */}
      <div className="p-3 border-t border-border/80 bg-card/90 shrink-0">
        {/* Quick AI Action Pills */}
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => handleAsk("Explain this post in simple terms")}
            disabled={isGenerating}
            className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary text-[11px] font-medium text-slate-300 hover:text-white border border-border/40 shrink-0 transition-colors cursor-pointer disabled:opacity-40"
          >
            ✨ Explain
          </button>
          <button
            type="button"
            onClick={() => handleAsk("What are the key points of this post?")}
            disabled={isGenerating}
            className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary text-[11px] font-medium text-slate-300 hover:text-white border border-border/40 shrink-0 transition-colors cursor-pointer disabled:opacity-40"
          >
            🔑 Key points
          </button>
          <button
            type="button"
            onClick={() => handleAsk("Translate the main message of this post")}
            disabled={isGenerating}
            className="px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary text-[11px] font-medium text-slate-300 hover:text-white border border-border/40 shrink-0 transition-colors cursor-pointer disabled:opacity-40"
          >
            🌐 Translate
          </button>
          {(post.commentsCount ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => handleAsk("Summarize what people are saying in the comments")}
              disabled={isGenerating}
              className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-[11px] font-medium text-indigo-300 border border-indigo-500/30 shrink-0 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-40"
            >
              <MessageSquare className="w-3 h-3 text-indigo-400" />
              <span>Comments</span>
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Input
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value.slice(0, 500))}
              placeholder="Ask anything about this post..."
              disabled={isGenerating}
              maxLength={500}
              className="h-10 text-xs rounded-xl bg-secondary/40 border-border pr-12 focus-visible:ring-indigo-500"
            />
            {questionText.length > 350 && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums">
                {500 - questionText.length}
              </span>
            )}
          </div>

          {isGenerating ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={stopGeneration}
              className="h-10 px-3 rounded-xl border-border text-destructive hover:bg-destructive/10 cursor-pointer"
              title="Stop generating"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={!questionText.trim() || isGenerating}
              className="h-10 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-1 shadow-sm disabled:opacity-40 cursor-pointer"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-muted-foreground">
          <span>Grounded in @{post.author.username}'s post</span>
          {(post.commentsCount ?? 0) > 0 && messages.length > 0 && (
            <button
              type="button"
              onClick={() => handleAsk("Summarize what people are saying in the comments")}
              disabled={isGenerating}
              className="hover:text-indigo-400 transition-colors flex items-center gap-1 font-medium cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Summarize comments</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
