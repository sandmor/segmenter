import React from "react";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";

interface SegmentationControlsProps {
  pointsPerSide: number;
  onPointsPerSideChange: (value: number) => void;
  predIoUThresh: number;
  onPredIoUThreshChange: (value: number) => void;
  stabilityScoreThresh: number;
  onStabilityScoreThreshChange: (value: number) => void;
}

const SegmentationControls: React.FC<SegmentationControlsProps> = ({
  pointsPerSide,
  onPointsPerSideChange,
  predIoUThresh,
  onPredIoUThreshChange,
  stabilityScoreThresh,
  onStabilityScoreThreshChange,
}) => {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="points-per-side" className="text-right">
          Points Per Side
        </Label>
        <Slider
          id="points-per-side"
          min={4}
          max={64}
          step={1}
          value={[pointsPerSide]}
          onValueChange={(value) => onPointsPerSideChange(value[0])}
          className="col-span-3"
        />
        <span className="col-span-1 text-left">{pointsPerSide}</span>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="pred-iou-thresh" className="text-right">
          Prediction IoU Threshold
        </Label>
        <Slider
          id="pred-iou-thresh"
          min={0.0}
          max={1.0}
          step={0.01}
          value={[predIoUThresh]}
          onValueChange={(value) => onPredIoUThreshChange(value[0])}
          className="col-span-3"
        />
        <span className="col-span-1 text-left">{predIoUThresh.toFixed(2)}</span>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="stability-score-thresh" className="text-right">
          Stability Score Threshold
        </Label>
        <Slider
          id="stability-score-thresh"
          min={0.0}
          max={1.0}
          step={0.01}
          value={[stabilityScoreThresh]}
          onValueChange={(value) => onStabilityScoreThreshChange(value[0])}
          className="col-span-3"
        />
        <span className="col-span-1 text-left">{stabilityScoreThresh.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default SegmentationControls;
