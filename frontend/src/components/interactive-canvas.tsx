import React, { useRef, useEffect, useState } from "react";
import useStore from "../store";
import { type Mask } from "../types";
import { PixiApp } from "@/lib/pixi-app";

const InteractiveCanvas: React.FC = () => {
  const {
    originalImage,
    masks,
    compositeMask,
    colorMap,
    displaySemanticMask,
    compositeOpacity,
  } = useStore();
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PixiApp | null>(null);
  const currentImageSrcRef = useRef<string | null>(null);
  const initializingRef = useRef<boolean>(false);
  const [highlightedRegionMask, setHighlightedRegionMask] =
    useState<Mask | null>(null);
  const [hoveredConfidence, setHoveredConfidence] = useState<number | null>(
    null
  );

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (appRef.current && width > 0 && height > 0) {
          appRef.current.updateMaxSize(width, height);
        }
      }
    });

    if (pixiContainerRef.current) {
      resizeObserver.observe(pixiContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const initOrUpdatePixi = async () => {
      if (initializingRef.current) return;
      if (!originalImage || !pixiContainerRef.current) return;
      if (!appRef.current) {
        initializingRef.current = true;

        try {
          const containerRect =
            pixiContainerRef.current.getBoundingClientRect();
          const maxWidth = containerRect.width || 800; // fallback
          const maxHeight = containerRect.height || 600; // fallback

          appRef.current = new PixiApp();
          await appRef.current.init({
            baseImage: originalImage,
            maxWidth,
            maxHeight,
            containerRef: pixiContainerRef.current,
          });

          currentImageSrcRef.current = originalImage;
        } catch (error) {
          console.error("Failed to initialize Pixi:", error);
        } finally {
          initializingRef.current = false;
        }
      } else {
        if (currentImageSrcRef.current !== originalImage && originalImage) {
          // Update with responsive sizing
          if (pixiContainerRef.current) {
            const containerRect =
              pixiContainerRef.current.getBoundingClientRect();
            appRef.current.updateMaxSize(
              containerRect.width,
              containerRect.height
            );
          }

          appRef.current.updateBaseImage(originalImage);
          currentImageSrcRef.current = originalImage;
        }

        if (highlightedRegionMask) {
          // Update highlighted region mask
          await appRef.current.highlightRegion(highlightedRegionMask.mask);
        } else {
          // Clear highlighted region mask
          await appRef.current.clearHighlightedRegion();
        }

        // Update semantic mask sprite
        if (compositeMask) {
          appRef.current.setSemanticMask(compositeMask, {
            visible: displaySemanticMask,
            opacity: compositeOpacity,
          });
        }
      }
    };

    initOrUpdatePixi();
  }, [
    originalImage,
    compositeOpacity,
    highlightedRegionMask,
    compositeMask,
    masks,
    colorMap,
    displaySemanticMask,
  ]);

  const handleMouseMove = async (event: React.MouseEvent<HTMLDivElement>) => {
    if (!appRef.current || !pixiContainerRef.current || !compositeMask) return;

    const canvas = appRef.current.getCanvas();

    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    const canvasX = (event.clientX - canvasRect.left) * scaleX;
    const canvasY = (event.clientY - canvasRect.top) * scaleY;

    const pixel = await appRef.current.sampleSemanticMask(canvasX, canvasY);
    if (!pixel) {
      setHighlightedRegionMask(null);
      setHoveredConfidence(null);
      console.error("No pixel data found at the mouse position");
      return;
    }

    const colorKey = `(${pixel.r}, ${pixel.g}, ${pixel.b})`;
    const segmentInfo = colorMap[colorKey];

    if (segmentInfo) {
      const mask = masks.find((m) => m.segment_id === segmentInfo.segment_id);
      setHighlightedRegionMask(mask || null);
      setHoveredConfidence(segmentInfo.confidence);
    } else {
      setHighlightedRegionMask(null);
      setHoveredConfidence(null);
    }
  };

  const handleMouseLeave = () => {
    setHighlightedRegionMask(null);
    setHoveredConfidence(null);
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={pixiContainerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full flex items-center justify-center"
        style={{ minHeight: "400px" }} // Ensure minimum height
      />
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
