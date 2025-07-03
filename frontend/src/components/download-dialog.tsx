import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { downloadImage } from "@/lib/utils";
import useStore from "@/store";

export function DownloadDialog() {
  const {
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    pixiApp,
    selectedMask,
    maskDataURL,
  } = useStore();

  const handleDownload = async (type: "mask" | "segment" | "cutout") => {
    if (!pixiApp) return;

    let dataUrl: string | null = null;
    let filename: string = "download.png";

    switch (type) {
      case "mask":
        dataUrl = maskDataURL;
        filename = "mask.png";
        break;
      case "segment":
        if (selectedMask) {
          dataUrl = await pixiApp.generateSegmentImage(selectedMask);
          filename = "segment.png";
        }
        break;
      case "cutout":
        if (selectedMask) {
          dataUrl = await pixiApp.generateSegmentImage(selectedMask, true);
          filename = "cutout.png";
        }
        break;
    }

    if (dataUrl) {
      downloadImage(dataUrl, filename);
    }
    setIsDownloadDialogOpen(false);
  };

  return (
    <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Options</DialogTitle>
          <DialogDescription>
            Choose what you want to download.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Button
            onClick={() => handleDownload("mask")}
            disabled={!maskDataURL}
          >
            Download Alpha Mask
          </Button>
          <Button
            onClick={() => handleDownload("segment")}
            disabled={!selectedMask}
          >
            Download Segment
          </Button>
          <Button
            onClick={() => handleDownload("cutout")}
            disabled={!selectedMask}
          >
            Download Cutout
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
