import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { EyeOff, Filter, Plus, X, Shield, Loader2 } from "lucide-react";

export function ContentPreferencesSection() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const currentPrefs = (user as any)?.contentPreferences || {};

  const [sensitiveContentLevel, setSensitiveContentLevel] = useState<"standard" | "less" | "more">(
    currentPrefs.sensitiveContentLevel || "standard"
  );
  const [mutedWords, setMutedWords] = useState<string[]>(currentPrefs.mutedWords || []);
  const [newWord, setNewWord] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    if (mutedWords.includes(word)) {
      toast({ title: "Word already in muted list" });
      return;
    }
    setMutedWords([...mutedWords, word]);
    setNewWord("");
  };

  const handleRemoveWord = (wordToRemove: string) => {
    setMutedWords(mutedWords.filter((w) => w !== wordToRemove));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const contentPreferences = {
        sensitiveContentLevel,
        mutedWords,
      };

      const res = await fetch(apiUrl("/api/users/me/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentPreferences }),
      });

      if (res.ok) {
        if (user) updateUser({ ...user, contentPreferences } as any);
        toast({ title: "Content preferences updated!" });
      } else {
        toast({ title: "Failed to save preferences", variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Content Preferences & Filtering</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control sensitive content thresholds and hide comments or posts containing specific words.
        </p>
      </div>

      {/* Sensitive Content Control */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Sensitive Content Control</h3>
            <p className="text-xs text-muted-foreground">Adjust how much potentially sensitive content you see</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { id: "less", title: "Less", desc: "Show fewer sensitive posts and reels in Explore." },
            { id: "standard", title: "Standard", desc: "Default balance for accounts and hashtags." },
            { id: "more", title: "More", desc: "Show more varied content on your feed." },
          ].map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setSensitiveContentLevel(lvl.id as any)}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
                sensitiveContentLevel === lvl.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div>
                <div className="font-semibold text-sm">{lvl.title}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{lvl.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Muted Words & Phrases */}
      <div className="p-6 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Muted Words & Phrases</h3>
            <p className="text-xs text-muted-foreground">Comments and posts containing these words will be hidden</p>
          </div>
        </div>

        <form onSubmit={handleAddWord} className="flex gap-2 pt-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Add word, phrase, or hashtag..."
            className="h-10 text-xs"
          />
          <Button type="submit" size="sm" className="h-10 px-4 gap-1.5 font-semibold shrink-0">
            <Plus className="w-4 h-4" /> Add Word
          </Button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2 min-h-[40px]">
          {mutedWords.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-2">No muted words added yet.</div>
          ) : (
            mutedWords.map((word) => (
              <span
                key={word}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-foreground text-xs font-medium border border-border"
              >
                <span>{word}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveWord(word)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="px-6 h-10 font-semibold bg-primary text-primary-foreground">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
