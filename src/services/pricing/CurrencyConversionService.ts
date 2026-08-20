/**
 * CurrencyConversionService.ts - Handles currency conversion with strict guard clauses.
 * Domestic currencies (BRL to BRL) NEVER trigger conversion.
 */

import { Currency, Money } from '../../types/currency';

export class CurrencyConversionService {
  private static usdToBrlRate = 5.50;
  private static eurToBrlRate = 6.00;
  public static convertCallsCount = 0;

  public static resetCallCount(): void {
    this.convertCallsCount = 0;
  }

  /**
   * Converts foreign currency to target currency.
   * GUARD CLAUSE: If currency is already targetCurrency, returns immediately with 0 conversion.
   */
  public static convert(money: Money, targetCurrency: Currency = 'BRL'): Money {
    // 1. Guard Clause - Same currency requires NO conversion
    if (money.currency === targetCurrency) {
      return money;
    }

    // 2. Track call for audit & testing
    this.convertCallsCount++;

    let convertedAmount = money.amount;

    if (money.currency === 'USD' && targetCurrency === 'BRL') {
      convertedAmount = money.amount * this.usdToBrlRate;
    } else if (money.currency === 'EUR' && targetCurrency === 'BRL') {
      convertedAmount = money.amount * this.eurToBrlRate;
    } else if (money.currency === 'BRL' && targetCurrency === 'USD') {
      convertedAmount = money.amount / this.usdToBrlRate;
    }

    return {
      amount: Number(convertedAmount.toFixed(2)),
      currency: targetCurrency,
    };
  }

  /**
   * Asserts that two monetary amounts or numbers share the exact same currency before operations.
   */
  public static assertSameCurrency(
    m1: Money | number,
    m2: Money | number,
    defaultCurrency: Currency = 'BRL'
  ): void {
    const c1 = typeof m1 === 'object' && m1 !== null ? m1.currency : defaultCurrency;
    const c2 = typeof m2 === 'object' && m2 !== null ? m2.currency : defaultCurrency;

    if (c1 !== c2) {
      throw new Error(`Currency mismatch assertion failed: ${c1} vs ${c2}`);
    }
  }

  public static getUsdToBrlRate(): number {
    return this.usdToBrlRate;
  }
}
