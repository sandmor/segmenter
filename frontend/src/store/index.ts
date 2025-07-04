import { create } from "zustand";
import {
  type Mask,
  type MatteParams,
  type SegmentationParameters,
} from "../types";
import { PixiApp } from "@/lib/pixi-app";
import * as PIXI from "pixi.js";
import { segmentImageAuto, segmentImageWithMask } from "../services/api";

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
  semanticMask: string | null;
  maskDataURL: string | null;
  colorMap: ColorMap;
  displaySemanticMask: boolean;
  semanticOpacity: number;
  isDownloadDialogOpen: boolean;
  pixiApp: PixiApp | null;
  selectedMask: PIXI.Sprite | null;
  applyAlphaMatting: boolean;
  matteParams: MatteParams;
  downloadType: "mask" | "segment" | "cutout";
  isDrawing: boolean;
  paintedMask: string | null;
  segmentationMode: "auto" | "paint";
  brushSize: number;
  setFile: (file: File | null) => void;
  setOriginalImage: (image: string | null) => void;
  setMasks: (masks: Mask[]) => void;
  setIsSegmenting: (isSegmenting: boolean) => void;
  setIsMatting: (isMatting: boolean) => void;
  setPointsPerSide: (points: number) => void;
  setPredIoUThresh: (thresh: number) => void;
  setStabilityScoreThresh: (thresh: number) => void;
  setSemanticMask: (mask: string | null) => void;
  setMaskDataURL: (url: string | null) => void;
  setColorMap: (map: ColorMap) => void;
  setDisplaySemanticMask: (display: boolean) => void;
  setSemanticOpacity: (opacity: number) => void;
  setIsDownloadDialogOpen: (isOpen: boolean) => void;
  setPixiApp: (pixiApp: PixiApp | null) => void;
  setSelectedMask: (mask: PIXI.Sprite | null) => void;
  setApplyAlphaMatting: (apply: boolean) => void;
  setMatteParams: (params: Partial<MatteParams>) => void;
  setDownloadType: (type: "mask" | "segment" | "cutout") => void;
  setIsDrawing: (isDrawing: boolean) => void;
  setPaintedMask: (mask: string | null) => void;
  setSegmentationMode: (mode: "auto" | "paint") => void;
  setBrushSize: (size: number) => void;
  segmentWithMask: () => Promise<void>;
  segmentAuto: () => Promise<void>;
  reset: () => void;
}

const useStore = create<AppState>((set, get) => ({
  file: null,
  originalImage: null,
  masks: [],
  isSegmenting: false,
  isMatting: false,
  pointsPerSide: 32,
  predIoUThresh: 0.88,
  stabilityScoreThresh: 0.95,
  semanticMask: null,
  maskDataURL: null,
  colorMap: {},
  displaySemanticMask: true,
  semanticOpacity: 0.5,
  isDownloadDialogOpen: false,
  pixiApp: null,
  selectedMask: null,
  applyAlphaMatting: true,
  matteParams: {
    erosion_kernel_size: 10,
    dilation_kernel_size: 10,
    max_size: 1024,
    algorithm: "cf",
  },
  downloadType: "cutout",
  isDrawing: false,
  paintedMask: null,
  segmentationMode: "auto",
  brushSize: 200,
  setFile: (file) => set({ file }),
  setOriginalImage: (image) => set({ originalImage: image }),
  setMasks: (masks) => set({ masks }),
  setIsSegmenting: (isSegmenting) => set({ isSegmenting }),
  setIsMatting: (isMatting) => set({ isMatting }),
  setPointsPerSide: (points) => set({ pointsPerSide: points }),
  setPredIoUThresh: (thresh) => set({ predIoUThresh: thresh }),
  setStabilityScoreThresh: (thresh) => set({ stabilityScoreThresh: thresh }),
  setSemanticMask: (mask) => set({ semanticMask: mask }),
  setMaskDataURL: (url) => set({ maskDataURL: url }),
  setColorMap: (map) => set({ colorMap: map }),
  setDisplaySemanticMask: (display) => set({ displaySemanticMask: display }),
  setSemanticOpacity: (opacity) => set({ semanticOpacity: opacity }),
  setIsDownloadDialogOpen: (isOpen) => set({ isDownloadDialogOpen: isOpen }),
  setPixiApp: (pixiApp) => set({ pixiApp }),
  setSelectedMask: (mask) => set({ selectedMask: mask }),
  setApplyAlphaMatting: (apply) => set({ applyAlphaMatting: apply }),
  setMatteParams: (params) =>
    set((state) => ({ matteParams: { ...state.matteParams, ...params } })),
  setDownloadType: (type) => set({ downloadType: type }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  setPaintedMask: (mask) => set({ paintedMask: mask }),
  setSegmentationMode: (mode) => set({ segmentationMode: mode }),
  setBrushSize: (size) => set({ brushSize: size }),
  segmentAuto: async () => {
    const { file, pointsPerSide, predIoUThresh, stabilityScoreThresh } = get();
    if (!file) return;

    set({ isSegmenting: true });
    try {
      const params: SegmentationParameters = {
        pointsPerSide,
        predIoUThresh,
        stabilityScoreThresh,
      };
      const data = await segmentImageAuto(file, params);
      set({
        masks: data.segments,
        semanticMask: data.semantic_mask,
        colorMap: data.color_map,
      });
    } catch (error) {
      console.error("Error segmenting image:", error);
    } finally {
      set({ isSegmenting: false });
    }
  },
  segmentWithMask: async () => {
    const { file, pixiApp } = get();
    if (!file || !pixiApp) return;

    set({ isSegmenting: true });
    try {
      const base64Mask = await pixiApp.getSelectionMaskAsBase64();
      const byteString = atob(base64Mask.split(",")[1]);
      const mimeString = base64Mask.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      const data = await segmentImageWithMask(file, blob);
      set({
        masks: data.segments,
        semanticMask: data.semantic_mask,
        colorMap: data.color_map,
        isDrawing: false,
      });
    } catch (error) {
      console.error("Error segmenting image with mask:", error);
    } finally {
      set({ isSegmenting: false });
    }
  },
  reset: () =>
    set({
      file: null,
      originalImage: null,
      masks: [],
      semanticMask: null,
      maskDataURL: null,
      colorMap: {},
      pixiApp: null,
      selectedMask: null,
      segmentationMode: "auto",
      isDrawing: false,
    }),
}));

export default useStore;
