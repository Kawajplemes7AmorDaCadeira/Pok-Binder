import { createWorker } from 'tesseract.js';
import { CardLanguage } from '../../types';

export interface OCRResult {
  text: string;
  confidence: number;
  lines: string[];
}

export interface OCRProvider {
  recognize(canvas: HTMLCanvasElement | ImageData): Promise<OCRResult>;
  terminate(): Promise<void>;
}

export class TesseractOCRProvider implements OCRProvider {
  private worker: any = null;
  private isInitializing = false;
  private currentLanguage: string = 'por+eng';

  constructor(lang: CardLanguage = 'pt') {
    this.currentLanguage = lang === 'ja' ? 'jpn' : 'por+eng';
  }

  private async ensureWorker(lang: string = this.currentLanguage): Promise<any> {
    if (this.worker && this.currentLanguage === lang) {
      return this.worker;
    }

    if (this.isInitializing) {
      // Wait briefly if initialization is already running
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (this.worker) return this.worker;
    }

    this.isInitializing = true;
    try {
      if (this.worker) {
        await this.worker.terminate().catch(() => {});
      }
      this.worker = await createWorker(lang);
      this.currentLanguage = lang;
      return this.worker;
    } catch (err) {
      console.warn(`Failed to initialize OCR with language ${lang}, falling back to eng`, err);
      try {
        this.worker = await createWorker('eng');
        this.currentLanguage = 'eng';
        return this.worker;
      } catch (fallbackErr) {
        console.error('Fatal OCR worker error:', fallbackErr);
        throw fallbackErr;
      }
    } finally {
      this.isInitializing = false;
    }
  }

  public async setLanguage(lang: CardLanguage): Promise<void> {
    const target = lang === 'ja' ? 'jpn' : 'por+eng';
    if (this.currentLanguage !== target) {
      await this.ensureWorker(target);
    }
  }

  public async recognize(canvas: HTMLCanvasElement | ImageData): Promise<OCRResult> {
    const worker = await this.ensureWorker();
    const { data } = await worker.recognize(canvas);
    const lines = (data.lines || []).map((l: any) => l.text.trim()).filter(Boolean);

    return {
      text: data.text || '',
      confidence: data.confidence || 0,
      lines: lines.length > 0 ? lines : (data.text || '').split('\n').map((s: string) => s.trim()).filter(Boolean),
    };
  }

  public async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (e) {
        // ignore
      }
      this.worker = null;
    }
  }
}

export class OCRService {
  private static provider: OCRProvider | null = null;
  private static isBusy = false;

  public static getProvider(language: CardLanguage = 'pt'): OCRProvider {
    if (!this.provider) {
      this.provider = new TesseractOCRProvider(language);
    }
    return this.provider;
  }

  public static async recognize(
    canvas: HTMLCanvasElement,
    language: CardLanguage = 'pt'
  ): Promise<OCRResult> {
    if (this.isBusy) {
      throw new Error('OCR is currently processing another frame');
    }

    this.isBusy = true;
    try {
      const provider = this.getProvider(language);
      if (provider instanceof TesseractOCRProvider) {
        await provider.setLanguage(language);
      }
      return await provider.recognize(canvas);
    } finally {
      this.isBusy = false;
    }
  }

  public static async terminate(): Promise<void> {
    if (this.provider) {
      await this.provider.terminate().catch(() => {});
      this.provider = null;
    }
    this.isBusy = false;
  }
}
