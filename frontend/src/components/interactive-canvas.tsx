import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";
import React, { useRef, useEffect, useState } from "react";

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

interface InteractiveCanvasProps {
  originalImage: string;
  masks: Mask[];
  compositeMask: string | null;
  colorMap: ColorMap;
  displayMode: "hover" | "composite";
  compositeOpacity: number;
}

const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  originalImage,
  masks,
  compositeMask,
  colorMap,
  displayMode,
  compositeOpacity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredMask, setHoveredMask] = useState<Mask | null>(null);
  const [maskImages, setMaskImages] = useState<HTMLImageElement[]>([]);
  const [compositeMaskImage, setCompositeMaskImage] =
    useState<HTMLImageElement | null>(null);
  const [hoveredConfidence, setHoveredConfidence] = useState<number | null>(
    null
  );

  useEffect(() => {
    const imageElements = masks.map((mask) => {
      const img = new Image();
      img.src = `data:image/png;base64,${mask.mask}`;
      return img;
    });
    setMaskImages(imageElements);
  }, [masks]);

  useEffect(() => {
    if (compositeMask) {
      const img = new Image();
      img.src = `data:image/png;base64,${compositeMask}`;
      img.onload = () => setCompositeMaskImage(img);
    } else {
      setCompositeMaskImage(null);
    }
  }, [compositeMask]);

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

      if (displayMode === "composite" && compositeMaskImage) {
        ctx.globalAlpha = compositeOpacity;
        ctx.drawImage(compositeMaskImage, 0, 0);
        ctx.globalAlpha = 1.0;
      } else if (displayMode === "hover" && hoveredMask) {
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
  }, [
    originalImage,
    hoveredMask,
    maskImages,
    masks,
    displayMode,
    compositeMaskImage,
    compositeOpacity,
  ]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !compositeMaskImage) {
      setHoveredMask(null);
      setHoveredConfidence(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);

    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    if (!offscreenCtx) return;

    offscreenCtx.drawImage(compositeMaskImage, 0, 0);
    const pixelData = offscreenCtx.getImageData(x, y, 1, 1).data;
    const colorKey = `(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;

    const segmentInfo = colorMap[colorKey];

    if (segmentInfo) {
      const mask = masks.find(
        (m) => m.segment_id === segmentInfo.segment_id
      );
      setHoveredMask(mask || null);
      setHoveredConfidence(segmentInfo.confidence);
    } else {
      setHoveredMask(null);
      setHoveredConfidence(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredMask(null);
    setHoveredConfidence(null);
  };

  return (
    <div className="relative">
      <TransformWrapper>
        <TransformComponent>
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="max-w-full h-auto"
          />
        </TransformComponent>
      </TransformWrapper>
      {hoveredConfidence !== null && (
        <div className="absolute top-0 left-0 p-2 bg-black bg-opacity-50 text-white rounded">
          <p className="text-white text-sm">
            Confidence: {hoveredConfidence.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveCanvas;
