// Client-side Web Worker for heavy file parsing, image preprocessing, and context compression

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  try {
    if (type === "PROCESS_IMAGE") {
      // Process image data URL or Blob for vision prompt
      const { dataUrl, maxWidth = 1024, maxHeight = 1024 } = payload;
      const processed = await processImageDataUrl(dataUrl, maxWidth, maxHeight);
      self.postMessage({ id, type, success: true, result: processed });
    } else if (type === "PARSER_DOC_TEXT") {
      // Parse file text/code
      const { text, filename } = payload;
      const clean = cleanDocumentText(text);
      const summary = generateQuickSummary(clean);
      self.postMessage({ id, type, success: true, result: { text: clean, summary, filename } });
    } else if (type === "COMPRESS_CONTEXT") {
      // Context compression for long conversation history
      const { messages, maxTokens = 4000 } = payload;
      const compressed = compressConversation(messages, maxTokens);
      self.postMessage({ id, type, success: true, result: compressed });
    } else if (type === "FILTER_CONVERSATIONS") {
      // Search conversations
      const { conversations, query } = payload;
      const q = (query || "").toLowerCase().trim();
      const filtered = conversations.filter((c: any) =>
        c.title.toLowerCase().includes(q) || (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
      );
      self.postMessage({ id, type, success: true, result: filtered });
    } else {
      self.postMessage({ id, type, success: false, error: "Unknown worker action" });
    }
  } catch (err: any) {
    self.postMessage({ id, type, success: false, error: err.message || "Worker processing error" });
  }
};

function processImageDataUrl(dataUrl: string, maxWidth: number, maxHeight: number): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    // If running in OffscreenCanvas or basic string extraction
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      resolve({ mimeType: match[1], base64: match[2] });
    } else {
      resolve({ mimeType: "image/jpeg", base64: dataUrl });
    }
  });
}

function cleanDocumentText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function generateQuickSummary(text: string): string {
  if (!text) return "Empty document";
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const snippet = lines.slice(0, 5).join(" ");
  return snippet.length > 150 ? snippet.slice(0, 150) + "..." : snippet;
}

function compressConversation(messages: any[], _maxTokens: number) {
  if (!messages || messages.length <= 10) return messages;

  const recent = messages.slice(-8);
  const older = messages.slice(0, messages.length - 8);

  const olderSummary = older
    .map((m: any) => `${m.role === "user" ? "User" : "AI"}: ${m.content.slice(0, 100)}`)
    .join(" | ");

  return [
    {
      role: "system",
      content: `[Compressed History Summary of older messages]: ${olderSummary.slice(0, 800)}`,
    },
    ...recent,
  ];
}
