import { useState } from "react";
import { getApiUrl } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImportExternalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galleryId: string;
  sectionId: string;
  gallerySlug: string;
  sectionTitle: string;
  onImportComplete: () => void;
}

export const ImportExternalDialog = ({
  open,
  onOpenChange,
  galleryId,
  sectionId,
  gallerySlug,
  sectionTitle,
  onImportComplete,
}: ImportExternalDialogProps) => {
  const [source, setSource] = useState<"dropbox" | "gdrive">("dropbox");
  const [folderUrl, setFolderUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const handleSync = async () => {
    if (!folderUrl.trim()) {
      toast.error("Please enter the folder shared link URL");
      return;
    }

    setSyncing(true);
    setProgress(5);
    setStatusText("Connecting to source folder...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userToken = session?.access_token;

      const response = await fetch(getApiUrl("/api/sync-external-folder"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": userToken ? `Bearer ${userToken}` : "",
        },
        body: JSON.stringify({
          source,
          folderUrl: folderUrl.trim(),
          galleryId,
          sectionId,
          gallerySlug,
          sectionTitle,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ReadableStream not supported on your browser");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last chunk if it's incomplete
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.status === "error") {
              throw new Error(data.error);
            } else if (data.status === "discovered") {
              setStatusText(`Discovered ${data.total} images. Starting sync...`);
              setProgress(10);
            } else if (data.status === "processing") {
              const pct = Math.min(10 + Math.round((data.current / data.total) * 85), 98);
              setProgress(pct);
              setStatusText(`Syncing [${data.current}/${data.total}]: ${data.filename}`);
            } else if (data.status === "completed") {
              setProgress(100);
              setStatusText("Sync completed successfully!");
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Error parsing progress chunk";
            console.error(msg, e);
            throw new Error(msg);
          }
        }
      }

      toast.success("Gallery synced from external source!");
      onImportComplete();
      onOpenChange(false);
      setFolderUrl("");
    } catch (error: unknown) {
      console.error("Folder sync error:", error);
      const msg = error instanceof Error ? error.message : "Sync failed";
      toast.error(msg);
    } finally {
      setSyncing(false);
      setProgress(0);
      setStatusText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-md border border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Link External Source</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Select External Source</Label>
            <RadioGroup
              value={source}
              onValueChange={(val) => setSource(val as "dropbox" | "gdrive")}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem value="dropbox" id="dropbox" className="peer sr-only" />
                <Label
                  htmlFor="dropbox"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-semibold">Dropbox</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="gdrive" id="gdrive" className="peer sr-only" />
                <Label
                  htmlFor="gdrive"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center"
                >
                  <span className="text-sm font-semibold">Google Drive</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder-url">Shared Folder Link URL *</Label>
            <Input
              id="folder-url"
              placeholder={
                source === "dropbox"
                  ? "https://www.dropbox.com/scl/fo/..."
                  : "https://drive.google.com/drive/folders/..."
              }
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              disabled={syncing}
            />
            <p className="text-xs text-muted-foreground">
              Make sure the folder is shared as public or viewable by anyone with the link.
            </p>
          </div>

          {syncing && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={syncing}
            >
              Cancel
            </Button>
            <Button onClick={handleSync} disabled={syncing} className="flex-1">
              {syncing ? "Syncing Folder..." : "Sync Gallery"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
