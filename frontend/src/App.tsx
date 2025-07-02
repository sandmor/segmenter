import { useState } from "react";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

interface Mask {
  segment_id: number;
  confidence: number;
  mask: string;
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [masks, setMasks] = useState<Mask[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      setOriginalImage(URL.createObjectURL(selectedFile));
      setMasks([]);
    }
  };

  const handleSegment = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://localhost:8000/api/v1/segment/auto",
        formData
      );
      setMasks(response.data.segments);
    } catch (error) {
      console.error("Error segmenting image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Image Segmentation</h1>
      <div className="grid w-full max-w-sm items-center gap-1.5 mb-4">
        <Label htmlFor="picture">Picture</Label>
        <Input id="picture" type="file" onChange={handleFileChange} />
      </div>
      <Button onClick={handleSegment} disabled={!file || loading}>
        {loading ? "Segmenting..." : "Upload and Segment"}
      </Button>

      <div className="flex flex-wrap mt-4">
        {originalImage && (
          <div className="w-1/2 p-2">
            <h2 className="text-xl font-semibold mb-2">Original Image</h2>
            <img
              src={originalImage}
              alt="Original"
              className="max-w-full h-auto"
            />
          </div>
        )}
        <div className="w-1/2 p-2">
          <h2 className="text-xl font-semibold mb-2">Masks</h2>
          <div className="grid grid-cols-3 gap-2">
            {masks.map((mask) => (
              <div key={mask.segment_id} className="relative">
                <img
                  src={`data:image/png;base64,${mask.mask}`}
                  alt={`Mask ${mask.segment_id}`}
                  className="max-w-full h-auto"
                />
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm">
                    Confidence: {mask.confidence.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
