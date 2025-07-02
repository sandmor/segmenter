import React, { useRef, useEffect, useState } from "react";

interface Mask {
  segment_id: number;
  confidence: number;
  mask: string;
}

interface InteractiveCanvasProps {
  originalImage: string;
  masks: Mask[];
}

const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  originalImage,
  masks,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredMask, setHoveredMask] = useState<Mask | null>(null);
  const [maskImages, setMaskImages] = useState<HTMLImageElement[]>([]);

  useEffect(() => {
    const imageElements = masks.map((mask) => {
      const img = new Image();
      img.src = `data:image/png;base64,${mask.mask}`;
      return img;
    });
    setMaskImages(imageElements);
  }, [masks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.src = originalImage;
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
    };
  }, [originalImage]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    let bestMask: Mask | null = null;
    let maxConfidence = -1;

    const offscreenCanvas = document.createElement("canvas");
    const offscreenCtx = offscreenCanvas.getContext("2d");

    if (!offscreenCtx) return;

    maskImages.forEach((maskImage, index) => {
      offscreenCanvas.width = maskImage.width;
      offscreenCanvas.height = maskImage.height;
      offscreenCtx.drawImage(maskImage, 0, 0);
      const pixelData = offscreenCtx.getImageData(x, y, 1, 1).data;

      if (pixelData[0] > 0) {
        const confidence = masks[index].confidence;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMask = masks[index];
        }
      }
    });

    setHoveredMask(bestMask);
  };

  const handleMouseLeave = () => {
    setHoveredMask(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.src = originalImage;
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      if (hoveredMask) {
        const hoveredMaskIndex = masks.findIndex(
          (mask) => mask.segment_id === hoveredMask.segment_id
        );
        const hoveredMaskImage = maskImages[hoveredMaskIndex];

        if (hoveredMaskImage) {
          ctx.globalAlpha = 0.5;
          ctx.drawImage(hoveredMaskImage, 0, 0);
          ctx.globalAlpha = 1.0;
        }
      }
    };
  }, [hoveredMask, originalImage, maskImages, masks]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="max-w-full h-auto"
      />
      {hoveredMask && (
        <div className="absolute top-0 left-0 p-2 bg-black bg-opacity-50 text-white rounded">
          <p className="text-white text-sm">
            Confidence: {hoveredMask.confidence.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveCanvas;
