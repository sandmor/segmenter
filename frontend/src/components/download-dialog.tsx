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
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import axios from "axios";
import { dataURLtoFile } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export function DownloadDialog() {
  const {
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    pixiApp,
    selectedMask,
    maskDataURL,
    applyAlphaMatting,
    setApplyAlphaMatting,
    file,
    isMatting,
    setIsMatting,
    downloadType,
    setDownloadType,
    matteParams,
  } = useStore();

  const handleDownload = async () => {
    if (!pixiApp) return;

    if (applyAlphaMatting && file && maskDataURL) {
      setIsMatting(true);
      const formData = new FormData();
      formData.append("image", file);
      const maskFile = dataURLtoFile(maskDataURL, "mask.png");
      formData.append("mask", maskFile);
      formData.append(
        "erosion_kernel_size",
        matteParams.erosion_kernel_size.toString()
      );
      formData.append(
        "dilation_kernel_size",
        matteParams.dilation_kernel_size.toString()
      );
      formData.append("max_size", matteParams.max_size.toString());
      formData.append("algorithm", matteParams.algorithm);

      try {
        const response = await axios.post("/api/v1/segment/matte", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          responseType: "json",
        });
        const alphaMatte = response.data.alpha_matte;

        if (downloadType === "mask") {
          const dataUrl = `data:image/png;base64,${alphaMatte}`;
          downloadImage(dataUrl, "alpha_mask_matted.png");
        } else if (downloadType === "segment") {
          const dataUrl = `data:image/png;base64,${response.data.foreground}`;
          downloadImage(dataUrl, "segment_matted.png");
        } else if (downloadType === "cutout") {
          const sprite = await pixiApp.createSpriteFromBase64(
            response.data.foreground
          );
          const dataUrl = await pixiApp.cropImage(sprite);
          downloadImage(dataUrl, "cutout_matted.png");
        }
      } catch (error) {
        console.error("Error applying alpha matting:", error);
      } finally {
        setIsMatting(false);
        setIsDownloadDialogOpen(false);
      }
      return;
    }

    // Fallback for no matting
    let dataUrl: string | null = null;
    let filename: string = "download.png";

    switch (downloadType) {
      case "mask":
        dataUrl = maskDataURL;
        filename = "mask.png";
        break;
      case "segment":
        if (selectedMask) {
          dataUrl = await pixiApp.generateSegmentImage(selectedMask, false);
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
          <div className="flex items-center space-x-2">
            <Switch
              id="alpha-matting"
              checked={applyAlphaMatting}
              onCheckedChange={setApplyAlphaMatting}
            />
            <Label htmlFor="alpha-matting">Apply Alpha Matting</Label>
          </div>
          <RadioGroup
            value={downloadType}
            onValueChange={(value) =>
              setDownloadType(value as "mask" | "segment" | "cutout")
            }
            className="flex flex-col gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mask" id="mask" />
              <Label htmlFor="mask">Alpha Mask</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="segment" id="segment" />
              <Label htmlFor="segment">Segment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cutout" id="cutout" />
              <Label htmlFor="cutout">Cutout</Label>
            </div>
          </RadioGroup>
          <Button
            onClick={handleDownload}
            disabled={
              isMatting ||
              (downloadType !== "mask" && !selectedMask) ||
              (downloadType === "mask" && !maskDataURL)
            }
          >
            {isMatting ? "Matting..." : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}