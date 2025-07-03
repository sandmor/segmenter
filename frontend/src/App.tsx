import useStore from "./store";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import InteractiveCanvas from "./components/interactive-canvas";
import SegmentationControls from "./components/segmentation-controls";
import { DownloadDialog } from "./components/download-dialog";

function App() {
  const {
    file,
    setFile,
    setOriginalImage,
    setMasks,
    loading,
    setLoading,
    pointsPerSide,
    predIoUThresh,
    stabilityScoreThresh,
    setCompositeMask,
    setColorMap,
    reset,
    masks,
    originalImage,
  } = useStore();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      reset();
      setFile(selectedFile);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setOriginalImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(selectedFile);
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
    <div className="h-screen bg-background flex flex-col">
      <header className="p-4 border-b shrink-0">
        <h1 className="text-2xl font-bold text-foreground">
          Image Segmentation
        </h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-4 overflow-auto">
          <div className="w-full h-full bg-card text-card-foreground rounded-lg shadow-xl flex items-center justify-center">
            {originalImage ? (
              <InteractiveCanvas />
            ) : (
              <div className="text-muted-foreground text-lg text-center p-8">
                <p>Please upload an image to start segmentation.</p>
                <p className="text-sm">
                  Use the controls on the right sidebar.
                </p>
              </div>
            )}
          </div>
        </main>
        <aside className="w-96 bg-card text-card-foreground border-l p-4 overflow-y-auto space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Controls</h2>
            <div className="space-y-4 p-4 border rounded-lg">
              <Label htmlFor="picture">Upload Picture</Label>
              <Input id="picture" type="file" onChange={handleFileChange} />
              <Button
                onClick={handleSegment}
                disabled={!file || loading}
                className="w-full"
              >
                {loading ? "Segmenting..." : "Upload and Segment"}
              </Button>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-4">
              Segmentation Parameters
            </h2>
            <div className="p-4 border rounded-lg">
              <SegmentationControls />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-4">Generated Masks</h2>
            <div className="grid grid-cols-2 gap-4 p-2 border rounded-lg max-h-96 overflow-y-auto">
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
                <div className="col-span-full text-muted-foreground text-center py-4">
                  No masks generated yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
      <DownloadDialog />
    </div>
  );
}

export default App;
