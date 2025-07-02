import { Application, Assets, Container, Rectangle, Sprite } from "pixi.js";

interface PixiAppConfig {
  baseImage: string;
  maxWidth: number;
  maxHeight: number;
  containerRef: HTMLDivElement;
}

export class PixiApp {
  private app: Application;

  constructor() {
    this.app = new Application();
  }

  public async init(config: PixiAppConfig): Promise<void> {
    const imageTexture = await Assets.load(config.baseImage);
    const imageSprite = new Sprite(imageTexture);
    imageSprite.label = "baseImage";

    const { displayWidth, displayHeight } = this.calculateResponsiveDimensions(
      imageSprite.width,
      imageSprite.height,
      config.maxWidth,
      config.maxHeight
    );

    await this.app.init({
      width: displayWidth,
      height: displayHeight,
      backgroundColor: 0x000000,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    config.containerRef.appendChild(this.app.canvas);

    // Scale the stage to fit the display dimensions
    const scale = Math.min(
      displayWidth / imageSprite.width,
      displayHeight / imageSprite.height
    );
    this.app.stage.scale.set(scale);

    this.app.stage.addChild(imageSprite);

    const highlightedRegionContainer = new Container();
    highlightedRegionContainer.label = "highlightedRegionContainer";
    this.app.stage.addChild(highlightedRegionContainer);

    this.app.canvas.style.maxWidth = "100%";
    this.app.canvas.style.maxHeight = "100%";
    this.app.canvas.style.objectFit = "contain";
  }

  public async updateBaseImage(newImage: string): Promise<void> {
    const baseImageSprite = this.app.stage.getChildByLabel(
      "baseImage"
    ) as Sprite | null;
    if (!baseImageSprite) {
      console.error("Base image sprite not found");
      return;
    }
    const imageTexture = await Assets.load(newImage);
    baseImageSprite.texture = imageTexture;
  }

  public async highlightRegion(mask: string): Promise<void> {
    const hightlightedRegionContainer = this.app.stage.getChildByLabel(
      "highlightedRegionContainer"
    ) as Container;

    const regionMaskTexture = await Assets.load(
      `data:image/png;base64,${mask}`
    );
    const regionMaskSprite = new Sprite(regionMaskTexture);
    regionMaskSprite.alpha = 0.5;
    regionMaskSprite.label = "highlightedRegion";

    hightlightedRegionContainer.removeChildren();
    hightlightedRegionContainer.addChild(regionMaskSprite);
  }

  public async clearHighlightedRegion(): Promise<void> {
    const highlightedRegionContainer = this.app.stage.getChildByLabel(
      "highlightedRegionContainer"
    ) as Container;
    if (highlightedRegionContainer) {
      highlightedRegionContainer.removeChildren();
    }
  }

  public async setSemanticMask(
    mask: string,
    options?: { visible?: boolean; opacity?: number }
  ): Promise<void> {
    const semanticMaskTexture = await Assets.load(
      `data:image/png;base64,${mask}`
    );

    let semanticMaskSprite = this.app.stage.getChildByLabel(
      "semanticMask"
    ) as Sprite;

    if (semanticMaskSprite) {
      semanticMaskSprite.texture = semanticMaskTexture;
    } else {
      semanticMaskSprite = new Sprite(semanticMaskTexture);
      semanticMaskSprite.label = "semanticMask";
      this.app.stage.addChild(semanticMaskSprite);
    }

    if (options) {
      if (options.visible !== undefined) {
        semanticMaskSprite.visible = options.visible;
      }
      if (options.opacity !== undefined) {
        semanticMaskSprite.alpha = options.opacity;
        console.log(`Setting semantic mask opacity to ${options.opacity}`);
      }
    }
  }

  public setSemanticMaskVisible(visible: boolean) {
    const semanticMaskSprite = this.app.stage.getChildByLabel(
      "semanticMask"
    ) as Sprite;
    if (semanticMaskSprite) {
      semanticMaskSprite.visible = visible;
    } else {
      console.warn("Semantic mask sprite not found, cannot set visibility.");
    }
  }

  public setSemanticMaskOpacity(opacity: number) {
    const semanticMaskSprite = this.app.stage.getChildByLabel(
      "semanticMask"
    ) as Sprite;
    if (semanticMaskSprite) {
      semanticMaskSprite.alpha = opacity;
    } else {
      console.warn("Semantic mask sprite not found, cannot set opacity.");
    }
  }

  public async sampleSemanticMask(
    x: number,
    y: number
  ): Promise<{ r: number; g: number; b: number } | null> {
    const semanticMaskSprite = this.app.stage.getChildByLabel(
      "semanticMask"
    ) as Sprite;

    if (!semanticMaskSprite || !semanticMaskSprite.texture) {
      console.warn("Semantic mask sprite or texture not found");
      return null;
    }

    // Convert screen coordinates to texture coordinates
    const scaledX = Math.round(x / this.app.stage.scale.x);
    const scaledY = Math.round(y / this.app.stage.scale.y);

    // Get texture dimensions
    const textureWidth = semanticMaskSprite.texture.width;
    const textureHeight = semanticMaskSprite.texture.height;

    // Ensure coordinates are within bounds
    if (
      scaledX < 0 ||
      scaledX >= textureWidth ||
      scaledY < 0 ||
      scaledY >= textureHeight
    ) {
      console.warn(
        `Coordinates out of bounds: (${scaledX}, ${scaledY}) vs (${textureWidth}x${textureHeight})`
      );
      return null;
    }

    try {
      return await this.sampleWithCleanRender(
        semanticMaskSprite,
        scaledX,
        scaledY
      );
    } catch (error) {
      console.error("Error sampling semantic mask:", error);
      return null;
    }
  }

  private async sampleWithCleanRender(
    sprite: Sprite,
    x: number,
    y: number
  ): Promise<{ r: number; g: number; b: number } | null> {
    // Create a temporary container for clean rendering
    const tempContainer = new Container();
    const tempSprite = new Sprite(sprite.texture);

    tempSprite.alpha = 1.0;
    tempSprite.blendMode = "normal";
    tempContainer.addChild(tempSprite);

    try {
      const { pixels } = this.app.renderer.extract.pixels({
        target: tempContainer,
        frame: new Rectangle(x, y, 1, 1),
      });

      if (pixels.length < 4) return null;

      const [r, g, b] = pixels.slice(0, 3);

      return { r, g, b };
    } finally {
      tempContainer.destroy();
    }
  }

  private calculateResponsiveDimensions = (
    imageWidth: number,
    imageHeight: number,
    maxWidth: number,
    maxHeight: number
  ) => {
    const imageAspectRatio = imageWidth / imageHeight;
    const containerAspectRatio = maxWidth / maxHeight;

    let displayWidth, displayHeight;

    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider relative to container
      displayWidth = maxWidth;
      displayHeight = maxWidth / imageAspectRatio;
    } else {
      // Image is taller relative to container
      displayHeight = maxHeight;
      displayWidth = maxHeight * imageAspectRatio;
    }

    return { displayWidth, displayHeight };
  };

  public updateMaxSize(maxWidth: number, maxHeight: number): void {
    const imageSprite = this.app.stage.getChildByLabel("image") as Sprite;
    if (!imageSprite || !imageSprite.texture) return;

    // Get original image dimensions
    const originalWidth = imageSprite.texture.width;
    const originalHeight = imageSprite.texture.height;

    // Calculate responsive dimensions that fit within the max size
    const { displayWidth, displayHeight } = this.calculateResponsiveDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight
    );

    // Calculate scale factor to fit original content into display dimensions
    const scaleX = displayWidth / originalWidth;
    const scaleY = displayHeight / originalHeight;
    const scale = Math.min(scaleX, scaleY);

    // Apply scaling to the entire stage
    this.app.stage.scale.set(scale);

    // Resize renderer to match the calculated display dimensions
    this.app.renderer.resize(displayWidth, displayHeight);

    // Update canvas styling to ensure it fits properly
    const canvas = this.app.canvas;
    canvas.style.maxWidth = "100%";
    canvas.style.maxHeight = "100%";
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  public destroy(): void {
    this.app.destroy(true, true);
  }
}
