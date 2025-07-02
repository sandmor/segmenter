import React from "react";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import useStore from "../store";

const SegmentationControls: React.FC = () => {
  const {
    pointsPerSide,
    setPointsPerSide,
    predIoUThresh,
    setPredIoUThresh,
    stabilityScoreThresh,
    setStabilityScoreThresh,
    displayMode,
    setDisplayMode,
    compositeOpacity,
    setCompositeOpacity,
  } = useStore();

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
          onValueChange={(value) => setPointsPerSide(value[0])}
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
          onValueChange={(value) => setPredIoUThresh(value[0])}
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
          onValueChange={(value) => setStabilityScoreThresh(value[0])}
          className="col-span-3"
        />
        <span className="col-span-1 text-left">
          {stabilityScoreThresh.toFixed(2)}
        </span>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Display Mode</Label>
        <div className="col-span-3 flex gap-2">
          <Button
            variant={displayMode === "hover" ? "secondary" : "outline"}
            onClick={() => setDisplayMode("hover")}
          >
            Hover
          </Button>
          <Button
            variant={displayMode === "composite" ? "secondary" : "outline"}
            onClick={() => setDisplayMode("composite")}
          >
            Composite
          </Button>
        </div>
      </div>
      {displayMode === "composite" && (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="composite-opacity" className="text-right">
            Composite Opacity
          </Label>
          <Slider
            id="composite-opacity"
            min={0.0}
            max={1.0}
            step={0.1}
            value={[compositeOpacity]}
            onValueChange={(value) => setCompositeOpacity(value[0])}
            className="col-span-3"
          />
          <span className="col-span-1 text-left">
            {compositeOpacity.toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
};

export default SegmentationControls;
