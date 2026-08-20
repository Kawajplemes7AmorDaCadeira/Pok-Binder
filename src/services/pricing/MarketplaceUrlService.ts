/**
 * MarketplaceUrlService.ts
 * Generates exact search queries and direct marketplace URLs for Brazilian and international TCG platforms.
 * Specifically formats Liga Pokémon queries strictly with 3-digit padding for both number and total:
 * e.g. "Ho-Oh (010/086)", "Bulbasaur (001/165)", "Pikachu (025/165)".
 */

import { PokemonCard } from '../../types';

export class MarketplaceUrlService {
  /**
   * Formats the collector number for Liga Pokémon / MYPCards standard notation.
   * Enforces 3-digit padding for both card number and total:
   * e.g. localId "10", setTotalCards 86 -> "010/086"
   * e.g. localId "1", setTotalCards 165 -> "001/165"
   * e.g. localId "25", setTotalCards 165 -> "025/165"
   * e.g. localId "10/86" -> "010/086"
   * e.g. localId "001/165" -> "001/165"
   * e.g. localId "GG01", setTotalCards 70 -> "GG01/070"
   */
  public static formatCollectorNumber(localId?: string, setTotalCards?: number): string {
    if (!localId) return '';

    const trimmed = localId.trim();

    // 1. If it already has the slash notation like "10/86" or "001/165"
    if (trimmed.includes('/')) {
      const [numPart, totalPart] = trimmed.split('/');
      const cleanNum = numPart.trim();
      const cleanTotal = (totalPart || '').trim();

      const paddedNum = /^\d+$/.test(cleanNum) ? cleanNum.padStart(3, '0') : cleanNum;
      const paddedTotal = /^\d+$/.test(cleanTotal) ? cleanTotal.padStart(3, '0') : cleanTotal;

      return `${paddedNum}/${paddedTotal}`;
    }

    // 2. If localId is pure numeric (e.g. "10", "1", "25", "199")
    if (/^\d+$/.test(trimmed)) {
      const paddedNum = trimmed.padStart(3, '0');
      const total = setTotalCards || 0;

      if (total > 0) {
        const paddedTotal = String(total).padStart(3, '0');
        return `${paddedNum}/${paddedTotal}`;
      }

      return paddedNum;
    }

    // 3. Special promo / gallery numbers like "GG01", "TG01", "SVP 001"
    if (setTotalCards && setTotalCards > 0) {
      const paddedTotal = String(setTotalCards).padStart(3, '0');
      return `${trimmed}/${paddedTotal}`;
    }

    return trimmed;
  }

  /**
   * Formats the canonical Liga Pokémon search term: "Nome (000/000)"
   * Examples:
   *  - Ho-Oh + 10 + 86 -> "Ho-Oh (010/086)"
   *  - Bulbasaur + 1 + 165 -> "Bulbasaur (001/165)"
   *  - Pikachu + 25 + 165 -> "Pikachu (025/165)"
   *  - Charizard ex + 199 + 165 -> "Charizard ex (199/165)"
   */
  public static formatLigaPokemonQuery(card?: PokemonCard): string {
    if (!card || !card.name) return '';

    const collectorNumber = this.formatCollectorNumber(card.localId, card.setTotalCards);
    if (collectorNumber) {
      return `${card.name.trim()} (${collectorNumber})`;
    }

    return card.name.trim();
  }

  /**
   * Formats search term for MYPCards: clean card name e.g. "Blastoise ex"
   * (MYPCards search bar expects plain card name without parentheses or fraction notation)
   */
  public static formatMypCardsQuery(card?: PokemonCard): string {
    if (!card || !card.name) return '';
    return card.name.replace(/\s*\([^)]*\)/g, '').trim();
  }

  /**
   * Formats search term for TCGPlayer: "Nome 010" or "Nome 010/086"
   */
  public static formatTcgPlayerQuery(card?: PokemonCard): string {
    if (!card || !card.name) return '';
    const cleanNum = card.localId ? card.localId.split('/')[0].trim() : '';
    const padded = /^\d+$/.test(cleanNum) ? cleanNum.padStart(3, '0') : cleanNum;
    return [card.name.trim(), padded].filter(Boolean).join(' ');
  }

  /**
   * Generates the direct URL for Liga Pokémon with the standard card search term: "Nome (000/000)"
   */
  public static getLigaPokemonUrl(card?: PokemonCard): string {
    if (!card) return 'https://www.ligapokemon.com.br';
    const query = this.formatLigaPokemonQuery(card);
    return `https://www.ligapokemon.com.br/?view=cards/search&card=${encodeURIComponent(query)}`;
  }

  /**
   * Generates the direct URL for MYPCards.
   * Directs to the exact product page on MYPCards (mypcards.com/pokemon/produto/...)
   * or direct indexed card finder.
   */
  public static getMypCardsUrl(card?: PokemonCard): string {
    if (!card || !card.name) return 'https://mypcards.com/pokemon';

    const cardId = card.id || '';
    // Known direct product mapping catalog
    const DIRECT_MYP_URLS: Record<string, string> = {
      'sv03.5-001': 'https://mypcards.com/pokemon/produto/205874/bulbasaur',
      'sv03.5-009': 'https://mypcards.com/pokemon/produto/205882/blastoise-ex',
      'sv03.5-199': 'https://mypcards.com/pokemon/produto/206072/charizard-ex',
      'sv03.5-004': 'https://mypcards.com/pokemon/produto/205877/charmander',
      'sv03.5-007': 'https://mypcards.com/pokemon/produto/205880/squirtle',
      'sv03.5-025': 'https://mypcards.com/pokemon/produto/205898/pikachu',
      'sv04.5-010': 'https://mypcards.com/pokemon/produto/214310/ho-oh',
    };

    if (DIRECT_MYP_URLS[cardId]) {
      return DIRECT_MYP_URLS[cardId];
    }

    const cleanNum = card.localId ? card.localId.split('/')[0].trim() : '';
    const cleanSet = card.setName || card.setId || '';
    const query = [card.name.trim(), cleanNum, cleanSet].filter(Boolean).join(' ');

    return `https://www.google.com/search?q=site:mypcards.com/pokemon/produto+${encodeURIComponent(query)}`;
  }

  /**
   * Generates the direct URL for TCGPlayer.
   */
  public static getTcgPlayerUrl(card?: PokemonCard): string {
    if (!card) return 'https://www.tcgplayer.com';
    const query = this.formatTcgPlayerQuery(card);
    return `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(query)}&view=grid`;
  }
}
