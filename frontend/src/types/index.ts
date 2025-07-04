export interface Mask {
  segment_id: number;
  confidence: number;
  mask: string;
}

export interface MatteParams {
  erosion_kernel_size: number;
  dilation_kernel_size: number;
  max_size: number;
  algorithm: "cf" | "vitmatte" | "knn" | "lbdm" | "lkm";
}