import { Application, Assets, Container, Rectangle, Sprite } from "pixi.js";

interface PixiAppConfig {
  baseImage: string;
  maxWidth: number;
  maxHeight: number;
  containerRef: HTMLDivElement;
}

export class PixiApp {
  private app: Application;
  private onMaskClick: (mask: Sprite, segmentId: number) => void = () => {};

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

    const scale = Math.min(
      displayWidth / imageSprite.width,
      displayHeight / imageSprite.height
    );
    this.app.stage.scale.set(scale);

    this.app.stage.addChild(imageSprite);

    const maskContainer = new Container();
    maskContainer.label = "maskContainer";
    this.app.stage.addChild(maskContainer);

    this.app.canvas.style.maxWidth = "100%";
    this.app.canvas.style.maxHeight = "100%";
    this.app.canvas.style.objectFit = "contain";
  }

  public setOnMaskClick(
    callback: (mask: Sprite, segmentId: number) => void
  ): void {
    this.onMaskClick = callback;
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

  public async addMask(mask: string, segmentId: number): Promise<void> {
    const maskContainer = this.app.stage.getChildByLabel(
      "maskContainer"
    ) as Container;

    const regionMaskTexture = await Assets.load(
      `data:image/png;base64,${mask}`
    );
    const regionMaskSprite = new Sprite(regionMaskTexture);
    regionMaskSprite.alpha = 0.5;
    regionMaskSprite.label = "mask";
    regionMaskSprite.eventMode = "static";
    regionMaskSprite.cursor = "pointer";

    regionMaskSprite.on("pointerdown", () => {
      this.onMaskClick(regionMaskSprite, segmentId);
    });

    maskContainer.removeChildren();
    maskContainer.addChild(regionMaskSprite);
  }

  public async clearMasks(): Promise<void> {
    const maskContainer = this.app.stage.getChildByLabel(
      "maskContainer"
    ) as Container;
    if (maskContainer) {
      maskContainer.removeChildren();
    }
  }

  public async createSpriteFromBase64(base64Data: string): Promise<Sprite> {
    const texture = await Assets.load(`data:image/png;base64,${base64Data}`);
    return new Sprite(texture);
  }

  public async generateSegmentImage(
    mask: Sprite,
    crop?: boolean
  ): Promise<string> {
    const baseImage = this.app.stage.getChildByLabel("baseImage") as Sprite;
    if (!baseImage) {
      throw new Error("Base image not found");
    }

    const container = new Container();
    const clonedBase = new Sprite(baseImage.texture);
    const clonedMask = new Sprite(mask.texture);

    clonedBase.mask = clonedMask;
    container.addChild(clonedBase);
    container.addChild(clonedMask);

    const frame = crop ? this.getBoundingBoxFromMask(clonedMask) : undefined;

    const texture = this.app.renderer.generateTexture({
      target: container,
      frame,
    });
    const extract = this.app.renderer.extract;
    const dataUrl = await extract.base64(new Sprite(texture));

    texture.destroy();
    container.destroy({ children: true });

    return dataUrl;
  }

  private getBoundingBoxFromMask(mask: Sprite) {
    const texture = mask.texture;
    const { pixels } = this.app.renderer.extract.pixels(mask);
    const width = texture.width;
    const height = texture.height;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];

        if (r > 0 || g > 0 || b > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
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

    const scaledX = Math.round(x / this.app.stage.scale.x);
    const scaledY = Math.round(y / this.app.stage.scale.y);

    const textureWidth = semanticMaskSprite.texture.width;
    const textureHeight = semanticMaskSprite.texture.height;

    if (
      scaledX < 0 ||
      scaledX >= textureWidth ||
      scaledY < 0 ||
      scaledY >= textureHeight
    ) {
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
      displayWidth = maxWidth;
      displayHeight = maxWidth / imageAspectRatio;
    } else {
      displayHeight = maxHeight;
      displayWidth = maxHeight * imageAspectRatio;
    }

    return { displayWidth, displayHeight };
  };

  public updateMaxSize(maxWidth: number, maxHeight: number): void {
    const imageSprite = this.app.stage.getChildByLabel("image") as Sprite;
    if (!imageSprite || !imageSprite.texture) return;

    const originalWidth = imageSprite.texture.width;
    const originalHeight = imageSprite.texture.height;

    const { displayWidth, displayHeight } = this.calculateResponsiveDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight
    );

    const scaleX = displayWidth / originalWidth;
    const scaleY = displayHeight / originalHeight;
    const scale = Math.min(scaleX, scaleY);

    this.app.stage.scale.set(scale);

    this.app.renderer.resize(displayWidth, displayHeight);

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
