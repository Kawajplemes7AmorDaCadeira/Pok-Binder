import { CardTextExtractor } from '../services/scanner/CardTextExtractor';
import { ScannerCardMatcher } from '../services/scanner/ScannerCardMatcher';
import { RecognitionConfidenceService } from '../services/scanner/RecognitionConfidenceService';
import { ScanHistoryService } from '../services/scanner/ScanHistoryService';
import { StorageService } from '../services/storage';
import { PokemonCard } from '../types';

export async function runScannerTests(): Promise<{ passed: number; failed: number }> {
  console.log('=== RUNNING POKÉBINDER PROFESSIONAL CARD SCANNER TESTS ===\n');
  let passed = 0;
  let failed = 0;

  // Node CLI localStorage mock
  if (typeof global !== 'undefined' && !(global as any).localStorage) {
    const memoryStore: Record<string, string> = {};
    (global as any).localStorage = {
      getItem: (key: string) => memoryStore[key] || null,
      setItem: (key: string, val: string) => {
        memoryStore[key] = String(val);
      },
      removeItem: (key: string) => {
        delete memoryStore[key];
      },
      clear: () => {
        Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
      },
    };
  }

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: OCR error normalization in collector numbers (O10/O86 -> 010/086)
  try {
    const normalized = CardTextExtractor.normalizeCollectorNumberErrors('O10/O86');
    assert(normalized === '010/086', `Normalized O to 0 in collector numbers: ${normalized}`);

    const normalized151 = CardTextExtractor.normalizeCollectorNumberErrors('I51/l65');
    assert(normalized151 === '151/165', `Normalized I and l to 1 in collector numbers: ${normalized151}`);
  } catch (err) {
    assert(false, `Normalization test failed: ${err}`);
  }

  // Test 2: Token Extraction from card text regions
  try {
    const topText = 'Ho-Oh\nHP 130\nBÁSICO';
    const bottomText = '010/086 G\nILLUS. AKIRA EGAWA\n©2024 POKÉMON';
    const fullText = `${topText}\n${bottomText}`;

    const tokens = CardTextExtractor.extractTokens(topText, bottomText, fullText);
    assert(tokens.collectorNumbers.includes('010/086'), 'Extracted 010/086 collector number');
    assert(tokens.hpCandidates.includes(130), 'Extracted HP 130');
    assert(tokens.regulationMarks.includes('G'), 'Extracted Regulation Mark G');
    assert(tokens.nameCandidates.includes('Ho-Oh'), 'Extracted name Ho-Oh without noise words');
  } catch (err) {
    assert(false, `Token extraction failed: ${err}`);
  }

  // Test 3: Card Scoring & Matcher with Ho-Oh 010/086
  try {
    const mockHoOh: PokemonCard = {
      id: 'sv07-010',
      localId: '010',
      name: 'Ho-Oh',
      setId: 'sv07',
      setName: 'Equilíbrio Perfeito',
      setCode: 'SV07',
      setTotalCards: 86,
      hp: 130,
      language: 'pt',
      rarity: 'Raro Holo',
    };

    const tokens = CardTextExtractor.extractTokens(
      'Ho-Oh\nHP 130',
      '010/086\nEquilíbrio Perfeito',
      'Ho-Oh HP 130 010/086'
    );

    const { breakdown } = ScannerCardMatcher.scoreCard(mockHoOh, tokens, 'pt');
    assert(breakdown.numberMatch === 45, `Number match score is +45 (got ${breakdown.numberMatch})`);
    assert(breakdown.nameMatch === 25, `Name match score is +25 (got ${breakdown.nameMatch})`);
    assert(breakdown.setMatch >= 15, `Set match score is >= 15 (got ${breakdown.setMatch})`);
    assert(breakdown.hpMatch === 5, `HP match score is +5 (got ${breakdown.hpMatch})`);
    assert(breakdown.total >= 90, `Total match score is >= 90 (got ${breakdown.total})`);
  } catch (err) {
    assert(false, `Card scoring failed: ${err}`);
  }

  // Test 4: Same-Name Disambiguation by Collector Number (Pikachu Test)
  try {
    const pikachu151: PokemonCard = {
      id: 'sv03.5-025',
      localId: '025',
      name: 'Pikachu',
      setId: 'sv03.5',
      setName: '151',
      setTotalCards: 165,
      hp: 60,
      language: 'pt',
    };

    const pikachuPaldea: PokemonCard = {
      id: 'sv02-062',
      localId: '062',
      name: 'Pikachu',
      setId: 'sv02',
      setName: 'Evoluções em Paldea',
      setTotalCards: 193,
      hp: 70,
      language: 'pt',
    };

    const tokens = CardTextExtractor.extractTokens(
      'Pikachu\nHP 60',
      '025/165',
      'Pikachu HP 60 025/165'
    );

    const score151 = ScannerCardMatcher.scoreCard(pikachu151, tokens, 'pt').breakdown.total;
    const scorePaldea = ScannerCardMatcher.scoreCard(pikachuPaldea, tokens, 'pt').breakdown.total;

    assert(
      score151 > scorePaldea,
      `Disambiguated Pikachu by collector number: 151 (${score151}) > Paldea (${scorePaldea})`
    );
  } catch (err) {
    assert(false, `Disambiguation test failed: ${err}`);
  }

  // Test 5: Confidence Evaluation & Gap Downgrade
  try {
    const mockCloseCandidates = [
      {
        card: { id: 'card1', localId: '010', name: 'Charizard', language: 'pt' } as PokemonCard,
        confidence: 91,
        matchBreakdown: { numberMatch: 45, nameMatch: 25, setMatch: 16, languageMatch: 5, hpMatch: 0, total: 91 },
        reasons: ['Número exato'],
      },
      {
        card: { id: 'card2', localId: '010', name: 'Charizard EX', language: 'pt' } as PokemonCard,
        confidence: 89,
        matchBreakdown: { numberMatch: 45, nameMatch: 23, setMatch: 16, languageMatch: 5, hpMatch: 0, total: 89 },
        reasons: ['Número exato'],
      },
    ];

    const tokens = CardTextExtractor.extractTokens('Charizard', '010/086', 'Charizard 010/086');
    const result = RecognitionConfidenceService.evaluateCandidates(mockCloseCandidates, tokens, 'pt');

    assert(
      result.level === 'MEDIUM',
      `Downgraded to MEDIUM due to small gap (<10%) between top 2 candidates to prevent auto-error (got ${result.level})`
    );
  } catch (err) {
    assert(false, `Gap evaluation test failed: ${err}`);
  }

  // Test 6: Duplicate Increment (1 -> 2) & Batch Session Undo
  try {
    const cardId = 'sv07-010-test';
    StorageService.updateCardQuantity(cardId, 1, 'holo', 'pt', 'near_mint');
    assert(StorageService.getCardTotalQuantity(cardId) === 1, 'Initial card added quantity = 1');

    StorageService.updateCardQuantity(cardId, 1, 'holo', 'pt', 'near_mint');
    assert(StorageService.getCardTotalQuantity(cardId) === 2, 'Duplicate card incremented quantity 1 -> 2');

    // Test Undo
    ScanHistoryService.startNewSession();
    ScanHistoryService.recordConfirmedScan({
      cardId,
      cardName: 'Ho-Oh',
      collectorNumber: '010',
      setName: 'Equilíbrio Perfeito',
      variant: 'holo',
      condition: 'near_mint',
      quantity: 1,
      recognizedText: ['010/086'],
      confidence: 95,
      isDuplicate: true,
    });

    const undoResult = ScanHistoryService.undoLastScan('pt');
    assert(undoResult.success, 'Undid the last scan addition successfully');
    assert(StorageService.getCardTotalQuantity(cardId) === 1, 'Quantity reverted back to 1');
  } catch (err) {
    assert(false, `Duplicate & undo test failed: ${err}`);
  }

  console.log(`\nSCANNER TESTS COMPLETED: ${passed} passed, ${failed} failed.\n`);
  return { passed, failed };
}
