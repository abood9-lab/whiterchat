/**
 * Local persistence helper for liked and saved posts & reels.
 * Guarantees that user likes & bookmarks persist across page reloads & navigation.
 */

function getStorageSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed);
  } catch {}
  return new Set();
}

function saveStorageSet(key: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

// ── Reel Likes ────────────────────────────────────────────────────────────
export function isReelLocallyLiked(id: string): boolean {
  return getStorageSet("whiterchat_liked_reels").has(id);
}

export function setReelLocallyLiked(id: string, liked: boolean): void {
  const set = getStorageSet("whiterchat_liked_reels");
  if (liked) set.add(id);
  else set.delete(id);
  saveStorageSet("whiterchat_liked_reels", set);
}

// ── Reel Saves ────────────────────────────────────────────────────────────
export function isReelLocallySaved(id: string): boolean {
  return getStorageSet("whiterchat_saved_reels").has(id);
}

export function setReelLocallySaved(id: string, saved: boolean): void {
  const set = getStorageSet("whiterchat_saved_reels");
  if (saved) set.add(id);
  else set.delete(id);
  saveStorageSet("whiterchat_saved_reels", set);
}

// ── Post Likes ────────────────────────────────────────────────────────────
export function isPostLocallyLiked(id: string): boolean {
  return getStorageSet("whiterchat_liked_posts").has(id);
}

export function setPostLocallyLiked(id: string, liked: boolean): void {
  const set = getStorageSet("whiterchat_liked_posts");
  if (liked) set.add(id);
  else set.delete(id);
  saveStorageSet("whiterchat_liked_posts", set);
}

// ── Post Saves ────────────────────────────────────────────────────────────
export function isPostLocallySaved(id: string): boolean {
  return getStorageSet("whiterchat_saved_posts").has(id);
}

export function setPostLocallySaved(id: string, saved: boolean): void {
  const set = getStorageSet("whiterchat_saved_posts");
  if (saved) set.add(id);
  else set.delete(id);
  saveStorageSet("whiterchat_saved_posts", set);
}
