import { FinancialService } from '../services/financial/financialService';
import { CollectionRepository } from '../database/repositories/CollectionRepository';
import { CollectionService } from '../services/collection/collectionService';
import { WishlistRepository } from '../database/repositories/WishlistRepository';
import { TradeRepository } from '../database/repositories/TradeRepository';

async function runPhase5Tests() {
  console.log('=== RUNNING FASE 5 (PREÇOS, TRANSAÇÕES, WISHLIST E TROCAS) AUTOMATED TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Price Snapshot History & Trend Calculation
  try {
    const cardPrintId = 'PKB:PRINT:pt:sv03.5:006';

    await FinancialService.recordPriceSnapshot(cardPrintId, 100.0, 'LigaPokemon', 'BRL');
    await FinancialService.recordPriceSnapshot(cardPrintId, 120.0, 'LigaPokemon', 'BRL');

    const history = await FinancialService.getPriceHistory(cardPrintId);
    assert(history.length === 2, `Price history stored 2 snapshots for ${cardPrintId}`);

    const trend = await FinancialService.calculatePriceTrend(cardPrintId);
    assert(trend.percentageChange === 20.0, `Price trend percentage calculated correctly (+20.0%): ${trend.percentageChange}%`);
    assert(trend.latestPrice === 120.0, `Latest market price identified correctly: R$ ${trend.latestPrice}`);
  } catch (err) {
    assert(false, `Price snapshot test failed: ${err}`);
  }

  // Test 2: Financial Balance Calculation & ROI
  try {
    await CollectionRepository.clearAll();

    // User bought 2 Charizards for R$ 50 each (Total acquisition = R$ 100)
    await CollectionService.addItem({
      cardPrintId: 'PKB:PRINT:pt:sv03.5:006',
      quantity: 2,
      acquiredPrice: 50.0,
    });

    // Market price is now R$ 120 each (Total market value = R$ 240)
    const report = await FinancialService.calculateFinancialBalance({
      'PKB:PRINT:pt:sv03.5:006': 120.0,
    });

    assert(report.totalAcquisitionCost === 100.0, `Total acquisition cost verified: R$ ${report.totalAcquisitionCost}`);
    assert(report.totalCurrentMarketValue === 240.0, `Total current market value verified: R$ ${report.totalCurrentMarketValue}`);
    assert(report.netProfitLoss === 140.0, `Net profit calculated: R$ ${report.netProfitLoss}`);
    assert(report.roiPercentage === 140.0, `ROI percentage calculated (+140%): ${report.roiPercentage}%`);
  } catch (err) {
    assert(false, `Financial balance test failed: ${err}`);
  }

  // Test 3: Wishlist Management & Total Cost
  try {
    await WishlistRepository.clear();

    await WishlistRepository.save({
      cardPrintId: 'PKB:PRINT:pt:sv03.5:006',
      desiredQuantity: 1,
      targetPrice: 110.0,
      priority: 'high',
    });

    const wishlistSummary = await FinancialService.getWishlistSummary();
    assert(wishlistSummary.itemsCount === 1, `Wishlist contains 1 item`);
    assert(wishlistSummary.estimatedTotalCost === 110.0, `Wishlist estimated total cost calculated: R$ ${wishlistSummary.estimatedTotalCost}`);
  } catch (err) {
    assert(false, `Wishlist test failed: ${err}`);
  }

  // Test 4: Trade Management & Total Available Value
  try {
    await TradeRepository.clear();

    await TradeRepository.save({
      cardPrintId: 'PKB:PRINT:pt:sv03.5:006',
      availableQuantity: 2,
    });

    const tradeSummary = await FinancialService.getTradeSummary({
      'PKB:PRINT:pt:sv03.5:006': 120.0,
    });

    assert(tradeSummary.itemsCount === 1, `Trade binder contains 1 item`);
    assert(tradeSummary.totalAvailableCards === 2, `Total available trade cards verified: 2`);
    assert(tradeSummary.estimatedTradeValue === 240.0, `Trade binder value verified: R$ ${tradeSummary.estimatedTradeValue}`);
  } catch (err) {
    assert(false, `Trade test failed: ${err}`);
  }

  console.log(`\n=== FASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runPhase5Tests();
