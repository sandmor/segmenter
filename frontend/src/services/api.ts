import axios from "axios";
import { type SegmentationParameters } from "../types";

const apiClient = axios.create({
  baseURL: "/api/v1",
});

export const segmentImageAuto = async (
  file: File,
  params: SegmentationParameters
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("points_per_side", params.pointsPerSide.toString());
  formData.append("pred_iou_thresh", params.predIoUThresh.toString());
  formData.append(
    "stability_score_thresh",
    params.stabilityScoreThresh.toString()
  );

  const response = await apiClient.post("/segment/auto", formData);
  return response.data;
};

export const segmentImageWithMask = async (file: File, selectionMask: Blob) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("selection_mask", selectionMask, "selection_mask.png");

  const response = await apiClient.post("/segment/mask", formData);
  return response.data;
};
