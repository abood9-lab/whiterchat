// Storage abstraction for Mobile Runtime & Persistent Session

const MEMORY_STORAGE: Record<string, string> = {};

export const MobileStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return MEMORY_STORAGE[key] || null;
    } catch {
      return MEMORY_STORAGE[key] || null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      MEMORY_STORAGE[key] = value;
    } catch {
      MEMORY_STORAGE[key] = value;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      delete MEMORY_STORAGE[key];
    } catch {
      delete MEMORY_STORAGE[key];
    }
  },

  async clear(): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.clear();
      }
      Object.keys(MEMORY_STORAGE).forEach((k) => delete MEMORY_STORAGE[k]);
    } catch {
      // ignore
    }
  },
};
