import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Bookmark, Plus, Folder, Trash2, Edit2, Loader2, Sparkles, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Collection {
  id: string;
  name: string;
  coverUrl?: string;
  postsCount: number;
}

export function SavedCollectionsSection() {
  const { toast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/saved-collections"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    setIsCreating(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/saved-collections"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        setCollections([...collections, created]);
        setCreateModalOpen(false);
        setNewCollectionName("");
        toast({ title: `Created collection "${created.name}"` });
      }
    } catch {
      toast({ title: "Failed to create collection", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      await fetch(apiUrl(`/api/users/me/saved-collections/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCollections(collections.filter((c) => c.id !== id));
      toast({ title: `Deleted "${name}"` });
    } catch {
      toast({ title: "Failed to delete collection", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Saved Collections</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize bookmarked photos, recipes, inspiration, and reels into folders.
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          size="sm"
          className="gap-1.5 font-semibold text-xs h-9 bg-primary text-primary-foreground"
        >
          <Plus className="w-4 h-4" /> New Collection
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* All Posts default card */}
        <div className="p-4 rounded-2xl border border-border bg-card flex items-center gap-4 hover:border-primary/50 transition-colors">
          <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-sm">All Saved Posts</div>
            <div className="text-xs text-muted-foreground mt-0.5">Default Collection</div>
          </div>
        </div>

        {/* Custom Collections */}
        {collections.map((coll) => (
          <div
            key={coll.id}
            className="p-4 rounded-2xl border border-border bg-card flex items-center justify-between gap-3 group hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-muted/70 overflow-hidden flex items-center justify-center shrink-0 border border-border">
                {coll.coverUrl ? (
                  <img src={coll.coverUrl} alt={coll.name} className="w-full h-full object-cover" />
                ) : (
                  <Folder className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{coll.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{coll.postsCount} items</div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(coll.id, coll.name)}
              className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" /> Create New Collection
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="coll-name">Collection Name</Label>
              <Input
                id="coll-name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g. Design Inspiration, Travel, Recipes"
                maxLength={40}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !newCollectionName.trim()}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
