import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Palette, Users, Loader2 } from "lucide-react";
import { apiUrl, getAuthToken } from "@/lib/api-url";

interface Props {
  whiteboardId?: string;
  conversationId?: string;
  onOpen: (whiteboardId: string) => void;
}

export function WhiteboardCard({ whiteboardId, conversationId, onOpen }: Props) {
  const [resolvedId, setResolvedId] = useState<string>(whiteboardId || "");
  const [title, setTitle] = useState("Shared Whiteboard");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = getAuthToken();

    const fetchSession = async () => {
      try {
        let endpoint = "";
        if (whiteboardId) {
          endpoint = `/api/whiteboards/${whiteboardId}`;
        } else if (conversationId) {
          endpoint = `/api/conversations/${conversationId}/whiteboard/latest`;
        } else {
          setIsLoading(false);
          return;
        }

        const res = await fetch(apiUrl(endpoint), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Whiteboard not found");
        const data = await res.json();

        if (active) {
          setTitle(data.title || "Shared Whiteboard");
          if (data.id || data._id) {
            setResolvedId(data.id || data._id);
          }
          setIsLoading(false);
        }
      } catch {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchSession();

    return () => {
      active = false;
    };
  }, [whiteboardId, conversationId]);

  const handleOpen = () => {
    const targetId = resolvedId || whiteboardId || "";
    if (targetId) {
      onOpen(targetId);
    }
  };

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-950/40 via-slate-900/60 to-slate-900/80 p-4 max-w-[290px] w-full flex flex-col gap-3.5 shadow-lg backdrop-blur-md select-none text-start">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 shadow-inner">
          <Palette className="w-5 h-5 text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-wider text-purple-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" /> Business+ Canvas
            </span>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
              <span className="text-xs text-slate-400">Loading Canvas...</span>
            </div>
          ) : (
            <h4 className="text-sm font-semibold text-white truncate mt-0.5" title={title}>
              {title}
            </h4>
          )}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleOpen}
        disabled={isLoading && !resolvedId && !whiteboardId}
        size="sm"
        className="w-full h-9 text-xs font-semibold rounded-xl gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-md border border-purple-400/20 active:scale-95 transition-all cursor-pointer"
      >
        <Users className="w-3.5 h-3.5" />
        <span>Open Shared Whiteboard</span>
      </Button>
    </div>
  );
}
