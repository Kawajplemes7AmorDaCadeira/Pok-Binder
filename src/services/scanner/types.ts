import { CardCondition, CardLanguage, CardVariant, PokemonCard } from '../../types';

export interface CardMatchBreakdown {
  numberMatch: number; // 0 - 45
  nameMatch: number;   // 0 - 25
  setMatch: number;    // 0 - 20
  languageMatch: number; // 0 - 5
  hpMatch: number;     // 0 - 5
  total: number;       // 0 - 100
}

export interface CardCandidate {
  card: PokemonCard;
  confidence: number; // 0 to 100
  matchBreakdown: CardMatchBreakdown;
  reasons: string[];
}

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ExtractedCardTokens {
  collectorNumbers: string[];
  rawNumbers: string[];
  nameCandidates: string[];
  hpCandidates: number[];
  setHints: string[];
  regulationMarks: string[];
  rawTopText: string;
  rawBottomText: string;
  fullRawText: string;
}

export interface ScanRecognitionResult {
  candidates: CardCandidate[];
  confidence: number;
  level: ConfidenceLevel;
  recognizedName?: string;
  recognizedCollectorNumber?: string;
  recognizedSetHint?: string;
  recognizedHp?: number;
  recognizedRegulationMark?: string;
  language?: CardLanguage;
  suggestedVariant?: CardVariant;
  variantConfidence?: number;
  extractedTokens: ExtractedCardTokens;
  rawText: string;
  normalizedText: string;
}

export interface ScanHistoryEntry {
  id: string;
  cardId?: string;
  cardName?: string;
  collectorNumber?: string;
  setName?: string;
  variant?: CardVariant;
  condition?: CardCondition;
  quantity?: number;
  recognizedText: string[];
  confidence: number;
  status: 'CONFIRMED' | 'REJECTED' | 'MANUAL';
  createdAt: string;
  previousQuantity?: number;
  newQuantity?: number;
}

export interface ImageQualityAssessment {
  isBlurry: boolean;
  blurScore: number; // Higher is sharper
  isGlary: boolean;
  glarePercentage: number; // Percentage of washed out / overexposed pixels
  isDark: boolean;
  brightnessScore: number; // 0 - 255 average
  isAcceptable: boolean;
  recommendations: string[];
}

export interface ScannerSettings {
  defaultCondition: CardCondition;
  defaultVariant: CardVariant;
  defaultQuantity: number;
  autoCapture: boolean;
  soundFeedback: boolean;
  hapticFeedback: boolean;
  preferredLanguage: CardLanguage;
  confidenceThresholdHigh: number; // default 80
  confidenceThresholdMedium: number; // default 45
  autoCaptureDebounceMs: number; // default 500
}

export interface SessionStats {
  totalScanned: number;
  confirmedCount: number;
  duplicateIncrementedCount: number;
  manualCorrectionCount: number;
  cancelledCount: number;
  undoneCount: number;
  averageConfidence: number;
}
