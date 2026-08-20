import { ExternalIds } from '../types/db';

/**
 * Standardized Internal ID generators
 */

/**
 * Generates internal Card ID based on card name slug.
 */
export function createInternalCardId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `PKB:CARD:${slug || 'unknown'}`;
}

/**
 * Generates internal CardPrint ID based on language, set ID, and collector number.
 */
export function createInternalPrintId(
  setId: string,
  collectorNumber: string,
  lang: string = 'pt'
): string {
  const cleanSet = setId.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const cleanNum = collectorNumber.toLowerCase().replace(/\s+/g, '');
  return `PKB:PRINT:${lang.toLowerCase()}:${cleanSet}:${cleanNum}`;
}

/**
 * Generates internal Set ID.
 */
export function createInternalSetId(setCodeOrId: string): string {
  const clean = setCodeOrId.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `PKB:SET:${clean}`;
}

/**
 * Generates internal Series ID.
 */
export function createInternalSeriesId(seriesId: string): string {
  const clean = seriesId.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `PKB:SERIES:${clean}`;
}

/**
 * Creates ExternalIds mapping object.
 */
export function createExternalIds(
  tcgdexId?: string,
  pokemonTcgApiId?: string,
  tcgplayerId?: string,
  cardmarketId?: string
): ExternalIds {
  const ids: ExternalIds = {};
  if (tcgdexId) ids.tcgdex = tcgdexId;
  if (pokemonTcgApiId) ids.pokemonTcgApi = pokemonTcgApiId;
  if (tcgplayerId) ids.tcgplayer = tcgplayerId;
  if (cardmarketId) ids.cardmarket = cardmarketId;
  return ids;
}

/**
 * Generates UUID v4 fallback string.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns the input if it's already a valid UUID, otherwise returns a generated UUID v4
 */
export function toValidUUID(input?: string): string {
  if (input && UUID_REGEX.test(input)) {
    return input;
  }
  return generateUUID();
}
