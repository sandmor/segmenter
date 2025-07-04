import useStore from "./store";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import InteractiveCanvas from "./components/interactive-canvas";
import SegmentationControls from "./components/segmentation-controls";
import { DownloadDialog } from "./components/download-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

function App() {
  const {
    file,
    setFile,
    setOriginalImage,
    isSegmenting,
    reset,
    masks,
    originalImage,
    segmentationMode,
    segmentAuto,
    segmentWithMask,
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

  const handleSegment = () => {
    if (segmentationMode === "auto") {
      segmentAuto();
    } else {
      segmentWithMask();
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
          <Card>
            <CardHeader>
              <CardTitle>Image Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="picture">Select Image</Label>
                  <Input id="picture" type="file" onChange={handleFileChange} />
                </div>
                <Button
                  onClick={handleSegment}
                  disabled={!file || isSegmenting}
                  className="w-full"
                >
                  {isSegmenting ? "Segmenting..." : "Segment Image"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {originalImage && (
            <>
              <SegmentationControls />

              <Card>
                <CardHeader>
                  <CardTitle>Generated Masks</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </>
          )}
        </aside>
      </div>
      <DownloadDialog />
    </div>
  );
}

export default App;
