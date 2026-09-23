import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { apiUrl } from "@/lib/api-url";
import {
  Bot,
  Sparkles,
  Languages,
  Hash,
  UserRound,
  Wand2,
  BarChart2,
  BookOpen,
  Flame,
  MessageSquareReply,
  Send,
  Copy,
  Check,
  Zap,
  RefreshCw,
  Brain,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ArrowUp,
  SquarePen,
  StopCircle,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Code,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Share2,
  Trash2,
  Edit2,
  Search,
  Plus,
  BrainCircuit,
  SlidersHorizontal,
  X,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Film,
  MessageCircle,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────── */
type ModelId = "gemini" | "groq" | "mistral" | "deepseek";

interface ModelInfo {
  id: ModelId;
  label: string;
  available: boolean;
}

interface Attachment {
  name: string;
  type: "image" | "file" | "code" | "pdf";
  dataUrl?: string;
  mimeType?: string;
  size?: number;
}

interface ChatMsg {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  modelId?: ModelId;
  attachments?: Attachment[];
  status?: "sending" | "complete" | "error";
  createdAt?: string;
}

interface Conversation {
  _id: string;
  title: string;
  isPinned: boolean;
  lastMessageAt: string;
}

interface Memory {
  _id: string;
  key: string;
  value: string;
  category: string;
  createdAt: string;
}

/* ─── Model Config & UI Metadata ────────────────────────────── */
const MODEL_META: Record<
  ModelId,
  { short: string; color: string; ring: string; dot: string; glyph: string }
> = {
  gemini: {
    short: "Gemini 3.8",
    color: "from-blue-500 via-indigo-500 to-violet-500",
    ring: "ring-indigo-400/40",
    dot: "bg-indigo-400",
    glyph: "✦",
  },
  groq: {
    short: "Groq 70B",
    color: "from-orange-500 to-amber-400",
    ring: "ring-orange-400/40",
    dot: "bg-orange-400",
    glyph: "G",
  },
  mistral: {
    short: "Mistral",
    color: "from-sky-500 to-cyan-400",
    ring: "ring-sky-400/40",
    dot: "bg-sky-400",
    glyph: "M",
  },
  deepseek: {
    short: "DeepSeek",
    color: "from-violet-500 to-purple-400",
    ring: "ring-violet-400/40",
    dot: "bg-violet-400",
    glyph: "D",
  },
};

const TOOLS = [
  { id: "chat", label: "AI Chat", icon: Bot, hint: "Multi-modal streaming assistant" },
  { id: "caption", label: "Post Caption", icon: Sparkles, hint: "Instagram post captions & tags" },
  { id: "reels", label: "Reels Direct", icon: Film, hint: "Reels titles, descriptions & audio" },
  { id: "notes", label: "Notes AI", icon: MessageCircle, hint: "Catchy status notes & emojis" },
  { id: "hashtags", label: "Hashtags", icon: Hash, hint: "Trending hashtag generator" },
  { id: "bio", label: "Bio Writer", icon: UserRound, hint: "Profile bio generator" },
  { id: "translate", label: "Translate", icon: Languages, hint: "Multi-language translator" },
  { id: "improve", label: "Improve Text", icon: Wand2, hint: "Polish & rewrite content" },
  { id: "sentiment", label: "Sentiment", icon: BarChart2, hint: "Tone & emotion detector" },
  { id: "compare", label: "Compare Models", icon: Zap, hint: "Compare 3 models side-by-side" },
] as const;

type ToolId = (typeof TOOLS)[number]["id"];

/* ─── Micro Helper Components ───────────────────────────────── */
function CopyBtn({ text, className }: { text: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
      title="Copy to clipboard"
      className={cn(
        "p-1.5 rounded-lg hover:bg-white/10 text-current opacity-60 hover:opacity-100 transition-all active:scale-95",
        className
      )}
    >
      {ok ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ModelBadge({ id, label, size = "sm" }: { id: ModelId; label?: string; size?: "xs" | "sm" }) {
  const m = MODEL_META[id] || MODEL_META.gemini;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium border border-white/10",
        size === "xs" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        `bg-gradient-to-r ${m.color} bg-clip-text text-transparent`
      )}
    >
      <span className={cn("rounded-full shrink-0", m.dot, size === "xs" ? "w-1.5 h-1.5" : "w-2 h-2")} />
      {label ?? m.short}
    </span>
  );
}

function ThinkingDots({ statusText = "Thinking..." }: { statusText?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground/80 py-1">
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-500"
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      <span className="font-medium text-[11px] animate-pulse">{statusText}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   1. CHAT PANEL WITH STREAMING & MULTI-MODAL
──────────────────────────────────────────────────────────────── */
function ChatPanel({
  models,
  token,
  memoryEnabled,
  onOpenMemories,
}: {
  models: ModelInfo[];
  token: string;
  memoryEnabled: boolean;
  onOpenMemories: () => void;
}) {
  const [model, setModel] = useState<ModelId>("gemini");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("Thinking...");
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  // Load active conversation messages
  const { data: messagesData, isLoading: msgsLoading } = useQuery({
    queryKey: ["ai-messages", activeConvId],
    queryFn: async () => {
      if (!activeConvId) return { messages: [] };
      const r = await fetch(apiUrl(`/api/ai/conversations/${activeConvId}/messages`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return { messages: [] };
      return r.json() as Promise<{ messages: ChatMsg[] }>;
    },
    enabled: !!activeConvId && !!token,
  });

  useEffect(() => {
    if (messagesData?.messages) {
      setMsgs(
        messagesData.messages.map((m) => ({
          id: (m as any)._id || m.id,
          role: m.role,
          content: m.content,
          model: m.model,
          attachments: m.attachments,
          status: "complete",
        }))
      );
    }
  }, [messagesData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, isGenerating]);

  // Handle File Upload & Base64 Conversion
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        let type: Attachment["type"] = "file";
        if (file.type.startsWith("image/")) type = "image";
        else if (file.name.endsWith(".pdf")) type = "pdf";
        else if (/\.(js|ts|tsx|jsx|py|json|html|css|md)$/i.test(file.name)) type = "code";

        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type,
            dataUrl,
            mimeType: file.type || "text/plain",
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Voice Recording via Web Speech API
  const toggleVoiceRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported on this browser.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInput(transcript);
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Text-to-Speech Readout
  const speakMessage = (msgId: string, text: string) => {
    if (!("speechSynthesis" in window)) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*_#`~]/g, ""));
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Streaming Send Message Function
  const sendMessage = async (overrideText?: string) => {
    const textToSend = overrideText !== undefined ? overrideText : input;
    if ((!textToSend.trim() && attachments.length === 0) || isGenerating) return;

    const userMsg: ChatMsg = {
      role: "user",
      content: textToSend.trim(),
      attachments: [...attachments],
      status: "complete",
    };

    const nextMsgs = [...msgs, userMsg];
    setMsgs(nextMsgs);
    setInput("");
    const currentAtts = [...attachments];
    setAttachments([]);
    setIsGenerating(true);
    setStatusText(currentAtts.length > 0 ? "Analyzing attachments..." : "Thinking...");

    // Create assistant placeholder
    const assistantMsgIndex = nextMsgs.length;
    setMsgs((prev) => [
      ...prev,
      { role: "assistant", content: "", model: "Gemini AI", status: "sending" },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const resp = await fetch(apiUrl("/api/ai/stream-chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: activeConvId,
          message: textToSend.trim(),
          model,
          attachments: currentAtts,
          memoryEnabled,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`Server error (${resp.status})`);
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) throw new Error("Response body is missing");

      let streamedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === "start") {
                if (data.conversationId && data.conversationId !== activeConvId) {
                  setActiveConvId(data.conversationId);
                  queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
                }
              } else if (data.type === "chunk" && data.text) {
                streamedText += data.text;
                setStatusText("Generating response...");
                setMsgs((prev) => {
                  const updated = [...prev];
                  if (updated[assistantMsgIndex]) {
                    updated[assistantMsgIndex] = {
                      ...updated[assistantMsgIndex],
                      content: streamedText,
                      status: "sending",
                    };
                  }
                  return updated;
                });
              } else if (data.type === "done") {
                setMsgs((prev) => {
                  const updated = [...prev];
                  if (updated[assistantMsgIndex]) {
                    updated[assistantMsgIndex] = {
                      ...updated[assistantMsgIndex],
                      id: data.assistantMessageId,
                      content: data.fullText || streamedText,
                      status: "complete",
                    };
                  }
                  return updated;
                });
              }
            } catch (err) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMsgs((prev) => {
          const updated = [...prev];
          if (updated[assistantMsgIndex]) {
            updated[assistantMsgIndex].content += " [Generation Stopped]";
            updated[assistantMsgIndex].status = "complete";
          }
          return updated;
        });
      } else {
        setMsgs((prev) => {
          const updated = [...prev];
          if (updated[assistantMsgIndex]) {
            updated[assistantMsgIndex].content = `Error: ${err.message || "Failed to generate response"}`;
            updated[assistantMsgIndex].status = "error";
          }
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const regenerateResponse = () => {
    if (msgs.length < 2 || isGenerating) return;
    const lastUserMsg = [...msgs].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  };

  const autoResize = () => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 180) + "px";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 min-h-0">
        {msgs.length === 0 && !msgsLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full max-w-xl mx-auto py-12 text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
              <BrainCircuit className="w-8 h-8 text-white animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                How can AI Assistant help you today?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Upload images, code, or PDFs. Ask questions about your posts, brainstorm content, or translate messages.
              </p>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-2 gap-2.5 w-full pt-2">
              {[
                { title: "📸 Analyze Screenshot", prompt: "Analyze this UI screenshot and give improvement suggestions." },
                { title: "✨ Instagram Caption", prompt: "Write an engaging, high-converting caption for my new post." },
                { title: "💻 Debug & Fix Code", prompt: "Explain how to fix memory leaks and improve React rendering." },
                { title: "🌐 Translate Content", prompt: "Translate my bio and recent post into Arabic and French." },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(item.prompt)}
                  className="p-3.5 rounded-2xl border border-border/70 bg-card hover:bg-muted/50 hover:border-violet-500/30 text-left transition-all text-xs space-y-1 group active:scale-[0.98]"
                >
                  <p className="font-semibold text-foreground group-hover:text-violet-500 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-muted-foreground line-clamp-2 text-[11px]">
                    {item.prompt}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message Items */}
        {msgs.map((m, idx) => (
          <motion.div
            key={m.id || idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-3 max-w-3xl", m.role === "user" ? "ml-auto flex-row-reverse" : "")}
          >
            {/* Assistant Avatar */}
            {m.role === "assistant" && (
              <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-violet-500/20">
                ✦
              </div>
            )}

            <div className={cn("space-y-1.5 min-w-0 flex-1", m.role === "user" ? "items-end flex flex-col" : "")}>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {m.role === "user" ? "You" : m.model || "Gemini AI"}
                </span>
                {m.status === "sending" && <ThinkingDots statusText={statusText} />}
              </div>

              {/* Attachments Preview */}
              {m.attachments && m.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1">
                  {m.attachments.map((att, aIdx) => (
                    <div
                      key={aIdx}
                      className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-muted/60 border border-border text-xs max-w-xs overflow-hidden"
                    >
                      {att.type === "image" && att.dataUrl ? (
                        <img src={att.dataUrl} alt={att.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                          {att.type === "code" ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                      )}
                      <span className="truncate font-medium text-[11px] text-foreground">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Content Bubble */}
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm relative group overflow-x-auto",
                  m.role === "user"
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-tr-none"
                    : "bg-card border border-border text-foreground rounded-tl-none"
                )}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-invert max-w-none text-foreground prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl">
                    <ReactMarkdown>{m.content || (m.status === "sending" ? "..." : "")}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}

                {/* Floating Action Controls */}
                {m.role === "assistant" && m.content && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40 opacity-80 group-hover:opacity-100 transition-opacity">
                    <CopyBtn text={m.content} />
                    <button
                      onClick={() => speakMessage(m.id || String(idx), m.content)}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Read aloud"
                    >
                      {speakingMsgId === (m.id || String(idx)) ? (
                        <VolumeX className="w-3.5 h-3.5 text-violet-500" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {idx === msgs.length - 1 && !isGenerating && (
                      <button
                        onClick={regenerateResponse}
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[11px]"
                        title="Regenerate"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Attachments Pending Bar */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center gap-2 overflow-x-auto">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-card border border-border text-xs shrink-0"
            >
              <span className="truncate max-w-[120px] font-medium text-foreground">{att.name}</span>
              <button
                onClick={() => setAttachments((p) => p.filter((_, i) => i !== idx))}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer Input Area */}
      <div className="px-4 py-3 border-t border-border/70 bg-background/95 backdrop-blur">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          accept="image/*,.pdf,.txt,.md,.js,.ts,.tsx,.py,.json"
        />

        <div className="relative flex items-end gap-2 bg-muted/40 border border-border rounded-2xl px-3 py-2 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
          {/* Attach Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Attach images or files"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Voice Input Button */}
          <button
            onClick={toggleVoiceRecording}
            className={cn(
              "p-2 rounded-xl transition-colors shrink-0",
              isRecording
                ? "bg-red-500/20 text-red-500 animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Voice input"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Area */}
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask AI Assistant anything or attach files…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground min-h-[28px] max-h-40 leading-relaxed py-1"
          />

          {/* Send or Stop Button */}
          {isGenerating ? (
            <button
              onClick={stopGeneration}
              className="shrink-0 w-8 h-8 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-all"
              title="Stop generation"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() && attachments.length === 0}
              className={cn(
                "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                input.trim() || attachments.length > 0
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-500/20 hover:shadow-lg active:scale-95"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 px-1 mt-1.5">
          <span>Supported: Images, Code, PDFs, Text</span>
          <button onClick={onOpenMemories} className="hover:underline flex items-center gap-1">
            <BrainCircuit className="w-3 h-3 text-violet-500" />
            Memory: {memoryEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   2. REELS & NOTES SOCIAL ASSISTANTS
──────────────────────────────────────────────────────────────── */
function ReelsAssistantPanel({ token }: { token: string }) {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("15s");
  const [style, setStyle] = useState("Energetic");

  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiUrl("/api/ai/reel-assistant"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic, duration, style }),
      });
      return r.json() as Promise<{ reelData: { title: string; caption: string; hashtags: string[]; audioSuggestion: string; category: string } }>;
    },
  });

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto h-full overflow-y-auto">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">Reels Director AI</h3>
        <p className="text-xs text-muted-foreground">Get instant catchy titles, captions, hashtag sets, and audio ideas for your Reels.</p>
      </div>

      <div className="space-y-3 bg-card p-4 rounded-2xl border border-border">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What is your Reel about? (e.g., Morning coffee routine)"
          className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-violet-500/50"
        />

        <div className="flex gap-2">
          {["15s", "30s", "60s"].map((d) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
                duration === d ? "bg-violet-600 text-white border-violet-600" : "border-border text-muted-foreground"
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          onClick={() => mut.mutate()}
          disabled={!topic.trim() || mut.isPending}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold shadow-md disabled:opacity-50"
        >
          {mut.isPending ? "Generating Reel Package..." : "🎬 Create Reel Package"}
        </button>
      </div>

      {mut.data?.reelData && (
        <div className="bg-card p-4 rounded-2xl border border-border space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-bold text-violet-500">{mut.data.reelData.title}</span>
            <CopyBtn text={`${mut.data.reelData.title}\n\n${mut.data.reelData.caption}\n\n${mut.data.reelData.hashtags.join(" ")}`} />
          </div>
          <p className="text-foreground leading-relaxed">{mut.data.reelData.caption}</p>
          <div className="flex flex-wrap gap-1 text-xs text-violet-400">
            {mut.data.reelData.hashtags.map((h, i) => (
              <span key={i}>{h}</span>
            ))}
          </div>
          {mut.data.reelData.audioSuggestion && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-xl">
              🎵 Audio Idea: {mut.data.reelData.audioSuggestion}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NotesAssistantPanel({ token }: { token: string }) {
  const [topic, setTopic] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiUrl("/api/ai/note-assistant"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic }),
      });
      return r.json() as Promise<{ notes: string[] }>;
    },
  });

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto h-full overflow-y-auto">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-foreground">Status Notes Assistant</h3>
        <p className="text-xs text-muted-foreground">Generate catchy 60-character status notes with matching emojis.</p>
      </div>

      <div className="space-y-3 bg-card p-4 rounded-2xl border border-border">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What's on your mind? (e.g. Late night coding)"
          className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-violet-500/50"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={!topic.trim() || mut.isPending}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-semibold shadow-md disabled:opacity-50"
        >
          {mut.isPending ? "Generating Notes..." : "✨ Generate Note Ideas"}
        </button>
      </div>

      {mut.data?.notes && (
        <div className="space-y-2">
          {mut.data.notes.map((note, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border text-sm">
              <span className="font-medium">{note}</span>
              <CopyBtn text={note} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   3. MEMORY MANAGEMENT MODAL
──────────────────────────────────────────────────────────────── */
function MemoriesModal({
  token,
  isOpen,
  onClose,
}: {
  token: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [key, setKey] = useState("");
  const [val, setVal] = useState("");
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["ai-memories"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/ai/memories"), { headers: { Authorization: `Bearer ${token}` } });
      return r.json() as Promise<{ memories: Memory[] }>;
    },
    enabled: isOpen && !!token,
  });

  const addMut = useMutation({
    mutationFn: async () => {
      await fetch(apiUrl("/api/ai/memories"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, value: val }),
      });
    },
    onSuccess: () => {
      setKey("");
      setVal("");
      queryClient.invalidateQueries({ queryKey: ["ai-memories"] });
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      await fetch(apiUrl(`/api/ai/memories/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-memories"] }),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-violet-500" />
            <h3 className="font-bold text-sm text-foreground">AI Memory Center</h3>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-muted-foreground">
            Save facts or preferences so AI remembers your context across conversations.
          </p>

          <div className="flex gap-2">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Key (e.g. Preferred Language)"
              className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs outline-none"
            />
            <input
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Value (e.g. Arabic & English)"
              className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs outline-none"
            />
            <button
              onClick={() => addMut.mutate()}
              disabled={!key.trim() || !val.trim()}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-semibold shrink-0 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div className="space-y-2 pt-2">
            {data?.memories?.map((m) => (
              <div key={m._id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="font-bold text-violet-400">{m.key}: </span>
                  <span className="text-foreground">{m.value}</span>
                </div>
                <button onClick={() => delMut.mutate(m._id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   MAIN AI PAGE
──────────────────────────────────────────────────────────────── */
export default function AIPage() {
  const { token } = useAuth();
  const [tool, setTool] = useState<ToolId>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();

  const { data: conversationsData } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/ai/conversations"), { headers: { Authorization: `Bearer ${token}` } });
      return r.json() as Promise<{ conversations: Conversation[] }>;
    },
    enabled: !!token,
  });

  const createConvMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiUrl("/api/ai/conversations"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "New Conversation" }),
      });
      return r.json() as Promise<{ conversation: Conversation }>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-conversations"] }),
  });

  const toolInfo = TOOLS.find((t) => t.id === tool)!;
  const ToolIcon = toolInfo.icon;

  const mockModels: ModelInfo[] = [
    { id: "gemini", label: "Google Gemini 3.8", available: true },
    { id: "groq", label: "Groq LLaMA 3.3", available: true },
    { id: "mistral", label: "Mistral Large", available: true },
    { id: "deepseek", label: "DeepSeek Chat", available: true },
  ];

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Memories Modal */}
      <MemoriesModal token={token!} isOpen={memoriesOpen} onClose={() => setMemoriesOpen(false)} />

      {/* Desktop Left Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden md:flex flex-col h-full bg-muted/20 border-r border-border shrink-0 overflow-hidden"
          >
            {/* Header / Brand */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-sm tracking-tight block">AI Assistant</span>
                  <span className="text-[10px] text-muted-foreground">Multimodal Suite</span>
                </div>
              </div>
              <button
                onClick={() => createConvMut.mutate()}
                className="p-1.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Tool Nav Items */}
            <div className="p-2 border-b border-border space-y-0.5">
              {TOOLS.map((t) => {
                const Icon = t.icon;
                const active = tool === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left",
                      active
                        ? "bg-gradient-to-r from-violet-600/20 to-fuchsia-600/10 text-violet-400 border border-violet-500/30"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Conversation History List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-2 py-1">
                Recent Chats
              </p>
              {conversationsData?.conversations?.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => setTool("chat")}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground truncate block transition-colors"
                >
                  {conv.title}
                </button>
              ))}
            </div>

            {/* Memory Toggle Bar */}
            <div className="p-3 border-t border-border flex items-center justify-between text-xs">
              <button
                onClick={() => setMemoriesOpen(true)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <BrainCircuit className="w-4 h-4 text-violet-500" />
                <span>Memory</span>
              </button>
              <button
                onClick={() => setMemoryEnabled((p) => !p)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
                  memoryEnabled ? "bg-violet-600 text-white border-violet-600" : "bg-muted border-border text-muted-foreground"
                )}
              >
                {memoryEnabled ? "ON" : "OFF"}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((p) => !p)}
              className="hidden md:flex p-1.5 rounded-xl hover:bg-muted text-muted-foreground"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <ToolIcon className="w-4 h-4 text-violet-500" />
              <span className="font-bold text-sm">{toolInfo.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ModelBadge id="gemini" />
          </div>
        </div>

        {/* Mobile Nav Strip */}
        <div className="md:hidden flex overflow-x-auto gap-1 p-2 border-b border-border bg-muted/20 scrollbar-none">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all",
                  active ? "bg-violet-600 text-white" : "bg-card text-muted-foreground border border-border"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Workspace Active View */}
        <div className="flex-1 overflow-hidden min-h-0">
          {tool === "chat" && (
            <ChatPanel
              models={mockModels}
              token={token!}
              memoryEnabled={memoryEnabled}
              onOpenMemories={() => setMemoriesOpen(true)}
            />
          )}
          {tool === "reels" && <ReelsAssistantPanel token={token!} />}
          {tool === "notes" && <NotesAssistantPanel token={token!} />}
          {tool !== "chat" && tool !== "reels" && tool !== "notes" && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              <ChatPanel
                models={mockModels}
                token={token!}
                memoryEnabled={memoryEnabled}
                onOpenMemories={() => setMemoriesOpen(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
