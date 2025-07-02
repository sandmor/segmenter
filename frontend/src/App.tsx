import { useState } from "react";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import InteractiveCanvas from "./components/interactive-canvas";
import SegmentationControls from "./components/segmentation-controls";

interface Mask {
  segment_id: number;
  confidence: number;
  mask: string;
}

interface ColorMap {
  [color: string]: {
    segment_id: number;
    confidence: number;
  };
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [masks, setMasks] = useState<Mask[]>([]);
  const [loading, setLoading] = useState(false);
  const [pointsPerSide, setPointsPerSide] = useState(32);
  const [predIoUThresh, setPredIoUThresh] = useState(0.88);
  const [stabilityScoreThresh, setStabilityScoreThresh] = useState(0.95);
  const [compositeMask, setCompositeMask] = useState<string | null>(null);
  const [colorMap, setColorMap] = useState<ColorMap>({});
  const [displayMode, setDisplayMode] = useState<"hover" | "composite">(
    "hover"
  );
  const [compositeOpacity, setCompositeOpacity] = useState(0.5);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setOriginalImage(URL.createObjectURL(selectedFile));
      setMasks([]);
      setCompositeMask(null);
      setColorMap({});
    }
  };

  const handleSegment = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("points_per_side", pointsPerSide.toString());
    formData.append("pred_iou_thresh", predIoUThresh.toString());
    formData.append("stability_score_thresh", stabilityScoreThresh.toString());

    try {
      const response = await axios.post(
        "http://localhost:8000/api/v1/segment/auto",
        formData
      );
      setMasks(response.data.segments);
      setCompositeMask(response.data.composite_mask);
      setColorMap(response.data.color_map);
    } catch (error) {
      console.error("Error segmenting image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      <h1 className="text-4xl font-extrabold text-foreground mb-6">
        Image Segmentation
      </h1>

      <div className="w-full max-w-6xl bg-card text-card-foreground rounded-lg shadow-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col space-y-4">
            <Label htmlFor="picture">Upload Picture</Label>
            <Input id="picture" type="file" onChange={handleFileChange} />
            <Button onClick={handleSegment} disabled={!file || loading}>
              {loading ? "Segmenting..." : "Upload and Segment"}
            </Button>
          </div>
          <div className="flex flex-col space-y-4">
            <h2 className="text-lg font-semibold">Segmentation Controls</h2>
            <SegmentationControls
              pointsPerSide={pointsPerSide}
              onPointsPerSideChange={setPointsPerSide}
              predIoUThresh={predIoUThresh}
              onPredIoUThreshChange={setPredIoUThresh}
              stabilityScoreThresh={stabilityScoreThresh}
              onStabilityScoreThreshChange={setStabilityScoreThresh}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              compositeOpacity={compositeOpacity}
              onCompositeOpacityChange={setCompositeOpacity}
            />
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl bg-card text-card-foreground rounded-lg shadow-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center bg-muted/40 p-4 rounded-md">
            <h2 className="text-2xl font-semibold mb-4">
              Interactive Canvas
            </h2>
            {originalImage ? (
              <InteractiveCanvas
                originalImage={originalImage}
                masks={masks}
                compositeMask={compositeMask}
                colorMap={colorMap}
                displayMode={displayMode}
                compositeOpacity={compositeOpacity}
              />
            ) : (
              <div className="text-muted-foreground text-lg">
                Please upload an image to start segmentation.
              </div>
            )}
          </div>
          <div className="flex flex-col bg-muted/40 p-4 rounded-md">
            <h2 className="text-2xl font-semibold mb-4">Generated Masks</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[500px] p-2">
              {masks.length > 0 ? (
                masks.map((mask) => (
                  <div
                    key={mask.segment_id}
                    className="relative border border-border rounded-md overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <img
                      src={`data:image/png;base64,${mask.mask}`}
                      alt={`Mask ${mask.segment_id}`}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <p className="text-white text-sm font-medium">
                        Confidence: {mask.confidence.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-muted-foreground text-lg text-center">
                  No masks generated yet. Upload an image and segment it.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
