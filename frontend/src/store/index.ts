import { create } from "zustand";
import { type Mask } from "../types";

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
  loading: boolean;
  pointsPerSide: number;
  predIoUThresh: number;
  stabilityScoreThresh: number;
  compositeMask: string | null;
  colorMap: ColorMap;
  displayMode: "hover" | "composite";
  compositeOpacity: number;
  setFile: (file: File | null) => void;
  setOriginalImage: (image: string | null) => void;
  setMasks: (masks: Mask[]) => void;
  setLoading: (loading: boolean) => void;
  setPointsPerSide: (points: number) => void;
  setPredIoUThresh: (thresh: number) => void;
  setStabilityScoreThresh: (thresh: number) => void;
  setCompositeMask: (mask: string | null) => void;
  setColorMap: (map: ColorMap) => void;
  setDisplayMode: (mode: "hover" | "composite") => void;
  setCompositeOpacity: (opacity: number) => void;
  reset: () => void;
}

const useStore = create<AppState>((set) => ({
  file: null,
  originalImage: null,
  masks: [],
  loading: false,
  pointsPerSide: 32,
  predIoUThresh: 0.88,
  stabilityScoreThresh: 0.95,
  compositeMask: null,
  colorMap: {},
  displayMode: "hover",
  compositeOpacity: 0.5,
  setFile: (file) => set({ file }),
  setOriginalImage: (image) => set({ originalImage: image }),
  setMasks: (masks) => set({ masks }),
  setLoading: (loading) => set({ loading }),
  setPointsPerSide: (points) => set({ pointsPerSide: points }),
  setPredIoUThresh: (thresh) => set({ predIoUThresh: thresh }),
  setStabilityScoreThresh: (thresh) => set({ stabilityScoreThresh: thresh }),
  setCompositeMask: (mask) => set({ compositeMask: mask }),
  setColorMap: (map) => set({ colorMap: map }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
  setCompositeOpacity: (opacity) => set({ compositeOpacity: opacity }),
  reset: () =>
    set({
      file: null,
      originalImage: null,
      masks: [],
      compositeMask: null,
      colorMap: {},
    }),
}));

export default useStore;
