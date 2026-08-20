import { CardCondition, CardLanguage, CardVariant } from '../../types';
import { StorageService } from '../storage';
import { ScanHistoryEntry, ScannerSettings, SessionStats } from './types';

const SETTINGS_KEY = 'pokebinder_scanner_settings';
const DEFAULT_SETTINGS: ScannerSettings = {
  defaultCondition: 'near_mint',
  defaultVariant: 'normal',
  defaultQuantity: 1,
  autoCapture: true,
  soundFeedback: true,
  hapticFeedback: true,
  preferredLanguage: 'pt',
  confidenceThresholdHigh: 80,
  confidenceThresholdMedium: 45,
  autoCaptureDebounceMs: 600,
};

export class ScanHistoryService {
  private static sessionEntries: ScanHistoryEntry[] = [];
  private static stats: SessionStats = {
    totalScanned: 0,
    confirmedCount: 0,
    duplicateIncrementedCount: 0,
    manualCorrectionCount: 0,
    cancelledCount: 0,
    undoneCount: 0,
    averageConfidence: 0,
  };

  /**
   * Resets session stats for a new batch session.
   */
  public static startNewSession(): void {
    this.sessionEntries = [];
    this.stats = {
      totalScanned: 0,
      confirmedCount: 0,
      duplicateIncrementedCount: 0,
      manualCorrectionCount: 0,
      cancelledCount: 0,
      undoneCount: 0,
      averageConfidence: 0,
    };
  }

  public static getSessionEntries(): ScanHistoryEntry[] {
    return [...this.sessionEntries];
  }

  public static getSessionStats(): SessionStats {
    const totalConfirmed = this.sessionEntries.filter((e) => e.status === 'CONFIRMED').length;
    const confSum = this.sessionEntries.reduce((acc, curr) => acc + curr.confidence, 0);
    const avg = this.sessionEntries.length > 0 ? Math.round(confSum / this.sessionEntries.length) : 0;

    return {
      ...this.stats,
      confirmedCount: totalConfirmed,
      totalScanned: this.sessionEntries.length,
      averageConfidence: avg,
    };
  }

  /**
   * Records a confirmed card scan.
   */
  public static recordConfirmedScan(params: {
    cardId: string;
    cardName: string;
    collectorNumber: string;
    setName: string;
    variant: CardVariant;
    condition: CardCondition;
    quantity: number;
    recognizedText: string[];
    confidence: number;
    isDuplicate: boolean;
    previousQuantity?: number;
    newQuantity?: number;
  }): ScanHistoryEntry {
    const entry: ScanHistoryEntry = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      cardId: params.cardId,
      cardName: params.cardName,
      collectorNumber: params.collectorNumber,
      setName: params.setName,
      variant: params.variant,
      condition: params.condition,
      quantity: params.quantity,
      recognizedText: params.recognizedText,
      confidence: params.confidence,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      previousQuantity: params.previousQuantity,
      newQuantity: params.newQuantity,
    };

    this.sessionEntries.unshift(entry);
    this.stats.totalScanned++;
    if (params.isDuplicate) {
      this.stats.duplicateIncrementedCount++;
    }

    return entry;
  }

  /**
   * Reverts the most recent scan addition safely.
   */
  public static undoLastScan(preferredLanguage: CardLanguage = 'pt'): {
    success: boolean;
    undoneEntry?: ScanHistoryEntry;
    message: string;
  } {
    const lastConfirmedIdx = this.sessionEntries.findIndex((e) => e.status === 'CONFIRMED');
    if (lastConfirmedIdx === -1) {
      return { success: false, message: 'Nenhuma carta para desfazer nesta sessão.' };
    }

    const entry = this.sessionEntries[lastConfirmedIdx];
    if (!entry.cardId) {
      return { success: false, message: 'Carta inválida para desfazer.' };
    }

    try {
      // Revert quantity in collection
      const qtyToRevert = -(entry.quantity || 1);
      StorageService.updateCardQuantity(
        entry.cardId,
        qtyToRevert,
        entry.variant || 'normal',
        preferredLanguage,
        entry.condition || 'near_mint'
      );

      // Mark entry as undone
      this.sessionEntries.splice(lastConfirmedIdx, 1);
      this.stats.undoneCount++;

      return {
        success: true,
        undoneEntry: entry,
        message: `Adição de "${entry.cardName}" desfeita com sucesso.`,
      };
    } catch (err: any) {
      return { success: false, message: `Erro ao desfazer: ${err.message || 'Falha desconhecida'}` };
    }
  }

  /**
   * Loads user scanner preferences.
   */
  public static getSettings(): ScannerSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (!saved) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Saves user scanner preferences.
   */
  public static saveSettings(settings: Partial<ScannerSettings>): ScannerSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save scanner settings to localStorage', e);
    }
    return updated;
  }
}
