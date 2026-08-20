import { CardLanguage } from '../../types';
import { ScannerCardMatcher } from './ScannerCardMatcher';
import {
  CardCandidate,
  ConfidenceLevel,
  ExtractedCardTokens,
  ScanRecognitionResult,
} from './types';

export class RecognitionConfidenceService {
  public static readonly HIGH_CONFIDENCE_THRESHOLD = 80;
  public static readonly MEDIUM_CONFIDENCE_THRESHOLD = 45;
  public static readonly MIN_CONFIDENCE_GAP = 10; // If top 1 and top 2 are within 10%, require user choice

  /**
   * Evaluates candidate list and determines the confidence level and primary recognized attributes.
   */
  public static evaluateCandidates(
    candidates: CardCandidate[],
    tokens: ExtractedCardTokens,
    preferredLanguage: CardLanguage
  ): ScanRecognitionResult {
    const rawText = tokens.fullRawText;
    const normalizedText = `Top: ${tokens.rawTopText}\nBottom: ${tokens.rawBottomText}\nNumbers: ${tokens.collectorNumbers.join(', ')}`;

    if (candidates.length === 0) {
      return {
        candidates: [],
        confidence: 0,
        level: 'LOW',
        recognizedCollectorNumber: tokens.collectorNumbers[0],
        recognizedName: tokens.nameCandidates[0],
        recognizedHp: tokens.hpCandidates[0],
        recognizedRegulationMark: tokens.regulationMarks[0],
        language: preferredLanguage,
        extractedTokens: tokens,
        rawText,
        normalizedText,
      };
    }

    const topCandidate = candidates[0];
    const topScore = topCandidate.confidence;

    let level: ConfidenceLevel = 'LOW';

    if (topScore >= this.HIGH_CONFIDENCE_THRESHOLD) {
      // Check Gap confidence if second candidate exists
      if (candidates.length > 1) {
        const secondScore = candidates[1].confidence;
        const gap = topScore - secondScore;
        if (gap < this.MIN_CONFIDENCE_GAP) {
          // Candidates are too close (e.g. 91% vs 89%), downgrade to MEDIUM for human confirmation
          level = 'MEDIUM';
        } else {
          level = 'HIGH';
        }
      } else {
        level = 'HIGH';
      }
    } else if (topScore >= this.MEDIUM_CONFIDENCE_THRESHOLD) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }

    const probableVariant = ScannerCardMatcher.suggestProbableVariant(topCandidate.card);

    return {
      candidates,
      confidence: topScore,
      level,
      recognizedName: topCandidate.card.name,
      recognizedCollectorNumber: tokens.collectorNumbers[0] || topCandidate.card.localId,
      recognizedSetHint: topCandidate.card.setName,
      recognizedHp: tokens.hpCandidates[0] || topCandidate.card.hp,
      recognizedRegulationMark: tokens.regulationMarks[0] || topCandidate.card.regulationMark,
      language: topCandidate.card.language || preferredLanguage,
      suggestedVariant: probableVariant.variant,
      variantConfidence: probableVariant.confidence,
      extractedTokens: tokens,
      rawText,
      normalizedText,
    };
  }
}
