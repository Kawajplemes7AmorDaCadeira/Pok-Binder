/**
 * BrazilianPriceParser.ts - Dedicated parser for Brazilian Currency (BRL) and Foreign Currencies (USD).
 * Prevents string misinterpretation (comma as decimal separator, dot as thousands separator).
 */

import { Money } from '../../types/currency';

export class BrazilianPriceParser {
  /**
   * Parses Brazilian currency formatted strings, numbers, or Money objects into Money { amount, currency: 'BRL' }.
   * Examples:
   * "R$ 0,50" -> 0.50
   * "R$0,50" -> 0.50
   * "0,50" -> 0.50
   * "1.234,56" -> 1234.56
   * "R$ 1.234,56" -> 1234.56
   * "2,78" -> 2.78
   * 2.78 -> 2.78
   */
  public static parseBrazilianCurrency(value: string | number | Money | null | undefined): Money {
    if (value === null || value === undefined || value === '') {
      return { amount: 0, currency: 'BRL' };
    }

    if (typeof value === 'object' && 'amount' in value) {
      return { amount: Number(value.amount.toFixed(2)), currency: 'BRL' };
    }

    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return { amount: 0, currency: 'BRL' };
      return { amount: Number(value.toFixed(2)), currency: 'BRL' };
    }

    let clean = String(value).trim();
    // Remove R$, BRL, and all non-numeric characters except dots and commas and minus
    clean = clean.replace(/R\$|\bBRL\b/gi, '').trim();

    // Check if comma is used as decimal separator
    if (clean.includes(',')) {
      // Remove all dots (thousands separators in BR)
      clean = clean.replace(/\./g, '');
      // Replace comma with dot
      clean = clean.replace(',', '.');
    }

    // Strip any remaining non-number / non-dot / non-minus characters
    clean = clean.replace(/[^0-9.-]/g, '');

    const parsed = parseFloat(clean);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return { amount: 0, currency: 'BRL' };
    }

    return {
      amount: Number(parsed.toFixed(2)),
      currency: 'BRL',
    };
  }

  /**
   * Parses USD currency formatted strings, numbers, or Money objects into Money { amount, currency: 'USD' }.
   * Examples:
   * "$1.20" -> 1.20
   * "1.20 USD" -> 1.20
   * "1,234.56" -> 1234.56
   */
  public static parseUSDPrice(value: string | number | Money | null | undefined): Money {
    if (value === null || value === undefined || value === '') {
      return { amount: 0, currency: 'USD' };
    }

    if (typeof value === 'object' && 'amount' in value) {
      return { amount: Number(value.amount.toFixed(2)), currency: 'USD' };
    }

    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) return { amount: 0, currency: 'USD' };
      return { amount: Number(value.toFixed(2)), currency: 'USD' };
    }

    let clean = String(value).trim();
    clean = clean.replace(/\$|\bUSD\b/gi, '').trim();

    // Remove commas (thousands separator in US)
    clean = clean.replace(/,/g, '');
    clean = clean.replace(/[^0-9.-]/g, '');

    const parsed = parseFloat(clean);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return { amount: 0, currency: 'USD' };
    }

    return {
      amount: Number(parsed.toFixed(2)),
      currency: 'USD',
    };
  }

  /**
   * Formats a numeric value or Money object into Brazilian Real currency string (R$ 0,00).
   */
  public static formatBRL(value: number | Money | null | undefined): string {
    if (value === null || value === undefined) return '---';
    const num = typeof value === 'object' && 'amount' in value ? value.amount : value;
    if (isNaN(num)) return '---';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  }

  /**
   * Formats a numeric value or Money object into USD currency string ($0.00).
   */
  public static formatUSD(value: number | Money | null | undefined): string {
    if (value === null || value === undefined) return '---';
    const num = typeof value === 'object' && 'amount' in value ? value.amount : value;
    if (isNaN(num)) return '---';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  }
}
