import { ExtractedCardTokens } from './types';

export class CardTextExtractor {
  private static readonly NOISE_WORDS = new Set([
    'BASIC',
    'STAGE',
    'STAGE 1',
    'STAGE 2',
    'POKEMON',
    'POKÉMON',
    'TRAINER',
    'TREINADOR',
    'ENERGY',
    'ENERGIA',
    'SUPPORTER',
    'APOIADOR',
    'ITEM',
    'STADIUM',
    'ESTÁDIO',
    'VSTAR',
    'VMAX',
    'RULE',
    'REGRA',
    'WEAKNESS',
    'FRAQUEZA',
    'RESISTANCE',
    'RESISTÊNCIA',
    'RETREAT',
    'RECUO',
    'COST',
    'CUSTO',
    'HP',
    'PS',
    'PV',
    'ILLUS',
    'ILLUSTRATOR',
    'ILUSTRADOR',
    'GAME',
    'FREAK',
    'NINTENDO',
    'CREATURES',
    'TCG',
    'POKEMONCOMPANY',
  ]);

  /**
   * Corrects common OCR mistranscriptions in numeric strings (e.g. O -> 0, I -> 1).
   * Context-aware: applied strictly to numbers and collector IDs.
   */
  public static normalizeCollectorNumberErrors(raw: string): string {
    let s = raw.trim().toUpperCase();

    // Fix slash variations (e.g. '|', '\', 'I', 'l' between numbers)
    s = s.replace(/([0-9A-Z])\s*[\\|Il]\s*([0-9A-Z])/g, '$1/$2');

    // Split around slash if present
    if (s.includes('/')) {
      const parts = s.split('/');
      const left = parts[0]
        .replace(/O/g, '0')
        .replace(/[ILl|]/g, '1')
        .replace(/S/g, '5')
        .replace(/B/g, '8')
        .replace(/Z/g, '2');

      const right = parts[1]
        .replace(/O/g, '0')
        .replace(/[ILl|]/g, '1')
        .replace(/S/g, '5')
        .replace(/B/g, '8')
        .replace(/Z/g, '2');

      return `${left}/${right}`;
    }

    return s
      .replace(/O/g, '0')
      .replace(/[ILl|]/g, '1')
      .replace(/S/g, '5')
      .replace(/B/g, '8')
      .replace(/Z/g, '2');
  }

  /**
   * Extracts collector numbers matching real TCG card patterns.
   */
  public static extractCollectorNumbers(text: string): { normalized: string[]; raw: string[] } {
    const rawMatches: string[] = [];
    const normalizedMatches: string[] = [];
    const seen = new Set<string>();

    // 1. Slash pattern (e.g., 010/086, 151/165, TG04/TG30, RC01/RC25, O10/O86, 25/102)
    const slashRegex = /\b([A-Z]{0,4}\s*[0-9OIlSBZ]{1,4}\s*\/\s*[A-Z]{0,4}\s*[0-9OIlSBZ]{1,4})\b/gi;
    let match: RegExpExecArray | null;
    while ((match = slashRegex.exec(text)) !== null) {
      const original = match[1].replace(/\s+/g, '');
      const corrected = this.normalizeCollectorNumberErrors(original);
      rawMatches.push(original);
      if (!seen.has(corrected)) {
        normalizedMatches.push(corrected);
        seen.add(corrected);
      }
    }

    // 2. Special Promo prefixes (e.g. SVP 085, SWSH 020, SM 123, XY 50, BW 01)
    const promoRegex = /\b(SVP|SWSH|SM|XY|BW|HGSS|DP|PROMO)\s*[-#]?\s*([0-9OIlSBZ]{1,4})\b/gi;
    while ((match = promoRegex.exec(text)) !== null) {
      const prefix = match[1].toUpperCase();
      const num = this.normalizeCollectorNumberErrors(match[2]);
      const combined = `${prefix} ${num}`;
      rawMatches.push(match[0]);
      if (!seen.has(combined)) {
        normalizedMatches.push(combined);
        seen.add(combined);
      }
    }

    // 3. Standalone formatted numbers like "025", "#151"
    const standaloneRegex = /\b(?:NO\.|#|Nº)?\s*([0-9]{3})\b/gi;
    while ((match = standaloneRegex.exec(text)) !== null) {
      const num = match[1];
      if (!seen.has(num)) {
        normalizedMatches.push(num);
        seen.add(num);
      }
    }

    return {
      normalized: normalizedMatches,
      raw: rawMatches,
    };
  }

  /**
   * Extracts HP values (e.g., "HP 130", "HP70", "PS 330", "PV 280").
   */
  public static extractHpValues(text: string): number[] {
    const hpList: number[] = [];
    const hpRegex = /\b(?:HP|PS|PV)\s*[:.]?\s*([0-9]{2,3})\b/gi;
    let match: RegExpExecArray | null;
    while ((match = hpRegex.exec(text)) !== null) {
      const val = parseInt(match[1], 10);
      if (val >= 30 && val <= 350 && !hpList.includes(val)) {
        hpList.push(val);
      }
    }
    return hpList;
  }

  /**
   * Extracts regulation marks (e.g. G, H, I, J) at bottom region.
   */
  public static extractRegulationMarks(bottomText: string): string[] {
    const marks: string[] = [];
    // Regulation marks are single capital letters D, E, F, G, H, I, J inside or next to borders
    const regRegex = /\b([D-J])\b/g;
    let match: RegExpExecArray | null;
    while ((match = regRegex.exec(bottomText)) !== null) {
      const mark = match[1].toUpperCase();
      if (!marks.includes(mark)) {
        marks.push(mark);
      }
    }
    return marks;
  }

  /**
   * Extracts potential Pokémon or Trainer card names by filtering noise words and clean tokens.
   */
  public static extractNameCandidates(topText: string, fullText: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();

    const cleanLines = topText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length >= 3);

    for (const line of cleanLines) {
      // Remove HP and special marks from line
      const sanitized = line
        .replace(/\b(?:HP|PS|PV)\s*[:.]?\s*[0-9]{2,3}\b/gi, '')
        .replace(/\b(?:BASIC|STAGE\s*[12]?|FASE\s*[12]?|BÁSICO)\b/gi, '')
        .replace(/[^a-zA-ZÀ-ÿ0-9\s'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (sanitized.length >= 3) {
        const words = sanitized.split(' ');
        // If first word or two make a viable Pokemon name
        const candidate = sanitized;
        const upper = candidate.toUpperCase();
        if (!this.NOISE_WORDS.has(upper) && !seen.has(candidate.toLowerCase())) {
          candidates.push(candidate);
          seen.add(candidate.toLowerCase());
        }

        // Also add individual words if name is composed
        for (const w of words) {
          if (w.length >= 3 && !this.NOISE_WORDS.has(w.toUpperCase()) && !seen.has(w.toLowerCase())) {
            candidates.push(w);
            seen.add(w.toLowerCase());
          }
        }
      }
    }

    // Fallback: search individual non-noise tokens from full text
    const fullTokens = fullText
      .replace(/[^a-zA-ZÀ-ÿ0-9\s'-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !this.NOISE_WORDS.has(w.toUpperCase()));

    for (const token of fullTokens.slice(0, 8)) {
      if (!seen.has(token.toLowerCase())) {
        candidates.push(token);
        seen.add(token.toLowerCase());
      }
    }

    return candidates;
  }

  /**
   * Main unified extraction pipeline.
   */
  public static extractTokens(
    topText: string,
    bottomText: string,
    fullText: string
  ): ExtractedCardTokens {
    const combinedBottom = `${bottomText}\n${fullText}`;
    const numbers = this.extractCollectorNumbers(combinedBottom);
    const hpList = this.extractHpValues(`${topText}\n${fullText}`);
    const regMarks = this.extractRegulationMarks(bottomText);
    const names = this.extractNameCandidates(topText, fullText);

    // Set code hints (e.g., "SVP", "PAL", "OBF", "MEW", "PAF", "TEF", "TWM", "SFA", "SCR", "SSP", "PRE")
    const setHints: string[] = [];
    const setCodeRegex = /\b([A-Z]{2,4}\d{0,2})\b/g;
    let setMatch: RegExpExecArray | null;
    while ((setMatch = setCodeRegex.exec(bottomText)) !== null) {
      const code = setMatch[1].toUpperCase();
      if (code.length >= 2 && !this.NOISE_WORDS.has(code) && !setHints.includes(code)) {
        setHints.push(code);
      }
    }

    return {
      collectorNumbers: numbers.normalized,
      rawNumbers: numbers.raw,
      nameCandidates: names,
      hpCandidates: hpList,
      setHints,
      regulationMarks: regMarks,
      rawTopText: topText,
      rawBottomText: bottomText,
      fullRawText: fullText,
    };
  }
}
