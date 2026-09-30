import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Palette, Users, Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/api-url";

interface Props {
  whiteboardId: string;
  onOpen: (whiteboardId: string) => void;
}

export function WhiteboardCard({ whiteboardId, onOpen }: Props) {
  const [title, setTitle] = useState("Shared Whiteboard");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("whiterchat_token") ?? "";
    fetch(apiUrl(`/api/whiteboards/${whiteboardId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        if (active) {
          setTitle(data.title || "Shared Whiteboard");
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [whiteboardId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 max-w-[280px] w-full flex flex-col gap-3 shadow-md backdrop-blur-xs select-none">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
          <Palette className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Shared Canvas
          </span>
          {isLoading ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Loader2 className="w-3 h-3 text-slate-500 animate-spin" />
              <span className="text-xs text-slate-500">Loading...</span>
            </div>
          ) : (
            <h4 className="text-xs font-bold text-white truncate mt-0.5" title={title}>
              {title}
            </h4>
          )}
        </div>
      </div>

      <Button
        onClick={() => onOpen(whiteboardId)}
        size="sm"
        className="w-full h-8 text-xs font-semibold rounded-xl gap-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-sm border border-purple-500/10 active:scale-95 transition-transform"
      >
        <Users className="w-3.5 h-3.5" />
        <span>Open Whiteboard</span>
      </Button>
    </div>
  );
}
