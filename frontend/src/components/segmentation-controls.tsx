import React from "react";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import useStore from "../store";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import { ChevronsUpDown } from "lucide-react";

const SegmentationControls: React.FC = () => {
  const {
    pointsPerSide,
    setPointsPerSide,
    predIoUThresh,
    setPredIoUThresh,
    stabilityScoreThresh,
    setStabilityScoreThresh,
    semanticOpacity,
    setSemanticOpacity,
    displaySemanticMask,
    setDisplaySemanticMask,
    applyAlphaMatting,
    setApplyAlphaMatting,
    matteParams,
    setMatteParams,
    setIsDrawing,
    segmentationMode,
    setSegmentationMode,
    brushSize,
    setBrushSize,
  } = useStore();

  const [isParamsOpen, setIsParamsOpen] = React.useState(true);
  const [isAlphaMattingOpen, setIsAlphaMattingOpen] = React.useState(false);

  React.useEffect(() => {
    setIsDrawing(segmentationMode === "paint");
  }, [segmentationMode, setIsDrawing]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Segmentation Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={segmentationMode}
            onValueChange={(value) =>
              setSegmentationMode(value as "auto" | "paint")
            }
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="auto" id="auto" className="peer sr-only" />
              <Label
                htmlFor="auto"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                Auto
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="paint"
                id="paint"
                className="peer sr-only"
              />
              <Label
                htmlFor="paint"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                Paint (WIP)
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      {segmentationMode === "paint" && (
        <Card>
          <CardHeader>
            <CardTitle>Drawing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brush-size" className="text-right">
                Brush Size
              </Label>
              <Slider
                id="brush-size"
                min={1}
                max={100}
                step={1}
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                className="col-span-3"
              />
              <span className="col-span-1 text-left">{brushSize}</span>
            </div>
          </CardContent>
        </Card>
      )}
      {segmentationMode === "auto" && (
        <Card>
          <Collapsible open={isParamsOpen} onOpenChange={setIsParamsOpen}>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Segmentation Parameters</CardTitle>
                    <CardDescription>
                      Adjust the automatic segmentation parameters.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="w-9 p-0">
                    <ChevronsUpDown className="h-4 w-4" />
                    <span className="sr-only">Toggle</span>
                  </Button>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-4">
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
                  <span className="col-span-1 text-left">
                    {predIoUThresh.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label
                    htmlFor="stability-score-thresh"
                    className="text-right"
                  >
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
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Display Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="display-semantic-mask">Show Semantic Mask</Label>
            <Switch
              id="display-semantic-mask"
              checked={displaySemanticMask}
              onCheckedChange={setDisplaySemanticMask}
            />
          </div>
          {displaySemanticMask && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="composite-opacity" className="text-right">
                Opacity
              </Label>
              <Slider
                id="composite-opacity"
                min={0.0}
                max={1.0}
                step={0.1}
                value={[semanticOpacity]}
                onValueChange={(value) => setSemanticOpacity(value[0])}
                className="col-span-3"
              />
              <span className="col-span-1 text-left">
                {semanticOpacity.toFixed(1)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <Collapsible
          open={isAlphaMattingOpen}
          onOpenChange={setIsAlphaMattingOpen}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Switch
                  id="alpha-matting"
                  checked={applyAlphaMatting}
                  onCheckedChange={setApplyAlphaMatting}
                />
                <div>
                  <CardTitle>Alpha Matting</CardTitle>
                  <CardDescription>
                    Refine the segmentation edges.
                  </CardDescription>
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  <ChevronsUpDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="algorithm" className="text-right">
                  Algorithm
                </Label>
                <Select
                  value={matteParams.algorithm}
                  onValueChange={(value) =>
                    setMatteParams({
                      algorithm: value as
                        | "cf"
                        | "vitmatte"
                        | "knn"
                        | "lbdm"
                        | "lkm",
                    })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an algorithm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cf">CF</SelectItem>
                    <SelectItem value="vitmatte">ViTMatte</SelectItem>
                    <SelectItem value="knn">KNN</SelectItem>
                    <SelectItem value="lbdm">LBDM</SelectItem>
                    <SelectItem value="lkm">LKM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="erosion-kernel-size" className="text-right">
                  Erosion Kernel Size
                </Label>
                <Slider
                  id="erosion-kernel-size"
                  min={0}
                  max={50}
                  step={1}
                  value={[matteParams.erosion_kernel_size]}
                  onValueChange={(value) =>
                    setMatteParams({ erosion_kernel_size: value[0] })
                  }
                  className="col-span-3"
                />
                <span className="col-span-1 text-left">
                  {matteParams.erosion_kernel_size}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dilation-kernel-size" className="text-right">
                  Dilation Kernel Size
                </Label>
                <Slider
                  id="dilation-kernel-size"
                  min={0}
                  max={50}
                  step={1}
                  value={[matteParams.dilation_kernel_size]}
                  onValueChange={(value) =>
                    setMatteParams({ dilation_kernel_size: value[0] })
                  }
                  className="col-span-3"
                />
                <span className="col-span-1 text-left">
                  {matteParams.dilation_kernel_size}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="max-size" className="text-right">
                  Max Size
                </Label>
                <Slider
                  id="max-size"
                  min={128}
                  max={4096}
                  step={1}
                  value={[matteParams.max_size]}
                  onValueChange={(value) =>
                    setMatteParams({ max_size: value[0] })
                  }
                  className="col-span-3"
                />
                <span className="col-span-1 text-left">
                  {matteParams.max_size}_
                </span>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </>
  );
};

export default SegmentationControls;
