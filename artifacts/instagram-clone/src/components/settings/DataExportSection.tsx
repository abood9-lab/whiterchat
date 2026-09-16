import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { Download, HardDrive, FileJson, CheckCircle2, Loader2 } from "lucide-react";

export function DataExportSection() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadArchive = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("whiterchat_token") ?? "";
      const res = await fetch(apiUrl("/api/users/me/export-data"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `whiterchat-data-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Account data archive downloaded!" });
      } else {
        toast({ title: "Failed to export data", variant: "destructive" });
      }
    } catch {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Data Management & Download</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Export a complete copy of your profile info, posts, comments, likes, and settings in JSON format.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-card space-y-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Download Your Information</h3>
            <p className="text-xs text-muted-foreground">Request a comprehensive export of all your WhiterChat data</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground bg-muted/30 p-4 rounded-xl border border-border">
          <div className="font-semibold text-foreground">Archive includes:</div>
          <ul className="list-disc pl-4 space-y-1">
            <li>Profile metadata, bio, avatar, and custom links</li>
            <li>All published posts and video reels</li>
            <li>Comments and post interaction histories</li>
            <li>Saved collections structure and bookmarks</li>
            <li>Security logs and active session histories</li>
          </ul>
        </div>

        <Button
          onClick={handleDownloadArchive}
          disabled={isExporting}
          className="w-full sm:w-auto gap-2 font-semibold text-xs h-10 px-5 bg-primary text-primary-foreground"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download Data Archive (.JSON)
        </Button>
      </div>
    </div>
  );
}
