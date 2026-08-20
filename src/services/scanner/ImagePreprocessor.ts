import { ImageQualityAssessment } from './types';

export class ImagePreprocessor {
  /**
   * Evaluates image sharpness, glare, and lighting condition from a canvas.
   */
  public static assessQuality(canvas: HTMLCanvasElement): ImageQualityAssessment {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return {
        isBlurry: false,
        blurScore: 100,
        isGlary: false,
        glarePercentage: 0,
        isDark: false,
        brightnessScore: 128,
        isAcceptable: true,
        recommendations: [],
      };
    }

    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalLuma = 0;
    let overexposedCount = 0;
    const totalPixels = width * height;

    // Convert to grayscale & sample for speed
    const sampleStep = Math.max(1, Math.floor(Math.sqrt(totalPixels / 20000)));
    let sampledCount = 0;

    for (let i = 0; i < data.length; i += 4 * sampleStep) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuma += luma;
      sampledCount++;

      if (r > 245 && g > 245 && b > 245) {
        overexposedCount++;
      }
    }

    const brightnessScore = sampledCount > 0 ? totalLuma / sampledCount : 128;
    const glarePercentage = sampledCount > 0 ? (overexposedCount / sampledCount) * 100 : 0;

    // Calculate Edge / Laplacian Variance for blur detection
    let edgeSum = 0;
    let edgeSamples = 0;
    const stride = width * 4;

    for (let y = 1; y < height - 1; y += sampleStep * 2) {
      for (let x = 1; x < width - 1; x += sampleStep * 2) {
        const idx = (y * width + x) * 4;
        const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const left = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
        const right = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
        const up = 0.299 * data[idx - stride] + 0.587 * data[idx - stride + 1] + 0.114 * data[idx - stride + 2];
        const down = 0.299 * data[idx + stride] + 0.587 * data[idx + stride + 1] + 0.114 * data[idx + stride + 2];

        // 4-neighbor Laplacian approximation
        const laplacian = Math.abs(4 * center - left - right - up - down);
        edgeSum += laplacian;
        edgeSamples++;
      }
    }

    const blurScore = edgeSamples > 0 ? edgeSum / edgeSamples : 50;

    const isDark = brightnessScore < 45;
    const isGlary = glarePercentage > 12;
    const isBlurry = blurScore < 14;

    const recommendations: string[] = [];
    if (isDark) recommendations.push('Pouca iluminação. Ative a lanterna ou aproxime de uma luz.');
    if (isGlary) recommendations.push('Reflexo detectado. Incline levemente a carta ou o celular.');
    if (isBlurry) recommendations.push('Mova menos o celular para estabilizar o foco.');

    const isAcceptable = !isDark && !isGlary && !isBlurry;

    return {
      isBlurry,
      blurScore: Math.round(blurScore * 10) / 10,
      isGlary,
      glarePercentage: Math.round(glarePercentage * 10) / 10,
      isDark,
      brightnessScore: Math.round(brightnessScore),
      isAcceptable,
      recommendations,
    };
  }

  /**
   * Crops top (name & HP) and bottom (number & set) regions of the card for targeted high-accuracy OCR.
   */
  public static cropCardRegions(sourceCanvas: HTMLCanvasElement): {
    topCanvas: HTMLCanvasElement;
    bottomCanvas: HTMLCanvasElement;
    fullCardCanvas: HTMLCanvasElement;
  } {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // Standard Pokemon card aspect ratio ~ 63mm x 88mm (approx 0.716)
    // We assume the card is centered in viewfinder
    let cardW = width * 0.75;
    let cardH = cardW / 0.716;

    if (cardH > height * 0.85) {
      cardH = height * 0.85;
      cardW = cardH * 0.716;
    }

    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    // 1. Full Card Canvas
    const fullCardCanvas = document.createElement('canvas');
    fullCardCanvas.width = Math.round(cardW);
    fullCardCanvas.height = Math.round(cardH);
    const fullCtx = fullCardCanvas.getContext('2d');
    if (fullCtx) {
      fullCtx.drawImage(
        sourceCanvas,
        cardX,
        cardY,
        cardW,
        cardH,
        0,
        0,
        fullCardCanvas.width,
        fullCardCanvas.height
      );
      this.enhanceContrast(fullCardCanvas);
    }

    // 2. Top Header Region (Top 22% of card: Name, HP, Stage)
    const topH = cardH * 0.22;
    const topCanvas = document.createElement('canvas');
    topCanvas.width = Math.round(cardW * 1.5); // Upscale for OCR clarity
    topCanvas.height = Math.round(topH * 1.5);
    const topCtx = topCanvas.getContext('2d');
    if (topCtx) {
      topCtx.imageSmoothingQuality = 'high';
      topCtx.drawImage(
        sourceCanvas,
        cardX,
        cardY,
        cardW,
        topH,
        0,
        0,
        topCanvas.width,
        topCanvas.height
      );
      this.enhanceContrast(topCanvas);
    }

    // 3. Bottom Footer Region (Bottom 18% of card: Number 000/000, Set code, Regulation mark)
    const bottomH = cardH * 0.18;
    const bottomY = cardY + cardH - bottomH;
    const bottomCanvas = document.createElement('canvas');
    bottomCanvas.width = Math.round(cardW * 1.5);
    bottomCanvas.height = Math.round(bottomH * 1.5);
    const bottomCtx = bottomCanvas.getContext('2d');
    if (bottomCtx) {
      bottomCtx.imageSmoothingQuality = 'high';
      bottomCtx.drawImage(
        sourceCanvas,
        cardX,
        bottomY,
        cardW,
        bottomH,
        0,
        0,
        bottomCanvas.width,
        bottomCanvas.height
      );
      this.enhanceContrast(bottomCanvas);
    }

    return {
      topCanvas,
      bottomCanvas,
      fullCardCanvas,
    };
  }

  /**
   * Applies adaptive thresholding and contrast boosting to maximize OCR character extraction.
   */
  public static enhanceContrast(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    // Calculate mean luma
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    const mean = sum / (d.length / 4);

    for (let i = 0; i < d.length; i += 4) {
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // Boost contrast away from mean
      let val: number;
      if (luma > mean) {
        val = Math.min(255, luma + (255 - luma) * 0.45);
      } else {
        val = Math.max(0, luma - luma * 0.45);
      }
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);
  }
}
