import { create } from "zustand";
import { type Mask } from "../types";
import { PixiApp } from "@/lib/pixi-app";
import * as PIXI from "pixi.js";

interface ColorMap {
  [color: string]: {
    segment_id: number;
    confidence: number;
  };
}

interface AppState {
  file: File | null;
  originalImage: string | null;
  masks: Mask[];
  isSegmenting: boolean;
  isMatting: boolean;
  pointsPerSide: number;
  predIoUThresh: number;
  stabilityScoreThresh: number;
  compositeMask: string | null;
  maskDataURL: string | null;
  colorMap: ColorMap;
  displaySemanticMask: boolean;
  compositeOpacity: number;
  isDownloadDialogOpen: boolean;
  pixiApp: PixiApp | null;
  selectedMask: PIXI.Sprite | null;
  applyAlphaMatting: boolean;
  downloadType: "mask" | "segment" | "cutout";
  setFile: (file: File | null) => void;
  setOriginalImage: (image: string | null) => void;
  setMasks: (masks: Mask[]) => void;
  setIsSegmenting: (isSegmenting: boolean) => void;
  setIsMatting: (isMatting: boolean) => void;
  setPointsPerSide: (points: number) => void;
  setPredIoUThresh: (thresh: number) => void;
  setStabilityScoreThresh: (thresh: number) => void;
  setCompositeMask: (mask: string | null) => void;
  setMaskDataURL: (url: string | null) => void;
  setColorMap: (map: ColorMap) => void;
  setDisplaySemanticMask: (display: boolean) => void;
  setCompositeOpacity: (opacity: number) => void;
  setIsDownloadDialogOpen: (isOpen: boolean) => void;
  setPixiApp: (pixiApp: PixiApp | null) => void;
  setSelectedMask: (mask: PIXI.Sprite | null) => void;
  setApplyAlphaMatting: (apply: boolean) => void;
  setDownloadType: (type: "mask" | "segment" | "cutout") => void;
  reset: () => void;
}

const useStore = create<AppState>((set) => ({
  file: null,
  originalImage: null,
  masks: [],
  isSegmenting: false,
  isMatting: false,
  pointsPerSide: 32,
  predIoUThresh: 0.88,
  stabilityScoreThresh: 0.95,
  compositeMask: null,
  maskDataURL: null,
  colorMap: {},
  displaySemanticMask: true,
  compositeOpacity: 0.5,
  isDownloadDialogOpen: false,
  pixiApp: null,
  selectedMask: null,
  applyAlphaMatting: true,
  downloadType: "cutout",
  setFile: (file) => set({ file }),
  setOriginalImage: (image) => set({ originalImage: image }),
  setMasks: (masks) => set({ masks }),
  setIsSegmenting: (isSegmenting) => set({ isSegmenting }),
  setIsMatting: (isMatting) => set({ isMatting }),
  setPointsPerSide: (points) => set({ pointsPerSide: points }),
  setPredIoUThresh: (thresh) => set({ predIoUThresh: thresh }),
  setStabilityScoreThresh: (thresh) => set({ stabilityScoreThresh: thresh }),
  setCompositeMask: (mask) => set({ compositeMask: mask }),
  setMaskDataURL: (url) => set({ maskDataURL: url }),
  setColorMap: (map) => set({ colorMap: map }),
  setDisplaySemanticMask: (display) => set({ displaySemanticMask: display }),
  setCompositeOpacity: (opacity) => set({ compositeOpacity: opacity }),
  setIsDownloadDialogOpen: (isOpen) => set({ isDownloadDialogOpen: isOpen }),
  setPixiApp: (pixiApp) => set({ pixiApp }),
  setSelectedMask: (mask) => set({ selectedMask: mask }),
  setApplyAlphaMatting: (apply) => set({ applyAlphaMatting: apply }),
  setDownloadType: (type) => set({ downloadType: type }),
  reset: () =>
    set({
      file: null,
      originalImage: null,
      masks: [],
      compositeMask: null,
      maskDataURL: null,
      colorMap: {},
      pixiApp: null,
      selectedMask: null,
    }),
}));

export default useStore;
