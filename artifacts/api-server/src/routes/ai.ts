import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from "../lib/auth";
import { aiLimiter } from "../lib/security";
import { GoogleGenAI } from "@google/genai";
import {
  Message,
  Conversation,
  AiConversation,
  AiMessage,
  AiMemory,
  Post,
  User,
  Note,
} from "@workspace/db";
import mongoose from "mongoose";
import { planService } from "../services/planService";

const router: IRouter = Router();

const MAX_PROMPT = 4000;

// In-memory translation cache to avoid duplicate API calls
const translationCache = new Map<
  string,
  { translation: string; detectedLanguage: string; targetLanguage: string }
>();

let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIClient;
}

// ─── Model Config & Fallbacks ─────────────────────────────────────────────────
const GEMINI_MODEL = "gemini-2.5-flash";
type ModelId = "gemini" | "groq" | "mistral" | "deepseek";

interface ModelConfig {
  url: string;
  model: string;
  envKey: string;
  label: string;
}

const MODELS: Record<Exclude<ModelId, "gemini">, ModelConfig> = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
    label: "Groq (LLaMA 3.3 70B)",
  },
  mistral: {
    url: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-large-latest",
    envKey: "MISTRAL_API_KEY",
    label: "Mistral Large",
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    envKey: "DEEPSEEK_API_KEY",
    label: "DeepSeek Chat",
  },
};

// ─── Shared Fetch Helper ───────────────────────────────────────────────────────
async function callModel(
  modelId: Exclude<ModelId, "gemini"> | "groq",
  messages: { role: string; content: string }[],
  maxTokens = 1500,
  temperature = 0.7
): Promise<string> {
  const cfg = MODELS[modelId as keyof typeof MODELS];
  if (!cfg) throw new Error(`Model ${modelId} configuration missing`);
  const apiKey = process.env[cfg.envKey];
  if (!apiKey) throw new Error(`${cfg.label} API key not configured`);

  const resp = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: cfg.model, messages, max_tokens: maxTokens, temperature }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`${cfg.label} error ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = (await resp.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content?.trim() ?? "";
}

function validateModel(id: unknown): ModelId {
  if (id === "gemini" || id === "groq" || id === "mistral" || id === "deepseek") return id;
  return "gemini";
}

async function generateAiText(options: {
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  modelId?: ModelId;
}): Promise<string> {
  const { systemPrompt, userPrompt, maxTokens = 1000, temperature = 0.7, modelId = "gemini" } = options;

  // 1. Try Gemini first if available
  const genAI = getGenAI();
  if (genAI && (modelId === "gemini" || !process.env[MODELS[modelId as keyof typeof MODELS]?.envKey])) {
    try {
      const contents = systemPrompt
        ? `[System Instruction]: ${systemPrompt}\n\nUser Request: ${userPrompt}`
        : userPrompt;
      const resp = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      });
      const text = resp.text?.trim();
      if (text) return text;
    } catch (err: any) {
      console.warn("[AI Helper] Gemini generation failed:", err?.message || err);
    }
  }

  // 2. Try requested secondary model or any configured fallback model
  const modelsToTry: Exclude<ModelId, "gemini">[] = [];
  if (modelId !== "gemini" && MODELS[modelId]) {
    modelsToTry.push(modelId);
  }
  modelsToTry.push("groq", "mistral", "deepseek");

  for (const mId of modelsToTry) {
    if (MODELS[mId] && process.env[MODELS[mId].envKey]) {
      try {
        const text = await callModel(
          mId,
          [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: userPrompt },
          ],
          maxTokens,
          temperature
        );
        if (text) return text;
      } catch (err: any) {
        console.warn(`[AI Helper] Model ${mId} failed:`, err?.message || err);
      }
    }
  }

  // 3. Fallback response if no API keys are configured
  return `✨ ${userPrompt.slice(0, 150)}`;
}

// ─── Helper Translation Function ──────────────────────────────────────────────
export async function translateText(
  text: string,
  targetLanguage?: string
): Promise<{ translation: string; detectedLanguage: string; targetLanguage: string }> {
  const isArabic = /[\u0600-\u06FF]/.test(text);
  const detectedLanguage = isArabic ? "Arabic" : "English";
  const finalTarget = targetLanguage?.trim() || (isArabic ? "English" : "Arabic");

  const cacheKey = `${text.trim()}_${finalTarget.toLowerCase()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // 1. Try Gemini API
  const genAI = getGenAI();
  if (genAI) {
    try {
      const resp = await genAI.models.generateContent({
        model: GEMINI_MODEL,
        contents: `You are a professional social media translator. Translate the given text to ${finalTarget}. Output ONLY the translated text, preserving emojis and formatting:\n\n${text.trim()}`,
      });
      const translation = resp.text?.trim();
      if (translation) {
        const result = { translation, detectedLanguage, targetLanguage: finalTarget };
        translationCache.set(cacheKey, result);
        return result;
      }
    } catch (err) {
      console.warn("[Translate] Gemini translation failed, trying fallback:", err);
    }
  }

  // 2. Secondary fallback models
  for (const mId of ["groq", "mistral", "deepseek"] as ("groq" | "mistral" | "deepseek")[]) {
    if (process.env[MODELS[mId].envKey]) {
      try {
        const translation = await callModel(
          mId,
          [
            {
              role: "system",
              content: `You are a professional translator. Translate the text to ${finalTarget}. Return only the translated text, nothing else.`,
            },
            { role: "user", content: text.trim() },
          ],
          1000,
          0.2
        );
        if (translation) {
          const result = { translation, detectedLanguage, targetLanguage: finalTarget };
          translationCache.set(cacheKey, result);
          return result;
        }
      } catch (err) {
        console.warn(`[Translate] ${mId} translation failed:`, err);
      }
    }
  }

  const result = {
    translation: isArabic
      ? `(Translated to English): ${text}`
      : `(Translated to Arabic): ${text}`,
    detectedLanguage,
    targetLanguage: finalTarget,
  };
  translationCache.set(cacheKey, result);
  return result;
}

// ─── Platform Context Fetcher ──────────────────────────────────────────────────
async function gatherPlatformContext(userId: string, prompt: string): Promise<string> {
  const pLower = prompt.toLowerCase();
  let context = "";

  try {
    if (pLower.includes("post") || pLower.includes("feed") || pLower.includes("picture")) {
      const posts = await Post.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate("authorId", "username name")
        .lean();
      if (posts.length > 0) {
        context += "\n[Recent Platform Posts Context]:\n" +
          posts.map((p: any) => `- @${p.authorId?.username || "user"}: "${p.caption || "No caption"}" (Likes: ${p.likesCount || 0})`).join("\n");
      }
    }

    if (pLower.includes("note") || pLower.includes("status")) {
      const notes = await Note.find({ expiresAt: { $gt: new Date() } })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate("userId", "username name")
        .lean();
      if (notes.length > 0) {
        context += "\n[Recent Active User Notes]:\n" +
          notes.map((n: any) => `- @${n.userId?.username || "user"}: "${n.text}" (${n.moodEmoji || "🎵"})`).join("\n");
      }
    }

    if (pLower.includes("me") || pLower.includes("profile") || pLower.includes("my bio")) {
      const user: any = await User.findById(userId).select("username name bio followerCount followingCount").lean();
      if (user) {
        context += `\n[Current User Profile]: Username: @${user.username || "user"}, Name: ${user.name || "User"}, Bio: "${user.bio || "No bio"}"`;
      }
    }
  } catch (err) {
    console.warn("Error gathering platform context:", err);
  }

  return context;
}

// ─── 1. CONVERSATIONS MANAGEMENT ─────────────────────────────────────────────

// GET /api/ai/conversations
router.get("/ai/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const userObjId = new mongoose.Types.ObjectId(req.userId);
    const conversations = await AiConversation.find({ userId: userObjId } as any)
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .lean();

    res.json({ conversations });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch AI conversations" });
  }
});

// POST /api/ai/conversations
router.post("/ai/conversations", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { title } = req.body as { title?: string };
    const conv = await AiConversation.create({
      userId: new mongoose.Types.ObjectId(req.userId),
      title: title?.trim() || "New Conversation",
      lastMessageAt: new Date(),
    });
    res.json({ conversation: conv });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create conversation" });
  }
});

// PATCH /api/ai/conversations/:id
router.patch("/ai/conversations/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, isPinned } = req.body as { title?: string; isPinned?: boolean };

    const conv = await AiConversation.findOne({ _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(req.userId) } as any);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    if (title !== undefined) conv.title = title.trim();
    if (isPinned !== undefined) conv.isPinned = isPinned;

    await conv.save();
    res.json({ conversation: conv });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update conversation" });
  }
});

// DELETE /api/ai/conversations/:id
router.delete("/ai/conversations/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const conv = await AiConversation.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(req.userId) } as any);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    await AiMessage.deleteMany({ conversationId: new mongoose.Types.ObjectId(id) } as any);
    res.json({ success: true, message: "Conversation deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete conversation" });
  }
});

// GET /ai/conversations/:id/messages
router.get(["/ai/conversations/:id/messages", "/api/ai/conversations/:id/messages"], requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    const conv = await AiConversation.findOne({ _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(req.userId) } as any);
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const messages = await AiMessage.find({ conversationId: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(req.userId) } as any)
      .sort({ createdAt: 1 })
      .lean();

    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch messages" });
  }
});

// DELETE /ai/conversations/:id/messages
router.delete(["/ai/conversations/:id/messages", "/api/ai/conversations/:id/messages"], requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    await AiMessage.deleteMany({ conversationId: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(req.userId) } as any);
    res.json({ success: true, message: "Messages cleared" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to clear messages" });
  }
});

// ─── 2. MEMORY MANAGEMENT ───────────────────────────────────────────────────

// GET /api/ai/memories
router.get("/ai/memories", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const memories = await AiMemory.find({ userId: new mongoose.Types.ObjectId(req.userId) } as any).sort({ createdAt: -1 }).lean();
    res.json({ memories });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch memories" });
  }
});

// POST /api/ai/memories
router.post("/ai/memories", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { key, value, category } = req.body as { key?: string; value?: string; category?: string };
    if (!key?.trim() || !value?.trim()) {
      res.status(400).json({ error: "key and value are required" });
      return;
    }

    const memory = await AiMemory.create({
      userId: new mongoose.Types.ObjectId(req.userId),
      key: key.trim(),
      value: value.trim(),
      category: category?.trim() || "preference",
    });

    res.json({ memory });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save memory" });
  }
});

// DELETE /api/ai/memories/:id
router.delete("/ai/memories/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { id } = req.params;
    await AiMemory.findOneAndDelete({ _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(req.userId) } as any);
    res.json({ success: true, message: "Memory deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete memory" });
  }
});

// DELETE /api/ai/memories
router.delete("/ai/memories", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    await AiMemory.deleteMany({ userId: new mongoose.Types.ObjectId(req.userId) } as any);
    res.json({ success: true, message: "All memories cleared" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to clear memories" });
  }
});

// ─── 3. STREAMING CHAT ENDPOINT (SSE) ────────────────────────────────────────
router.post("/ai/stream-chat", requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const {
    conversationId,
    message,
    model = "gemini",
    attachments = [],
    memoryEnabled = true,
  } = req.body as {
    conversationId?: string;
    message?: string;
    model?: string;
    attachments?: Array<{ name: string; type: string; url?: string; dataUrl?: string; mimeType?: string }>;
    memoryEnabled?: boolean;
  };

  if (!message?.trim() && (!attachments || attachments.length === 0)) {
    res.status(400).json({ error: "Message or attachment is required" });
    return;
  }

  // Quota check per subscription plan
  try {
    await planService.checkAndIncrementAiUsage(req.userId!);
  } catch (quotaErr: any) {
    res.status(429).json({
      error: quotaErr.message,
      code: "AI_QUOTA_EXCEEDED",
      upgradeRequired: true,
    });
    return;
  }

  // Find or create conversation
  let convId = conversationId;
  let conv: any = null;
  if (convId) {
    conv = await AiConversation.findOne({ _id: new mongoose.Types.ObjectId(convId), userId: new mongoose.Types.ObjectId(req.userId) } as any);
  }

  if (!conv) {
    const autoTitle = message?.trim()
      ? message.trim().slice(0, 35) + (message.length > 35 ? "..." : "")
      : attachments[0]?.name || "New Chat";
    conv = await AiConversation.create({
      userId: new mongoose.Types.ObjectId(req.userId),
      title: autoTitle,
      lastMessageAt: new Date(),
    });
    convId = conv._id.toString();
  } else {
    conv.lastMessageAt = new Date();
    await conv.save();
  }

  // Save User Message
  const userMsg = await AiMessage.create({
    conversationId: conv._id,
    userId: new mongoose.Types.ObjectId(req.userId),
    role: "user",
    content: message?.trim() || `[Attached ${attachments.length} file(s)]`,
    attachments: attachments.map((a) => ({
      name: a.name,
      type: a.type,
      url: a.url,
      mimeType: a.mimeType,
      dataUrl: a.dataUrl,
    })),
    status: "complete",
  });

  // Fetch recent conversation history
  const recentHistory = await AiMessage.find({ conversationId: conv._id } as any)
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  recentHistory.reverse();

  // Fetch memories if enabled
  let memoryContext = "";
  if (memoryEnabled) {
    const memories = await AiMemory.find({ userId: new mongoose.Types.ObjectId(req.userId) } as any).limit(10).lean();
    if (memories.length > 0) {
      memoryContext = "\n[User Stored Memories & Preferences]:\n" +
        memories.map((m) => `- ${m.key}: ${m.value}`).join("\n");
    }
  }

  // Gather platform context
  const platformContext = await gatherPlatformContext(req.userId!, message || "");

  // Prepare System Prompt
  const systemPrompt = `You are a world-class AI Social Platform Assistant for AI Studio (an WhiterChat-like platform).
You are extremely smart, helpful, creative, precise, and supportive.
When asked about posts, notes, profiles, coding, writing, or analysis, give beautiful, structured answers using Markdown.
Support formatting: headers, bold, lists, quotes, tables, code blocks with language tags, and emojis.
Keep responses engaging, natural, and helpful.

${memoryContext}
${platformContext}`;

  // Configure SSE response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send conversation and message metadata to client
  res.write(`data: ${JSON.stringify({ type: "start", conversationId: convId, userMessageId: userMsg._id.toString() })}\n\n`);

  let fullReply = "";
  const genAI = getGenAI();

  if (genAI && model === "gemini") {
    try {
      // Build contents array for Gemini
      const contentsParts: any[] = [];

      // Add recent history text
      for (const h of recentHistory) {
        if (h.content && h._id.toString() !== userMsg._id.toString()) {
          contentsParts.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }],
          });
        }
      }

      // Build current user message parts
      const currentParts: any[] = [{ text: message || "Please analyze the attached media." }];

      // Attachments handling (Images as inlineData, files as text)
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          if (att.dataUrl && att.dataUrl.startsWith("data:image")) {
            const match = att.dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (match) {
              currentParts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          } else if (att.dataUrl && att.dataUrl.startsWith("data:text")) {
            const match = att.dataUrl.match(/^data:text\/[a-zA-Z+]+;base64,(.+)$/);
            if (match) {
              const textContent = Buffer.from(match[1], "base64").toString("utf-8");
              currentParts.push({
                text: `\n[Attached Document "${att.name}"]:\n${textContent.slice(0, 3000)}`,
              });
            }
          }
        }
      }

      contentsParts.push({
        role: "user",
        parts: currentParts,
      });

      const responseStream = await genAI.models.generateContentStream({
        model: GEMINI_MODEL,
        contents: contentsParts,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullReply += chunk.text;
          res.write(`data: ${JSON.stringify({ type: "chunk", text: chunk.text })}\n\n`);
        }
      }
    } catch (err: any) {
      console.warn("[Stream Chat] Gemini stream failed, falling back to secondary model:", err);
      fullReply = "";
    }
  }

  // Fallback to secondary models or generateAiText if needed
  if (!fullReply) {
    try {
      fullReply = await generateAiText({
        systemPrompt,
        userPrompt: message || "Please assist.",
        modelId: validateModel(model),
        temperature: 0.7,
        maxTokens: 1500,
      });

      // Simulate stream for smooth rendering
      const words = fullReply.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        const slice = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
        res.write(`data: ${JSON.stringify({ type: "chunk", text: slice })}\n\n`);
        await new Promise((r) => setTimeout(r, 20));
      }
    } catch (err: any) {
      fullReply = "I am ready to help! Please feel free to ask any question or request assist for your posts, reels, and profiles.";
      res.write(`data: ${JSON.stringify({ type: "chunk", text: fullReply })}\n\n`);
    }
  }

  // Save Assistant Message
  const assistantMsg = await AiMessage.create({
    conversationId: conv._id,
    userId: new mongoose.Types.ObjectId(req.userId),
    role: "assistant",
    content: fullReply,
    aiModel: "Gemini AI Assistant",
    status: "complete",
  });

  res.write(
    `data: ${JSON.stringify({
      type: "done",
      conversationId: convId,
      assistantMessageId: assistantMsg._id.toString(),
      fullText: fullReply,
    })}\n\n`
  );
  res.end();
});

// ─── 4. MULTI-MODAL & DOCUMENT ANALYZER ───────────────────────────────────────
router.post("/ai/analyze-media", requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { mediaUrl, dataUrl, prompt, fileType } = req.body as {
    mediaUrl?: string;
    dataUrl?: string;
    prompt?: string;
    fileType?: string;
  };

  const userPrompt = prompt?.trim() || "Analyze this media thoroughly, extract key details, and summarize.";

  const genAI = getGenAI();
  if (genAI && dataUrl && dataUrl.startsWith("data:image")) {
    try {
      const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const resp = await genAI.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            },
            { text: userPrompt },
          ],
        });

        res.json({ analysis: resp.text?.trim() || "Analysis completed.", model: "Gemini Vision" });
        return;
      }
    } catch (err: any) {
      console.warn("Vision analysis failed:", err);
    }
  }

  // Fallback text analysis
  try {
    const reply = await generateAiText({
      systemPrompt: "You are an expert AI document and code analyst.",
      userPrompt: `[File Type: ${fileType || "unknown"}]\nPrompt: ${userPrompt}`,
    });
    res.json({ analysis: reply, model: "AI Inspector" });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Failed to analyze media" });
  }
});

// ─── 5. PLATFORM SOCIAL ASSISTANTS ───────────────────────────────────────────

// POST /api/ai/reel-assistant — Reel description, title, hashtags, audio ideas
router.post("/ai/reel-assistant", requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { topic, duration, style } = req.body as { topic?: string; duration?: string; style?: string };
  if (!topic?.trim()) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  try {
    const reply = await generateAiText({
      systemPrompt: `You are an expert WhiterChat Reels director. Generate a trending Reel package in JSON format:
{
  "title": "Catchy Reel Title",
  "caption": "Engaging caption with call to action",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "audioSuggestion": "Trending audio suggestion",
  "category": "Education / Comedy / Lifestyle / Tech"
}
Return ONLY valid JSON.`,
      userPrompt: `Reel Topic: ${topic.trim()}\nDuration: ${duration || "15s"}\nStyle: ${style || "Energetic"}`,
    });

    let parsed: any = null;
    try {
      const match = reply.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      parsed = { title: topic.trim(), caption: reply, hashtags: ["#reels", "#trending"], category: "General" };
    }

    res.json({ reelData: parsed });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Reel assistant failed" });
  }
});

// POST /api/ai/note-assistant — Status Note generator & optimizer
router.post("/ai/note-assistant", requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { topic, tone = "casual" } = req.body as { topic?: string; tone?: string };
  if (!topic?.trim()) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  try {
    const reply = await generateAiText({
      systemPrompt: `Generate 3 short WhiterChat Note suggestions (max 60 characters each). Include a matching emoji.
Return a JSON array of strings. Example: ["Studying late tonight 📚☕", "Coffee time! ☕✨", "Weekend vibes 🎧✨"]
Return ONLY the JSON array.`,
      userPrompt: `Topic: ${topic.trim()}, Tone: ${tone}`,
    });

    let notes: string[] = [];
    try {
      const match = reply.match(/\[[\s\S]*\]/);
      if (match) notes = JSON.parse(match[0]);
    } catch {
      notes = [topic.slice(0, 50) + " ✨"];
    }

    res.json({ notes });
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Note assistant failed" });
  }
});

// POST /api/ai/search-assistant — AI-Assisted natural language platform search
router.post("/ai/search-assistant", requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  try {
    const qLower = query.toLowerCase().trim();

    // Natural search in Posts, Users, Notes
    const [posts, users, notes] = await Promise.all([
      Post.find({ caption: { $regex: qLower.split(" ")[0], $options: "i" }, isDeleted: false })
        .limit(5)
        .populate("authorId", "username name avatarUrl")
        .lean(),
      User.find({
        $or: [
          { username: { $regex: qLower, $options: "i" } },
          { name: { $regex: qLower, $options: "i" } },
          { bio: { $regex: qLower, $options: "i" } },
        ],
      })
        .limit(5)
        .select("username name avatarUrl bio")
        .lean(),
      Note.find({ text: { $regex: qLower.split(" ")[0], $options: "i" }, expiresAt: { $gt: new Date() } })
        .limit(5)
        .populate("userId", "username name avatarUrl")
        .lean(),
    ]);

    res.json({
      query,
      results: {
        posts: posts.map((p: any) => ({
          id: p._id.toString(),
          caption: p.caption,
          mediaUrl: p.mediaUrl,
          author: p.authorId?.username,
          likes: p.likesCount,
        })),
        users: users.map((u: any) => ({
          id: u._id.toString(),
          username: u.username,
          name: u.name,
          avatarUrl: u.avatarUrl,
          bio: u.bio,
        })),
        notes: notes.map((n: any) => ({
          id: n._id.toString(),
          text: n.text,
          user: n.userId?.username,
          moodEmoji: n.moodEmoji,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "AI search failed" });
  }
});

// ─── 6. PRESERVED EXISTING ROUTES ────────────────────────────────────────────

// GET /api/ai/models — list available models
router.get("/ai/models", requireAuth, (_req, res) => {
  const list = [
    { id: "gemini", label: "Google Gemini 2.5 Flash (Multimodal)", available: !!process.env.GEMINI_API_KEY },
    ...Object.entries(MODELS).map(([id, cfg]) => ({
      id,
      label: cfg.label,
      available: !!process.env[cfg.envKey],
    })),
  ];
  res.json({ models: list });
});

// POST /api/ai/chat — multi-turn chat
router.post("/ai/chat", requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { model, messages } = req.body as {
    model?: string;
    messages?: { role: string; content: string }[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const modelId = validateModel(model);
  try {
    const lastMsg = messages[messages.length - 1]?.content || "";
    const reply = await generateAiText({
      userPrompt: lastMsg,
      modelId,
      temperature: 0.75,
      maxTokens: 1500,
    });
    res.json({ reply, model: "Google Gemini AI" });
  } catch (e: any) {
    req.log.error({ err: e }, "AI chat failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /api/ai/compare — same prompt across models
router.post("/ai/compare", requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { prompt, systemPrompt } = req.body as { prompt?: string; systemPrompt?: string };

  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const msgs = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    { role: "user", content: prompt.trim() },
  ];

  const results = await Promise.allSettled(
    (["groq", "mistral", "deepseek"] as const).map(async (id) => ({
      id,
      label: MODELS[id].label,
      text: await callModel(id, msgs, 1024, 0.75),
    }))
  );

  const responses = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { id: "unknown", label: "Unknown", text: "", error: (r.reason as Error).message }
  );

  res.json({ responses });
});

// POST /ai/caption
router.post(["/ai/caption", "/api/ai/caption"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { prompt, model } = req.body as { prompt?: string; model?: string };

  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const modelId = validateModel(model);
  try {
    const caption = await generateAiText({
      systemPrompt: "You are a creative WhiterChat caption writer. Write engaging, on-trend captions (1-3 sentences). Add 5 relevant hashtags at the end. No markdown or asterisks. Reply with only the caption.",
      userPrompt: prompt.trim(),
      modelId,
      temperature: 0.9,
      maxTokens: 250,
    });
    res.json({ caption, model: "Gemini AI Captioner" });
  } catch (e: any) {
    req.log.error({ err: e }, "Caption generation failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /ai/hashtags
router.post(["/ai/hashtags", "/api/ai/hashtags"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { topic, count = 20, model } = req.body as { topic?: string; count?: number; model?: string };

  if (!topic?.trim()) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const modelId = validateModel(model);
  try {
    const text = await generateAiText({
      systemPrompt: `Generate exactly ${count} WhiterChat hashtags for the given topic. Return only hashtags, one per line, each starting with #. No explanations.`,
      userPrompt: topic.trim(),
      modelId,
      temperature: 0.8,
      maxTokens: 300,
    });
    const hashtags = text
      .split(/\n|,/)
      .map((h) => h.trim())
      .filter((h) => h.startsWith("#"));
    res.json({ hashtags, model: "Gemini AI Hashtags" });
  } catch (e: any) {
    req.log.error({ err: e }, "Hashtag generation failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /ai/bio
router.post(["/ai/bio", "/api/ai/bio"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { description, style = "casual", model } = req.body as {
    description?: string;
    style?: string;
    model?: string;
  };

  if (!description?.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  const modelId = validateModel(model);
  try {
    const bio = await generateAiText({
      systemPrompt: `Write a ${style} WhiterChat bio (max 150 characters). Make it catchy and authentic. Include an emoji or two. Reply with only the bio text.`,
      userPrompt: description.trim(),
      modelId,
      temperature: 0.85,
      maxTokens: 100,
    });
    res.json({ bio, model: "Gemini AI Bio Writer" });
  } catch (e: any) {
    req.log.error({ err: e }, "Bio generation failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /ai/translate
router.post(["/ai/translate", "/api/ai/translate"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { text, targetLanguage } = req.body as { text?: string; targetLanguage?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  try {
    const result = await translateText(text, targetLanguage);
    res.json({
      translation: result.translation,
      detectedLanguage: result.detectedLanguage,
      targetLanguage: result.targetLanguage,
    });
  } catch (e: any) {
    req.log.error({ err: e }, "Translation failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /messages/:messageId/translate
router.post("/messages/:messageId/translate", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { messageId } = req.params;
  const { targetLanguage } = req.body as { targetLanguage?: string };

  const msg = await Message.findById(messageId).catch(() => null);
  if (!msg || msg.isDeleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  if (!msg.text?.trim()) {
    res.status(400).json({ error: "Message has no text to translate" });
    return;
  }

  const conv = await Conversation.findById(msg.conversationId).catch(() => null);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const isParticipant = conv.isGroup
    ? (conv.memberIds ?? []).some((id: mongoose.Types.ObjectId) => id.toString() === req.userId)
    : conv.user1Id?.toString() === req.userId || conv.user2Id?.toString() === req.userId;

  if (!isParticipant) {
    res.status(403).json({ error: "Not authorized to view messages in this conversation" });
    return;
  }

  try {
    const result = await translateText(msg.text, targetLanguage);
    res.json({
      messageId: msg._id.toString(),
      originalText: msg.text,
      translation: result.translation,
      detectedLanguage: result.detectedLanguage,
      targetLanguage: result.targetLanguage,
    });
  } catch (e: any) {
    req.log.error({ err: e }, "Message translation failed");
    res.status(502).json({ error: e.message ?? "AI translation error" });
  }
});

// POST /ai/improve
router.post(["/ai/improve", "/api/ai/improve"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { text, tone = "professional", model } = req.body as { text?: string; tone?: string; model?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const modelId = validateModel(model);
  try {
    const improved = await generateAiText({
      systemPrompt: `Rewrite the given text to be more ${tone}. Fix grammar, improve clarity and flow. Keep the same meaning but make it better. Return only the improved text.`,
      userPrompt: text.trim(),
      modelId,
      temperature: 0.6,
      maxTokens: 1500,
    });
    res.json({ improved, model: "Gemini AI Rewriter" });
  } catch (e: any) {
    req.log.error({ err: e }, "Text improvement failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /ai/sentiment
router.post(["/ai/sentiment", "/api/ai/sentiment"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { text, model } = req.body as { text?: string; model?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const modelId = validateModel(model);
  try {
    const raw = await generateAiText({
      systemPrompt: `Analyze the sentiment of the given text and return a JSON object with:
- "sentiment": "positive" | "negative" | "neutral" | "mixed"
- "score": number from -1.0 (very negative) to 1.0 (very positive)
- "emotions": array of detected emotions (e.g. ["joy", "excitement"])
- "summary": one sentence explaining the sentiment
Return only valid JSON.`,
      userPrompt: text.trim(),
      modelId,
      temperature: 0.2,
      maxTokens: 300,
    });

    type SentimentResult = { sentiment: string; score: number; emotions: string[]; summary: string };
    const fallback: SentimentResult = { sentiment: "neutral", score: 0, emotions: [], summary: raw };
    let parsed: SentimentResult = fallback;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const candidate = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        const validSentiments = ["positive", "negative", "neutral", "mixed"];
        parsed = {
          sentiment:
            typeof candidate.sentiment === "string" && validSentiments.includes(candidate.sentiment)
              ? candidate.sentiment
              : "neutral",
          score: typeof candidate.score === "number" ? Math.max(-1, Math.min(1, candidate.score)) : 0,
          emotions: Array.isArray(candidate.emotions)
            ? (candidate.emotions as unknown[]).filter((e): e is string => typeof e === "string")
            : [],
          summary: typeof candidate.summary === "string" ? candidate.summary : raw,
        };
      }
    } catch {
      parsed = fallback;
    }

    res.json({ analysis: parsed, model: "Gemini AI Sentiment" });
  } catch (e: any) {
    req.log.error({ err: e }, "Sentiment analysis failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /ai/story
router.post(["/ai/story", "/api/ai/story"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { prompt, genre = "general", length = "short", model } = req.body as {
    prompt?: string;
    genre?: string;
    length?: string;
    model?: string;
  };

  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const wordCount = length === "short" ? "100-150" : length === "medium" ? "200-300" : "400-500";
  const modelId = validateModel(model);
  try {
    const story = await generateAiText({
      systemPrompt: `You are a creative storyteller. Write a ${genre} story based on the given prompt. Keep it ${wordCount} words. Make it engaging with vivid descriptions. No markdown or asterisks.`,
      userPrompt: prompt.trim(),
      modelId,
      temperature: 0.9,
      maxTokens: 700,
    });
    res.json({ story, model: "Gemini AI Storyteller" });
  } catch (e: any) {
    req.log.error({ err: e }, "Story generation failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /ai/roast
router.post(["/ai/roast", "/api/ai/roast"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { subject, model } = req.body as { subject?: string; model?: string };

  if (!subject?.trim()) {
    res.status(400).json({ error: "subject is required" });
    return;
  }

  const modelId = validateModel(model);
  try {
    const roast = await generateAiText({
      systemPrompt: "You are a comedian. Write a funny, light-hearted roast about the given subject. Keep it playful and not offensive. 2-3 sentences max. No markdown.",
      userPrompt: subject.trim(),
      modelId,
      temperature: 0.95,
      maxTokens: 200,
    });
    res.json({ roast, model: "Gemini AI Roaster" });
  } catch (e: any) {
    req.log.error({ err: e }, "Roast generation failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

// POST /ai/reply-suggestions
router.post(["/ai/reply-suggestions", "/api/ai/reply-suggestions"], requireAuth, aiLimiter, async (req: AuthRequest, res): Promise<void> => {
  const { message: msgText, context, model } = req.body as {
    message?: string;
    context?: string;
    model?: string;
  };

  if (!msgText?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const modelId = validateModel(model);
  try {
    const raw = await generateAiText({
      systemPrompt: `Generate 4 short reply suggestions for the given message${context ? ` in the context of: ${context}` : ""}. 
Return a JSON array of strings. Each reply should be different in tone (e.g. friendly, witty, formal, enthusiastic). Keep each reply under 20 words. Return only the JSON array.`,
      userPrompt: msgText.trim(),
      modelId,
      temperature: 0.85,
      maxTokens: 300,
    });

    let suggestions: string[] = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]) as unknown;
        suggestions = Array.isArray(parsed)
          ? (parsed as unknown[]).filter((s): s is string => typeof s === "string")
          : [raw];
      } else {
        suggestions = [raw];
      }
    } catch {
      suggestions = [raw];
    }

    res.json({ suggestions, model: "Gemini AI Reply Assistant" });
  } catch (e: any) {
    req.log.error({ err: e }, "Reply suggestions failed");
    res.status(502).json({ error: e.message ?? "AI service error" });
  }
});

export default router;
